# EnjoyTrip FrontEnd

`C:\EnjoyTrip_ChatBot\clients\index_fishing.html`의 낚시 여행 화면을 옮긴 정적 프런트엔드입니다.

## 구성

| 담당 화면 | HTML | JS | 현재 기능 |
| --- | --- | --- | --- |
| 지역 선택 홈 | `index.html` | `js/main.js` | 전국 17개 시도 지도, 시·군 선택, 선택 상태 저장·복원, 오늘 날짜·현재 날씨·시간별 예보 |
| 지도 탐색 | `map.html` | `js/map.js` | 선택 지역 카카오맵, 낚시 포인트·용품점 검색, 주변 명소·음식점·숙박 필터, 이미지 선택 마커 등록 |
| 여행 플래너 | `travel.html` | `js/travel.js` | 지도 출발·도착 선택, 실제 장소로 AI 추천 3개, 여행 선택·저장 |
| 커뮤니티 | `community.html` | `js/community.js` | 카테고리 필터, 게시글 작성·상세·수정·삭제 (작성자만 수정·삭제) |
| 로그인 | `login.html` | `js/login.js` | 회원가입 창, 로컬 회원 저장, 로그인, 데모 계정 |
| 마이페이지 | `mypage.html` | `js/mypage.js` | 관심 장소·등록 장소·저장 여행·내가 쓴 글 목록, 여행 상세 지도·전체/장소 메모, 계정 정보, 로그아웃, 회원 탈퇴 |

모든 페이지는 공통 `js/session.js`를 먼저 불러온 뒤 자기 JS 파일을 불러옵니다. `session.js`는 로그인 상태 읽기, 로그아웃, localStorage 목록 읽기·쓰기를 `window.Kkuni`로 제공하고, 로그인한 경우 헤더의 로그인 버튼을 `이름님` 마이페이지 링크로 바꿉니다. 헤더의 `<span class="login-link-text">`가 이 텍스트 자리입니다. 담당자는 해당 HTML에서 화면 구조를, 해당 JS에서 이벤트와 기능을 수정하면 됩니다. 메뉴는 일반 링크로 각 HTML 페이지에 이동합니다. 헤더는 각 HTML에 포함되어 있으며, 현재 메뉴의 `active` 클래스와 `aria-current="page"`도 HTML에서 지정합니다.

공통 스타일은 `css/main.css`, 헤더 로고는 `img/icons/03-낚시꾸니.png`입니다. 지역 선택의 시·군 버튼은 `index.html`의 `<template>`을 복제한 뒤 텍스트와 이벤트를 연결합니다. JS에는 HTML 문자열이나 `innerHTML`을 사용하지 않습니다.

원본의 Python 서버, 데이터, 채팅·업로드 화면과 코드는 포함하지 않았습니다. 지도 경계 데이터의 원본은 [korea-maps](https://github.com/swcho/korea-maps)입니다.

## 실행

지역 선택과 커뮤니티 같은 정적 화면은 HTML을 직접 열거나 정적 파일 서버로 이 폴더를 실행해 확인할 수 있습니다.

카카오맵, 날씨·물때와 AI 여행 추천을 사용하려면 Node.js 20.12 이상에서 프로젝트 폴더의 서버를 실행합니다.

```bash
node server.cjs
```

`http://127.0.0.1:5500`에서 홈을, `http://127.0.0.1:5500/map.html`에서 지도를 확인할 수 있습니다. 서버는 같은 폴더의 `.env`를 자동으로 읽습니다. `KAKAO_MAP_KEY`는 카카오맵 JavaScript 키, `DATA_GO_KR_KEY`는 공공데이터 API의 공통 인증키입니다. `.env`에는 각 API의 기본 엔드포인트와 서버 `PORT`도 저장합니다. 현재 카카오 키에서 허용된 로컬 주소가 `http://127.0.0.1:5500`이므로 이 주소를 사용합니다. 다른 호스트나 포트를 사용하려면 카카오 개발자 콘솔에도 해당 웹사이트 주소를 등록해야 합니다. 공공데이터 인증키는 서버에서 사용하고, 브라우저에는 카카오맵 SDK에 필요한 키만 전달합니다. `.env`를 변경하면 서버를 다시 실행합니다. `.env`는 Git 추적에서 제외됩니다.

## 날짜·날씨와 지도 탐색

홈에서 시도와 시·군·구를 선택하면 우측 상단의 날짜·날씨 버튼이 해당 지역으로 바뀝니다. 버튼을 누르면 한국 시간 기준 오늘의 시간별 기온, 하늘 상태, 강수, 습도, 풍속을 확인할 수 있습니다. 날씨는 기상청 초단기실황과 단기예보를 사용하며, 제공되지 않은 시간이나 항목은 미제공 상태로 표시합니다. 조회 중 지역을 바꾸면 마지막으로 선택한 지역의 결과만 반영합니다.

날씨 창은 천문연구원의 일출·일몰·월출·월몰·음력 정보와 기상청의 최신 전국 기상특보 현황도 함께 표시합니다. 특보는 `getPwnStatus`로 조회해 전날 발표된 최신 특보·예비특보·참고사항과 발표/현황 기준시각을 보여줍니다. 특보 없음, 자료 없음, 조회 실패를 구분하고 전국 범위를 명시합니다. 이전의 오늘 발표 목록은 발표가 없는 날 코드 `03`을 반환해 현황을 보여주지 못했습니다. [기상청 서비스 명세](https://www.data.go.kr/data/15000415/openapi.do) 지도 아래에는 국립해양조사원의 조석예보·최신 조위관측·바다낚시지수를 표시합니다. 지도에서 조회한 좌표 35km 이내의 기준 관측소와 낚시 예보 지점을 사용하며 거리·기준 시각·출처를 함께 표시합니다. 지도 이동 후에는 물때 다시 조회 버튼으로 현재 지도 중심의 정보를 갱신합니다. 제공기관에서 받지 못한 항목은 빈 상태로 표시합니다.

지도 탐색은 홈의 선택 지역을 카카오 주소 검색으로 찾아 중심 좌표로 사용합니다. 낚시 포인트와 용품점은 카카오 장소 검색 결과이며, 명소·음식점·숙박 토글로 현재 지도 주변의 장소를 함께 볼 수 있습니다. 지도 위치를 이동하면 검색 범위도 바뀝니다. 검색 결과는 실제 낚시 허용 여부를 판정하는 자료가 아닙니다.

마커 추가를 누르고 지도에서 위치를 찍으면 위도·경도가 입력됩니다. 이름과 장소 유형을 지정하고 물고기·낚시용품·여행·숙소·음식점의 다섯 가지 마커 이미지 중 하나를 선택할 수 있습니다. 로그인한 사용자의 마커는 기존 `kkuni-markers` 형식으로 브라우저에 저장해 새로고침 후에도 복원하고 마이페이지에 표시합니다. 비회원은 임시 마커를 사용할 수 있습니다. 카카오 검색 결과의 숙소·음식점에도 전용 마커 이미지를 사용합니다.

## AI 여행 플래너와 여행 메모

`travel.html`에서 지도 클릭, 카카오 장소 검색, 주변 낚시터 검색 또는 내 낚시 포인트로 출발지·도착지를 고릅니다. 각각 실제 카카오 마커를 표시하고 여행 날짜(최대 7일)와 취향을 받아 경로 중간 지점·도착지 주변의 숙박·음식점·관광명소 후보를 조회합니다. 지도 점선은 두 좌표의 연결선이며 실제 도로 경로는 카카오 길찾기에서 확인합니다.

`POST /api/travel-plans`는 서버에서 [`gpt-5.6-luna`](https://developers.openai.com/api/docs/models/gpt-5.6-luna) Responses API를 호출합니다. 프로젝트 `.env`의 `OPENAI_API_KEY` 또는 기존 `OPEN_API_KEY`만 사용합니다. 해당 파일에 키가 없으면 설정 오류를 표시하며 실행 환경이나 다른 프로젝트의 키는 사용하지 않습니다. OpenAI 키는 브라우저에 전달하지 않습니다. 조회한 카카오 후보만 모델에 전달하고 [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs) 및 서버 검증으로 요청한 날짜와 실제 후보 안의 장소를 사용하는 서로 다른 조합 3개만 표시합니다. 각 조합은 출발지·도착지·숙소·음식점·명소를 포함합니다. API 연결·결제·응답 오류는 안내하며 임의 추천으로 대체하지 않습니다.

추천은 로그인 없이 볼 수 있고 선택한 플랜은 로그인 후 기존 `kkuni-trips`에 저장합니다. 로그인 이동 중에도 추천을 유지합니다. 마이페이지의 저장한 여행에서 상세 일정과 카카오 마커를 확인하고 여행 전체 메모(10,000자) 및 장소별 메모(2,000자)를 저장할 수 있습니다. 동일 장소는 날짜가 달라도 여행 내 메모를 공유합니다. 메모는 현재 계정의 여행에만 저장되며 새로고침 후에도 유지됩니다. `mypage.html?tab=trips&trip=ID`로 내 여행 상세를 바로 열 수 있습니다.

이번 기능에 새로 추가한 파일은 페이지 전용 `css/travel.css`와 숙소·음식점 SVG 마커 2개입니다. HTML·JS는 기존 여행 플래너·마이페이지·홈·지도 파일을 수정합니다.

## 로컬 회원 저장

회원가입하면 `localStorage`의 `kkuni-users` 키에 회원 배열을 JSON 문자열로 저장합니다. 계정은 새로고침 후에도 유지되며, 로그인 시 저장된 목록을 다시 읽습니다. 선택한 저장 방식은 브라우저 저장소이므로 `json/user.json` 파일에는 쓰지 않습니다.

회원 정보는 `name`, `email`, `salt`, `passwordHash`, `iterations`, `createdAt`으로 구성됩니다. 비밀번호 원문은 저장하지 않고 사용자별 salt와 PBKDF2 해시를 보관합니다. 로그인한 사용자의 이름과 이메일은 `sessionStorage`의 `kkuni-current-user` 키에 저장합니다.

개발자 도구의 **Application → Local Storage**에서 `kkuni-users`를 확인하거나, Console에서 다음 코드로 읽을 수 있습니다.

```javascript
JSON.parse(localStorage.getItem("kkuni-users"));
```

데모 계정 버튼을 처음 누르면 `demo@example.com` / `demo1234!` 계정을 생성합니다. 이후에는 같은 계정을 사용합니다.

같은 브라우저와 같은 사이트 주소에서 실행해야 같은 저장소를 사용합니다. `file:` 주소의 저장소 동작은 브라우저마다 다를 수 있으므로 개발 시에는 Live Server 같은 정적 파일 서버로 실행하면 주소를 일정하게 유지하기 쉽습니다. [localStorage 동작 문서](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)

이 로그인은 브라우저 저장소로 동작을 연습하는 기능입니다. 실제 서비스의 계정 검증과 접근 권한은 서버에서 처리해야 합니다.

커뮤니티는 주소로 글을 바로 열 수 있습니다. `community.html?post=ID`는 상세, `community.html?edit=ID`는 수정 창(작성자만)을 엽니다. `&from=mypage`를 붙이면 저장하거나 취소한 뒤 `mypage.html?tab=posts`로 돌아갑니다. 마이페이지는 `?tab=favorites|markers|trips|posts|account`로 처음 열 탭을 정할 수 있습니다.

로그인 화면은 `login.html?next=community.html`처럼 `next`가 있으면 로그인 후 해당 페이지로 돌아갑니다. 같은 폴더의 `*.html` 이름만 허용합니다.

## 브라우저 저장 데이터

모든 목록은 localStorage에 JSON 배열로 저장하며, 소유자는 이메일로 구분합니다. 지도 탐색과 여행 플래너를 구현할 때 아래 형식에 맞춰 저장하면 마이페이지에 바로 표시됩니다.

| 키 | 항목 형식 | 작성 화면 |
| --- | --- | --- |
| `kkuni-posts` | `{ id, ownerEmail, author, category(story·hidden·qna·free), title, body, images: [{ id, width, height }], likes, createdAt, updatedAt }` | 커뮤니티 |
| `kkuni-favorites` | `{ userEmail, place: { id, name, category, sample? } }` | 지도 탐색 |
| `kkuni-markers` | `{ id, ownerEmail, category(point·store), name, lat, lng, address, desc, visibility(public·private), icon, createdAt }` | 지도 탐색 |
| `kkuni-trips` | `{ id, ownerEmail, name, start, end, origin, destination, summary, days: [{ date, places: [{ id, ... }] }], tips, model, memo, placeNotes, createdAt, updatedAt }` | 여행 플래너·마이페이지 |

게시글 사진은 용량 때문에 localStorage가 아니라 IndexedDB `kkuni-images`(store `images`)에 `{ id, full, thumb, width, height }` Blob으로 저장하고, 글에는 사진 `id`만 남깁니다. 첨부할 때 브라우저에서 자동으로 크기를 맞춥니다.

- `full`: 비율을 유지한 채 긴 변을 1600px 이하로 줄인 JPEG. 상세 화면에서 창 폭과 높이(최대 520px) 안에 잘림 없이 표시합니다.
- `thumb`: 가운데를 2:1로 잘라 640×320으로 만든 JPEG. 카드 썸네일 칸도 2:1이라 추가로 잘리거나 여백이 생기지 않습니다. 비율을 바꾸려면 `js/community.js`의 `THUMB_WIDTH`/`THUMB_HEIGHT`와 `css/community.css`의 `.post-thumb` `aspect-ratio`를 함께 바꿉니다.
- 글당 최대 4장, 원본 20MB 이하, JPG·PNG·WebP·GIF·AVIF를 받습니다. 휴대폰 사진의 회전 정보를 반영하고, 투명 배경은 흰색으로 채웁니다. GIF 애니메이션은 첫 장면만 저장됩니다.

장소 `category`는 `point`, `store`, `attraction`, `restaurant`, `lodging`, `festival` 중 하나입니다. 마이페이지에서 등록 장소를 삭제하면 모든 사용자의 관심 장소와 여행 일정에서 같은 `id`의 장소도 제거됩니다. 회원 탈퇴는 확인 문구 `탈퇴`와 현재 비밀번호를 확인한 뒤 계정과 본인 소유의 위 데이터를 모두 지우고 로그아웃합니다.

## 로그인 검증

프로젝트 폴더에서 `node --test`를 실행합니다. 브라우저 DOM과 저장소 경계를 재현하고 실제 Web Crypto를 사용해 저장 후 재접속, 중복 가입, 틀린 비밀번호, 저장 오류와 데모 로그인을 검사합니다.
