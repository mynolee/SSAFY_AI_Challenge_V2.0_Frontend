// All places below are fictional demo records. No live TourAPI request is made.
window.KKUNI = {
  categories: {
    point: { name: '낚시 포인트', color: '#2F80ED', icon: 'pin' },
    store: { name: '낚시용품점', color: '#8B65CB', icon: 'bag' },
    tour: { name: '관광지', color: '#36A58A', icon: 'sun' },
    food: { name: '음식점', color: '#EB9860', icon: 'food' },
    stay: { name: '숙박', color: '#D67EAA', icon: 'bed' },
    festival: { name: '축제·행사', color: '#E4AA39', icon: 'spark' }
  },
  regions: [
    { id: 'seoul', name: '서울특별시', short: '서울', cities: ['종로구','마포구','강남구'], lat:37.5665, lng:126.9780, story:'도시의 풍경과 한강의 여유를 만나는 서울' },
    { id:'gyeonggi', name:'경기도', short:'경기', cities:['수원시','가평군','양평군','화성시'],lat:37.4138,lng:127.5183,story:'가까이 떠나는 강과 호수의 여행' },
    { id:'incheon', name:'인천광역시',short:'인천',cities:['중구','강화군','옹진군'],lat:37.4563,lng:126.7052,story:'섬과 바다가 기다리는 인천' },
    { id:'gangwon',name:'강원특별자치도',short:'강원',cities:['강릉시','속초시','양양군','동해시'],lat:37.7519,lng:128.8761,story:'맑은 바다와 산을 함께 즐기는 여행' },
    { id:'chungbuk',name:'충청북도',short:'충북',cities:['충주시','제천시','단양군'],lat:36.9910,lng:127.9259,story:'잔잔한 호수 곁에서 쉬어가는 하루' },
    { id:'chungnam',name:'충청남도',short:'충남',cities:['태안군','보령시','서산시','당진시'],lat:36.7456,lng:126.2980,story:'노을이 아름다운 서해 여행' },
    { id:'daejeon',name:'대전광역시',short:'대전',cities:['동구','유성구','대덕구'],lat:36.3504,lng:127.3845,story:'대청호와 함께하는 여유로운 여행' },
    { id:'sejong',name:'세종특별자치시',short:'세종',cities:['세종시'],lat:36.4800,lng:127.2890,story:'금강을 따라 만나는 새로운 풍경' },
    { id:'gyeongbuk',name:'경상북도',short:'경북',cities:['포항시','경주시','울진군','영덕군'],lat:36.0190,lng:129.3435,story:'동해의 풍경과 오래된 이야기를 찾아서' },
    { id:'daegu',name:'대구광역시',short:'대구',cities:['수성구','달성군','군위군'],lat:35.8714,lng:128.6014,story:'강변의 여유와 도시의 맛을 만나보세요' },
    { id:'jeonbuk',name:'전북특별자치도',short:'전북',cities:['군산시','부안군','고창군','전주시'],lat:35.9677,lng:126.7369,story:'맛과 풍경을 함께 즐기는 전북' },
    { id:'gwangju',name:'광주광역시',short:'광주',cities:['동구','북구','광산구'],lat:35.1595,lng:126.8526,story:'문화와 맛으로 채우는 하루' },
    { id:'jeonnam',name:'전라남도',short:'전남',cities:['목포시','여수시','순천시','나주시','광양시','담양군','곡성군','구례군','고흥군','보성군','화순군','장흥군','강진군','해남군','영암군','무안군','함평군','영광군','장성군','완도군','진도군','신안군'],lat:34.7604,lng:127.6622,story:'다도해의 섬과 깊은 맛, 초록빛 정원이 펼쳐지는 남도' },
    { id:'gyeongnam',name:'경상남도',short:'경남',cities:['통영시','거제시','남해군','창원시'],lat:34.8544,lng:128.4330,story:'남쪽 바다에서 찾는 나만의 여행' },
    { id:'busan',name:'부산광역시',short:'부산',cities:['해운대구','기장군','영도구','수영구'],lat:35.1631,lng:129.1635,story:'낚시도 여행도, 바다 도시 부산에서' },
    { id:'ulsan',name:'울산광역시',short:'울산',cities:['동구','북구','울주군'],lat:35.5384,lng:129.3114,story:'푸른 해안선 따라 떠나는 여행' },
    { id:'jeju',name:'제주특별자치도',short:'제주',cities:['제주시','서귀포시'],lat:33.4996,lng:126.5312,story:'섬의 바람을 따라 즐기는 낚시 여행' }
  ],
  seeds: [
    {id:'p1',category:'point',name:'푸른 방파제 포인트',lat:34.7410,lng:127.6920,address:'전라남도 여수시 · 가상 예시 위치',desc:'바다를 바라보며 하루를 보내는 포인트. 주변 먹거리와 산책 장소를 함께 담아보세요.',tags:['바다낚시','방파제','초보자'],scene:'coast'},
    {id:'s1',category:'store',name:'꾸니 낚시용품점',lat:34.7500,lng:127.6850,address:'전라남도 여수시 · 가상 예시 위치',desc:'낚시 준비에 필요한 용품을 찾아보는 예시 매장입니다. 운영시간과 재고 정보는 실제 연동 후 제공됩니다.',tags:['낚시용품','여행 준비'],scene:'store'},
    {id:'t1',category:'tour',name:'달빛 해안 산책길',lat:34.7540,lng:127.6980,address:'전라남도 여수시 · 가상 예시 위치',desc:'낚시를 마친 뒤 바닷바람을 느끼며 걸어보세요. 가상의 관광 장소를 이용한 추천 시안입니다.',tags:['해안산책','풍경'],scene:'coast'},
    {id:'f1',category:'food',name:'바다한상',lat:34.7480,lng:127.6900,address:'전라남도 여수시 · 가상 예시 위치',desc:'여행 중 함께 즐길 음식점을 추천하는 예시입니다. 메뉴와 가격은 실제 데이터 연동이 필요합니다.',tags:['지역 먹거리','식사'],scene:'food'},
    {id:'h1',category:'stay',name:'오션스테이',lat:34.7580,lng:127.6870,address:'전라남도 여수시 · 가상 예시 위치',desc:'여행의 마지막을 편안하게 채워줄 예시 숙소입니다. 예약과 객실 정보는 제공하지 않습니다.',tags:['바다 뷰','하룻밤'],scene:'stay'},
    {id:'p2',category:'point',name:'고요한 갯바위 포인트',lat:34.7730,lng:127.7120,address:'전라남도 여수시 · 가상 예시 위치',desc:'내가 발견한 장소를 공유하는 숨은 포인트 예시입니다. 실제 낚시 가능 여부는 확인되지 않은 데모입니다.',tags:['숨은 포인트','갯바위'],scene:'coast'},
    {id:'e1',category:'festival',name:'꾸니 바다 여행 페스티벌',lat:34.7650,lng:127.7020,address:'전라남도 여수시 · 가상 예시 위치',desc:'지역 축제와 행사 정보를 함께 추천하는 레이아웃 예시입니다. 실제 개최 행사가 아닙니다.',tags:['가상 행사','지역 여행'],scene:'festival'}
  ],
  posts:[
    {id:'post1',title:'낚시하고 나서, 여수에서 하루 더 머물렀어요',body:'아침에는 포인트에 들르고 오후에는 해안 산책을 즐기는 일정은 어떨까요? 나만의 낚시 여행 이야기를 들려주세요. 이 글은 화면 구성을 위한 예시입니다.',category:'여행 이야기',author:'여행하는 꾸니',scene:'coast',likes:12,date:'예시 게시글'},
    {id:'post2',title:'처음 떠나는 바다낚시, 준비물은 무엇일까요?',body:'초보 낚시꾼의 질문을 나누는 공간입니다. 출발 전 필요한 준비물을 함께 정리해봐요. 예시 게시글이며 전문 안내가 아닙니다.',category:'질문·답변',author:'초보 꾸니',scene:'store',likes:8,date:'예시 게시글'},
    {id:'post3',title:'나만 알고 있던 작은 산책길을 공유해요',body:'낚시 포인트 근처에서 발견한 풍경, 마음에 들었던 먹거리와 숙소를 자유롭게 소개해주세요. 화면용 예시입니다.',category:'숨은 장소',author:'바다 산책자',scene:'stay',likes:17,date:'예시 게시글'}
  ]
};
