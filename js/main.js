// index.html의 지도와 지역 선택 동작을 담당합니다.
(function () {
  const regionData = {
    "서울특별시": { label: "서울", copy: "동네마다 완전히 다른 표정을 가진 도시 여행의 출발점", cities: ["종로구", "중구", "용산구", "성동구", "광진구", "동대문구", "성북구", "마포구", "서대문구", "영등포구", "강남구", "송파구"] },
    "부산광역시": { label: "부산", copy: "바다와 산복도로, 오래된 시장이 한 프레임에 담기는 도시", cities: ["중구", "서구", "동구", "영도구", "부산진구", "동래구", "남구", "해운대구", "사하구", "금정구", "강서구", "수영구", "기장군"] },
    "대구광역시": { label: "대구", copy: "골목의 맛과 근대 문화, 팔공산 풍경을 함께 만나는 여행", cities: ["중구", "동구", "서구", "남구", "북구", "수성구", "달서구", "달성군", "군위군"] },
    "인천광역시": { label: "인천", copy: "개항장의 시간부터 서해 섬 여행까지 이어지는 관문 도시", cities: ["중구", "동구", "미추홀구", "연수구", "남동구", "부평구", "계양구", "서구", "강화군", "옹진군"] },
    "광주광역시": { label: "광주", copy: "예술과 미식, 무등산의 초록을 가까이에서 누리는 도시", cities: ["동구", "서구", "남구", "북구", "광산구"] },
    "대전광역시": { label: "대전", copy: "과학과 빵, 걷기 좋은 근교가 연결되는 가벼운 주말 여행", cities: ["동구", "중구", "서구", "유성구", "대덕구"] },
    "울산광역시": { label: "울산", copy: "태화강의 정원과 동해 일출을 동시에 만나는 산업 도시", cities: ["중구", "남구", "동구", "북구", "울주군"] },
    "세종특별자치시": { label: "세종", copy: "호수와 정원, 현대적인 건축 사이를 느긋하게 걷는 도시", cities: ["세종시"] },
    "경기도": { label: "경기", copy: "도시의 활기부터 산과 호수까지 하루 안에 만나는 여행", cities: ["수원시", "고양시", "용인시", "성남시", "부천시", "화성시", "안산시", "남양주시", "안양시", "평택시", "파주시", "김포시", "광주시", "양평군", "가평군"] },
    "강원도": { label: "강원", fullLabel: "강원특별자치도", copy: "동해의 푸른 선과 깊은 산을 따라 계절이 선명해지는 곳", cities: ["춘천시", "원주시", "강릉시", "동해시", "태백시", "속초시", "삼척시", "홍천군", "횡성군", "영월군", "평창군", "정선군", "철원군", "화천군", "양구군", "인제군", "고성군", "양양군"] },
    "충청북도": { label: "충북", copy: "호수와 산성, 조용한 도시가 이어지는 내륙의 여행지", cities: ["청주시", "충주시", "제천시", "보은군", "옥천군", "영동군", "증평군", "진천군", "괴산군", "음성군", "단양군"] },
    "충청남도": { label: "충남", copy: "서해 낙조와 고도의 이야기를 함께 품은 느긋한 여행", cities: ["천안시", "공주시", "보령시", "아산시", "서산시", "논산시", "계룡시", "당진시", "금산군", "부여군", "서천군", "청양군", "홍성군", "예산군", "태안군"] },
    "전라북도": { label: "전북", fullLabel: "전북특별자치도", copy: "한옥과 미식, 산과 들의 넉넉함을 천천히 음미하는 곳", cities: ["전주시", "군산시", "익산시", "정읍시", "남원시", "김제시", "완주군", "진안군", "무주군", "장수군", "임실군", "순창군", "고창군", "부안군"] },
    "전라남도": { label: "전남", copy: "다도해의 섬과 깊은 맛, 초록빛 정원이 펼쳐지는 남도", cities: ["목포시", "여수시", "순천시", "나주시", "광양시", "담양군", "곡성군", "구례군", "고흥군", "보성군", "화순군", "장흥군", "강진군", "해남군", "영암군", "무안군", "함평군", "영광군", "완도군", "진도군", "신안군"] },
    "경상북도": { label: "경북", copy: "유서 깊은 도시와 동해안, 산 깊은 마을을 잇는 여행", cities: ["포항시", "경주시", "김천시", "안동시", "구미시", "영주시", "영천시", "상주시", "문경시", "경산시", "의성군", "청송군", "영양군", "영덕군", "청도군", "고령군", "성주군", "칠곡군", "예천군", "봉화군", "울진군", "울릉군"] },
    "경상남도": { label: "경남", copy: "섬과 항구, 산청의 숲까지 풍경이 다채롭게 이어지는 곳", cities: ["창원시", "진주시", "통영시", "사천시", "김해시", "밀양시", "거제시", "양산시", "의령군", "함안군", "창녕군", "고성군", "남해군", "하동군", "산청군", "함양군", "거창군", "합천군"] },
    "제주특별자치도": { label: "제주", copy: "오름과 바다, 돌담길을 따라 걷는 가장 이국적인 국내 여행", cities: ["제주시", "서귀포시"] }
  };

  function initRegionSelection(page) {
    const mapObject = page.querySelector("#korea-map");
    const mapReset = page.querySelector("#map-reset");
    const cityGrid = page.querySelector("#city-grid");
    const emptyCities = page.querySelector("#empty-cities");
    const cityButtonTemplate = page.querySelector("#city-button-template");
    const regionTitle = page.querySelector("#region-title");
    const regionCopy = page.querySelector("#region-copy");
    const stepText = page.querySelector("#step-text");
    const summaryValue = page.querySelector("#summary-value");
    const summaryCount = page.querySelector("#summary-count");
    const regionMapLink = page.querySelector("#region-map-link");
    const regionMapLabel = page.querySelector("#region-map-label");
    const STATE_KEY = "pado-fishing-session";

    let selectedRegionId = "";
    let selectedCity = "";
    let restoring = false;
    const mapPaths = [...mapObject.querySelectorAll("path[id]")];

    function displayName(id) {
      const data = regionData[id];
      return data ? (data.fullLabel || id) : id;
    }

    function saveState() {
      if (restoring) return;
      const selection = { regionId: selectedRegionId, city: selectedCity };
      try {
        sessionStorage.setItem(STATE_KEY, JSON.stringify(selection));
      } catch (error) { /* 세션 저장이 불가능해도 지도 선택은 계속 사용한다. */ }
      regionMapLink.hidden = !selectedRegionId;
      regionMapLabel.textContent = selectedRegionId
        ? `${regionData[selectedRegionId].label}${selectedCity ? ` · ${selectedCity}` : ""} 지도 보기`
        : "선택한 지역 지도 보기";
      window.dispatchEvent(new CustomEvent("kkuni:region-change", { detail: selection }));
    }

    function hideTooltip() {
      mapReset.textContent = selectedRegionId ? displayName(selectedRegionId) : "대한민국 전체";
      mapReset.classList.remove("previewing");
    }

    function selectCity(city) {
      if (!selectedRegionId || !regionData[selectedRegionId].cities.includes(city)) return;
      selectedCity = city;
      cityGrid.querySelectorAll(".city-btn").forEach((button) => {
        const selected = button.dataset.city === city;
        button.classList.toggle("selected", selected);
        button.setAttribute("aria-pressed", String(selected));
      });
      summaryValue.textContent = `${regionData[selectedRegionId].label} · ${city}`;
      saveState();
    }

    function selectRegion(id) {
      const data = regionData[id];
      if (!data) return;
      selectedRegionId = id;
      selectedCity = "";
      hideTooltip();

      mapPaths.forEach((path) => {
        const selected = path.id === id;
        path.classList.toggle("selected", selected);
        path.classList.toggle("dimmed", !selected);
        path.setAttribute("aria-pressed", String(selected));
      });

      const fullName = displayName(id);
      stepText.textContent = "이제 시·군을 선택하세요";
      regionTitle.textContent = fullName;
      regionCopy.textContent = data.copy;
      summaryValue.textContent = fullName;
      summaryCount.textContent = `${data.cities.length}개 지역`;

      clearCityButtons();
      emptyCities.hidden = true;

      const buttons = data.cities.map((city) => {
        const button = cityButtonTemplate.content.firstElementChild.cloneNode(true);
        button.dataset.city = city;
        button.querySelector(".city-name").textContent = city;
        button.addEventListener("click", () => selectCity(city));
        return button;
      });
      cityGrid.append(...buttons);
      saveState();
    }

    function clearCityButtons() {
      cityGrid.querySelectorAll(".city-btn").forEach((button) => button.remove());
    }

    function resetMap() {
      selectedRegionId = "";
      selectedCity = "";
      mapPaths.forEach((path) => {
        path.classList.remove("selected", "dimmed");
        path.setAttribute("aria-pressed", "false");
      });
      stepText.textContent = "여행할 도를 선택하세요";
      regionTitle.textContent = "어디로 떠날까요?";
      regionCopy.textContent = "지도 위 지역을 누르면 시·군 단위로 더 자세히 살펴볼 수 있어요.";
      summaryValue.textContent = "대한민국 전체";
      summaryCount.textContent = "17개 지역";
      clearCityButtons();
      emptyCities.hidden = false;
      hideTooltip();
      saveState();
    }

    mapPaths.forEach((path) => {
      path.setAttribute("tabindex", "0");
      path.setAttribute("role", "button");
      path.setAttribute("aria-label", `${displayName(path.id)} 선택`);
      path.setAttribute("aria-pressed", "false");
      path.addEventListener("mouseenter", () => {
        mapReset.textContent = displayName(path.id);
        mapReset.classList.add("previewing");
      });
      path.addEventListener("mouseleave", hideTooltip);
      path.addEventListener("focus", () => {
        mapReset.textContent = displayName(path.id);
        mapReset.classList.add("previewing");
      });
      path.addEventListener("blur", hideTooltip);
      path.addEventListener("click", () => selectRegion(path.id));
      path.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectRegion(path.id);
        }
      });
    });
    mapReset.addEventListener("click", resetMap);

    try {
      const saved = JSON.parse(sessionStorage.getItem(STATE_KEY) || "null");
      if (saved && regionData[saved.regionId]) {
        restoring = true;
        selectRegion(saved.regionId);
        if (saved.city) selectCity(saved.city);
      }
    } catch (error) { /* 손상된 저장 상태는 무시한다. */ }
    finally { restoring = false; }
    saveState();
    return () => ({ regionId: selectedRegionId, city: selectedCity });
  }

  function initHomeWeather(getSelection) {
    const openButton = document.getElementById("weather-open");
    const dialog = document.getElementById("weather-dialog");
    const dateLabel = document.getElementById("weather-date");
    const locationLabel = document.getElementById("weather-location");
    const currentLabel = document.getElementById("weather-current");
    const icon = document.getElementById("weather-icon");
    const status = document.getElementById("weather-status");
    const content = document.getElementById("weather-content");
    const retryButton = document.getElementById("weather-retry");
    const sourceLabel = document.getElementById("weather-source");
    const warningLabel = document.getElementById("weather-warning");
    const overview = document.getElementById("weather-overview");
    const hoursBody = document.getElementById("weather-hours");
    const extras = document.getElementById("weather-extras");
    const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", weekday: "short",
    });
    const koreanParts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23",
    });
    let requestVersion = 0;
    let abortController = null;
    let selectedLocation = "";
    let currentDate = "";
    let weather = null;
    let lastRefresh = 0;
    let loading = false;

    function todayParts() {
      const parts = Object.fromEntries(koreanParts.formatToParts(new Date()).map((part) => [part.type, part.value]));
      return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) };
    }

    function refreshDate() {
      const parts = todayParts();
      currentDate = parts.date;
      dateLabel.dateTime = parts.date;
      dateLabel.textContent = dateFormatter.format(new Date());
      document.getElementById("weather-dialog-date").textContent = `${dateLabel.textContent} · 오늘`;
      return parts;
    }

    function hasValue(value) {
      return value !== null && value !== undefined && value !== "" && (typeof value !== "number" || Number.isFinite(value));
    }

    function metric(value, unit = "") {
      if (!hasValue(value)) return "—";
      const number = Number(value);
      return `${Number.isFinite(number) ? Math.round(number * 10) / 10 : value}${unit}`;
    }

    function precipitation(value) {
      if (!hasValue(value)) return "—";
      const number = Number(value);
      return Number.isFinite(number) ? `${number} mm` : String(value);
    }

    function conditions(item) {
      const precipitationLabels = { 1: "비", 2: "비·눈", 3: "눈", 4: "소나기", 5: "빗방울", 6: "빗방울·눈날림", 7: "눈날림" };
      const skyLabels = { 1: "맑음", 3: "구름 많음", 4: "흐림" };
      if (precipitationLabels[item.precipitationType]) return precipitationLabels[item.precipitationType];
      if (skyLabels[item.sky]) return skyLabels[item.sky];
      return hasValue(item.sky) ? String(item.sky) : "—";
    }

    function conditionIcon(item) {
      const label = conditions(item);
      if (label.includes("눈")) return "❄";
      if (/비|소나기|빗방울/.test(label)) return "☂";
      if (/흐림|구름/.test(label)) return "☁";
      return label === "맑음" ? "☼" : "◷";
    }

    function updateButtonLabel() {
      openButton.setAttribute("aria-label", `${dateLabel.textContent}, ${locationLabel.textContent}, ${currentLabel.textContent}. 시간별 날씨 보기`);
    }

    function showStatus(message, canRetry = false) {
      status.textContent = message;
      status.hidden = false;
      content.hidden = true;
      retryButton.hidden = !canRetry;
    }

    function summaryCard(label, value, note) {
      const card = document.createElement("div");
      card.className = "weather-summary-card";
      const heading = document.createElement("span");
      heading.className = "weather-summary-label";
      heading.textContent = label;
      const strong = document.createElement("strong");
      strong.textContent = value;
      card.append(heading, strong);
      if (note) {
        const hint = document.createElement("span");
        hint.className = "weather-summary-note";
        hint.textContent = note;
        card.append(hint);
      }
      return card;
    }

    function formatAlertTime(value) {
      const raw = String(value || "");
      const compact = raw.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})$/);
      if (compact) return `${compact[1]}.${compact[2]}.${compact[3]} ${compact[4]}:${compact[5]} (KST)`;
      const parsed = new Date(raw);
      if (!raw || Number.isNaN(parsed.getTime())) return "시각 미제공";
      return new Intl.DateTimeFormat("ko-KR", {
        timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
      }).format(parsed) + " (KST)";
    }

    function renderAlerts(alertStatus) {
      const section = document.getElementById("weather-alerts");
      section.replaceChildren();
      const state = ["ok", "none", "no_data", "unavailable"].includes(alertStatus && alertStatus.state) ? alertStatus.state : "unavailable";
      section.dataset.state = state;
      const head = document.createElement("div");
      head.className = "weather-alert-head";
      const heading = document.createElement("h3");
      heading.id = "weather-alert-title";
      heading.textContent = "전국 기상특보 현황";
      const badge = document.createElement("span");
      badge.className = "weather-alert-badge";
      badge.textContent = { ok: "특보 현황", none: "특보 없음", no_data: "자료 없음", unavailable: "조회 실패" }[state];
      head.append(heading, badge);
      section.append(head);
      const scope = document.createElement("p");
      scope.className = "weather-alert-scope";
      scope.textContent = "기상청 원문 · 아래 전국 특보에서 해당 지역·해역을 확인하세요.";
      section.append(scope);

      if (state === "ok" || state === "none") {
        const times = document.createElement("p");
        times.className = "weather-alert-times";
        times.textContent = `발표 ${formatAlertTime(alertStatus.issuedAt)} · 현황 기준 ${formatAlertTime(alertStatus.effectiveAt)}`;
        section.append(times);
        const parts = [
          ["기상특보", state === "none" ? "기상청 최신 특보 현황은 ‘없음’입니다." : alertStatus.active],
          ["예비특보", alertStatus.preliminary],
          ["참고사항", alertStatus.reference],
        ];
        parts.forEach(([label, value]) => {
          const block = document.createElement("div");
          block.className = "weather-alert-part";
          const title = document.createElement("h4");
          title.textContent = label;
          const text = document.createElement("p");
          text.className = "weather-alert-text";
          text.textContent = typeof value === "string" && value.trim() ? value.trim() : "내용 미제공";
          block.append(title, text);
          section.append(block);
        });
      } else {
        const message = document.createElement("p");
        message.className = "weather-alert-message";
        message.textContent = state === "no_data"
          ? "기상청이 제공한 최신 특보 현황 자료가 없어 현재 특보를 확인할 수 없어요."
          : "기상특보 현황을 불러오지 못했어요. 다시 확인하거나 기상청에서 확인해주세요.";
        section.append(message);
      }
      const official = document.createElement("a");
      official.className = "weather-alert-link";
      official.href = "https://www.weather.go.kr/w/weather/warning/status.do";
      official.target = "_blank";
      official.rel = "noopener noreferrer";
      official.textContent = "기상청 특보 현황 확인 ↗";
      section.append(official);
    }

    function renderWeather(data) {
      const today = refreshDate();
      const hours = (Array.isArray(data.hours) ? data.hours : []).filter((hour) => hour.date === today.date);
      const current = data.current || {};
      const currentConditions = current;
      const currentAvailable = [current.temperature, current.humidity, current.windSpeed, current.precipitation].some(hasValue);
      const state = conditions(currentConditions);
      currentLabel.textContent = currentAvailable
        ? `${metric(current.temperature, "°")}${state === "—" ? "" : ` · ${state}`}`
        : "현재 관측 없음";
      icon.textContent = conditionIcon(currentConditions);
      updateButtonLabel();

      if (!currentAvailable && !hours.length) {
        showStatus("이 지역의 오늘 날씨 자료를 아직 받지 못했어요. 잠시 후 다시 확인해주세요.", true);
        return;
      }

      overview.replaceChildren(
        summaryCard("현재 기온", metric(current.temperature, "°C"), state === "—" ? "하늘 상태 미제공" : state),
        summaryCard("현재 습도", metric(current.humidity, "%"), "최근 관측 기준"),
        summaryCard("현재 풍속", metric(current.windSpeed, " m/s"), `강수량 ${precipitation(current.precipitation)}`),
      );
      renderAlerts(data.extras && data.extras.alertStatus);

      const temperatures = hours.map((hour) => hour.temperature).filter(hasValue).map(Number).filter(Number.isFinite);
      if (temperatures.length) {
        overview.append(summaryCard("오늘 예보 기온", `${metric(Math.min(...temperatures), "°")} ~ ${metric(Math.max(...temperatures), "°")}`, "제공된 시간대 최저·최고"));
      }

      const rows = Array.from({ length: 24 }, (_, hour) => {
        const time = `${String(hour).padStart(2, "0")}:00`;
        const item = hours.find((entry) => String(entry.time) === time);
        const row = document.createElement("tr");
        if (hour === today.hour) row.className = "current-hour";
        const heading = document.createElement("th");
        heading.scope = "row";
        heading.textContent = `${time}${hour === today.hour ? " · 지금" : ""}`;
        row.append(heading);
        if (!item) {
          const empty = document.createElement("td");
          empty.colSpan = 6;
          empty.className = "weather-hour-empty";
          empty.textContent = "예보 미제공";
          row.append(empty);
          return row;
        }
        [conditions(item), metric(item.temperature, "°C"), precipitation(item.precipitation), metric(item.precipitationProbability, "%"), metric(item.humidity, "%"), metric(item.windSpeed, " m/s")].forEach((value) => {
          const cell = document.createElement("td");
          cell.textContent = value;
          row.append(cell);
        });
        return row;
      });
      hoursBody.replaceChildren(...rows);

      extras.replaceChildren();
      const extraLabels = { sunrise: "일출", sunset: "일몰", moonrise: "월출", moonset: "월몰", lunarDate: "음력" };
      if (data.extras && typeof data.extras === "object") {
        Object.entries(extraLabels).forEach(([key, label]) => {
          if (hasValue(data.extras[key]) && typeof data.extras[key] !== "object") {
            extras.append(summaryCard(label, String(data.extras[key])));
          }
        });
        if (hasValue(data.extras.astronomyLocation) && extras.children.length) {
          const caption = document.createElement("p");
          caption.className = "weather-extra-caption";
          caption.textContent = `출몰시각은 인근 기준 지역 (${data.extras.astronomyLocation}) 자료입니다.`;
          extras.append(caption);
        }
      }
      extras.hidden = !extras.children.length;
      const sources = (Array.isArray(data.sources) ? data.sources : []).map((source) => {
        return typeof source === "string" ? source : source && (source.name || source.label);
      }).filter(Boolean);
      const observed = hasValue(current.observedAt) ? ` · 관측 ${current.observedAt}` : "";
      sourceLabel.textContent = `${sources.length ? sources.join(" · ") : "기상청 공공데이터"}${observed}${hasValue(data.issuedAt) ? ` · 예보 발표 ${data.issuedAt}` : ""}`;
      const warnings = (Array.isArray(data.warnings) ? data.warnings : []).filter((item) => typeof item === "string");
      if (!currentAvailable) warnings.unshift("현재 관측 자료가 없어 시간별 예보를 표시합니다.");
      if (!hours.length) warnings.unshift("오늘의 시간별 예보가 아직 제공되지 않았습니다.");
      warningLabel.textContent = warnings.join(" ");
      warningLabel.hidden = !warnings.length;
      status.hidden = true;
      content.hidden = false;
      retryButton.hidden = false;
    }

    async function loadWeather(selection = getSelection()) {
      const version = ++requestVersion;
      if (abortController) abortController.abort();
      abortController = new AbortController();
      loading = true;
      lastRefresh = Date.now();
      weather = null;
      refreshDate();
      selectedLocation = selection.regionId
        ? `${regionData[selection.regionId] ? regionData[selection.regionId].label : selection.regionId}${selection.city ? ` · ${selection.city}` : ""}`
        : "";
      locationLabel.textContent = selectedLocation || "지역을 선택해주세요";
      document.getElementById("weather-dialog-title").textContent = selectedLocation ? `${selectedLocation}의 오늘 날씨` : "지역별 시간대 날씨";
      icon.textContent = "◷";
      currentLabel.textContent = selection.regionId ? "날씨 확인 중" : "오늘의 날씨";
      updateButtonLabel();
      if (!selection.regionId) {
        loading = false;
        showStatus("지도에서 지역을 선택하면 현재 날씨와 오늘의 시간별 예보를 확인할 수 있어요.");
        return;
      }
      showStatus(`${selectedLocation}의 날씨를 확인하고 있어요.`);
      try {
        const coordinates = await Kkuni.resolveRegion(selection);
        if (version !== requestVersion) return;
        const params = new URLSearchParams({ lat: String(coordinates.lat), lng: String(coordinates.lng) });
        const response = await fetch(`/api/weather?${params}`, { signal: abortController.signal });
        if (!response.ok) throw new Error("날씨 정보를 받지 못했습니다.");
        const data = await response.json();
        if (version !== requestVersion) return;
        if (data.error) throw new Error("날씨 정보를 받지 못했습니다.");
        weather = data;
        lastRefresh = Date.now();
        renderWeather(data);
      } catch (error) {
        if (version !== requestVersion || error.name === "AbortError") return;
        currentLabel.textContent = "날씨 확인 필요";
        updateButtonLabel();
        showStatus("날씨 정보를 불러오지 못했어요. 연결 상태를 확인하고 다시 시도해주세요.", true);
      } finally {
        if (version === requestVersion) loading = false;
      }
    }

    openButton.addEventListener("click", () => {
      if (!dialog.open) dialog.showModal();
      if (weather) renderWeather(weather);
      if (!loading && getSelection().regionId && Date.now() - lastRefresh > 10 * 60 * 1000) loadWeather();
    });
    document.getElementById("weather-close").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => {
      if (event.target !== dialog) return;
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
    });
    retryButton.addEventListener("click", () => loadWeather());
    window.addEventListener("kkuni:region-change", (event) => loadWeather(event.detail || getSelection()));
    window.setInterval(() => {
      if (todayParts().date !== currentDate) loadWeather();
      else if (!loading && getSelection().regionId && Date.now() - lastRefresh > 10 * 60 * 1000) loadWeather();
      else if (dialog.open && weather) renderWeather(weather);
    }, 60 * 1000);
    loadWeather();
  }

  const page = document.getElementById("region-page");
  const getSelection = initRegionSelection(page);
  initHomeWeather(getSelection);
})();
