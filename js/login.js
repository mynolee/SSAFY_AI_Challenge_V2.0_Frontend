// 로그인 화면의 시작점입니다. 인증 연결 전에는 안내 화면만 표시합니다.
window.NakkisiPages = window.NakkisiPages || {};
window.NakkisiPages.login = {
  render() {
    return `
      <section class="page-placeholder" aria-labelledby="login-page-title">
        <p class="page-eyebrow">LOGIN</p>
        <h2 id="login-page-title">로그인</h2>
        <p>로그인 화면을 준비 중입니다.</p>
      </section>
    `;
  },
};
