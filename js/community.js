// community.html의 게시글 목록, 상세, 작성·수정·삭제, 사진 첨부를 담당합니다.
(function () {
  const { KEYS, getCurrentUser, readList, writeList, createId, formatDate, images } = window.Kkuni;

  const CATEGORIES = {
    story: "여행 이야기",
    hidden: "숨은 장소",
    qna: "질문·답변",
    free: "자유 토론",
  };

  // 사진 규칙: 원본은 긴 변 1600px 안으로 줄이고, 카드용 썸네일은 카드 썸네일 칸과 같은 2:1 비율로 잘라 둡니다.
  // 비율이 같으므로 카드에서는 추가로 잘리거나 여백이 생기지 않고 칸에 딱 맞습니다. (css/community.css .post-thumb)
  const MAX_IMAGES = 4;
  const MAX_FILE_BYTES = 20 * 1024 * 1024;
  const FULL_MAX_SIDE = 1600;
  const THUMB_WIDTH = 640;
  const THUMB_HEIGHT = 320;

  // 화면 구성을 보여주는 예시 글입니다. 저장소에 넣지 않으며 수정·삭제할 수 없습니다.
  const SAMPLE_POSTS = [
    {
      id: "sample-1", sample: true, category: "story", likes: 12, author: "여행하는 꾸니",
      title: "낚시하고 나서, 여수에서 하루 더 머물렀어요",
      body: "아침에는 포인트에 들르고 오후에는 해안 산책을 즐기는 일정은 어떨까요? 나만의 낚시 여행 이야기를 들려주세요. 이 글은 화면 구성을 위한 예시입니다.",
    },
    {
      id: "sample-2", sample: true, category: "qna", likes: 8, author: "초보 꾸니",
      title: "처음 떠나는 바다낚시, 준비물은 무엇일까요?",
      body: "초보 낚시꾼의 질문을 나누는 공간입니다. 출발 전 필요한 준비물을 함께 정리해봐요. 예시 게시글이며 전문 안내가 아닙니다.",
    },
    {
      id: "sample-3", sample: true, category: "hidden", likes: 17, author: "바다 산책자",
      title: "나만 알고 있던 작은 산책길을 공유해요",
      body: "낚시 포인트 근처에서 발견한 풍경, 마음에 들었던 먹거리와 숙소를 자유롭게 소개해주세요. 화면용 예시입니다.",
    },
  ];

  // ---------- 사진 리사이징 ----------
  async function decodeImage(file) {
    if (window.createImageBitmap) {
      try {
        // 휴대폰 사진의 EXIF 회전 정보를 반영해 읽습니다.
        return await createImageBitmap(file, { imageOrientation: "from-image" });
      } catch (error) {
        // 아래 <img> 방식으로 다시 시도합니다.
      }
    }
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      return image;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  function makeCanvas(width, height) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  // 원본의 (sx, sy, sw, sh) 영역을 width×height에 그립니다.
  // 크게 줄일 때는 절반씩 단계적으로 줄여 계단 현상을 막습니다.
  function drawScaled(source, sx, sy, sw, sh, width, height) {
    let current = source;
    let x = sx, y = sy, w = sw, h = sh;
    while (w / 2 >= width && h / 2 >= height) {
      const step = makeCanvas(Math.round(w / 2), Math.round(h / 2));
      const context = step.getContext("2d");
      context.imageSmoothingQuality = "high";
      context.drawImage(current, x, y, w, h, 0, 0, step.width, step.height);
      current = step;
      x = 0; y = 0; w = step.width; h = step.height;
    }
    const canvas = makeCanvas(width, height);
    const context = canvas.getContext("2d");
    context.fillStyle = "#ffffff"; // 투명 PNG가 JPEG로 바뀔 때 검게 나오지 않도록 흰 배경을 깝니다.
    context.fillRect(0, 0, width, height);
    context.imageSmoothingQuality = "high";
    context.drawImage(current, x, y, w, h, 0, 0, width, height);
    return canvas;
  }

  function canvasToBlob(canvas, quality) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("사진을 변환하지 못했습니다.")), "image/jpeg", quality);
    });
  }

  async function resizeImage(file) {
    let source;
    try {
      source = await decodeImage(file);
    } catch (error) {
      throw new Error("'" + file.name + "'은(는) 열 수 없는 사진 형식입니다. JPG, PNG, WebP로 올려주세요.");
    }
    try {
      const width = source.naturalWidth || source.width;
      const height = source.naturalHeight || source.height;
      if (!width || !height) throw new Error("'" + file.name + "'의 크기를 읽을 수 없습니다.");

      // 상세 화면용: 비율을 유지한 채 긴 변을 FULL_MAX_SIDE 안으로 맞춥니다.
      const scale = Math.min(1, FULL_MAX_SIDE / Math.max(width, height));
      const fullWidth = Math.max(1, Math.round(width * scale));
      const fullHeight = Math.max(1, Math.round(height * scale));
      const full = await canvasToBlob(drawScaled(source, 0, 0, width, height, fullWidth, fullHeight), 0.85);

      // 카드용: 가운데를 2:1로 잘라 카드 썸네일 칸에 빈틈없이 맞춥니다.
      const ratio = THUMB_WIDTH / THUMB_HEIGHT;
      const cropWidth = width / height > ratio ? height * ratio : width;
      const cropHeight = width / height > ratio ? height : width / ratio;
      const thumb = await canvasToBlob(drawScaled(
        source, (width - cropWidth) / 2, (height - cropHeight) / 2, cropWidth, cropHeight, THUMB_WIDTH, THUMB_HEIGHT
      ), 0.8);

      return { id: createId(), full, thumb, width: fullWidth, height: fullHeight };
    } finally {
      if (typeof source.close === "function") source.close();
    }
  }

  // 만든 object URL을 모아 두었다가 화면을 다시 그릴 때 해제합니다.
  function urlPool() {
    const urls = [];
    return {
      make(blob) {
        const url = URL.createObjectURL(blob);
        urls.push(url);
        return url;
      },
      clear() {
        urls.splice(0).forEach((url) => URL.revokeObjectURL(url));
      },
    };
  }

  function imageIds(post) {
    return Array.isArray(post.images) ? post.images.map((image) => image && image.id).filter(Boolean) : [];
  }

  function initCommunityPage() {
    const writeButton = document.getElementById("write-button");
    const emptyWrite = document.getElementById("empty-write");
    const filter = document.getElementById("category-filter");
    const countText = document.getElementById("post-count");
    const boardError = document.getElementById("board-error");
    const grid = document.getElementById("post-grid");
    const empty = document.getElementById("post-empty");
    const cardTemplate = document.getElementById("post-card-template");

    const detailDialog = document.getElementById("post-dialog");
    const detailCategory = document.getElementById("detail-category");
    const detailTitle = document.getElementById("detail-title");
    const detailMeta = document.getElementById("detail-meta");
    const detailGallery = document.getElementById("detail-gallery");
    const detailBody = document.getElementById("detail-body");
    const detailLike = document.getElementById("detail-like");
    const detailLikeCount = document.getElementById("detail-like-count");
    const ownerActions = document.getElementById("owner-actions");

    const editorDialog = document.getElementById("editor-dialog");
    const editorForm = document.getElementById("editor-form");
    const editorHeading = document.getElementById("editor-title");
    const editorCategory = document.getElementById("editor-category");
    const editorTitle = document.getElementById("editor-post-title");
    const editorBody = document.getElementById("editor-body");
    const editorCounter = document.getElementById("editor-counter");
    const editorError = document.getElementById("editor-error");
    const editorSubmit = document.getElementById("editor-submit");
    const imagePicker = document.getElementById("image-picker");
    const imageInput = document.getElementById("editor-images");
    const imageAdd = document.getElementById("image-add");
    const imagePreviews = document.getElementById("image-previews");
    const imageStatus = document.getElementById("image-status");
    const previewTemplate = document.getElementById("image-preview-template");

    const cardUrls = urlPool();
    const detailUrls = urlPool();
    const draftUrls = urlPool();

    let selectedCategory = "all";
    let openedPost = null;
    let editingPost = null;
    let detailToken = 0;
    let draftImages = []; // { id, width, height, previewUrl, record? } record가 있으면 새로 추가한 사진
    let processing = 0;
    let saving = false;
    let editorSession = 0; // 작성 창을 열 때마다 늘려, 이전 창에서 끝난 비동기 작업 결과를 버립니다.
    let returnTo = null; // 수정 창을 닫은 뒤 돌아갈 페이지
    let editorActive = false; // 작성 창 정리를 한 번만 하도록 표시합니다.

    function loadPosts() {
      return readList(KEYS.posts).filter((post) =>
        post && typeof post.id === "string" && CATEGORIES[post.category] &&
        typeof post.title === "string" && typeof post.body === "string"
      );
    }

    // 내가 쓴 글을 최신순으로 먼저, 그 뒤에 예시 글을 보여줍니다.
    function allPosts() {
      const saved = loadPosts().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
      return saved.concat(SAMPLE_POSTS);
    }

    function isOwner(post) {
      const user = getCurrentUser();
      return Boolean(user && !post.sample && post.ownerEmail === user.email);
    }

    function metaText(post) {
      if (post.sample) return post.author + " · 예시 게시글";
      const edited = post.updatedAt && post.updatedAt !== post.createdAt ? " · 수정됨" : "";
      return post.author + " · " + formatDate(post.createdAt) + edited;
    }

    function illustration(category) {
      return document.getElementById("thumb-" + category).content.cloneNode(true);
    }

    // 카드 썸네일: 첫 번째 사진, 없거나 읽지 못하면 카테고리 그림을 보여줍니다.
    function fillThumbnail(container, post) {
      const ids = imageIds(post);
      const countBadge = container.querySelector(".photo-count");
      if (ids.length === 0) {
        container.prepend(illustration(post.category));
        return;
      }
      const photo = document.createElement("img");
      photo.className = "post-photo";
      photo.alt = "";
      photo.decoding = "async";
      container.classList.add("has-photo");
      container.prepend(photo);
      if (ids.length > 1) {
        countBadge.textContent = "사진 " + ids.length + "장";
        countBadge.hidden = false;
      }
      images.get(ids[0]).then(function (record) {
        if (!record) throw new Error("missing");
        photo.src = cardUrls.make(record.thumb);
      }).catch(function () {
        photo.remove();
        container.classList.remove("has-photo");
        container.prepend(illustration(post.category));
      });
    }

    function render() {
      let posts;
      try {
        posts = allPosts();
        boardError.hidden = true;
      } catch (error) {
        posts = SAMPLE_POSTS;
        boardError.textContent = error.message;
        boardError.hidden = false;
      }
      const visible = selectedCategory === "all" ? posts : posts.filter((post) => post.category === selectedCategory);

      cardUrls.clear();
      grid.replaceChildren();
      visible.forEach(function (post) {
        const card = cardTemplate.content.firstElementChild.cloneNode(true);
        card.dataset.category = post.category;
        fillThumbnail(card.querySelector(".post-thumb"), post);
        card.querySelector(".category-pill").textContent = CATEGORIES[post.category];
        card.querySelector(".post-title").textContent = post.title;
        card.querySelector(".post-excerpt").textContent = post.body;
        card.querySelector(".post-meta").textContent = metaText(post);
        card.querySelector(".like-count").textContent = post.likes || 0;
        if (isOwner(post)) card.classList.add("mine");
        card.querySelector(".post-open").addEventListener("click", () => openDetail(post));
        grid.append(card);
      });

      empty.hidden = visible.length > 0;
      countText.textContent = visible.length + "개의 이야기 · 로컬 데모";
    }

    filter.addEventListener("click", function (event) {
      const chip = event.target.closest("[data-category]");
      if (!chip) return;
      selectedCategory = chip.dataset.category;
      filter.querySelectorAll("[data-category]").forEach((button) => {
        button.setAttribute("aria-pressed", String(button === chip));
      });
      render();
    });

    // ---------- 상세 ----------
    // 상세 사진은 비율을 유지한 채 창 안에 들어오도록 표시합니다. width/height를 먼저 지정해 자리가 흔들리지 않습니다.
    function fillGallery(post) {
      const token = ++detailToken;
      const list = Array.isArray(post.images) ? post.images.filter((image) => image && image.id) : [];
      detailUrls.clear();
      detailGallery.replaceChildren();
      detailGallery.hidden = list.length === 0;
      detailGallery.classList.toggle("single", list.length === 1);
      list.forEach(function (image, index) {
        const figure = document.createElement("figure");
        figure.className = "detail-photo";
        const photo = document.createElement("img");
        photo.alt = post.title + " 사진 " + (index + 1);
        if (image.width && image.height) {
          photo.width = image.width;
          photo.height = image.height;
        }
        figure.append(photo);
        detailGallery.append(figure);
        images.get(image.id).then(function (record) {
          if (token !== detailToken) return;
          if (!record) throw new Error("missing");
          photo.src = detailUrls.make(record.full);
        }).catch(function () {
          if (token !== detailToken) return;
          figure.classList.add("missing");
          photo.remove();
          figure.textContent = "사진을 불러오지 못했어요.";
        });
      });
    }

    function openDetail(post) {
      openedPost = post;
      detailCategory.textContent = CATEGORIES[post.category];
      detailTitle.textContent = post.title;
      detailMeta.textContent = metaText(post);
      detailBody.textContent = post.body;
      detailLikeCount.textContent = post.likes || 0;
      ownerActions.hidden = !isOwner(post);
      fillGallery(post);
      detailDialog.showModal();
    }

    detailDialog.addEventListener("close", function () {
      detailToken++;
      detailGallery.replaceChildren();
      detailUrls.clear();
    });
    document.getElementById("detail-close").addEventListener("click", () => detailDialog.close());
    detailLike.addEventListener("click", function () {
      alert("좋아요는 회원 간 게시판 서버가 연동된 뒤 제공됩니다.");
    });
    document.getElementById("detail-edit").addEventListener("click", function () {
      if (!openedPost || !isOwner(openedPost)) return;
      const post = openedPost;
      detailDialog.close();
      openEditor(post);
    });
    document.getElementById("detail-delete").addEventListener("click", function () {
      if (!openedPost || !isOwner(openedPost)) return;
      if (!window.confirm("'" + openedPost.title + "' 글을 삭제할까요? 삭제한 글은 되돌릴 수 없습니다.")) return;
      const post = openedPost;
      try {
        writeList(KEYS.posts, readList(KEYS.posts).filter((item) => item.id !== post.id));
      } catch (error) {
        alert(error.message);
        return;
      }
      images.remove(imageIds(post)).catch(() => {}); // 사진 정리는 실패해도 글 삭제는 유지합니다.
      detailDialog.close();
      render();
    });

    // ---------- 작성 창의 사진 ----------
    function updateImageControls(message) {
      const full = draftImages.length >= MAX_IMAGES;
      imageAdd.classList.toggle("disabled", full || processing > 0);
      imageInput.disabled = full || processing > 0;
      editorSubmit.disabled = processing > 0 || saving;
      if (message) {
        imageStatus.textContent = message;
      } else if (processing > 0) {
        imageStatus.textContent = "사진 크기를 맞추는 중이에요...";
      } else {
        imageStatus.textContent = draftImages.length
          ? draftImages.length + " / " + MAX_IMAGES + "장 · 카드에는 첫 번째 사진이 보여요."
          : "사진을 끌어다 놓아도 됩니다.";
      }
    }

    function renderDraftImages() {
      imagePreviews.replaceChildren();
      draftImages.forEach(function (image, index) {
        const item = previewTemplate.content.firstElementChild.cloneNode(true);
        const photo = item.querySelector("img");
        photo.src = image.previewUrl || "";
        photo.alt = "첨부 사진 " + (index + 1);
        if (index === 0) item.classList.add("cover");
        const remove = item.querySelector(".image-remove");
        remove.setAttribute("aria-label", "첨부 사진 " + (index + 1) + " 삭제");
        remove.addEventListener("click", function () {
          draftImages = draftImages.filter((draft) => draft !== image);
          renderDraftImages();
        });
        imagePreviews.append(item);
      });
      updateImageControls();
    }

    async function addFiles(fileList) {
      const files = Array.from(fileList || []);
      if (files.length === 0) return;
      const room = MAX_IMAGES - draftImages.length - processing;
      const problems = [];
      if (files.length > room) problems.push("사진은 최대 " + MAX_IMAGES + "장까지 올릴 수 있어요.");

      const accepted = files.slice(0, Math.max(0, room)).filter(function (file) {
        if (!file.type.startsWith("image/")) {
          problems.push("'" + file.name + "'은(는) 사진 파일이 아니에요.");
          return false;
        }
        if (file.size > MAX_FILE_BYTES) {
          problems.push("'" + file.name + "'은(는) 20MB를 넘어요.");
          return false;
        }
        return true;
      });

      processing += accepted.length;
      updateImageControls();
      const draftOwner = editingPost; // 처리 중 창이 닫히거나 다른 글을 열면 결과를 버립니다.
      const sessionId = editorSession;
      for (const file of accepted) {
        try {
          const record = await resizeImage(file);
          if (sessionId !== editorSession || draftOwner !== editingPost) continue;
          draftImages.push({
            id: record.id, width: record.width, height: record.height,
            previewUrl: draftUrls.make(record.thumb), record,
          });
          renderDraftImages();
        } catch (error) {
          problems.push(error.message);
        } finally {
          if (sessionId === editorSession) processing--;
        }
      }
      if (sessionId !== editorSession) return;
      updateImageControls(problems.length ? problems.join(" ") : "");
    }

    imageInput.addEventListener("change", function () {
      addFiles(imageInput.files);
      imageInput.value = "";
    });
    imagePicker.addEventListener("dragover", function (event) {
      if (!event.dataTransfer || !Array.from(event.dataTransfer.types).includes("Files")) return;
      event.preventDefault();
      imagePicker.classList.add("dragging");
    });
    imagePicker.addEventListener("dragleave", () => imagePicker.classList.remove("dragging"));
    imagePicker.addEventListener("drop", function (event) {
      event.preventDefault();
      imagePicker.classList.remove("dragging");
      if (imageInput.disabled) return;
      addFiles(event.dataTransfer.files);
    });

    // 수정할 때는 저장된 썸네일을 불러와 미리보기에 보여줍니다.
    function loadExistingDrafts(post) {
      const sessionId = editorSession;
      draftImages = (Array.isArray(post.images) ? post.images : [])
        .filter((image) => image && image.id)
        .map((image) => ({ id: image.id, width: image.width, height: image.height, previewUrl: "" }));
      renderDraftImages();
      draftImages.forEach(function (draft) {
        images.get(draft.id).then(function (record) {
          if (sessionId !== editorSession || !record) return;
          draft.previewUrl = draftUrls.make(record.thumb);
          renderDraftImages();
        }).catch(() => {});
      });
    }

    // ---------- 작성·수정 ----------
    function requireLogin() {
      if (getCurrentUser()) return true;
      if (window.confirm("이야기를 쓰려면 로그인이 필요합니다. 로그인 화면으로 이동할까요?")) {
        window.location.href = "login.html?next=community.html";
      }
      return false;
    }

    function updateCounter() {
      editorCounter.textContent = editorBody.value.length.toLocaleString("ko-KR") + " / 3,000";
    }

    function openEditor(post) {
      if (!requireLogin()) return;
      editorSession++;
      processing = 0;
      saving = false;
      editingPost = post;
      editorHeading.textContent = post ? "이야기 수정" : "이야기 쓰기";
      editorSubmit.textContent = post ? "수정하기" : "등록하기";
      editorCategory.value = post ? post.category : (CATEGORIES[selectedCategory] ? selectedCategory : "story");
      editorTitle.value = post ? post.title : "";
      editorBody.value = post ? post.body : "";
      editorError.hidden = true;
      updateCounter();
      if (post) {
        loadExistingDrafts(post);
      } else {
        draftImages = [];
        renderDraftImages();
      }
      editorActive = true;
      editorDialog.showModal();
      editorTitle.focus();
    }

    // 작성 창을 닫은 뒤 정리합니다. 저장하지 않은 새 사진은 IndexedDB에 쓰지 않았으므로 미리보기 URL만 해제합니다.
    // 다른 페이지로 이동하면 true를 돌려줍니다.
    function finishEditor() {
      if (!editorActive) return false;
      editorActive = false;
      editorSession++;
      processing = 0;
      draftImages = [];
      imagePreviews.replaceChildren();
      draftUrls.clear();
      // 마이페이지에서 수정하러 온 경우 저장하거나 취소하면 내 글 목록으로 돌아갑니다.
      if (returnTo) {
        const target = returnTo;
        returnTo = null;
        window.location.href = target;
        return true;
      }
      return false;
    }

    function closeEditor() {
      if (saving) return false;
      editorDialog.close();
      return finishEditor();
    }

    // Esc로 닫힌 경우를 처리합니다. close 이벤트는 늦게 올 수 있어, 그 사이 창을 다시 열었다면 무시합니다.
    editorDialog.addEventListener("close", function () {
      if (!editorDialog.open) finishEditor();
    });
    editorDialog.addEventListener("cancel", function (event) {
      if (saving) event.preventDefault();
    });

    function validate(category, title, body) {
      if (!CATEGORIES[category]) return "카테고리를 선택해주세요.";
      if (title.length < 2 || title.length > 80) return "제목은 2~80자로 입력해주세요.";
      if (body.length < 10 || body.length > 3000) return "내용은 10~3,000자로 입력해주세요.";
      return "";
    }

    writeButton.addEventListener("click", () => openEditor(null));
    emptyWrite.addEventListener("click", () => openEditor(null));
    editorBody.addEventListener("input", updateCounter);
    document.getElementById("editor-close").addEventListener("click", closeEditor);
    document.getElementById("editor-cancel").addEventListener("click", closeEditor);

    function showEditorError(message) {
      editorError.textContent = message;
      editorError.hidden = false;
    }

    editorForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      if (saving || processing > 0) return;
      const user = getCurrentUser();
      if (!user) {
        closeEditor();
        requireLogin();
        return;
      }

      const category = editorCategory.value;
      const title = editorTitle.value.trim();
      const body = editorBody.value.trim();
      const message = validate(category, title, body);
      if (message) {
        showEditorError(message);
        return;
      }

      saving = true;
      updateImageControls();
      editorError.hidden = true;
      const newRecords = draftImages.filter((draft) => draft.record).map((draft) => draft.record);
      const imageMeta = draftImages.map((draft) => ({ id: draft.id, width: draft.width, height: draft.height }));
      const removedIds = editingPost
        ? imageIds(editingPost).filter((id) => !imageMeta.some((image) => image.id === id))
        : [];

      try {
        // 사진을 먼저 저장하고, 글 저장이 실패하면 방금 저장한 사진을 되돌립니다.
        await images.put(newRecords);
        try {
          const posts = readList(KEYS.posts);
          const now = new Date().toISOString();
          if (editingPost) {
            const post = posts.find((item) => item.id === editingPost.id);
            if (!post || post.ownerEmail !== user.email) throw new Error("수정할 수 있는 글이 아닙니다.");
            Object.assign(post, { category, title, body, images: imageMeta, updatedAt: now });
          } else {
            posts.push({
              id: createId(), ownerEmail: user.email, author: user.name,
              category, title, body, images: imageMeta, likes: 0, createdAt: now, updatedAt: now,
            });
          }
          writeList(KEYS.posts, posts);
        } catch (error) {
          await images.remove(newRecords.map((record) => record.id)).catch(() => {});
          throw error;
        }
      } catch (error) {
        saving = false;
        updateImageControls();
        showEditorError(error.message);
        return;
      }

      images.remove(removedIds).catch(() => {});
      saving = false;
      if (closeEditor()) return;
      // 새 글이 바로 보이도록 해당 카테고리 또는 전체 목록을 유지합니다.
      if (selectedCategory !== "all" && selectedCategory !== category) {
        filter.querySelector('[data-category="all"]').click();
      } else {
        render();
      }
    });

    // 다른 화면에서 글을 바로 열 때: ?post=ID 는 상세, ?edit=ID 는 수정 창(&from=mypage면 끝난 뒤 복귀)
    function openFromUrl() {
      const params = new URLSearchParams(window.location.search);
      const postId = params.get("edit") || params.get("post");
      if (!postId) return;
      history.replaceState(null, "", "community.html"); // 새로고침해도 다시 열리지 않도록 주소를 정리합니다.

      let post;
      try {
        post = loadPosts().find((item) => item.id === postId);
      } catch (error) {
        return; // 목록 위의 오류 안내로 충분합니다.
      }
      if (!post) {
        alert("글을 찾을 수 없어요. 이미 삭제되었을 수 있어요.");
        return;
      }
      if (!params.get("edit")) {
        openDetail(post);
        return;
      }
      if (!isOwner(post)) {
        alert("내가 쓴 글만 수정할 수 있어요.");
        return;
      }
      if (params.get("from") === "mypage") returnTo = "mypage.html?tab=posts";
      openEditor(post);
    }

    render();
    openFromUrl();
  }

  initCommunityPage();
})();
