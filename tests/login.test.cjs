const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { webcrypto } = require("node:crypto");

const source = fs.readFileSync("js/login.js", "utf8");
const html = fs.readFileSync("login.html", "utf8");

// 브라우저 대신 DOM 이벤트와 저장소 경계만 재현합니다. 암호 처리는 실제 Web Crypto를 사용합니다.
function storage() {
  const data = new Map();
  return {
    getItem(key) { return data.get(key) ?? null; },
    setItem(key, value) { data.set(key, String(value)); },
  };
}

function openPage(local = storage(), options = {}) {
  const elements = new Map();
  const alerts = [];
  const session = storage();
  const location = { href: "login.html" };

  function element(id) {
    return {
      id, value: "", disabled: false, open: false, handlers: {}, validationMessage: "",
      addEventListener(type, handler) { (this.handlers[type] ||= []).push(handler); },
      async dispatch(type) {
        await Promise.all((this.handlers[type] || []).map(handler => handler({ preventDefault() {} })));
      },
      setCustomValidity(message) { this.validationMessage = message; },
      focus() {},
      showModal() { this.open = true; },
      close() { this.open = false; this.dispatch("close"); },
      querySelector() { return this.submitButton; },
      reset() { (this.fields || []).forEach(field => { field.value = ""; }); },
      reportValidity() { return (this.fields || []).every(field => field.value && !field.validationMessage); },
      requestSubmit() { return this.dispatch("submit"); },
    };
  }

  for (const match of html.matchAll(/\bid="([^"]+)"/g)) elements.set(match[1], element(match[1]));
  const node = id => { assert(elements.has(id), `HTML에 ${id}가 없습니다.`); return elements.get(id); };
  node("login-form").fields = [node("login-email"), node("login-password")];
  node("login-form").submitButton = node("login-submit");
  node("signup-form").fields = ["signup-name", "signup-email", "signup-password", "signup-password-confirm"].map(node);
  node("signup-form").submitButton = element("signup-submit");

  vm.runInNewContext(source, {
    document: { getElementById: node }, localStorage: local, sessionStorage: session,
    crypto: webcrypto, TextEncoder, Uint8Array,
    alert: message => alerts.push(message),
    window: { location, confirm: () => options.confirm ?? true, crypto: webcrypto },
  });

  return {
    node, alerts, local, session, location,
    async signup(email = "angler@example.com", password = "test-password!") {
      node("signup-name").value = "낚시꾸니";
      node("signup-email").value = email;
      node("signup-password").value = password;
      node("signup-password-confirm").value = password;
      node("signup-dialog").showModal();
      await node("signup-form").dispatch("submit");
    },
    async login(email = "angler@example.com", password = "test-password!") {
      node("login-email").value = email;
      node("login-password").value = password;
      await node("login-form").dispatch("submit");
    },
  };
}

test("가입 정보가 JSON으로 유지되어 새 페이지에서 로그인할 수 있다", async () => {
  const page = openPage();
  await page.signup("Angler@Example.com");
  const saved = JSON.parse(page.local.getItem("kkuni-users"));
  assert(Array.isArray(saved), "회원 목록이 localStorage에 저장되지 않았습니다.");
  assert.equal(saved[0].email, "angler@example.com");
  assert(!JSON.stringify(saved).includes("test-password!"), "비밀번호 원문이 저장되었습니다.");
  const reloaded = openPage(page.local);
  await reloaded.login();
  assert.equal(reloaded.location.href, "index.html");
  assert.deepEqual(JSON.parse(reloaded.session.getItem("kkuni-current-user")), {
    name: "낚시꾸니", email: "angler@example.com",
  });
});

test("새로고침 후 같은 이메일로 가입해도 기존 계정을 덮어쓰지 않는다", async () => {
  const page = openPage();
  await page.signup("angler@example.com");
  const before = page.local.getItem("kkuni-users");
  const reloaded = openPage(page.local);
  await reloaded.signup("ANGLER@example.com", "other-password!");
  assert(reloaded.alerts.some(message => message.includes("이미 가입")));
  assert.equal(page.local.getItem("kkuni-users"), before);
});

test("틀린 비밀번호는 로그인 상태를 만들지 않는다", async () => {
  const page = openPage();
  await page.signup("angler@example.com");
  await page.login("angler@example.com", "incorrect-password!");
  assert.equal(page.location.href, "login.html");
  assert.equal(page.session.getItem("kkuni-current-user"), null);
  assert(page.alerts.some(message => message.includes("비밀번호를 확인")));
});

test("손상된 회원 JSON을 가입 중에 덮어쓰지 않는다", async () => {
  const local = storage();
  local.setItem("kkuni-users", "{broken");
  const page = openPage(local);
  await page.signup("angler@example.com");
  assert.equal(local.getItem("kkuni-users"), "{broken");
  assert(page.alerts.some(message => message.includes("손상")));
});

test("저장소 쓰기가 실패하면 가입 성공을 알리지 않는다", async () => {
  const local = { getItem() { return null; }, setItem() { throw new Error("QuotaExceededError"); } };
  const page = openPage(local);
  await page.signup("angler@example.com");
  assert(page.node("signup-dialog").open);
  assert(!page.alerts.some(message => message.includes("완료")));
  assert(page.alerts.some(message => message.includes("저장")));
});

test("가입 확인을 취소하면 회원 정보를 저장하지 않는다", async () => {
  const page = openPage(storage(), { confirm: false });
  await page.signup("angler@example.com");
  assert.equal(page.local.getItem("kkuni-users"), null);
});

test("데모 계정도 저장된 계정으로 로그인할 수 있다", async () => {
  const page = openPage();
  await page.node("demo-login").dispatch("click");
  const users = JSON.parse(page.local.getItem("kkuni-users"));
  assert(Array.isArray(users) && users.some(user => user.email === "demo@example.com"));
  const reloaded = openPage(page.local);
  await reloaded.login("demo@example.com", "demo1234!");
  assert.equal(reloaded.location.href, "index.html");
});
