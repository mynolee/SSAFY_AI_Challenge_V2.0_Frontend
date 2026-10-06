// 지도 탐색: 실제 카카오 장소 검색/마커와 브라우저에 저장한 내 장소를 함께 표시합니다.
(function () {
  "use strict";

  const K = window.Kkuni;
  const CATEGORY = {
    point: { label: "낚시 포인트", keyword: "낚시터", icon: "point" },
    store: { label: "낚시용품점", keyword: "낚시용품", icon: "store" },
    attraction: { label: "주변 명소", code: "AT4", icon: "trip" },
    restaurant: { label: "음식점", code: "FD6", icon: "restaurant" },
    lodging: { label: "숙박", code: "AD5", icon: "lodging" },
  };
  const ICONS = { point: "../img/icons/marker-point.svg", store: "../img/icons/marker-store.svg", trip: "../img/icons/marker-trip.svg", lodging: "../img/icons/marker-lodging.svg", restaurant: "../img/icons/marker-restaurant.svg" };
  const byId = (id) => document.getElementById(id);
  const controls = ["add-marker", "add-marker-coordinates", "map-recenter", "map-refresh", "marine-refresh"];
  const filters = Array.from(document.querySelectorAll('input[name="map-category"]'));
  const states = Object.fromEntries(Object.keys(CATEGORY).map((key) => [key, { places: [], markers: [], pagination: null, loading: false, error: "", generation: 0 }]));
  let maps, map, infoWindow, selectedRegion;
  let initializing = false, adding = false, selectedPlace = null, searchTimer = null;
  let customPlaces = [], customMarkers = [], marineController = null, marineSequence = 0, storageError = "";
  let marineLocation = null, marineBaseStatus = "";
  const temporaryPlaces = [];
  const photoResults = new Map();
  let photoRequest = 0;

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }
  function enabled(category) {
    return filters.some((input) => input.value === category && input.checked);
  }
  function validCoordinates(place) {
    const numeric = (value) => (typeof value === "number" || (typeof value === "string" && value.trim() !== "")) && Number.isFinite(Number(value));
    return numeric(place.lat) && numeric(place.lng) && Math.abs(Number(place.lat)) <= 90 && Math.abs(Number(place.lng)) <= 180;
  }
  function matchesFishingCategory(key, item) {
    if (key !== "point" && key !== "store") return true;
    // 키워드가 상호에만 포함된 식당 등을 포인트로 표시하지 않습니다.
    const categories = String(item.category_name || "").split(">").map((name) => name.trim());
    const equipment = categories.some((name) => /낚시(?:용품|도구|장비|점)/.test(name));
    const unrelated = ["FD6", "CE7", "AD5"].includes(item.category_group_code) || categories.some((name) => /음식점|카페|숙박/.test(name));
    if (unrelated) return false;
    return key === "store" ? equipment : !equipment && categories.some((name) => /낚시/.test(name));
  }
  function iconFor(place) {
    return Object.hasOwn(ICONS, place.icon) ? place.icon : (CATEGORY[place.category]?.icon || "point");
  }
  function placeLink(place) {
    if (place.url) {
      try {
        const url = new URL(place.url);
        if (url.protocol === "https:" && url.hostname === "map.kakao.com") return url.href;
        if (url.protocol === "http:" && url.hostname === "place.map.kakao.com") return "https://place.map.kakao.com" + url.pathname;
        if (url.protocol === "https:" && url.hostname === "place.map.kakao.com") return url.href;
      } catch (error) { /* 안전한 좌표 링크를 대신 사용합니다. */ }
    }
    return "https://map.kakao.com/link/map/" + encodeURIComponent(place.name) + "," + Number(place.lat) + "," + Number(place.lng);
  }
  function externalLink(label, url, className) {
    const link = element("a", className, label);
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    return link;
  }
  function setStatus(message) { byId("map-search-status").textContent = message; }
  function closeSelection() {
    selectedPlace = null;
    byId("place-detail").hidden = true;
    if (infoWindow) infoWindow.close();
  }

  function newMarker(place) {
    const image = new maps.MarkerImage(ICONS[iconFor(place)], new maps.Size(34, 43), { offset: new maps.Point(17, 42), alt: CATEGORY[place.category]?.label || "선택 지역" });
    const marker = new maps.Marker({ map, position: new maps.LatLng(Number(place.lat), Number(place.lng)), image, title: String(place.name) });
    maps.event.addListener(marker, "click", () => {
      if (adding) openMarkerDialog(marker.getPosition());
      else selectPlace(place, marker);
    });
    return marker;
  }

  function refreshCustomMarkers() {
    customMarkers.forEach((marker) => marker.setMap(null));
    customMarkers = [];
    const user = K.getCurrentUser();
    try {
      // 비공개 장소는 소유자만 봅니다. 로그인하지 않은 마커는 이 페이지에서만 유지합니다.
      customPlaces = K.readList(K.KEYS.markers).filter((place) => place && typeof place.id === "string" && typeof place.name === "string" && place.name.trim() &&
        typeof place.ownerEmail === "string" && place.ownerEmail && (place.ownerEmail === user?.email || place.visibility === "public") &&
        Object.hasOwn(CATEGORY, place.category) && validCoordinates(place));
      storageError = "";
    } catch (error) {
      customPlaces = [];
      storageError = error.message;
    }
    customPlaces = customPlaces.concat(temporaryPlaces);
    customPlaces.filter((place) => enabled(place.category)).forEach((place) => customMarkers.push(newMarker(place)));
    renderResults();
  }

  function allCustomInBounds(category) {
    if (!map) return [];
    const bounds = map.getBounds();
    return customPlaces.filter((place) => place.category === category && bounds.contain(new maps.LatLng(Number(place.lat), Number(place.lng))));
  }

  function renderResults() {
    const container = byId("map-results");
    container.replaceChildren();
    let count = 0;
    Object.entries(CATEGORY).forEach(([key, category]) => {
      if (!enabled(key)) return;
      const state = states[key];
      const places = allCustomInBounds(key).concat(state.places);
      count += places.length;
      const group = element("section", "map-result-group");
      const heading = element("h3");
      heading.append(element("span", "filter-dot " + (category.icon === "point" ? "point-dot" : category.icon === "store" ? "store-dot" : "trip-dot")), element("span", "", category.label), element("span", "", places.length + "개"));
      group.append(heading);
      places.forEach((place) => {
        const button = element("button", "map-result-item" + (selectedPlace?.id === place.id ? " is-selected" : ""));
        button.type = "button";
        const image = element("img");
        image.src = ICONS[iconFor(place)];
        image.alt = "";
        const copy = element("span", "map-result-copy");
        copy.append(element("strong", "", place.name), element("span", "", place.address || Number(place.lat).toFixed(5) + ", " + Number(place.lng).toFixed(5)));
        copy.append(element("span", "", place.temporary ? "내 임시 마커 · 이번 방문에만 표시" : place.source === "kakao" ? "카카오맵 · " + (place.categoryName || category.label) : place.ownerEmail === K.getCurrentUser()?.email ? "내 마커 · " + (place.visibility === "public" ? "공개" : "나만 보기") : "사용자 등록 · 공개"));
        button.append(image, copy);
        button.addEventListener("click", () => {
          selectPlace(place);
          map.panTo(new maps.LatLng(Number(place.lat), Number(place.lng)));
        });
        group.append(button);
      });
      if (state.loading) group.append(element("p", "map-result-empty", "주변 장소를 불러오는 중이에요…"));
      else if (state.error) group.append(element("p", "map-result-empty", state.error));
      else if (!places.length) group.append(element("p", "map-result-empty", state.pagination?.hasNextPage ? "현재 검색 페이지에 해당 분류의 장소가 없어요. 더 보기로 다음 검색 결과를 확인하세요." : "이 지도 범위에 해당 분류의 장소가 없어요. 지도를 이동하거나 축소해 보세요."));
      if (state.pagination?.hasNextPage) {
        const more = element("button", "map-button map-button-light map-load-more", state.loading ? "불러오는 중…" : category.label + " 더 보기 (다음 15개)");
        more.type = "button";
        more.disabled = state.loading;
        more.addEventListener("click", () => {
          if (!state.pagination?.hasNextPage || state.loading) return;
          state.loading = true;
          state.error = "";
          const pagination = state.pagination;
          renderResults();
          pagination.nextPage();
        });
        group.append(more);
      }
      container.append(group);
    });
    const loading = Object.values(states).some((state) => state.loading);
    const failed = Object.entries(states).filter(([key, state]) => enabled(key) && state.error).length;
    setStatus(storageError || (loading ? "현재 지도 주변의 장소를 찾고 있어요." : failed ? "일부 장소 검색에 실패했어요. ‘이 지도에서 다시 찾기’를 눌러주세요." : count + "개의 장소를 찾았어요. 지도를 움직이면 주변 장소를 다시 찾습니다."));
  }

  function searchCategory(key) {
    const state = states[key];
    const generation = ++state.generation;
    state.markers.forEach((marker) => marker.setMap(null));
    state.markers = [];
    state.places = [];
    state.pagination = null;
    state.error = "";
    state.loading = enabled(key);
    if (!state.loading) return;
    const category = CATEGORY[key];
    // 검색마다 별도 Places 인스턴스/경계를 사용하여 오래된 페이지 응답이 새 결과를 덮지 못하게 합니다.
    const places = new maps.services.Places();
    const options = { bounds: map.getBounds(), location: map.getCenter(), size: 15 };
    const callback = (data, status, pagination) => {
      if (generation !== state.generation || !enabled(key)) return;
      state.loading = false;
      if (status === maps.services.Status.OK) {
        data.forEach((item) => {
          if (!matchesFishingCategory(key, item)) return;
          const place = {
            id: "kakao-" + item.id, category: key, name: item.place_name,
            lat: Number(item.y), lng: Number(item.x), address: item.road_address_name || item.address_name || "",
            phone: item.phone || "", url: item.place_url || "", categoryName: item.category_name || "",
            source: "kakao", icon: category.icon,
          };
          if (!validCoordinates(place) || state.places.some((existing) => existing.id === place.id)) return;
          state.places.push(place);
          state.markers.push(newMarker(place));
        });
        state.pagination = pagination;
      } else if (status === maps.services.Status.ZERO_RESULT) {
        state.pagination = null;
      } else {
        state.error = "카카오맵 장소 검색에 실패했습니다. 잠시 후 다시 찾아주세요.";
        state.pagination = null;
      }
      renderResults();
    };
    try {
      if (category.code) places.categorySearch(category.code, callback, options);
      else places.keywordSearch(category.keyword, callback, options);
    } catch (error) {
      state.loading = false;
      state.error = "장소 검색을 시작하지 못했습니다. 지도를 다시 불러와 주세요.";
    }
  }

  function refreshSearch() {
    if (!map) return;
    clearTimeout(searchTimer);
    Object.keys(CATEGORY).forEach(searchCategory);
    const center = map.getCenter();
    byId("map-center-caption").textContent = "지도 중심 " + center.getLat().toFixed(4) + ", " + center.getLng().toFixed(4) + " · 카카오맵 기준";
    updateMarineStatus();
    renderResults();
  }

  function favoriteButton(place) {
    const button = element("button", "map-button map-button-primary");
    button.type = "button";
    function refreshLabel() {
      const user = K.getCurrentUser();
      try {
        const exists = user && K.readList(K.KEYS.favorites).some((item) => item && item.userEmail === user.email && item.place?.id === place.id);
        button.textContent = exists ? "♥ 관심 장소 해제" : "♡ 관심 장소 저장";
        button.setAttribute("aria-pressed", String(Boolean(exists)));
      } catch (error) { button.textContent = "관심 장소 저장"; }
    }
    button.addEventListener("click", () => {
      const user = K.getCurrentUser();
      if (!user) { location.href = "login.html?next=map.html"; return; }
      if (place.temporary) { setStatus("임시 마커는 로그인 후 장소를 다시 등록하면 관심 장소로 저장할 수 있어요."); return; }
      try {
        const favorites = K.readList(K.KEYS.favorites);
        const exists = favorites.some((item) => item && item.userEmail === user.email && item.place?.id === place.id);
        K.writeList(K.KEYS.favorites, exists ? favorites.filter((item) => !(item && item.userEmail === user.email && item.place?.id === place.id)) : favorites.concat({ id: K.createId(), userEmail: user.email, place: { ...place }, createdAt: new Date().toISOString() }));
        refreshLabel();
        setStatus(exists ? "관심 장소에서 해제했어요." : "관심 장소에 저장했어요. 마이페이지에서 확인할 수 있어요.");
      } catch (error) { setStatus(error.message); }
    });
    refreshLabel();
    return button;
  }

  // 마커 정보창의 대표 이미지 1장: 카카오 장소는 서버에서 사진을 찾고, 없으면 장소 유형 이미지를 보여줍니다.
  // 사용자가 등록한 마커는 비공개 이름일 수 있어 외부 조회 없이 마커 이미지를 사용합니다.
  function placePhoto(place) {
    const figure = element("figure");
    const image = element("img");
    const caption = element("figcaption");
    function fallback(message) {
      figure.className = "map-info-photo is-fallback";
      image.onerror = null;
      image.src = ICONS[iconFor(place)];
      image.alt = "";
      caption.textContent = message;
    }
    figure.append(image, caption);
    if (place.source !== "kakao") {
      fallback("등록된 사진이 없어요");
      return figure;
    }
    const request = ++photoRequest;
    function show(photo) {
      if (request !== photoRequest) return;
      if (!photo) { fallback("등록된 사진이 없어요"); return; }
      figure.className = "map-info-photo";
      image.onerror = () => fallback("사진을 불러오지 못했어요");
      image.src = photo.url;
      image.alt = place.name + " 대표 이미지";
      caption.textContent = "사진 · " + photo.source;
    }
    if (photoResults.has(place.id)) {
      show(photoResults.get(place.id));
      return figure;
    }
    fallback("대표 사진을 찾는 중이에요");
    const params = new URLSearchParams({ name: place.name, lat: String(place.lat), lng: String(place.lng), address: place.address || "" });
    fetch("/api/place-photo?" + params, { signal: AbortSignal.timeout(15000) })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("photo")))
      .then((data) => {
        const photo = data.photo && /^https:\/\//.test(data.photo.url) ? { url: data.photo.url, source: String(data.photo.source || "") } : null;
        photoResults.set(place.id, photo);
        show(photo);
      })
      .catch(() => show(null)); // 실패한 조회는 저장하지 않아 다음 클릭에서 다시 찾습니다.
    return figure;
  }

  function selectPlace(place, marker) {
    selectedPlace = place;
    const detail = byId("place-detail");
    detail.replaceChildren();
    const top = element("div", "map-detail-top");
    top.append(element("span", "map-place-type", CATEGORY[place.category]?.label || "선택 지역"));
    const close = element("button", "map-icon-button", "×");
    close.type = "button";
    close.setAttribute("aria-label", "장소 상세 닫기");
    close.addEventListener("click", () => { closeSelection(); renderResults(); });
    top.append(close);
    detail.append(top, element("h3", "", place.name));
    if (place.address) detail.append(element("p", "", place.address));
    if (place.phone) detail.append(element("p", "", "연락처 " + place.phone));
    if (place.desc) detail.append(element("p", "", place.desc));
    detail.append(element("p", "map-coordinates", "위도 " + Number(place.lat).toFixed(6) + " · 경도 " + Number(place.lng).toFixed(6)));
    if (place.temporary) detail.append(element("p", "", "임시 마커예요. 페이지를 떠나면 사라집니다."));
    const actions = element("div", "map-detail-actions");
    actions.append(externalLink("카카오맵에서 보기 ↗", placeLink(place), "map-button map-button-light"));
    if (CATEGORY[place.category]) actions.append(favoriteButton(place));
    detail.append(actions);
    detail.hidden = false;
    const popup = element("div", "map-info-window");
    popup.append(placePhoto(place), element("strong", "", place.name), externalLink("카카오맵에서 보기 ↗", placeLink(place)));
    infoWindow.setContent(popup);
    infoWindow.setPosition(new maps.LatLng(Number(place.lat), Number(place.lng)));
    infoWindow.open(map, marker || null);
    renderResults();
    detail.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function setAdding(value) {
    adding = value;
    byId("add-marker").setAttribute("aria-pressed", String(value));
    byId("add-marker").textContent = value ? "위치 선택 취소" : "＋ 내 마커 만들기";
    byId("marker-mode-notice").hidden = !value;
    document.querySelector(".map-canvas-wrap").classList.toggle("is-adding", value);
    if (map?.setCursor) map.setCursor(value ? "crosshair" : "");
  }

  function openMarkerDialog(position) {
    const form = byId("marker-form");
    form.reset();
    byId("marker-form-error").hidden = true;
    byId("marker-lat").value = position.getLat().toFixed(6);
    byId("marker-lng").value = position.getLng().toFixed(6);
    const user = K.getCurrentUser();
    const notice = byId("marker-save-notice");
    notice.replaceChildren();
    if (user) {
      notice.textContent = user.name + "님의 브라우저 저장소에 보관합니다. 마이페이지의 ‘내 마커’에서 관리할 수 있어요. 공개 마커는 이 브라우저의 다른 사용자에게도 보여요.";
    } else {
      notice.append(document.createTextNode("로그인 전에는 이번 방문 동안만 표시되는 임시 마커를 만들 수 있어요. 계속 보관하려면 "));
      const login = element("a", "", "로그인");
      login.href = "login.html?next=map.html";
      notice.append(login, document.createTextNode(" 후 등록해 주세요."));
    }
    byId("marker-visibility").disabled = !user;
    byId("marker-submit").textContent = user ? "마커 저장" : "임시 마커 만들기";
    byId("marker-dialog").showModal();
    byId("marker-name").focus();
  }

  function saveMarker(event) {
    event.preventDefault();
    const user = K.getCurrentUser();
    const latInput = byId("marker-lat").value;
    const lngInput = byId("marker-lng").value;
    const place = {
      id: K.createId(), ownerEmail: user?.email || null, category: byId("marker-category").value,
      name: byId("marker-name").value.trim(), lat: Number(latInput), lng: Number(lngInput),
      address: "", desc: byId("marker-desc").value.trim(), visibility: user ? byId("marker-visibility").value : "private",
      createdAt: new Date().toISOString(), icon: byId("marker-form").elements.icon.value,
    };
    try {
      if (!place.name || place.name.length > 60 || place.desc.length > 300 || !validCoordinates({ lat: latInput, lng: lngInput }) ||
        !["point", "store"].includes(place.category) || !["private", "public"].includes(place.visibility) || !Object.hasOwn(ICONS, place.icon)) throw new Error("장소 이름(60자 이내), 메모(300자 이내), 올바른 위도·경도를 입력해 주세요.");
      if (user) K.writeList(K.KEYS.markers, K.readList(K.KEYS.markers).concat(place));
      else { place.temporary = true; temporaryPlaces.push(place); }
      const checkbox = filters.find((input) => input.value === place.category);
      if (!checkbox.checked) { checkbox.checked = true; searchCategory(place.category); }
      byId("marker-dialog").close();
      setAdding(false);
      refreshCustomMarkers();
      map.panTo(new maps.LatLng(place.lat, place.lng));
      selectPlace(place);
      setStatus(user ? "내 마커를 저장했어요. 마이페이지에서 확인할 수 있어요." : "실제 카카오 지도에 임시 마커를 만들었어요. 이번 방문에만 유지됩니다.");
    } catch (error) {
      byId("marker-form-error").textContent = error.message;
      byId("marker-form-error").hidden = false;
    }
  }

  function marineValue(value, suffix) {
    return value !== null && value !== undefined && value !== "" ? String(value) + (suffix || "") : "정보 없음";
  }
  function marineCard(title) {
    const card = element("article", "marine-card");
    card.append(element("h3", "", title));
    return card;
  }
  function marineMetric(card, label, value, suffix) {
    const line = element("p");
    line.append(document.createTextNode(label + " "), element("strong", "", marineValue(value, suffix)));
    card.append(line);
  }
  function rangeValue(range, fallback) {
    return Array.isArray(range) && range.length === 2 && range.every((value) => value !== null && value !== undefined && Number.isFinite(Number(value))) ? range.join(" ~ ") : fallback;
  }
  function updateMarineStatus() {
    if (!marineLocation || !marineBaseStatus || !map) return;
    const center = map.getCenter();
    const moved = Math.abs(center.getLat() - marineLocation.lat) > .002 || Math.abs(center.getLng() - marineLocation.lng) > .002;
    byId("marine-status").textContent = marineBaseStatus + (moved ? " 지도가 이동했습니다. 현재 지도 중심의 바다 정보는 ‘물때 다시 조회’를 눌러 확인하세요." : "");
  }

  function renderMarine(data) {
    const cards = byId("marine-cards");
    cards.replaceChildren();
    const queryLabel = marineLocation ? "조회 위치 " + marineLocation.lat.toFixed(4) + ", " + marineLocation.lng.toFixed(4) + " · " : "";
    byId("marine-station").textContent = queryLabel + (data.station ? data.station.name + " 관측소 · " + (data.station.distanceKm !== null && data.station.distanceKm !== undefined ? "조회 위치에서 약 " + marineValue(data.station.distanceKm, "km") + " · " : "") + (data.date || "") : "가까운 해양관측소 정보가 없습니다. 해안 지역에서 다시 조회해 보세요.");
    const tides = marineCard("오늘의 물때 · 조석 예보");
    if (Array.isArray(data.tides) && data.tides.length) data.tides.forEach((tide) => {
      const row = element("p");
      row.append(element("strong", "", tide.type || "조석"), document.createTextNode(" " + marineValue(tide.time) + " · " + marineValue(tide.height, "cm")));
      tides.append(row);
    });
    else tides.append(element("p", "marine-empty", "조회 가능한 조석 예보가 없습니다."));
    const observation = marineCard("관측소 최신 관측");
    if (data.observation) {
      marineMetric(observation, "조위", data.observation.tideLevel, "cm");
      marineMetric(observation, "수온", data.observation.waterTemperature, "°C");
      marineMetric(observation, "풍속", data.observation.windSpeed, "m/s");
      if (data.observation.observedAt) observation.append(element("p", "marine-empty", "관측 시각 " + data.observation.observedAt));
    } else observation.append(element("p", "marine-empty", "최신 관측 데이터가 없습니다."));
    const fishing = marineCard("바다낚시 지수");
    if (data.fishing) {
      if (data.fishing.area) fishing.append(element("p", "", data.fishing.area));
      marineMetric(fishing, "지수", data.fishing.index);
      marineMetric(fishing, "등급", data.fishing.grade);
      marineMetric(fishing, "파고", rangeValue(data.fishing.waveHeightRange, data.fishing.waveHeight), "m");
      marineMetric(fishing, "수온", rangeValue(data.fishing.waterTemperatureRange, data.fishing.waterTemperature), "°C");
      marineMetric(fishing, "풍속", rangeValue(data.fishing.windSpeedRange, data.fishing.windSpeed), "m/s");
      if (data.fishing.species) fishing.append(element("p", "marine-empty", "어종 " + data.fishing.species + (data.fishing.tide ? " · " + data.fishing.tide : "")));
      if (data.fishing.date) fishing.append(element("p", "marine-empty", "예보 " + data.fishing.date + (data.fishing.period ? " · " + data.fishing.period : "")));
      if (data.fishing.distanceKm !== null && data.fishing.distanceKm !== undefined) fishing.append(element("p", "marine-empty", "예보 지점은 조회 위치에서 약 " + data.fishing.distanceKm + "km 떨어져 있어요."));
    } else fishing.append(element("p", "marine-empty", "이 위치의 바다낚시 지수 데이터가 없습니다."));
    cards.append(tides, observation, fishing);
    const warnings = byId("marine-warnings");
    warnings.replaceChildren();
    const warningList = Array.isArray(data.warnings) ? data.warnings : [];
    warningList.forEach((warning) => warnings.append(element("li", "", warning)));
    warnings.hidden = !warningList.length;
    const sources = byId("marine-sources");
    sources.replaceChildren();
    (Array.isArray(data.sources) ? data.sources : []).forEach((source) => {
      try {
        const url = new URL(source.url);
        if (url.protocol !== "https:") return;
        sources.append(externalLink(source.name || "공공 데이터 출처", url.href));
      } catch (error) { /* 유효하지 않은 출처 주소는 링크로 표시하지 않습니다. */ }
    });
  }

  async function loadMarine(position) {
    marineController?.abort();
    const controller = new AbortController();
    marineController = controller;
    const sequence = ++marineSequence;
    marineBaseStatus = "";
    marineLocation = { lat: position.getLat(), lng: position.getLng() };
    byId("marine-refresh").disabled = true;
    byId("marine-status").textContent = "지도 중심의 공공 해양 데이터를 조회하고 있어요…";
    const timeout = setTimeout(() => controller.abort(), 40000);
    try {
      const query = new URLSearchParams({ lat: position.getLat(), lng: position.getLng() });
      const response = await fetch("/api/marine?" + query, { signal: controller.signal });
      if (!response.headers.get("content-type")?.includes("application/json")) throw new Error("공공 데이터 서버 응답을 확인할 수 없습니다. node server.cjs로 실행한 주소에서 다시 조회해 주세요.");
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "해양 데이터 조회에 실패했습니다. (HTTP " + response.status + ")");
      if (sequence !== marineSequence) return;
      renderMarine(data);
      marineBaseStatus = "국립해양조사원 공공 데이터 · 관측소/예보 위치 기준입니다.";
      updateMarineStatus();
    } catch (error) {
      if (sequence !== marineSequence) return;
      byId("marine-cards").replaceChildren();
      byId("marine-warnings").hidden = true;
      byId("marine-sources").replaceChildren();
      byId("marine-status").textContent = error.name === "AbortError" ? "해양 데이터 조회 시간이 길어졌어요. ‘물때 다시 조회’로 재시도해 주세요." : error.message;
    } finally {
      clearTimeout(timeout);
      if (sequence === marineSequence) byId("marine-refresh").disabled = !map;
    }
  }

  async function initializeMap() {
    if (initializing) return;
    initializing = true;
    byId("map-loading").hidden = false;
    byId("map-load-error").hidden = true;
    try {
      maps = await K.loadKakaoMaps();
      selectedRegion = await K.resolveRegion(K.getSelectedRegion());
      const center = new maps.LatLng(selectedRegion.lat, selectedRegion.lng);
      map = new maps.Map(byId("map"), { center, level: 7 });
      infoWindow = new maps.InfoWindow({ zIndex: 10, removable: true });
      newMarker({ id: "region-center", name: selectedRegion.label + " · 선택 지역 중심", lat: selectedRegion.lat, lng: selectedRegion.lng, icon: "trip" });
      byId("selected-region").textContent = selectedRegion.label;
      maps.event.addListener(map, "idle", () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(refreshSearch, 600);
      });
      maps.event.addListener(map, "click", (event) => { if (adding) openMarkerDialog(event.latLng); });
      controls.forEach((id) => { byId(id).disabled = false; });
      filters.forEach((input) => { input.disabled = false; });
      byId("map-loading").hidden = true;
      refreshCustomMarkers();
      refreshSearch();
      loadMarine(center);
    } catch (error) {
      byId("map-loading").hidden = true;
      byId("map-load-error").hidden = false;
      byId("map-load-error-message").textContent = error.message || "카카오 지도를 준비하지 못했습니다. 서버 실행 주소와 카카오 앱의 등록 도메인을 확인해 주세요.";
      byId("selected-region").textContent = "지역 정보 확인 필요";
      setStatus("지도 연결을 확인한 뒤 다시 시도해 주세요.");
      byId("marine-status").textContent = "지도를 연결한 후 선택 지역의 해양 데이터를 조회할 수 있어요.";
    } finally { initializing = false; }
  }

  filters.forEach((input) => {
    input.disabled = true;
    input.addEventListener("change", () => {
      if (!map) return;
      if (selectedPlace?.category === input.value && !input.checked) closeSelection();
      searchCategory(input.value);
      refreshCustomMarkers();
    });
  });
  byId("map-retry").addEventListener("click", initializeMap);
  byId("map-refresh").addEventListener("click", refreshSearch);
  byId("map-recenter").addEventListener("click", () => {
    if (!map) return;
    map.setLevel(7);
    map.panTo(new maps.LatLng(selectedRegion.lat, selectedRegion.lng));
  });
  byId("add-marker").addEventListener("click", () => setAdding(!adding));
  byId("add-marker-coordinates").addEventListener("click", () => { if (map) openMarkerDialog(map.getCenter()); });
  byId("marker-form").addEventListener("submit", saveMarker);
  ["marker-dialog-close", "marker-cancel"].forEach((id) => byId(id).addEventListener("click", () => byId("marker-dialog").close()));
  byId("marker-dialog").addEventListener("close", () => setAdding(false));
  byId("marine-refresh").addEventListener("click", () => { if (map) loadMarine(map.getCenter()); });
  window.addEventListener("storage", (event) => {
    if (!map) return;
    if (event.key === K.KEYS.markers || event.key === null) {
      closeSelection();
      refreshCustomMarkers();
    }
    if (event.key === K.KEYS.favorites && selectedPlace) selectPlace(selectedPlace);
  });
  // 기존 군산 고정 조회 대신 현재 지도 중심의 관측소를 조회합니다.
  window.showTide = () => { if (map) return loadMarine(map.getCenter()); };
  initializeMap();
})();
