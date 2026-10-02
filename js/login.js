(function () {
  const USERS_KEY = "kkuni-users";
  const CURRENT_USER_KEY = "kkuni-current-user";
  const PASSWORD_ITERATIONS = 600000;

  // localStorage에는 문자열을 저장하므로 JSON.parse로 회원 배열을 읽습니다.
  function loadUsers() {
    let raw;
    try {
      raw = localStorage.getItem(USERS_KEY);
    } catch (error) {
      throw new Error("브라우저 저장소를 읽을 수 없습니다. 저장소 설정을 확인해주세요.");
    }
    if (raw === null) return [];

    let users;
    try {
      users = JSON.parse(raw);
    } catch (error) {
      throw new Error("저장된 회원 JSON이 손상되었습니다. 기존 데이터를 확인해주세요.");
    }
    const valid = Array.isArray(users) && users.every((user) =>
      user && typeof user.name === "string" && typeof user.email === "string" &&
      typeof user.salt === "string" && /^[a-f0-9]{32}$/.test(user.salt) &&
      typeof user.passwordHash === "string" && /^[a-f0-9]{64}$/.test(user.passwordHash) &&
      Number.isSafeInteger(user.iterations) && user.iterations > 0 && user.iterations <= 1000000
    );
    if (!valid) {
      throw new Error("저장된 회원 JSON의 형식이 손상되었습니다. 기존 데이터를 확인해주세요.");
    }
    return users;
  }

  function saveUsers(users) {
    try {
      localStorage.setItem(USERS_KEY, JSON.stringify(users, null, 2));
    } catch (error) {
      throw new Error("회원 정보를 저장하지 못했습니다. 브라우저 저장 공간과 설정을 확인해주세요.");
    }
  }

  function toHex(bytes) {
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  // 비밀번호 원문 대신 사용자마다 다른 salt와 PBKDF2 해시를 보관합니다.
  async function hashPassword(password, salt, iterations) {
    if (!window.crypto || !window.crypto.subtle) {
      throw new Error("이 브라우저에서는 비밀번호 해시 기능을 사용할 수 없습니다.");
    }
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]
    );
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", hash: "SHA-256", salt: encoder.encode(salt), iterations },
      key,
      256
    );
    return toHex(new Uint8Array(bits));
  }

  async function registerUser(name, email, password) {
    if (loadUsers().some((user) => user.email === email)) {
      throw new Error("이미 가입된 이메일입니다.");
    }
    const salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
    const passwordHash = await hashPassword(password, salt, PASSWORD_ITERATIONS);
    const user = {
      name, email, salt, passwordHash,
      iterations: PASSWORD_ITERATIONS,
      createdAt: new Date().toISOString(),
    };

    // 해시를 만드는 동안 다른 가입이 진행되었을 수 있어 최신 목록을 다시 읽습니다.
    const users = loadUsers();
    if (users.some((member) => member.email === email)) {
      throw new Error("이미 가입된 이메일입니다.");
    }
    users.push(user);
    saveUsers(users);
    return user;
  }

  function initLoginPage() {
    const loginForm = document.getElementById("login-form");
    const loginEmail = document.getElementById("login-email");
    const loginPassword = document.getElementById("login-password");
    const loginSubmit = document.getElementById("login-submit");
    const demoButton = document.getElementById("demo-login");
    const signupButton = document.getElementById("signup-button");

    const signupDialog = document.getElementById("signup-dialog");
    const signupClose = document.getElementById("signup-close");
    const signupForm = document.getElementById("signup-form");
    const signupSubmit = signupForm.querySelector('button[type="submit"]');
    const signupName = document.getElementById("signup-name");
    const signupEmail = document.getElementById("signup-email");
    const signupPassword = document.getElementById("signup-password");
    const signupPasswordConfirm = document.getElementById("signup-password-confirm");

    let signupBusy = false;
    let loginBusy = false;

    signupButton.addEventListener("click", function () {
      signupDialog.showModal();
    });
    signupClose.addEventListener("click", function () {
      signupDialog.close();
    });
    signupDialog.addEventListener("close", function () {
      signupForm.reset();
      signupPasswordConfirm.setCustomValidity("");
    });

    function checkPasswords() {
      const matches = signupPassword.value === signupPasswordConfirm.value;
      signupPasswordConfirm.setCustomValidity(matches ? "" : "비밀번호가 일치하지 않습니다.");
    }
    signupPassword.addEventListener("input", checkPasswords);
    signupPasswordConfirm.addEventListener("input", checkPasswords);

    signupForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      if (signupBusy) return;
      checkPasswords();
      if (!signupForm.reportValidity()) return;

      const name = signupName.value.trim();
      const email = signupEmail.value.trim().toLowerCase();
      const password = signupPassword.value;
      if (!name) {
        alert("이름을 입력해주세요.");
        signupName.focus();
        return;
      }
      try {
        if (loadUsers().some((user) => user.email === email)) {
          throw new Error("이미 가입된 이메일입니다.");
        }
        if (!window.confirm(name + "님, 회원가입을 진행할까요?")) return;

        signupBusy = true;
        signupSubmit.disabled = true;
        await registerUser(name, email, password);

        signupDialog.close();
        loginEmail.value = email;
        loginPassword.value = "";
        alert("회원가입이 완료되었습니다. 로그인해주세요.");
        loginPassword.focus();
      } catch (error) {
        alert(error.message);
      } finally {
        signupBusy = false;
        signupSubmit.disabled = false;
      }
    });

    async function signIn(email, password) {
      const user = loadUsers().find((member) => member.email === email);
      if (!user || await hashPassword(password, user.salt, user.iterations) !== user.passwordHash) {
        throw new Error("이메일 또는 비밀번호를 확인해주세요.");
      }

      // 현재 로그인한 사람의 공개 정보만 탭 세션에 보관합니다.
      try {
        sessionStorage.setItem(CURRENT_USER_KEY, JSON.stringify({ name: user.name, email: user.email }));
      } catch (error) {
        throw new Error("로그인 정보를 저장하지 못했습니다. 브라우저 저장소 설정을 확인해주세요.");
      }
      alert(user.name + "님, 로그인되었습니다.");
      loginPassword.value = "";
      window.location.href = nextPage();
    }

    // login.html?next=community.html처럼 온 경우 같은 사이트의 페이지로만 돌아갑니다.
    function nextPage() {
      const match = /[?&]next=([a-z-]+\.html)(?:&|$)/.exec(window.location.search || "");
      return match && match[1] !== "login.html" ? match[1] : "index.html";
    }

    function setLoginBusy(busy) {
      loginBusy = busy;
      loginSubmit.disabled = busy;
      demoButton.disabled = busy;
    }

    loginForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      if (loginBusy || !loginForm.reportValidity()) return;
      setLoginBusy(true);
      try {
        await signIn(loginEmail.value.trim().toLowerCase(), loginPassword.value);
      } catch (error) {
        alert(error.message);
      } finally {
        setLoginBusy(false);
      }
    });

    demoButton.addEventListener("click", async function () {
      if (loginBusy) return;
      setLoginBusy(true);
      const email = "demo@example.com";
      const password = "demo1234!";
      try {
        if (!loadUsers().some((user) => user.email === email)) {
          await registerUser("데모꾸니", email, password);
        }
        loginEmail.value = email;
        loginPassword.value = password;
        await signIn(email, password);
      } catch (error) {
        alert(error.message);
      } finally {
        setLoginBusy(false);
      }
    });
  }

  initLoginPage();
})();
