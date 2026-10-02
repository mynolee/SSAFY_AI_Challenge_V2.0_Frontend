// map.html의 동작을 담당합니다.
(function () {
  function initMapPage() {
    const page = document.getElementById("map-page");

  }

  initMapPage();
})();

window.showTide = async function () {
  const box = document.getElementById("tide-result");
  box.textContent = "물때를 불러오는 중...";

  try {
    const response = await fetch("/api/tide");
    if (response.status === 404) {
      throw new Error(
        "물때 API를 찾을 수 없습니다. node server.cjs 실행 후 http://127.0.0.1:4173/map.html에서 조회하세요.",
      );
    }

    if (!response.headers.get("content-type")?.includes("application/json")) {
      throw new Error(`물때 API가 JSON으로 응답하지 않았습니다. (HTTP ${response.status})`);
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `물때 조회에 실패했습니다. (HTTP ${response.status})`);
    }

    const items = data.body.items.item;
    const list = Array.isArray(items) ? items : [items];

    box.textContent = list.map(item =>
      `${item.obsvtrNm} | ${item.predcDt} | 조위 ${item.predcTdlvVl}`
    ).join("\n");
  } catch (error) {
    box.textContent = error.message;
  }
};
