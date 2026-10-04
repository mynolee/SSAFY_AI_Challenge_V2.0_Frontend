// mypage.html의 내 정보, 저장 목록, 내가 쓴 글, 회원정보 수정, 로그아웃, 회원 탈퇴를 담당합니다.
(function () {
  const {
    KEYS, getCurrentUser, setCurrentUser, logout, readList, writeList, formatDate,
    verifyPassword, createPasswordRecord, renderHeaderUser, images,
  } = window.Kkuni;

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
    const accountEditRow = document.getElementById("account-edit-row");
    const itemTemplate = document.getElementById("item-template");

    const tripDialog = document.getElementById("trip-detail-dialog");
    const tripForm = document.getElementById("trip-detail-form");
    const tripMemo = document.getElementById("trip-detail-memo");
    const tripError = document.getElementById("trip-detail-error");
    const tripSaveStatus = document.getElementById("trip-detail-save-status");
    const tripDaysBox = document.getElementById("trip-detail-days");
    const tripMapBox = document.getElementById("trip-detail-map");
    const tripMapStatus = document.getElementById("trip-detail-map-status");
    const tripMapRetry = document.getElementById("trip-map-retry");
    let selectedTripId = null;
    let mapGeneration = 0;
    let detailMapObjects = [];
    let detailPlaces = [];

    const withdrawDialog = document.getElementById("withdraw-dialog");
    const withdrawForm = document.getElementById("withdraw-form");
    const withdrawConfirm = document.getElementById("withdraw-confirm");
    const withdrawPassword = document.getElementById("withdraw-password");
    const withdrawError = document.getElementById("withdraw-error");
    const withdrawSubmit = document.getElementById("withdraw-submit");

    const profileDialog = document.getElementById("profile-dialog");
    const profileForm = document.getElementById("profile-form");
    const profileNameInput = document.getElementById("profile-name-input");
    const profileNewPassword = document.getElementById("profile-new-password");
    const profileNewPasswordConfirm = document.getElementById("profile-new-password-confirm");
    const profileCurrentPassword = document.getElementById("profile-current-password");
    const profileError = document.getElementById("profile-error");
    const profileSubmit = document.getElementById("profile-submit");
    let profileBusy = false;

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
        href: "mypage.html?tab=trips&trip=" + encodeURIComponent(trip.id),
        meta: [trip.start && trip.end ? trip.start.replaceAll("-", ".") + " ~ " + trip.end.replaceAll("-", ".") : "",
          "장소 " + tripPlaceCount(trip) + "곳"].filter(Boolean).join(" · "),
        actions: [
          { label: "상세·메모", onClick: () => openTrip(trip.id) },
          { label: "삭제", danger: true, onClick: () => removeTrip(trip) },
        ],
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
      accountEditRow.hidden = true;

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
        accountEditRow.hidden = false;
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

    // ---------- 저장한 여행 상세·메모 ----------
    function node(tag, className, text) {
      const element = document.createElement(tag);
      if (className) element.className = className;
      if (text !== undefined) element.textContent = text;
      return element;
    }
    function text(value, fallback = "") { return typeof value === "string" ? value : fallback; }
    function ownedTrip(id) {
      const user = getCurrentUser();
      if (!user) throw new Error("저장한 여행 상세는 로그인 후 확인할 수 있어요.");
      const trip = readList(KEYS.trips).find((item) => item && String(item.id) === String(id) && item.ownerEmail === user.email);
      if (!trip) throw new Error("저장한 여행을 찾을 수 없습니다. 내 계정의 여행만 열 수 있어요.");
      return trip;
    }
    function noteKey(place, dayIndex, placeIndex) {
      return place && typeof place.id === "string" && place.id ? place.id : "legacy:" + dayIndex + ":" + placeIndex;
    }
    function location(place) {
      if (!place || place.lat === null || place.lng === null || place.lat === "" || place.lng === "") return null;
      const lat = Number(place.lat);
      const lng = Number(place.lng);
      return Number.isFinite(lat) && Number.isFinite(lng) && lat >= 32 && lat <= 40 && lng >= 124 && lng <= 133 ? { lat, lng } : null;
    }
    function placeLink(place) {
      try {
        const url = new URL(text(place.url));
        if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.port || !["place.map.kakao.com", "map.kakao.com", "maps.kakao.com"].includes(url.hostname)) return null;
        url.protocol = "https:";
        return url.toString();
      } catch { return null; }
    }
    function tripPlaceLabel(category) {
      return category === "origin" ? "출발지" : category === "destination" ? "낚시·도착지" : placeLabel(category);
    }
    function tripMarkerType(category) {
      return ["lodging", "restaurant", "store", "point"].includes(category) ? category : category === "destination" ? "point" : "trip";
    }
    function updateTripUrl(id) {
      const url = new URL(window.location.href);
      if (id !== null) { url.searchParams.set("tab", "trips"); url.searchParams.set("trip", id); }
      else url.searchParams.delete("trip");
      window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    }
    function clearTripMap() {
      mapGeneration += 1;
      detailMapObjects.forEach((object) => object.setMap(null));
      detailMapObjects = [];
      tripMapBox.replaceChildren();
    }
    function closeTrip() {
      if (tripDialog.open) tripDialog.close();
    }
    function showTripError(message) {
      tripError.textContent = message;
      tripError.hidden = false;
      tripSaveStatus.textContent = "";
    }
    function renderTripPlaces(trip) {
      tripDaysBox.replaceChildren();
      detailPlaces = [];
      const notes = trip.placeNotes && typeof trip.placeNotes === "object" && !Array.isArray(trip.placeNotes) ? trip.placeNotes : {};
      const days = tripDays(trip);
      if (!days.length) tripDaysBox.append(node("p", "trip-note-help", "이 여행에는 저장된 날짜별 장소가 없어요. 전체 메모를 남길 수 있습니다."));
      days.forEach((day, dayIndex) => {
        const section = node("section", "trip-detail-day");
        const date = day && text(day.date);
        section.append(node("h3", "trip-day-title", `${dayIndex + 1}일차${date ? " · " + date : ""}`));
        const places = day && Array.isArray(day.places) ? day.places : [];
        if (!places.length) section.append(node("p", "trip-note-help", "이 날짜에 저장된 장소가 없습니다."));
        const cards = node("div", "trip-place-grid");
        places.forEach((place, placeIndex) => {
          if (!place || typeof place !== "object") return;
          const key = noteKey(place, dayIndex, placeIndex);
          const inputId = "trip-place-note-" + dayIndex + "-" + placeIndex;
          const card = node("article", "trip-place-card");
          card.id = "trip-place-" + dayIndex + "-" + placeIndex;
          card.tabIndex = -1;
          const category = text(place.category);
          const name = text(place.name, "이름 없는 장소");
          const head = node("div", "trip-place-head");
          const icon = node("img", "trip-place-icon");
          const imageType = tripMarkerType(category);
          icon.src = "img/icons/marker-" + imageType + ".svg";
          icon.alt = "";
          const heading = node("div", "trip-place-heading");
          heading.append(node("span", "trip-place-category", tripPlaceLabel(category)), node("h4", "", `${placeIndex + 1}. ${name}`));
          head.append(icon, heading);
          card.append(head);
          if (typeof place.address === "string" && place.address) card.append(node("p", "trip-place-address", place.address));
          const point = location(place);
          if (point) card.append(node("p", "trip-place-coordinates", `위도 ${point.lat.toFixed(5)} · 경도 ${point.lng.toFixed(5)}`));
          const url = placeLink(place);
          if (url) {
            const link = node("a", "trip-place-link", "카카오맵에서 장소 보기 ↗");
            link.href = url;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            card.append(link);
          }
          const field = node("div", "form-field trip-place-note-field");
          const label = node("label", "", "장소 메모");
          label.htmlFor = inputId;
          const input = node("textarea", "trip-place-note");
          input.id = inputId;
          input.dataset.noteKey = key;
          input.maxLength = 2000;
          input.rows = 3;
          input.placeholder = "예약, 준비물, 방문 후 느낀 점을 적어보세요. (최대 2,000자)";
          input.value = Object.hasOwn(notes, key) ? text(notes[key]) : "";
          field.append(label, input);
          card.append(field);
          cards.append(card);
          detailPlaces.push({ place, point, card, key });
        });
        section.append(cards);
        tripDaysBox.append(section);
      });
    }
    async function loadTripMap() {
      clearTripMap();
      const generation = mapGeneration;
      const id = selectedTripId;
      const points = detailPlaces.filter((entry) => entry.point);
      tripMapRetry.hidden = true;
      if (!points.length) {
        tripMapStatus.textContent = "이 여행에는 지도에 표시할 좌표가 저장되어 있지 않습니다.";
        tripMapBox.hidden = true;
        return;
      }
      tripMapBox.hidden = false;
      tripMapStatus.textContent = "저장한 장소의 지도를 불러오는 중이에요.";
      try {
        const maps = await window.Kkuni.loadKakaoMaps();
        if (generation !== mapGeneration || !tripDialog.open || selectedTripId !== id) return;
        ownedTrip(id);
        const map = new maps.Map(tripMapBox, { center: new maps.LatLng(points[0].point.lat, points[0].point.lng), level: 6 });
        const bounds = new maps.LatLngBounds();
        const seen = new Set();
        points.forEach(({ place, point, card }) => {
          const position = new maps.LatLng(point.lat, point.lng);
          bounds.extend(position);
          const positionKey = point.lat + ":" + point.lng + ":" + text(place.category);
          if (seen.has(positionKey)) return;
          seen.add(positionKey);
          const category = tripMarkerType(place.category);
          const image = new maps.MarkerImage("img/icons/marker-" + category + ".svg", new maps.Size(44, 56), { offset: new maps.Point(22, 53) });
          const marker = new maps.Marker({ map, position, image, title: text(place.name, "여행 장소") });
          detailMapObjects.push(marker);
          maps.event.addListener(marker, "click", () => {
            card.scrollIntoView({ behavior: "smooth", block: "nearest" });
            card.focus({ preventScroll: true });
          });
        });
        if (seen.size > 1) map.setBounds(bounds, 48, 48, 48, 48);
        tripMapStatus.textContent = `저장된 장소 ${seen.size}곳을 표시했어요. 지도를 이동하거나 확대할 수 있습니다.`;
      } catch (error) {
        if (generation !== mapGeneration || selectedTripId !== id) return;
        tripMapStatus.textContent = error.message || "지도를 불러오지 못했습니다. 장소와 메모는 계속 확인할 수 있어요.";
        tripMapRetry.hidden = false;
      }
    }
    function openTrip(id) {
      try {
        const trip = ownedTrip(id);
        selectedTripId = String(trip.id);
        activeTab = "trips";
        render();
        updateTripUrl(selectedTripId);
        document.getElementById("trip-detail-title").textContent = text(trip.name, "이름 없는 여행");
        document.getElementById("trip-detail-meta").textContent = [trip.start && trip.end ? text(trip.start) + " ~ " + text(trip.end) : "날짜 미지정", `${tripDays(trip).length}일 · 장소 ${tripPlaceCount(trip)}곳`].join(" · ");
        const summary = document.getElementById("trip-detail-summary");
        summary.textContent = text(trip.summary);
        summary.hidden = !summary.textContent;
        const route = document.getElementById("trip-detail-route");
        route.replaceChildren();
        for (const [label, place] of [["출발", trip.origin], ["도착", trip.destination]]) {
          if (place && typeof place.name === "string") route.append(node("span", "", `${label} · ${place.name}`));
        }
        route.hidden = !route.children.length;
        tripMemo.value = text(trip.memo);
        tripError.hidden = true;
        tripSaveStatus.textContent = "";
        renderTripPlaces(trip);
        const tipsBox = document.getElementById("trip-detail-tips");
        const tipList = document.getElementById("trip-detail-tip-list");
        tipList.replaceChildren();
        (Array.isArray(trip.tips) ? trip.tips : []).filter((tip) => typeof tip === "string" && tip).forEach((tip) => tipList.append(node("li", "", tip)));
        tipsBox.hidden = !tipList.children.length;
        if (!tripDialog.open) tripDialog.showModal();
        loadTripMap();
      } catch (error) {
        errorBox.textContent = error.message;
        errorBox.hidden = false;
        updateTripUrl(null);
      }
    }
    document.getElementById("trip-detail-close").addEventListener("click", closeTrip);
    tripDialog.addEventListener("close", () => {
      selectedTripId = null;
      clearTripMap();
      detailPlaces = [];
      tripMemo.value = "";
      tripDaysBox.replaceChildren();
      updateTripUrl(null);
    });
    tripMapRetry.addEventListener("click", loadTripMap);
    tripForm.addEventListener("input", (event) => {
      tripSaveStatus.textContent = "변경한 메모가 아직 저장되지 않았어요.";
      if (event.target.classList.contains("trip-place-note")) {
        // The same place on multiple days shares one memo; keep all its editors in sync.
        tripDaysBox.querySelectorAll(".trip-place-note").forEach((input) => {
          if (input !== event.target && input.dataset.noteKey === event.target.dataset.noteKey) input.value = event.target.value;
        });
      }
    });
    tripForm.addEventListener("submit", (event) => {
      event.preventDefault();
      tripError.hidden = true;
      try {
        if (!selectedTripId) throw new Error("저장할 여행을 먼저 선택해주세요.");
        const trip = ownedTrip(selectedTripId);
        if (tripMemo.value.length > 10000) throw new Error("여행 전체 메모는 10,000자까지 저장할 수 있어요.");
        const notes = Object.assign(Object.create(null), trip.placeNotes && typeof trip.placeNotes === "object" && !Array.isArray(trip.placeNotes) ? trip.placeNotes : {});
        tripDaysBox.querySelectorAll(".trip-place-note").forEach((input) => {
          if (input.value.length > 2000) throw new Error("장소별 메모는 2,000자까지 저장할 수 있어요.");
          notes[input.dataset.noteKey] = input.value;
        });
        const list = readList(KEYS.trips);
        const index = list.findIndex((item) => item && String(item.id) === selectedTripId && item.ownerEmail === getCurrentUser()?.email);
        if (index < 0) throw new Error("여행이 삭제되었거나 계정이 변경되었습니다. 다시 열어주세요.");
        list[index] = Object.assign({}, list[index], { memo: tripMemo.value, placeNotes: notes, updatedAt: new Date().toISOString() });
        writeList(KEYS.trips, list);
        render();
        tripSaveStatus.textContent = "여행 메모와 장소별 메모를 저장했어요.";
      } catch (error) { showTripError(error.message); }
    });
    window.addEventListener("storage", (event) => {
      if (event.key !== KEYS.trips && event.key !== null) return;
      if (selectedTripId) {
        try { ownedTrip(selectedTripId); }
        catch { closeTrip(); }
      }
      render();
    });

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
      guard(function () {
        writeList(KEYS.trips, readList(KEYS.trips).filter((item) => !(item && item.id === trip.id && item.ownerEmail === user.email)));
        if (selectedTripId === String(trip.id)) closeTrip();
      });
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

    // ---------- 회원정보 수정 ----------
    document.getElementById("profile-edit-open").addEventListener("click", function () {
      const user = getCurrentUser();
      if (!user) {
        render();
        return;
      }
      profileForm.reset();
      profileError.hidden = true;
      document.getElementById("profile-email").textContent = user.email;
      profileNameInput.value = user.name;
      profileDialog.showModal();
      profileNameInput.focus();
    });

    function closeProfile() {
      if (!profileBusy) profileDialog.close();
    }
    document.getElementById("profile-close").addEventListener("click", closeProfile);
    document.getElementById("profile-cancel").addEventListener("click", closeProfile);
    profileDialog.addEventListener("cancel", function (event) {
      if (profileBusy) event.preventDefault();
    });

    function showProfileError(message, field) {
      profileError.textContent = message;
      profileError.hidden = false;
      if (field) field.focus();
    }

    profileForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      if (profileBusy) return;
      const user = getCurrentUser();
      if (!user) {
        profileDialog.close();
        render();
        return;
      }
      const name = profileNameInput.value.trim();
      const newPassword = profileNewPassword.value;
      if (!name) return showProfileError("닉네임을 입력해주세요.", profileNameInput);
      if (name.length > 20) return showProfileError("닉네임은 20자까지 입력할 수 있어요.", profileNameInput);
      if (newPassword && newPassword.length < 8) return showProfileError("새 비밀번호는 8자 이상 입력해주세요.", profileNewPassword);
      if (newPassword !== profileNewPasswordConfirm.value) return showProfileError("새 비밀번호가 일치하지 않습니다.", profileNewPasswordConfirm);
      if (name === user.name && !newPassword) return showProfileError("변경할 닉네임이나 새 비밀번호를 입력해주세요.", profileNameInput);
      if (!profileCurrentPassword.value) return showProfileError("현재 비밀번호를 입력해주세요.", profileCurrentPassword);

      profileBusy = true;
      profileSubmit.disabled = true;
      profileSubmit.textContent = "확인 중...";
      try {
        const member = readList(KEYS.users).find((item) => item && item.email === user.email);
        if (!member) throw new Error("저장된 계정 정보를 찾을 수 없습니다.");
        if (!await verifyPassword(member, profileCurrentPassword.value)) {
          throw new Error("현재 비밀번호가 일치하지 않습니다.");
        }
        const changes = { name, updatedAt: new Date().toISOString() };
        if (newPassword) Object.assign(changes, await createPasswordRecord(newPassword));

        // 해시를 만드는 동안 계정이 바뀌었을 수 있어 최신 목록을 다시 읽습니다.
        const users = readList(KEYS.users);
        const index = users.findIndex((item) => item && item.email === user.email);
        if (index < 0) throw new Error("저장된 계정 정보를 찾을 수 없습니다.");
        users[index] = Object.assign({}, users[index], changes);
        writeList(KEYS.users, users);
        // 내가 쓴 글의 작성자 이름도 새 닉네임으로 맞춥니다.
        if (name !== user.name) {
          writeList(KEYS.posts, readList(KEYS.posts).map((post) =>
            post && post.ownerEmail === user.email ? Object.assign({}, post, { author: name }) : post));
        }
        setCurrentUser({ name, email: user.email });
      } catch (error) {
        showProfileError(error.message);
        return;
      } finally {
        profileBusy = false;
        profileSubmit.disabled = false;
        profileSubmit.textContent = "저장하기";
      }

      profileDialog.close();
      renderHeaderUser();
      render();
      alert(newPassword ? "닉네임과 비밀번호를 저장했습니다." : "닉네임을 저장했습니다.");
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
    const requestedTrip = new URLSearchParams(window.location.search).get("trip");
    if (requestedTrip) openTrip(requestedTrip);
  }

  initMyPage();
})();
