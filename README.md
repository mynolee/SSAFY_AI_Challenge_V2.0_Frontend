# EnjoyTrip FrontEnd

`C:\EnjoyTrip_ChatBot\clients\index_fishing.html`의 낚시 여행 화면을 옮긴 정적 프런트엔드입니다.

## 구성

- `index.html`: 앱 진입점과 스타일·스크립트 로드
- `img/낚시꾸니.png`: 헤더 로고
- `css/main.css`: 헤더, 지도, 지역 목록, 화면 틀 스타일
- `js/main.js`: 헤더와 지역 선택 화면 렌더링, 메뉴 이동, 지도와 시·군 선택 상태 복원. 전국 17개 시도 SVG도 이 파일에 포함되어 있습니다.
- `js/map.js`, `js/travel.js`, `js/community.js`, `js/login.js`: 각 메뉴의 화면 시작점

원본의 Python 서버, 데이터, 채팅·업로드 화면과 코드는 포함하지 않았습니다. 지도 경계 데이터의 원본은 [korea-maps](https://github.com/swcho/korea-maps)입니다.

## 실행

브라우저에서 `index.html`을 열거나 정적 파일 서버로 이 폴더를 실행합니다. 메뉴는 URL의 `#region`, `#map`, `#travel`, `#community`, `#login`으로 이동합니다. 지도와 지역 선택에는 백엔드가 필요하지 않습니다.
