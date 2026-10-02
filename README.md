# EnjoyTrip FrontEnd

`C:\EnjoyTrip_ChatBot\clients\index_fishing.html`의 낚시 여행 화면을 옮긴 정적 프런트엔드입니다.

## 구성

| 담당 화면 | HTML | JS | 현재 기능 |
| --- | --- | --- | --- |
| 지역 선택 홈 | `index.html` | `js/main.js` | 전국 17개 시도 지도, 시·군 선택, 선택 상태 저장·복원 |
| 지도 탐색 | `map.html` | `js/map.js` | 지도 탐색 화면 틀 |
| 여행 플래너 | `travel.html` | `js/travel.js` | 여행 플래너 화면 틀 |
| 커뮤니티 | `community.html` | `js/community.js` | 커뮤니티 화면 틀 |
| 로그인 | `login.html` | `js/login.js` | 로그인 화면 틀 |

각 페이지는 자기 JS 파일만 불러옵니다. 담당자는 해당 HTML에서 화면 구조를, 해당 JS에서 이벤트와 기능을 수정하면 됩니다. 메뉴는 일반 링크로 각 HTML 페이지에 이동합니다. 헤더는 각 HTML에 포함되어 있으며, 현재 메뉴의 `active` 클래스와 `aria-current="page"`도 HTML에서 지정합니다.

공통 스타일은 `css/main.css`, 헤더 로고는 `img/icons/03-낚시꾸니.png`입니다. 지역 선택의 시·군 버튼은 `index.html`의 `<template>`을 복제한 뒤 텍스트와 이벤트를 연결합니다. JS에는 HTML 문자열이나 `innerHTML`을 사용하지 않습니다.

원본의 Python 서버, 데이터, 채팅·업로드 화면과 코드는 포함하지 않았습니다. 지도 경계 데이터의 원본은 [korea-maps](https://github.com/swcho/korea-maps)입니다.

## 실행

브라우저에서 `index.html` 또는 작업할 페이지의 HTML을 직접 열거나, 정적 파일 서버로 이 폴더를 실행합니다. 지도와 지역 선택에는 백엔드가 필요하지 않습니다.
