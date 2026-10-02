// 지도 탐색 화면의 시작점입니다. 실제 지도 기능은 이 파일에서 확장합니다.
window.NakkisiPages = window.NakkisiPages || {};
window.NakkisiPages.map = {
  render() {
    return `
      <section class="page-placeholder" aria-labelledby="map-page-title">
        <p class="page-eyebrow">MAP</p>
        <h2 id="map-page-title">지도 탐색</h2>
        <p>지도 탐색 화면을 준비 중입니다.</p>
      </section>
    `;
  },
};
