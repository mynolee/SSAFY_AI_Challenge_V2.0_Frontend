# EnjoyTrip FrontEnd

`C:\EnjoyTrip_ChatBot\clients\index_fishing.html`의 낚시 여행 화면을 옮긴 정적 프런트엔드입니다.

## 구성

| 담당 화면 | HTML | JS | 현재 기능 |
| --- | --- | --- | --- |
| 지역 선택 홈 | `index.html` | `js/main.js` | 전국 17개 시도 지도, 시·군 선택, 선택 상태 저장·복원 |
| 지도 탐색 | `map.html` | `js/map.js` | 지도 탐색 화면 틀 |
| 여행 플래너 | `travel.html` | `js/travel.js` | 여행 플래너 화면 틀 |
| 커뮤니티 | `community.html` | `js/community.js` | 커뮤니티 화면 틀 |
| 로그인 | `login.html` | `js/login.js` | 회원가입 창, 로컬 회원 저장, 로그인, 데모 계정 |

각 페이지는 자기 JS 파일만 불러옵니다. 담당자는 해당 HTML에서 화면 구조를, 해당 JS에서 이벤트와 기능을 수정하면 됩니다. 메뉴는 일반 링크로 각 HTML 페이지에 이동합니다. 헤더는 각 HTML에 포함되어 있으며, 현재 메뉴의 `active` 클래스와 `aria-current="page"`도 HTML에서 지정합니다.

공통 스타일은 `css/main.css`, 헤더 로고는 `img/icons/03-낚시꾸니.png`입니다. 지역 선택의 시·군 버튼은 `index.html`의 `<template>`을 복제한 뒤 텍스트와 이벤트를 연결합니다. JS에는 HTML 문자열이나 `innerHTML`을 사용하지 않습니다.

원본의 Python 서버, 데이터, 채팅·업로드 화면과 코드는 포함하지 않았습니다. 지도 경계 데이터의 원본은 [korea-maps](https://github.com/swcho/korea-maps)입니다.

## 실행

브라우저에서 `index.html` 또는 작업할 페이지의 HTML을 직접 열거나, 정적 파일 서버로 이 폴더를 실행합니다. 지도와 지역 선택에는 백엔드가 필요하지 않습니다.

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

## 로그인 검증

프로젝트 폴더에서 `node --test`를 실행합니다. 브라우저 DOM과 저장소 경계를 재현하고 실제 Web Crypto를 사용해 저장 후 재접속, 중복 가입, 틀린 비밀번호, 저장 오류와 데모 로그인을 검사합니다.
