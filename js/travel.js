// 실제 카카오 장소 후보로 AI 여행을 추천받고 선택한 플랜을 기존 여행 저장소에 보관합니다.
(function () {
  "use strict";

  const K = window.Kkuni;
  const DRAFT_KEY = "kkuni-travel-draft";
  const MODEL = "gpt-5.6-luna";
  const TYPES = { origin: "출발지", destination: "도착지", point: "낚시 포인트", lodging: "숙소", restaurant: "음식점", attraction: "명소" };
  const ICONS = { origin: "img/icons/marker-trip.svg", destination: "img/icons/marker-point.svg", point: "img/icons/marker-point.svg", lodging: "img/icons/marker-lodging.svg", restaurant: "img/icons/marker-restaurant.svg", attraction: "img/icons/marker-trip.svg" };
  const byId = (id) => document.getElementById(id);
  let maps, map, infoWindow, region, initializationPending = false;
  let origin = null, destination = null, endpointMarkers = [], previewMarkers = [], routeLine = null;
  let searchGeneration = 0, searchPagination = null, searchResults = [], searchLoading = false, searchTimer = null;
  let generation = 0, generationController = null, busy = false, plans = [], planRequest = null;
  const savedIds = new Map();

  function node(tag, className, text) {
    const value = document.createElement(tag);
    if (className) value.className = className;
    if (text !== undefined && text !== null) value.textContent = String(text);
    return value;
  }
  function validCoordinates(place) {
    return place && typeof place.lat === "number" && typeof place.lng === "number" && Number.isFinite(place.lat) && Number.isFinite(place.lng) && place.lat >= 32 && place.lat <= 40 && place.lng >= 124 && place.lng <= 133;
  }
  function currentTarget() { return document.querySelector('input[name="travel-target"]:checked').value; }
  function pointPosition(place) { return new maps.LatLng(place.lat, place.lng); }
  function safePlaceUrl(place) {
    try {
      const url = new URL(place.url);
      if (["map.kakao.com", "place.map.kakao.com"].includes(url.hostname) && ["https:", "http:"].includes(url.protocol) && !url.username && !url.password && !url.port) { url.protocol = "https:"; return url.href; }
    } catch (error) { /* 좌표 링크로 열 수 있습니다. */ }
    return "https://map.kakao.com/link/map/" + encodeURIComponent(place.name) + "," + place.lat + "," + place.lng;
  }
  function externalLink(text, url, className) {
    const link = node("a", className, text);
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    return link;
  }
  function message(text, error) {
    const box = byId("travel-plan-message");
    box.replaceChildren(document.createTextNode(text));
    box.classList.toggle("is-error", Boolean(error));
  }
  function setBusy(value) {
    busy = value;
    byId("travel-generation-loading").hidden = !value;
    byId("travel-generate").disabled = value || !map;
    byId("travel-generate").textContent = value ? "실제 장소로 플랜을 만드는 중…" : "✦ AI 여행 플랜 3개 만들기";
  }
  function clearPreview() {
    previewMarkers.forEach((marker) => marker.setMap(null));
    previewMarkers = [];
    infoWindow?.close();
    document.querySelectorAll(".travel-plan-card").forEach((card) => card.classList.remove("is-previewed"));
  }
  function invalidatePlans(reason) {
    generation++;
    generationController?.abort();
    generationController = null;
    setBusy(false);
    plans = [];
    planRequest = null;
    savedIds.clear();
    byId("travel-plan-cards").replaceChildren();
    clearPreview();
    try { sessionStorage.removeItem(DRAFT_KEY); } catch (error) { /* 추천은 메모리만으로도 사용할 수 있습니다. */ }
    message(reason || "선택한 위치와 날짜로 새로운 여행 플랜을 만들어보세요.");
  }

  function makeMarker(place, category) {
    const image = new maps.MarkerImage(ICONS[category] || ICONS.attraction, new maps.Size(34, 43), { offset: new maps.Point(17, 42), alt: TYPES[category] || "여행 장소" });
    const marker = new maps.Marker({ map, position: pointPosition(place), image, title: place.name });
    maps.event.addListener(marker, "click", () => showPlace(place, marker));
    return marker;
  }
  function showPlace(place, marker) {
    const content = node("div", "travel-info-window");
    content.append(node("strong", "", place.name), externalLink("카카오맵에서 보기 ↗", safePlaceUrl(place)));
    infoWindow.setContent(content);
    infoWindow.setPosition(pointPosition(place));
    infoWindow.open(map, marker || null);
  }
  function renderEndpoints() {
    ["origin", "destination"].forEach((key) => {
      const place = key === "origin" ? origin : destination;
      byId("travel-" + key + "-name").textContent = place ? place.name : "아직 선택하지 않았어요";
      byId("travel-" + key + "-coordinates").textContent = place ? (place.address ? place.address + " · " : "") + place.lat.toFixed(5) + ", " + place.lng.toFixed(5) : key === "origin" ? "지도에서 여행의 시작점을 찍어주세요." : "가고 싶은 낚시터나 장소를 골라주세요.";
      document.querySelector('[data-reset-endpoint="' + key + '"]').hidden = !place;
    });
    if (!map) return;
    endpointMarkers.forEach((marker) => marker.setMap(null));
    endpointMarkers = [];
    if (origin) endpointMarkers.push(makeMarker(origin, "origin"));
    if (destination) endpointMarkers.push(makeMarker(destination, "destination"));
    routeLine?.setMap(null);
    routeLine = null;
    const link = byId("travel-directions");
    link.hidden = !(origin && destination);
    if (origin && destination) {
      routeLine = new maps.Polyline({ map, path: [pointPosition(origin), pointPosition(destination)], strokeWeight: 4, strokeColor: "#3182f6", strokeOpacity: .7, strokeStyle: "shortdash" });
      link.href = "https://map.kakao.com/link/from/" + encodeURIComponent(origin.name) + "," + origin.lat + "," + origin.lng + "/to/" + encodeURIComponent(destination.name) + "," + destination.lat + "," + destination.lng;
    }
  }
  function updateTarget() {
    byId("travel-map-mode").textContent = currentTarget() === "origin" ? "초록 출발지를 지도에서 선택하세요" : "파랑 도착지를 지도에서 선택하세요";
  }
  function chooseEndpoint(place) {
    if (!validCoordinates(place)) { message("대한민국 지도 안에서 올바른 위치를 선택해 주세요.", true); return; }
    invalidatePlans();
    const target = currentTarget();
    if (target === "origin") origin = { ...place };
    else destination = { ...place };
    renderEndpoints();
    if (target === "origin" && !destination) document.querySelector('input[name="travel-target"][value="destination"]').checked = true;
    updateTarget();
    byId("travel-search-status").textContent = TYPES[target] + "로 ‘" + place.name + "’을 선택했어요.";
  }
  function fitPlaces(places) {
    const points = places.filter(validCoordinates);
    if (!points.length) { map.panTo(new maps.LatLng(region.lat, region.lng)); return; }
    if (points.length === 1) { map.panTo(pointPosition(points[0])); return; }
    const bounds = new maps.LatLngBounds();
    points.forEach((place) => bounds.extend(pointPosition(place)));
    map.setBounds(bounds, 80, 60, 100, 60);
  }

  function normalizeKakao(item, category) {
    return { id: String(item.id), name: String(item.place_name || ""), lat: Number(item.y), lng: Number(item.x), address: item.road_address_name || item.address_name || "", url: item.place_url || "", category: category || "point" };
  }
  function trueFishingPoint(item) {
    const category = String(item.category_name || "");
    return !["FD6", "CE7", "AD5"].includes(item.category_group_code) && /낚시/.test(category) && !/낚시(?:용품|도구|장비|점)|음식점|카페|숙박/.test(category);
  }
  function renderSearch() {
    byId("travel-search-results").replaceChildren();
    searchResults.forEach((place) => {
      const button = node("button", "travel-search-item");
      button.type = "button";
      button.append(node("strong", "", place.name), node("span", "", place.address || place.lat.toFixed(5) + ", " + place.lng.toFixed(5)));
      button.addEventListener("click", () => { chooseEndpoint(place); map.panTo(pointPosition(place)); });
      byId("travel-search-results").append(button);
    });
    byId("travel-search-more").hidden = !searchPagination?.hasNextPage;
    byId("travel-search-more").disabled = searchLoading;
    byId("travel-search-submit").disabled = !map || searchLoading;
    byId("travel-fishing-search").disabled = !map || searchLoading;
  }
  function armSearchTimeout(token) {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      if (token !== searchGeneration) return;
      searchGeneration++;
      searchLoading = false;
      searchPagination = null;
      byId("travel-search-status").textContent = "장소 검색 시간이 길어졌어요. 검색 버튼을 눌러 다시 시도해 주세요.";
      renderSearch();
    }, 12000);
  }
  function searchPlaces(fishing) {
    if (!map) return;
    const query = fishing ? "낚시터" : byId("travel-search-query").value.trim();
    if (!query || query.length > 100) return;
    const token = ++searchGeneration;
    searchResults = [];
    searchPagination = null;
    searchLoading = true;
    byId("travel-search-status").textContent = "카카오맵의 실제 장소를 검색하고 있어요…";
    armSearchTimeout(token);
    renderSearch();
    const places = new maps.services.Places();
    const callback = (data, status, pagination) => {
      if (token !== searchGeneration) return;
      clearTimeout(searchTimer);
      searchLoading = false;
      if (status === maps.services.Status.OK) {
        data.filter((item) => !fishing || trueFishingPoint(item)).forEach((item) => {
          const place = normalizeKakao(item, fishing ? "point" : "destination");
          if (validCoordinates(place) && place.name && !searchResults.some((result) => result.id === place.id)) searchResults.push(place);
        });
        searchPagination = pagination;
        byId("travel-search-status").textContent = searchResults.length ? searchResults.length + "개 장소 · 목록을 누르면 현재 선택 중인 " + TYPES[currentTarget()] + "로 지정해요." : pagination.hasNextPage ? "이 페이지에는 낚시 업종의 장소가 없어요. 다음 검색 결과를 확인해 보세요." : "이 지도에서 낚시 업종의 장소를 찾지 못했어요. 지도를 옮겨 다시 찾아보세요.";
      } else {
        searchPagination = null;
        byId("travel-search-status").textContent = status === maps.services.Status.ZERO_RESULT ? "검색 결과가 없어요. 다른 주소나 장소 이름으로 찾아보세요." : "카카오 장소 검색에 실패했어요. 잠시 후 다시 검색해 주세요.";
      }
      renderSearch();
    };
    const options = fishing ? { bounds: map.getBounds(), location: map.getCenter(), size: 15 } : { size: 15 };
    try { places.keywordSearch(query, callback, options); }
    catch (error) { clearTimeout(searchTimer); searchLoading = false; byId("travel-search-status").textContent = "장소 검색을 시작하지 못했어요. 지도를 다시 연결해 주세요."; renderSearch(); }
  }
  function renderMyPoints() {
    const container = byId("travel-my-points");
    container.replaceChildren();
    const user = K.getCurrentUser();
    if (!user) {
      const text = node("p", "", "로그인하면 내가 저장한 낚시 포인트를 바로 선택할 수 있어요. ");
      const link = node("a", "", "로그인");
      link.href = "login.html?next=travel.html";
      text.append(link);
      container.append(text);
      return;
    }
    try {
      const points = K.readList(K.KEYS.markers).filter((place) => place && place.ownerEmail === user.email && place.category === "point" && typeof place.name === "string" && validCoordinates({ ...place, lat: Number(place.lat), lng: Number(place.lng) }) && place.lat !== null && place.lng !== null && place.lat !== "" && place.lng !== "");
      if (!points.length) container.append(node("p", "", "저장한 낚시 포인트가 없어요. 지도 탐색에서 포인트를 등록해보세요."));
      points.forEach((place) => {
        const button = node("button", "travel-search-item");
        button.type = "button";
        button.append(node("strong", "", place.name), node("span", "", place.address || "내 낚시 포인트"));
        button.addEventListener("click", () => { const selected = { ...place, lat: Number(place.lat), lng: Number(place.lng) }; chooseEndpoint(selected); map.panTo(pointPosition(selected)); });
        container.append(button);
      });
    } catch (error) { container.append(node("p", "", error.message)); }
  }

  function dateRoster(start, end) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) throw new Error("여행 시작과 종료 날짜를 선택해 주세요.");
    const first = Date.parse(start + "T00:00:00Z");
    const last = Date.parse(end + "T00:00:00Z");
    if (!Number.isFinite(first) || !Number.isFinite(last) || last < first || last - first > 6 * 86400000) throw new Error("종료 날짜는 시작 날짜 이후, 여행 기간은 최대 7일로 선택해 주세요.");
    const dates = [];
    for (let value = first; value <= last; value += 86400000) dates.push(new Date(value).toISOString().slice(0, 10));
    if (dates[0] !== start || dates[dates.length - 1] !== end) throw new Error("올바른 여행 날짜를 선택해 주세요.");
    return dates;
  }
  function readRequest() {
    if (!validCoordinates(origin) || !validCoordinates(destination)) throw new Error("지도나 장소 검색으로 출발지와 도착지를 모두 선택해 주세요.");
    if (Math.abs(origin.lat - destination.lat) < .00005 && Math.abs(origin.lng - destination.lng) < .00005) throw new Error("출발지와 도착지를 서로 다른 위치로 선택해 주세요.");
    const start = byId("travel-start").value;
    const end = byId("travel-end").value;
    dateRoster(start, end);
    const preferences = byId("travel-preferences").value.trim();
    if (preferences.length > 1000) throw new Error("여행 취향은 1,000자 이내로 입력해 주세요.");
    return { origin: { ...origin }, destination: { ...destination }, start, end, preferences };
  }
  function queryCandidatePages(code, location, signal) {
    return new Promise((resolve, reject) => {
      let finished = false, pages = 0;
      const items = [];
      const service = new maps.services.Places();
      const timer = setTimeout(() => finish(new Error("주변 장소 조회가 지연되고 있어요. 잠시 후 다시 만들어 주세요.")), 12000);
      const abort = () => finish(new DOMException("취소된 추천", "AbortError"));
      function finish(error) {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        signal.removeEventListener("abort", abort);
        if (error) reject(error); else resolve(items);
      }
      signal.addEventListener("abort", abort, { once: true });
      if (signal.aborted) { abort(); return; }
      const callback = (data, status, pagination) => {
        if (finished) return;
        if (status === maps.services.Status.OK) {
          items.push(...data);
          pages++;
          if (pages < 2 && pagination.hasNextPage) { pagination.nextPage(); return; }
          finish();
        } else if (status === maps.services.Status.ZERO_RESULT) finish();
        else finish(new Error("숙소·음식점·명소 후보 검색에 실패했어요. 카카오 지도 연결을 확인하고 다시 시도해 주세요."));
      };
      try { service.categorySearch(code, callback, { location: pointPosition(location), radius: 10000, size: 15, sort: maps.services.SortBy.DISTANCE }); }
      catch (error) { finish(new Error("주변 여행 장소를 검색하지 못했습니다. 지도를 다시 연결해 주세요.")); }
    });
  }
  async function collectCandidates(request, signal) {
    const midpoint = { lat: (request.origin.lat + request.destination.lat) / 2, lng: (request.origin.lng + request.destination.lng) / 2 };
    const categories = [["lodging", "AD5"], ["restaurant", "FD6"], ["attraction", "AT4"]];
    const groups = await Promise.all(categories.map(async ([category, code]) => {
      const results = await Promise.all([queryCandidatePages(code, midpoint, signal), queryCandidatePages(code, request.destination, signal)]);
      const places = [], ids = new Set();
      // 중간 지점과 도착지의 결과를 번갈아 반영해 한 지역에만 후보가 몰리지 않게 합니다.
      for (let index = 0; index < Math.max(...results.map((items) => items.length)) && places.length < 30; index++) {
        for (const result of results) {
          if (!result[index]) continue;
          const place = normalizeKakao(result[index], category);
          if (!validCoordinates(place) || !place.name || ids.has(place.id)) continue;
          ids.add(place.id);
          places.push(place);
          if (places.length === 30) break;
        }
      }
      if (!places.length) throw new Error(TYPES[category] + " 후보를 찾지 못했어요. 도착지를 다른 위치로 바꾸고 다시 만들어 주세요.");
      return places;
    }));
    const ids = new Set();
    return groups.flat().filter((place) => { if (ids.has(place.id)) return false; ids.add(place.id); return true; });
  }
  function validatePlans(data, request) {
    if (data.model !== MODEL || !Array.isArray(data.plans) || data.plans.length !== 3) throw new Error("AI가 올바른 세 가지 여행을 반환하지 못했습니다. 다시 만들어 주세요.");
    const dates = dateRoster(request.start, request.end);
    if (!Array.isArray(request.candidates) || !request.candidates.length || request.candidates.length > 90 || request.candidates.some((place) => !validCoordinates(place) || typeof place.name !== "string" || !place.name.trim() || !["lodging", "restaurant", "attraction"].includes(place.category))) throw new Error("검증한 여행 장소 정보를 확인하지 못했습니다. 플랜을 다시 만들어 주세요.");
    const registry = new Map(request.candidates.map((place) => [String(place.id), place]));
    registry.set("route-origin", { ...request.origin, id: "route-origin", category: "origin" });
    registry.set("route-destination", { ...request.destination, id: "route-destination", category: "destination" });
    const combinations = new Set();
    return data.plans.map((plan) => {
      if (!plan || typeof plan.name !== "string" || !plan.name.trim() || typeof plan.summary !== "string" || !plan.summary.trim() || !Array.isArray(plan.days) || plan.days.length !== dates.length || !Array.isArray(plan.tips) || plan.tips.some((tip) => typeof tip !== "string" || !tip.trim())) throw new Error("AI 일정 형식이 올바르지 않습니다. 다시 만들어 주세요.");
      const days = plan.days.map((day, index) => {
        if (!day || day.date !== dates[index] || !Array.isArray(day.places) || !day.places.length || day.places.length > 10) throw new Error("AI 일정의 날짜나 장소를 확인하지 못했습니다. 다시 만들어 주세요.");
        const places = day.places.map((place) => {
          const verified = registry.get(String(place?.id));
          if (!verified) throw new Error("확인되지 않은 장소가 포함되어 추천을 표시하지 않았습니다. 다시 만들어 주세요.");
          return { ...verified };
        });
        return { date: day.date, places };
      });
      if (days[0].places[0].id !== "route-origin" || !days[0].places.some((place) => place.id === "route-destination")) throw new Error("AI 일정에 첫날의 출발지·도착지가 올바르게 포함되지 않았습니다. 다시 만들어 주세요.");
      const selected = days.flatMap((day) => day.places.filter((place) => ["lodging", "restaurant", "attraction"].includes(place.category)));
      if (new Set(selected.map((place) => place.category)).size !== 3) throw new Error("숙소·음식점·명소를 모두 포함한 일정을 확인하지 못했습니다. 다시 만들어 주세요.");
      const combination = Array.from(new Set(selected.map((place) => String(place.id)))).sort().join("|");
      if (combinations.has(combination)) throw new Error("서로 다른 세 가지 여행 구성을 확인하지 못했습니다. 다시 만들어 주세요.");
      combinations.add(combination);
      return { name: plan.name, summary: plan.summary, days, tips: plan.tips.slice() };
    });
  }

  function previewPlan(index, focusMap = true) {
    if (!map || !plans[index] || !planRequest) return;
    clearPreview();
    const unique = new Map();
    plans[index].days.forEach((day) => day.places.forEach((place) => { if (!["origin", "destination"].includes(place.category)) unique.set(place.id, place); }));
    unique.forEach((place) => previewMarkers.push(makeMarker(place, place.category)));
    fitPlaces([planRequest.origin, planRequest.destination, ...unique.values()]);
    document.querySelectorAll(".travel-plan-card")[index].classList.add("is-previewed");
    message("‘" + plans[index].name + "’의 숙소·음식점·명소를 지도에 표시했어요. 지도 점선은 출발·도착 연결선입니다.");
    if (focusMap) byId("travel-map").scrollIntoView({ behavior: "smooth", block: "center" });
  }
  function savePlan(index) {
    if (!plans[index] || !planRequest) return;
    const user = K.getCurrentUser();
    if (!user) {
      message("이 플랜을 보관하려면 로그인해 주세요. 로그인 후 돌아오면 추천한 플랜을 다시 저장할 수 있어요.");
      const login = node("a", "", "로그인하고 저장하기");
      login.href = "login.html?next=travel.html";
      byId("travel-plan-message").append(login);
      return;
    }
    try {
      const identity = user.email + ":" + index;
      const previous = savedIds.get(identity);
      const existing = K.readList(K.KEYS.trips);
      if (previous && existing.some((trip) => trip && trip.id === previous && trip.ownerEmail === user.email)) return;
      const now = new Date().toISOString();
      const trip = { id: K.createId(), ownerEmail: user.email, name: plans[index].name, start: planRequest.start, end: planRequest.end,
        origin: { ...planRequest.origin, id: "route-origin", category: "origin" }, destination: { ...planRequest.destination, id: "route-destination", category: "destination" },
        summary: plans[index].summary, days: plans[index].days, tips: plans[index].tips, model: MODEL, createdAt: now, updatedAt: now, memo: "", placeNotes: {} };
      K.writeList(K.KEYS.trips, existing.concat(trip));
      savedIds.set(identity, trip.id);
      persistDraft();
      renderPlans();
      message("선택한 여행을 저장했어요. 마이페이지에서 상세 일정과 메모를 관리할 수 있어요.");
      const link = node("a", "", "저장한 여행 상세 보기 →");
      link.href = "mypage.html?tab=trips&trip=" + encodeURIComponent(trip.id);
      byId("travel-plan-message").append(link);
    } catch (error) { message(error.message, true); }
  }
  function renderPlans() {
    const container = byId("travel-plan-cards");
    container.replaceChildren();
    plans.forEach((plan, index) => {
      const card = node("article", "travel-plan-card");
      card.append(node("span", "travel-plan-number", "PLAN 0" + (index + 1)), node("h3", "", plan.name), node("p", "travel-plan-summary", plan.summary));
      const count = new Set(plan.days.flatMap((day) => day.places.filter((place) => !["origin", "destination"].includes(place.category)).map((place) => place.id))).size;
      card.append(node("p", "travel-plan-count", plan.days.length + "일 · 실제 여행 장소 " + count + "곳"));
      const details = node("details", "travel-plan-details");
      details.append(node("summary", "", "날짜별 상세 일정 보기"));
      plan.days.forEach((day, dayIndex) => {
        const section = node("section", "travel-plan-day");
        section.append(node("h4", "", "DAY " + (dayIndex + 1) + " · " + day.date));
        day.places.forEach((place) => {
          const button = node("button", "travel-plan-place");
          button.type = "button";
          const image = node("img");
          image.src = ICONS[place.category] || ICONS.attraction;
          image.alt = "";
          const text = node("span");
          text.append(node("strong", "", place.name), node("small", "", (TYPES[place.category] || "장소") + " · " + (place.address || place.lat.toFixed(5) + ", " + place.lng.toFixed(5))));
          button.append(image, text);
          button.addEventListener("click", () => { previewPlan(index); map.panTo(pointPosition(place)); showPlace(place); });
          section.append(button);
        });
        details.append(section);
      });
      const tips = node("ul", "travel-plan-tips");
      plan.tips.forEach((tip) => tips.append(node("li", "", tip)));
      details.append(tips);
      card.append(details);
      const actions = node("div", "travel-plan-actions");
      const preview = node("button", "travel-button travel-button-light", "이 플랜 지도에서 보기");
      preview.type = "button";
      preview.addEventListener("click", () => previewPlan(index));
      const saved = savedIds.get(K.getCurrentUser()?.email + ":" + index);
      const save = node("button", "travel-button travel-button-primary", saved ? "✓ 저장한 플랜" : "이 플랜 선택하여 저장");
      save.type = "button";
      save.disabled = Boolean(saved);
      save.addEventListener("click", () => savePlan(index));
      actions.append(preview, save);
      card.append(actions);
      if (saved) {
        const link = node("a", "travel-saved-link", "마이페이지에서 일정·메모 보기 →");
        link.href = "mypage.html?tab=trips&trip=" + encodeURIComponent(saved);
        card.append(link);
      }
      container.append(card);
    });
  }
  function persistDraft() {
    try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ request: planRequest, plans, model: MODEL, savedIds: Array.from(savedIds), createdAt: Date.now() })); }
    catch (error) { /* 브라우저 저장소를 쓸 수 없어도 현재 화면의 플랜은 사용할 수 있습니다. */ }
  }
  function restoreDraft() {
    try {
      const draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "null");
      if (!draft || !Number.isFinite(draft.createdAt) || Date.now() - draft.createdAt > 86400000 || !validCoordinates(draft.request?.origin) || !validCoordinates(draft.request?.destination) || !Array.isArray(draft.request.candidates) || draft.request.candidates.length > 90) return false;
      const restored = validatePlans(draft, draft.request);
      origin = draft.request.origin;
      destination = draft.request.destination;
      byId("travel-start").value = draft.request.start;
      byId("travel-end").value = draft.request.end;
      byId("travel-preferences").value = typeof draft.request.preferences === "string" ? draft.request.preferences : "";
      planRequest = draft.request;
      plans = restored;
      if (Array.isArray(draft.savedIds)) {
        const trips = K.readList(K.KEYS.trips);
        draft.savedIds.forEach((entry) => {
          if (Array.isArray(entry) && typeof entry[0] === "string" && typeof entry[1] === "string" && trips.some((trip) => trip && trip.id === entry[1] && entry[0].startsWith(trip.ownerEmail + ":"))) savedIds.set(entry[0], entry[1]);
        });
      }
      renderEndpoints();
      renderPlans();
      fitPlaces([origin, destination]);
      message("최근에 만든 세 가지 여행을 다시 불러왔어요. 원하는 플랜을 선택하여 저장하세요.");
      return true;
    } catch (error) { return false; }
  }

  async function generatePlans(event) {
    event.preventDefault();
    if (busy || !map) return;
    let request;
    try { request = readRequest(); }
    catch (error) { message(error.message, true); return; }
    invalidatePlans();
    const token = ++generation;
    const controller = new AbortController();
    generationController = controller;
    setBusy(true);
    byId("travel-generation-step").textContent = "경로 중간 지점과 도착지 주변의 실제 장소를 찾고 있어요.";
    message("카카오맵의 숙소·음식점·명소 후보를 확인한 뒤 AI에 여행 구성을 요청합니다.");
    const timeout = setTimeout(() => controller.abort(), 90000);
    try {
      request.candidates = await collectCandidates(request, controller.signal);
      if (token !== generation) return;
      byId("travel-generation-step").textContent = request.candidates.length + "개 실제 장소로 AI가 세 가지 여행을 구성하고 있어요.";
      const response = await fetch("/api/travel-plans", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request), signal: controller.signal });
      if (!response.headers.get("content-type")?.includes("application/json")) throw new Error("AI 여행 서버를 찾지 못했습니다. 프로젝트의 node server.cjs 실행 주소에서 다시 요청해 주세요.");
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "AI 여행 추천에 실패했습니다. (HTTP " + response.status + ")");
      if (token !== generation) return;
      plans = validatePlans(data, request);
      planRequest = request;
      persistDraft();
      renderPlans();
      message("실제 장소로 세 가지 여행을 준비했어요. 상세 일정을 비교하고 원하는 플랜을 선택하세요.");
      previewPlan(0, false);
      byId("travel-plan-cards").scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      controller.abort();
      if (token !== generation) return;
      message(error.name === "AbortError" ? "여행 추천 시간이 길어져 요청을 취소했어요. ‘AI 여행 플랜 3개 만들기’로 다시 시도해 주세요." : error.message, true);
    } finally {
      clearTimeout(timeout);
      if (token === generation) { generationController = null; setBusy(false); }
    }
  }
  async function initializeMap() {
    if (initializationPending) return;
    initializationPending = true;
    byId("travel-map-loading").hidden = false;
    byId("travel-map-error").hidden = true;
    try {
      maps = await K.loadKakaoMaps();
      region = await K.resolveRegion(K.getSelectedRegion());
      map = new maps.Map(byId("travel-map"), { center: new maps.LatLng(region.lat, region.lng), level: 7 });
      infoWindow = new maps.InfoWindow({ zIndex: 10, removable: true });
      maps.event.addListener(map, "click", (event) => {
        const lat = Number(event.latLng.getLat().toFixed(6)), lng = Number(event.latLng.getLng().toFixed(6));
        chooseEndpoint({ id: "pin-" + lat + "-" + lng, name: "지도에서 선택한 " + TYPES[currentTarget()], lat, lng, address: "", category: currentTarget() });
      });
      ["travel-search-submit", "travel-fishing-search", "travel-generate", "travel-fit-route"].forEach((id) => { byId(id).disabled = false; });
      byId("travel-map-loading").hidden = true;
      byId("travel-search-status").textContent = "주소나 장소를 검색하거나, 지도에서 출발·도착지를 찍어보세요.";
      renderMyPoints();
      restoreDraft();
    } catch (error) {
      byId("travel-map-loading").hidden = true;
      byId("travel-map-error").hidden = false;
      byId("travel-map-error-message").textContent = error.message || "카카오 지도 연결을 확인하고 다시 시도해 주세요.";
      byId("travel-search-status").textContent = "지도를 연결한 뒤 위치를 선택할 수 있어요.";
    } finally { initializationPending = false; }
  }

  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  byId("travel-start").value = today;
  byId("travel-end").value = today;
  document.querySelectorAll('input[name="travel-target"]').forEach((input) => input.addEventListener("change", updateTarget));
  document.querySelectorAll("[data-reset-endpoint]").forEach((button) => button.addEventListener("click", () => {
    invalidatePlans();
    if (button.dataset.resetEndpoint === "origin") origin = null; else destination = null;
    document.querySelector('input[name="travel-target"][value="' + button.dataset.resetEndpoint + '"]').checked = true;
    updateTarget();
    renderEndpoints();
  }));
  byId("travel-search-form").addEventListener("submit", (event) => { event.preventDefault(); searchPlaces(false); });
  byId("travel-fishing-search").addEventListener("click", () => searchPlaces(true));
  byId("travel-search-more").addEventListener("click", () => {
    if (!searchPagination?.hasNextPage || searchLoading) return;
    searchLoading = true;
    const pagination = searchPagination;
    armSearchTimeout(searchGeneration);
    renderSearch();
    try { pagination.nextPage(); }
    catch (error) { clearTimeout(searchTimer); searchLoading = false; searchPagination = null; byId("travel-search-status").textContent = "다음 검색 결과를 조회하지 못했어요. 검색을 다시 시도해 주세요."; renderSearch(); }
  });
  ["travel-start", "travel-end", "travel-preferences"].forEach((id) => byId(id).addEventListener("input", () => invalidatePlans("여행 조건이 바뀌었어요. 새 조건으로 플랜을 다시 만들어 주세요.")));
  byId("travel-plan-form").addEventListener("submit", generatePlans);
  byId("travel-generation-cancel").addEventListener("click", () => invalidatePlans("진행 중인 여행 추천을 취소했어요. 준비되면 다시 만들어 주세요."));
  byId("travel-fit-route").addEventListener("click", () => fitPlaces([origin, destination].filter(Boolean)));
  byId("travel-map-retry").addEventListener("click", initializeMap);
  window.addEventListener("storage", (event) => { if (map && (event.key === K.KEYS.markers || event.key === null)) renderMyPoints(); });
  updateTarget();
  initializeMap();
})();
