// mypage.html의 내 정보, 저장 목록, 내가 쓴 글, 로그아웃, 회원 탈퇴를 담당합니다.
(function () {
  const { KEYS, getCurrentUser, logout, readList, writeList, formatDate, verifyPassword, images } = window.Kkuni;

  const PLACE_TYPES = {
    point: "낚시 포인트",
    store: "낚시용품점",
    attraction: "관광지",
    restaurant: "음식점",
    lodging: "숙박",
    festival: "축제·행사",
  };

  const POST_CATEGORIES = {
    story: "여행 이야기",
    hidden: "숨은 장소",
    qna: "질문·답변",
    free: "자유 토론",
  };

  const TABS = {
    favorites: {
      title: "다시 가고 싶은 장소",
      empty: "아직 관심 장소가 없어요. 지도 탐색에서 마음에 드는 장소에 하트를 눌러보세요.",
      link: ["map.html", "지도 탐색하기"],
    },
    markers: {
      title: "내가 등록한 장소",
      empty: "아직 등록한 장소가 없어요. 지도에서 낚시 포인트나 용품점을 등록해보세요.",
      link: ["map.html", "장소 등록하러 가기"],
    },
    trips: {
      title: "저장한 여행",
      empty: "저장한 여행이 없어요. 여행 플래너에서 첫 여행을 만들어보세요.",
      link: ["travel.html", "여행 만들기"],
    },
    posts: {
      title: "내가 쓴 글",
      empty: "아직 작성한 글이 없어요. 커뮤니티에 첫 이야기를 남겨보세요.",
      link: ["community.html", "이야기 쓰러 가기"],
    },
    account: { title: "계정 관리" },
  };

  // 로그인 전 화면 구성을 보여주는 가상 예시입니다.
  const PREVIEW = {
    favorites: [
      { name: "푸른 방파제 포인트", category: "point" },
      { name: "꾸니 낚시용품점", category: "store" },
      { name: "달빛 해안 산책길", category: "attraction" },
      { name: "바다한상", category: "restaurant" },
    ].map((place) => ({ icon: place.category, name: place.name, meta: PLACE_TYPES[place.category] + " · 가상 예시" })),
    markers: [
      { icon: "point", name: "새벽 갯바위 포인트", meta: "낚시 포인트 · 비공개 · 가상 예시" },
      { icon: "store", name: "항구 앞 미끼가게", meta: "낚시용품점 · 공개 · 가상 예시" },
    ],
    trips: [
      { icon: "trip", name: "여수 1박 2일 낚시 여행", meta: "2026.10.10 ~ 2026.10.11 · 장소 5곳 · 가상 예시" },
    ],
    posts: [
      { icon: "post", name: "첫 바다낚시, 생각보다 즐거웠어요", meta: "여행 이야기 · 가상 예시" },
      { icon: "post", name: "방파제 근처 조용한 카페를 찾았어요", meta: "숨은 장소 · 가상 예시" },
    ],
  };

  const ICONS = Object.keys(PLACE_TYPES).concat(["trip", "post"]);

  function postImageIds(post) {
    return Array.isArray(post.images) ? post.images.map((image) => image && image.id).filter(Boolean) : [];
  }

  function placeLabel(category) {
    return PLACE_TYPES[category] || "장소";
  }

  // 여행 일정의 days는 [{ places: [...] }] 형태로 저장합니다.
  function tripDays(trip) {
    return Array.isArray(trip.days) ? trip.days : [];
  }
  function tripPlaceCount(trip) {
    return tripDays(trip).reduce((sum, day) => sum + (Array.isArray(day && day.places) ? day.places.length : 0), 0);
  }

  // 삭제된 마커를 다른 사람의 관심 장소와 일정에서도 제거합니다.
  function removeMarkerReferences(markerIds) {
    if (markerIds.length === 0) return;
    const ids = new Set(markerIds);
    writeList(KEYS.favorites, readList(KEYS.favorites).filter((item) => !(item && item.place && ids.has(item.place.id))));
    writeList(KEYS.trips, readList(KEYS.trips).map(function (trip) {
      if (!trip || !Array.isArray(trip.days)) return trip;
      return Object.assign({}, trip, {
        days: trip.days.map((day) => day && Array.isArray(day.places)
          ? Object.assign({}, day, { places: day.places.filter((place) => !(place && ids.has(place.id))) })
          : day),
      });
    }));
  }

  function initMyPage() {
    const errorBox = document.getElementById("mypage-error");
    const headAction = document.getElementById("head-action");
    const profileName = document.getElementById("profile-name");
    const profileMeta = document.getElementById("profile-meta");
    const profileBadge = document.getElementById("profile-badge");
    const profileLogin = document.getElementById("profile-login");
    const profileLogout = document.getElementById("profile-logout");
    const tabs = Array.from(document.querySelectorAll(".mypage-tab"));
    const panel = document.getElementById("mypage-panel");
    const panelTitle = document.getElementById("panel-title");
    const panelBadge = document.getElementById("panel-badge");
    const list = document.getElementById("item-list");
    const empty = document.getElementById("item-empty");
    const emptyText = document.getElementById("empty-text");
    const emptyLink = document.getElementById("empty-link");
    const accountInfo = document.getElementById("account-info");
    const itemTemplate = document.getElementById("item-template");

    const withdrawDialog = document.getElementById("withdraw-dialog");
    const withdrawForm = document.getElementById("withdraw-form");
    const withdrawConfirm = document.getElementById("withdraw-confirm");
    const withdrawPassword = document.getElementById("withdraw-password");
    const withdrawError = document.getElementById("withdraw-error");
    const withdrawSubmit = document.getElementById("withdraw-submit");

    // mypage.html?tab=posts 처럼 처음 열 탭을 지정할 수 있습니다.
    const requestedTab = (/[?&]tab=([a-z]+)/.exec(window.location.search) || [])[1];
    let activeTab = TABS[requestedTab] ? requestedTab : "favorites";
    const photoUrls = [];
    let withdrawBusy = false;

    // 현재 사용자에게 속한 데이터만 모읍니다. 손상된 저장소는 오류로 안내합니다.
    function userData(user) {
      const email = user.email;
      return {
        favorites: readList(KEYS.favorites).filter((item) => item && item.userEmail === email && item.place),
        markers: readList(KEYS.markers).filter((marker) => marker && marker.ownerEmail === email),
        trips: readList(KEYS.trips).filter((trip) => trip && trip.ownerEmail === email),
        posts: readList(KEYS.posts).filter((post) => post && post.ownerEmail === email),
      };
    }

    function itemsFor(tab, data) {
      if (tab === "favorites") {
        return data.favorites.map((item) => ({
          icon: item.place.category, name: item.place.name,
          meta: placeLabel(item.place.category) + " · " + (item.place.sample ? "예시 장소" : "사용자 등록"),
          actions: [{ label: "해제", onClick: () => removeFavorite(item.place.id) }],
        }));
      }
      if (tab === "markers") {
        return data.markers.map((marker) => ({
          icon: marker.category, name: marker.name,
          meta: [placeLabel(marker.category), marker.visibility === "private" ? "비공개" : "공개", formatDate(marker.createdAt)]
            .filter(Boolean).join(" · "),
          actions: [{ label: "삭제", danger: true, onClick: () => removeMarker(marker) }],
        }));
      }
      if (tab === "posts") {
        return data.posts.slice()
          .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
          .map(function (post) {
            const id = encodeURIComponent(post.id);
            const photos = postImageIds(post);
            const edited = post.updatedAt && post.updatedAt !== post.createdAt ? " (수정됨)" : "";
            return {
              icon: "post", name: post.title, photoId: photos[0],
              href: "community.html?post=" + id,
              meta: [POST_CATEGORIES[post.category] || "게시글", formatDate(post.createdAt) + edited,
                photos.length ? "사진 " + photos.length + "장" : ""].filter(Boolean).join(" · "),
              actions: [
                { label: "수정", href: "community.html?edit=" + id + "&from=mypage" },
                { label: "삭제", danger: true, onClick: () => removePost(post) },
              ],
            };
          });
      }
      return data.trips.map((trip) => ({
        icon: "trip", name: trip.name || "이름 없는 여행",
        meta: [trip.start && trip.end ? trip.start.replaceAll("-", ".") + " ~ " + trip.end.replaceAll("-", ".") : "",
          "장소 " + tripPlaceCount(trip) + "곳"].filter(Boolean).join(" · "),
        actions: [{ label: "삭제", danger: true, onClick: () => removeTrip(trip) }],
      }));
    }

    // 글에 사진이 있으면 아이콘 자리에 카드용 썸네일을 보여줍니다.
    function showPhoto(iconBox, photoId) {
      images.get(photoId).then(function (record) {
        if (!record || !iconBox.isConnected) return;
        const url = URL.createObjectURL(record.thumb);
        photoUrls.push(url);
        const photo = document.createElement("img");
        photo.alt = "";
        photo.src = url;
        iconBox.classList.add("has-photo");
        iconBox.replaceChildren(photo);
      }).catch(() => {});
    }

    function renderItems(items) {
      photoUrls.splice(0).forEach((url) => URL.revokeObjectURL(url));
      list.replaceChildren();
      list.classList.toggle("single-column", activeTab === "posts");
      items.forEach(function (item) {
        const node = itemTemplate.content.firstElementChild.cloneNode(true);
        const icon = ICONS.includes(item.icon) ? item.icon : "point";
        node.classList.add("type-" + icon);
        node.querySelector("use").setAttribute("href", "#icon-" + icon);
        if (item.photoId) showPhoto(node.querySelector(".item-icon"), item.photoId);

        const name = node.querySelector(".item-name");
        if (item.href) {
          const link = document.createElement("a");
          link.href = item.href;
          link.textContent = item.name;
          name.append(link);
        } else {
          name.textContent = item.name;
        }
        node.querySelector(".item-meta").textContent = item.meta;

        const actions = node.querySelector(".item-actions");
        (item.actions || []).forEach(function (action) {
          const control = document.createElement(action.href ? "a" : "button");
          control.className = "item-action" + (action.danger ? " danger" : "");
          control.textContent = action.label;
          control.setAttribute("aria-label", item.name + " " + action.label);
          if (action.href) {
            control.href = action.href;
          } else {
            control.type = "button";
            control.addEventListener("click", action.onClick);
          }
          actions.append(control);
        });
        list.append(node);
      });
    }

    function showEmpty(text, href, label) {
      emptyText.textContent = text;
      emptyLink.href = href;
      emptyLink.textContent = label;
      empty.hidden = false;
    }

    function render() {
      const user = getCurrentUser();
      const tab = TABS[activeTab];
      let data = null;
      errorBox.hidden = true;
      if (user) {
        try {
          data = userData(user);
        } catch (error) {
          errorBox.textContent = error.message;
          errorBox.hidden = false;
        }
      }

      // 프로필과 상단 버튼
      profileName.textContent = user ? user.name : "여행하는 꾸니";
      profileMeta.textContent = user ? user.email : "로그인 전 미리보기";
      profileBadge.textContent = user ? "낚시꾸니 회원" : "마이페이지 시안";
      profileLogin.hidden = Boolean(user);
      profileLogout.hidden = !user;
      headAction.textContent = user ? "지도에서 장소 찾기" : "로그인하고 저장하기";
      headAction.href = user ? "map.html" : "login.html?next=mypage.html";

      // 통계
      ["favorites", "markers", "trips", "posts"].forEach(function (key) {
        document.getElementById("stat-" + key).textContent = data ? data[key].length : "—";
      });

      // 탭
      tabs.forEach(function (button) {
        const selected = button.dataset.tab === activeTab;
        button.setAttribute("aria-selected", String(selected));
        button.tabIndex = selected ? 0 : -1;
      });
      panel.setAttribute("aria-labelledby", "tab-" + activeTab);
      panelTitle.textContent = tab.title;
      renderItems([]);
      empty.hidden = true;
      accountInfo.hidden = true;

      if (activeTab === "account") {
        panelBadge.textContent = user ? "내 계정" : "미리보기";
        if (!user) {
          showEmpty("로그인하면 계정 정보를 확인하고 관리할 수 있어요.", "login.html?next=mypage.html", "로그인하기");
          return;
        }
        let createdAt = "";
        try {
          const member = readList(KEYS.users).find((item) => item && item.email === user.email);
          createdAt = member ? formatDate(member.createdAt) : "";
        } catch (error) {
          // 가입일만 표시하지 않습니다.
        }
        document.getElementById("account-name").textContent = user.name;
        document.getElementById("account-email").textContent = user.email;
        document.getElementById("account-created").textContent = createdAt || "확인할 수 없음";
        document.getElementById("account-posts").textContent = data ? data.posts.length + "개" : "—";
        accountInfo.hidden = false;
        return;
      }

      if (!user) {
        panelBadge.textContent = "미리보기";
        renderItems(PREVIEW[activeTab]);
        return;
      }

      const items = data ? itemsFor(activeTab, data) : [];
      panelBadge.textContent = items.length + "개";
      if (items.length === 0) {
        showEmpty(tab.empty, tab.link[0], tab.link[1]);
        return;
      }
      renderItems(items);
    }

    function selectTab(name, focus) {
      if (!TABS[name]) return;
      activeTab = name;
      render();
      if (focus) document.getElementById("tab-" + name).focus();
    }

    // ---------- 항목 삭제 ----------
    function guard(action) {
      try {
        action();
      } catch (error) {
        alert(error.message);
      }
      render();
    }

    function removeFavorite(placeId) {
      const user = getCurrentUser();
      if (!user) return;
      guard(() => writeList(KEYS.favorites, readList(KEYS.favorites)
        .filter((item) => !(item && item.userEmail === user.email && item.place && item.place.id === placeId))));
    }

    function removeMarker(marker) {
      const user = getCurrentUser();
      if (!user || marker.ownerEmail !== user.email) return;
      if (!window.confirm("'" + marker.name + "' 장소를 삭제할까요? 관심 장소와 여행 일정에서도 함께 제거됩니다.")) return;
      guard(function () {
        writeList(KEYS.markers, readList(KEYS.markers).filter((item) => !(item && item.id === marker.id)));
        removeMarkerReferences([marker.id]);
      });
    }

    function removeTrip(trip) {
      const user = getCurrentUser();
      if (!user || trip.ownerEmail !== user.email) return;
      if (!window.confirm("'" + (trip.name || "이름 없는 여행") + "' 여행을 삭제할까요?")) return;
      guard(() => writeList(KEYS.trips, readList(KEYS.trips).filter((item) => !(item && item.id === trip.id))));
    }

    function removePost(post) {
      const user = getCurrentUser();
      if (!user || post.ownerEmail !== user.email) return;
      if (!window.confirm("'" + post.title + "' 글을 삭제할까요? 삭제한 글은 되돌릴 수 없습니다.")) return;
      guard(function () {
        writeList(KEYS.posts, readList(KEYS.posts).filter((item) => !(item && item.id === post.id)));
        images.remove(postImageIds(post)).catch(() => {}); // 사진 정리는 실패해도 글 삭제는 유지합니다.
      });
    }

    // ---------- 이벤트 ----------
    tabs.forEach(function (button, index) {
      button.addEventListener("click", () => selectTab(button.dataset.tab));
      button.addEventListener("keydown", function (event) {
        const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
        if (!step) return;
        event.preventDefault();
        selectTab(tabs[(index + step + tabs.length) % tabs.length].dataset.tab, true);
      });
    });
    document.querySelectorAll(".stat-card").forEach((card) => {
      card.addEventListener("click", () => selectTab(card.dataset.tab));
    });

    profileLogout.addEventListener("click", function () {
      if (!window.confirm("로그아웃할까요?")) return;
      logout();
      window.location.href = "index.html";
    });

    // ---------- 회원 탈퇴 ----------
    document.getElementById("withdraw-open").addEventListener("click", function () {
      const user = getCurrentUser();
      if (!user) {
        if (window.confirm("회원 탈퇴는 로그인 후 이용할 수 있습니다. 로그인 화면으로 이동할까요?")) {
          window.location.href = "login.html?next=mypage.html";
        }
        return;
      }
      let data;
      try {
        data = userData(user);
      } catch (error) {
        alert(error.message);
        return;
      }
      document.getElementById("scope-email").textContent = user.email;
      ["markers", "favorites", "trips", "posts"].forEach(function (key) {
        document.getElementById("scope-" + key).textContent = data[key].length;
      });
      withdrawForm.reset();
      withdrawError.hidden = true;
      withdrawDialog.showModal();
      withdrawConfirm.focus();
    });

    function closeWithdraw() {
      if (!withdrawBusy) withdrawDialog.close();
    }
    document.getElementById("withdraw-close").addEventListener("click", closeWithdraw);
    document.getElementById("withdraw-cancel").addEventListener("click", closeWithdraw);
    withdrawDialog.addEventListener("cancel", function (event) {
      if (withdrawBusy) event.preventDefault();
    });

    function showWithdrawError(message) {
      withdrawError.textContent = message;
      withdrawError.hidden = false;
    }

    withdrawForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      if (withdrawBusy) return;
      const user = getCurrentUser();
      if (!user) {
        withdrawDialog.close();
        render();
        return;
      }
      if (withdrawConfirm.value.trim() !== "탈퇴") {
        showWithdrawError("확인 문구로 '탈퇴'를 정확히 입력해주세요.");
        withdrawConfirm.focus();
        return;
      }
      if (!withdrawPassword.value) {
        showWithdrawError("현재 비밀번호를 입력해주세요.");
        withdrawPassword.focus();
        return;
      }

      withdrawBusy = true;
      withdrawSubmit.disabled = true;
      withdrawSubmit.textContent = "확인 중...";
      try {
        const member = readList(KEYS.users).find((item) => item && item.email === user.email);
        if (!member) throw new Error("저장된 계정 정보를 찾을 수 없습니다.");
        if (!await verifyPassword(member, withdrawPassword.value)) {
          throw new Error("비밀번호가 일치하지 않습니다.");
        }

        // 소유 데이터 → 계정 순서로 지웁니다.
        const markerIds = readList(KEYS.markers)
          .filter((marker) => marker && marker.ownerEmail === user.email)
          .map((marker) => marker.id);
        writeList(KEYS.markers, readList(KEYS.markers).filter((marker) => !(marker && marker.ownerEmail === user.email)));
        removeMarkerReferences(markerIds);
        writeList(KEYS.favorites, readList(KEYS.favorites).filter((item) => !(item && item.userEmail === user.email)));
        writeList(KEYS.trips, readList(KEYS.trips).filter((trip) => !(trip && trip.ownerEmail === user.email)));
        const postImageIds = readList(KEYS.posts)
          .filter((post) => post && post.ownerEmail === user.email && Array.isArray(post.images))
          .flatMap((post) => post.images.map((image) => image && image.id).filter(Boolean));
        writeList(KEYS.posts, readList(KEYS.posts).filter((post) => !(post && post.ownerEmail === user.email)));
        writeList(KEYS.users, readList(KEYS.users).filter((item) => !(item && item.email === user.email)));
        logout();
        await images.remove(postImageIds).catch(() => {}); // 게시글 사진(IndexedDB)도 함께 지웁니다.
      } catch (error) {
        showWithdrawError(error.message);
        withdrawBusy = false;
        withdrawSubmit.disabled = false;
        withdrawSubmit.textContent = "탈퇴하기";
        return;
      }

      alert("탈퇴가 완료되었습니다. 그동안 낚시꾸니를 이용해주셔서 감사합니다.");
      window.location.href = "index.html";
    });

    render();
  }

  initMyPage();
})();
