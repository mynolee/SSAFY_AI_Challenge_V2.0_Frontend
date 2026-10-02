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

const mapObject = document.getElementById("korea-map");
const mapReset = document.getElementById("map-reset");
const cityGrid = document.getElementById("city-grid");
const regionTitle = document.getElementById("region-title");
const regionCopy = document.getElementById("region-copy");
const stepText = document.getElementById("step-text");
const summaryValue = document.getElementById("summary-value");
const summaryCount = document.getElementById("summary-count");
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
  try {
    sessionStorage.setItem(STATE_KEY, JSON.stringify({ regionId: selectedRegionId, city: selectedCity }));
  } catch (error) { /* 세션 저장이 불가능해도 지도 선택은 계속 사용한다. */ }
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

  const buttons = data.cities.map((city) => {
    const button = document.createElement("button");
    button.className = "city-btn";
    button.type = "button";
    button.dataset.city = city;
    button.setAttribute("aria-pressed", "false");
    const name = document.createElement("span");
    name.textContent = city;
    const arrow = document.createElement("span");
    arrow.className = "city-arrow";
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "↗";
    button.append(name, arrow);
    button.addEventListener("click", () => selectCity(city));
    return button;
  });
  cityGrid.replaceChildren(...buttons);
  saveState();
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
  const empty = document.createElement("div");
  empty.className = "empty-cities";
  empty.innerHTML = "먼저 지도에서 마음이 가는<br />지역을 하나 골라주세요.";
  cityGrid.replaceChildren(empty);
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
