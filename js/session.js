// 모든 페이지가 함께 쓰는 로그인 상태, 브라우저 저장소, 헤더 표시를 담당합니다.
// 각 페이지의 JS보다 먼저 불러와 window.Kkuni로 사용합니다.
(function () {
  const CURRENT_USER_KEY = "kkuni-current-user";

  const KEYS = {
    users: "kkuni-users",
    posts: "kkuni-posts",
    favorites: "kkuni-favorites",
    markers: "kkuni-markers",
    trips: "kkuni-trips",
  };

  // 로그인 상태는 이름과 이메일만 sessionStorage에 보관합니다.
  function getCurrentUser() {
    try {
      const user = JSON.parse(sessionStorage.getItem(CURRENT_USER_KEY) || "null");
      if (user && typeof user.name === "string" && typeof user.email === "string") return user;
    } catch (error) {
      // 손상된 세션은 로그아웃 상태로 취급합니다.
    }
    return null;
  }

  function logout() {
    try {
      sessionStorage.removeItem(CURRENT_USER_KEY);
    } catch (error) {
      // 세션 저장소를 쓸 수 없으면 이미 로그인 정보도 남아 있지 않습니다.
    }
  }

  // localStorage의 JSON 배열을 읽습니다. 없으면 빈 배열, 손상되었으면 오류를 던집니다.
  function readList(key) {
    let raw;
    try {
      raw = localStorage.getItem(key);
    } catch (error) {
      throw new Error("브라우저 저장소를 읽을 수 없습니다. 저장소 설정을 확인해주세요.");
    }
    if (raw === null) return [];
    try {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) return list;
    } catch (error) {
      // 아래에서 같은 오류로 안내합니다.
    }
    throw new Error("저장된 데이터(" + key + ")가 손상되었습니다. 기존 데이터를 확인해주세요.");
  }

  function writeList(key, list) {
    try {
      localStorage.setItem(key, JSON.stringify(list));
    } catch (error) {
      throw new Error("데이터를 저장하지 못했습니다. 브라우저 저장 공간과 설정을 확인해주세요.");
    }
  }

  function createId() {
    if (window.crypto && typeof crypto.randomUUID === "function") return crypto.randomUUID();
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const pad = (number) => String(number).padStart(2, "0");
    return date.getFullYear() + "." + pad(date.getMonth() + 1) + "." + pad(date.getDate());
  }

  function toHex(bytes) {
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  // login.js와 같은 방식(PBKDF2-SHA256)으로 비밀번호를 다시 확인합니다.
  async function verifyPassword(user, password) {
    if (!window.crypto || !window.crypto.subtle) {
      throw new Error("이 브라우저에서는 비밀번호 확인 기능을 사용할 수 없습니다.");
    }
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]
    );
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", hash: "SHA-256", salt: encoder.encode(user.salt), iterations: user.iterations },
      key,
      256
    );
    return toHex(new Uint8Array(bits)) === user.passwordHash;
  }

  // 로그인하면 헤더의 "로그인" 버튼이 "이름님" 마이페이지 링크로 바뀝니다.
  function renderHeaderUser() {
    const user = getCurrentUser();
    if (!user) return;
    document.querySelectorAll(".login-link").forEach(function (link) {
      const label = link.querySelector(".login-link-text");
      if (!label) return;
      label.textContent = user.name + "님";
      link.href = "mypage.html";
      link.classList.add("signed-in");
      link.setAttribute("aria-label", user.name + "님의 마이페이지");
      link.title = user.email;
    });
  }

  // 게시글 사진은 용량이 커서 localStorage 대신 IndexedDB에 Blob으로 저장합니다.
  // 레코드 형식: { id, full: Blob, thumb: Blob, width, height }
  const IMAGE_DB = "kkuni-images";
  const IMAGE_STORE = "images";
  let imageDb = null;

  function openImageDb() {
    if (!imageDb) {
      imageDb = new Promise(function (resolve, reject) {
        if (!window.indexedDB) {
          reject(new Error("이 브라우저에서는 사진 저장 기능을 사용할 수 없습니다."));
          return;
        }
        const request = indexedDB.open(IMAGE_DB, 1);
        request.onupgradeneeded = () => request.result.createObjectStore(IMAGE_STORE, { keyPath: "id" });
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(new Error("사진 저장소를 열 수 없습니다. 브라우저 설정을 확인해주세요."));
      });
      imageDb.catch(() => { imageDb = null; });
    }
    return imageDb;
  }

  async function imageTransaction(mode, work) {
    const db = await openImageDb();
    return new Promise(function (resolve, reject) {
      const transaction = db.transaction(IMAGE_STORE, mode);
      const result = work(transaction.objectStore(IMAGE_STORE));
      transaction.oncomplete = () => resolve(result && "result" in result ? result.result : undefined);
      transaction.onerror = transaction.onabort = () => reject(new Error(
        transaction.error && transaction.error.name === "QuotaExceededError"
          ? "사진을 저장할 공간이 부족합니다. 사용하지 않는 글이나 사진을 정리해주세요."
          : "사진을 저장하거나 읽지 못했습니다."
      ));
    });
  }

  const images = {
    put(records) {
      return imageTransaction("readwrite", (store) => { records.forEach((record) => store.put(record)); });
    },
    get(id) {
      return imageTransaction("readonly", (store) => store.get(id));
    },
    remove(ids) {
      if (!ids.length) return Promise.resolve();
      return imageTransaction("readwrite", (store) => { ids.forEach((id) => store.delete(id)); });
    },
  };

  window.Kkuni = {
    KEYS, getCurrentUser, logout, readList, writeList, createId, formatDate, verifyPassword, images,
  };

  renderHeaderUser();
})();
