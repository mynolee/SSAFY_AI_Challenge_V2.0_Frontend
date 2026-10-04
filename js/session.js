// 모든 페이지가 함께 쓰는 로그인 상태, 브라우저 저장소, 헤더 표시를 담당합니다.
// 각 페이지의 JS보다 먼저 불러와 window.Kkuni로 사용합니다.
(function () {
  const CURRENT_USER_KEY = "kkuni-current-user";
  const PASSWORD_ITERATIONS = 600000;
  const REGION_STATE_KEY = "pado-fishing-session";
  const REGION_NAMES = new Set([
    "서울특별시", "부산광역시", "대구광역시", "인천광역시", "광주광역시", "대전광역시",
    "울산광역시", "세종특별자치시", "경기도", "강원도", "충청북도", "충청남도",
    "전라북도", "전라남도", "경상북도", "경상남도", "제주특별자치도",
  ]);
  let kakaoMapsPromise = null;
  const regionLocations = new Map();

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

  // 회원정보를 수정하면 탭 세션의 이름도 함께 바꿉니다.
  function setCurrentUser(user) {
    try {
      sessionStorage.setItem(CURRENT_USER_KEY, JSON.stringify({ name: user.name, email: user.email }));
    } catch (error) {
      throw new Error("로그인 정보를 저장하지 못했습니다. 브라우저 저장소 설정을 확인해주세요.");
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

  function getSelectedRegion() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(REGION_STATE_KEY) || "null");
      if (saved && REGION_NAMES.has(saved.regionId)) {
        return {
          regionId: saved.regionId,
          city: typeof saved.city === "string" && saved.city.length <= 40 ? saved.city.trim() : "",
        };
      }
    } catch (error) { /* 저장하지 못한 지역은 미선택 상태로 표시합니다. */ }
    return { regionId: "", city: "" };
  }

  // 두 페이지에서 같은 SDK와 지역 중심 좌표를 사용합니다. 공공데이터 인증키는 받지 않습니다.
  function loadKakaoMaps() {
    if (window.kakao?.maps?.Map && window.kakao.maps.services) return Promise.resolve(window.kakao.maps);
    if (kakaoMapsPromise) return kakaoMapsPromise;
    kakaoMapsPromise = (async function () {
      const response = await fetch("/api/kakao-map-config", { signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error("지도 설정을 받지 못했습니다.");
      const config = await response.json();
      const sdkUrl = new URL(config.url);
      if (sdkUrl.protocol !== "https:" || sdkUrl.hostname !== "dapi.kakao.com" || sdkUrl.pathname !== "/v2/maps/sdk.js") {
        throw new Error("지도 설정을 확인하지 못했습니다.");
      }
      // 카카오 SDK는 실제 script.src에서 키와 libraries를 읽으므로 공식 주소를 직접 로드합니다.
      return new Promise(function (resolve, reject) {
        const script = document.createElement("script");
        script.id = "kkuni-kakao-sdk";
        script.src = sdkUrl.toString();
        script.async = true;
        let finished = false;
        const timer = setTimeout(() => fail(), 15000);
        function fail() {
          if (finished) return;
          finished = true;
          clearTimeout(timer);
          script.remove();
          reject(new Error("지도를 불러오지 못했습니다. 잠시 후 다시 시도해주세요."));
        }
        script.onerror = fail;
        script.onload = function () {
          if (finished) return;
          if (!window.kakao?.maps?.load) { fail(); return; }
          try {
            window.kakao.maps.load(function () {
              if (finished) return;
              if (!window.kakao.maps.services) { fail(); return; }
              finished = true;
              clearTimeout(timer);
              resolve(window.kakao.maps);
            });
          } catch (error) { fail(); }
        };
        document.head.append(script);
      });
    })().catch(function () {
      kakaoMapsPromise = null;
      throw new Error("지도를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
    });
    return kakaoMapsPromise;
  }

  async function resolveRegion(selection = getSelectedRegion()) {
    const regionId = typeof selection?.regionId === "string" ? selection.regionId : "";
    const city = typeof selection?.city === "string" ? selection.city.trim() : "";
    if (!regionId) return { lat: 37.5665, lng: 126.9780, label: "서울", regionId: "", city: "" };
    const fullRegion = { "강원도": "강원특별자치도", "전라북도": "전북특별자치도" }[regionId] || regionId;
    const label = [fullRegion, city].filter(Boolean).join(" ");
    if (regionLocations.has(label)) return regionLocations.get(label);
    const pending = (async function () {
      const maps = await loadKakaoMaps();
      return new Promise(function (resolve, reject) {
        let finished = false;
        const timer = setTimeout(() => {
          finished = true;
          reject(new Error("선택한 지역의 위치 조회가 지연되고 있습니다. 다시 시도해주세요."));
        }, 12000);
        function finish(result) {
          if (finished) return;
          finished = true;
          const lat = Number(result?.y);
          const lng = Number(result?.x);
          clearTimeout(timer);
          if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < 33 || lat > 39 || lng < 124 || lng > 132) {
            reject(new Error("선택한 지역의 중심 위치를 찾지 못했습니다. 다른 지역을 선택해주세요."));
            return;
          }
          resolve({ lat, lng, label, regionId, city });
        }
        const geocoder = new maps.services.Geocoder();
        geocoder.addressSearch(label, function (results, status) {
          if (finished) return;
          if (status === maps.services.Status.OK && results.length) { finish(results[0]); return; }
          const office = city ? `${fullRegion} ${city}청` : `${fullRegion.replace(/(?:특별시|광역시|특별자치시)$/, "시")}청`;
          const places = new maps.services.Places();
          places.keywordSearch(office, function (offices, officeStatus) {
            if (finished) return;
            if (officeStatus === maps.services.Status.OK && offices.length) { finish(offices[0]); return; }
            finished = true;
            clearTimeout(timer);
            reject(new Error("선택한 지역의 위치를 찾지 못했습니다. 잠시 후 다시 시도해주세요."));
          }, { size: 1 });
        });
      });
    })();
    regionLocations.set(label, pending);
    try { return await pending; }
    catch (error) { regionLocations.delete(label); throw error; }
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

  // login.js와 같은 방식(PBKDF2-SHA256)으로 비밀번호 해시를 만듭니다.
  async function hashPassword(password, salt, iterations) {
    if (!window.crypto || !window.crypto.subtle) {
      throw new Error("이 브라우저에서는 비밀번호 확인 기능을 사용할 수 없습니다.");
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

  async function verifyPassword(user, password) {
    return await hashPassword(password, user.salt, user.iterations) === user.passwordHash;
  }

  // 비밀번호를 바꿀 때 새 salt와 해시를 함께 만듭니다. 형식은 login.js의 회원 검증과 같습니다.
  async function createPasswordRecord(password) {
    const salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
    return { salt, passwordHash: await hashPassword(password, salt, PASSWORD_ITERATIONS), iterations: PASSWORD_ITERATIONS };
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
    KEYS, getCurrentUser, setCurrentUser, logout, readList, writeList, createId, formatDate,
    verifyPassword, createPasswordRecord, renderHeaderUser, images,
    REGION_STATE_KEY, getSelectedRegion, loadKakaoMaps, resolveRegion,
  };

  renderHeaderUser();
})();
