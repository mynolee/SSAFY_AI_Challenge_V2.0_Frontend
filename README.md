# EnjoyTrip FrontEnd

`C:\EnjoyTrip_ChatBot\clients\index_fishing.html`의 낚시 여행 화면을 옮긴 정적 프런트엔드입니다.

## 구성

- `index.html`: 낚시꾸니 헤더와 여행 지역 선택 화면. 전국 17개 시도 지도는 HTML 안에 SVG 마크업으로 포함했습니다.
- `낚시꾸니.png`: 헤더 로고
- `style.css`: 헤더, 지도, 지역 목록 스타일
- `script.js`: 지도와 시·군 선택, 선택 상태 복원

원본의 Python 서버, 데이터, 채팅·업로드 화면과 코드는 포함하지 않았습니다. 지도 경계 데이터의 원본은 [korea-maps](https://github.com/swcho/korea-maps)입니다.

## 실행

브라우저에서 `index.html`을 열거나 정적 파일 서버로 이 폴더를 실행합니다. 지도와 지역 선택에는 백엔드가 필요하지 않습니다.
