window.escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
window.icon = (name, size=20) => {
  const paths = {
    pin:'<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    map:'<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Z"/><path d="M9 3v16m6-14v16"/>',
    bag:'<rect x="4" y="7" width="16" height="14" rx="3"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/>',
    sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/>',
    food:'<path d="M5 3v7m3-7v7m3-7v7M5 7h6m-3 3v11M19 3c-4 3-4 9 0 9V3Zm0 9v9"/>',
    bed:'<path d="M3 9v12m18-12v12M3 17h18M3 13h18V8H3v5Zm3 0V9h5v4m2 0V9h5v4"/>',
    spark:'<path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2Z"/>',
    search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
    up:'<path d="M7 17 17 7M7 7h10v10"/>',
    heart:'<path d="M20.8 4.6c-2.6-2.7-6.2-1.8-8.8 1-2.6-2.8-6.2-3.7-8.8-1-2.6 2.6-1 6.5.5 8L12 21l8.3-8.4c1.5-1.5 3.1-5.4.5-8Z"/>',
    user:'<circle cx="12" cy="8" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/>',
    plus:'<path d="M12 4v16M4 12h16"/>',
    check:'<path d="m5 12 4 4L19 6"/>',
    close:'<path d="m6 6 12 12M6 18 18 6"/>',
    calendar:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18m-13 4h2m4 0h2"/>',
    share:'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.5 10.5 7-4m-7 7 7 4"/>',
    layers:'<path d="m12 3 10 5-10 5L2 8l10-5Zm-10 9 10 5 10-5M2 16l10 5 10-5"/>',
    chat:'<path d="M21 11c0 5-4 8-9 8H6l-4 3 1-7a8 8 0 0 1-1-4c0-5 4-8 10-8s9 3 9 8Z"/><path d="M7 10h10m-10 4h6"/>',
    trash:'<path d="M3 6h18M8 6V3h8v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
    back:'<path d="m10 5-7 7 7 7M3 12h18"/>',
    lock:'<rect x="4" y="10" width="16" height="12" rx="3"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/>',
    edit:'<path d="m14 5 5 5M4 20l4-1 13-13-4-4L4 15v5Z"/>',
    route:'<circle cx="5" cy="5" r="3"/><circle cx="19" cy="19" r="3"/><path d="M8 5h8a4 4 0 0 1 0 8H8a3 3 0 0 0 0 6h8"/>',
    copy:'<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>'
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.pin}</svg>`;
};
window.scene = (kind='coast', label='') => {
  const extras = {
    coast:'<path d="M0 225 110 206 186 217 256 240 340 224 420 210v70H0Z" fill="#94BAD9"/><path d="m62 229 40-18 66 12 24 25-140 18Z" fill="#FFFFFF" opacity=".78"/><path d="M72 198v40m0-40 50 12" stroke="#365D81" stroke-width="3"/><path d="M122 210q0 25-13 30" fill="none" stroke="#365D81"/>',
    store:'<rect x="108" y="119" width="201" height="150" rx="8" fill="#FFFFFF"/><path d="M94 119h230l-25-44H119Z" fill="#789DD1"/><path d="M97 119h225v22q-10 19-27 0-14 20-29 0-15 20-30 0-15 20-29 0-15 20-29 0-15 20-29 0-18 18-22 0Z" fill="#CEDFF6"/><rect x="135" y="170" width="62" height="69" rx="5" fill="#DDEAF8"/><rect x="221" y="169" width="58" height="100" rx="5" fill="#ADC9E9"/><path d="M150 220q25-65 31-22" fill="none" stroke="#5B83AD" stroke-width="3"/>',
    food:'<ellipse cx="212" cy="214" rx="120" ry="41" fill="#91B8DE"/><ellipse cx="212" cy="195" rx="112" ry="46" fill="white"/><ellipse cx="212" cy="193" rx="89" ry="31" fill="#EED7B8"/><path d="m171 187 35-22 43 22-29 30Z" fill="#DF927A"/><ellipse cx="248" cy="184" rx="20" ry="9" fill="#9AB998"/><path d="m299 144 51 63m-44-73 50 62" stroke="#547592" stroke-width="4"/>',
    stay:'<path d="M92 143 208 74 323 143" fill="#8DADD2"/><rect x="111" y="141" width="193" height="132" rx="4" fill="#FDFEFF"/><rect x="189" y="201" width="36" height="72" rx="5" fill="#94B8DF"/><g fill="#D9E7F6"><rect x="138" y="162" width="30" height="29" rx="3"/><rect x="246" y="162" width="30" height="29" rx="3"/><rect x="138" y="217" width="30" height="29" rx="3"/><rect x="246" y="217" width="30" height="29" rx="3"/></g>',
    festival:'<path d="M54 134q145-75 309 0" fill="none" stroke="#567C9E" stroke-width="2"/><path d="m77 122 15 34 17-44m37-8 15 37 18-40m39-2 16 36 19-34m39 9 15 38 17-28" fill="#E7AD90"/><path d="M150 257v-62l60-53 63 53v62Z" fill="#FFFFFF"/><path d="m140 193 70-57 74 57Z" fill="#88ABD6"/>'
  };
  return `<svg class="scene" viewBox="0 0 420 280" role="img" aria-label="${escapeHTML(label||'가상 장소 일러스트')}"><defs><linearGradient id="sea-${kind}" x2="0" y2="1"><stop stop-color="#DAE7F8"/><stop offset="1" stop-color="#BCD4EE"/></linearGradient></defs><rect width="420" height="280" fill="url(#sea-${kind})"/><circle cx="320" cy="70" r="29" fill="#FAE6CB"/><path d="M0 151q67-36 128-8t123 0 169 5v132H0Z" fill="#ABC9E7"/><path d="M0 189q63-19 140 0t148 0 132 6" fill="none" stroke="#E9F3FC" stroke-width="2"/><path d="M0 236q109-17 225 4t195-9" fill="none" stroke="#E9F3FC" stroke-width="2"/>${extras[kind]||extras.coast}<g stroke="#6D90B6" stroke-width="2" fill="none"><path d="m118 53 6-4 6 4m-56 36 6-4 6 4"/></g></svg>`;
};
window.distance = (a,b) => {
  const rad = n => n * Math.PI / 180;
  const dlat = rad(b.lat-a.lat), dlng=rad(b.lng-a.lng);
  const v = Math.sin(dlat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dlng/2)**2;
  return 6371*2*Math.atan2(Math.sqrt(v),Math.sqrt(1-v));
};
window.formatDistance = km => km < 1 ? `${Math.round(km*1000)}m` : `${km.toFixed(1)}km`;
// Coordinates are projected within explicit bounds. The decorative coastline is a UI illustration.
window.localMap = (places, options={}) => {
  const center = options.center || {lat:34.756,lng:127.692};
  const fitted = (options.fit||!options.pick)&&places.length>1;
  const points = fitted ? places : [center];
  const latSpan=Math.max(...points.map(p=>p.lat))-Math.min(...points.map(p=>p.lat));
  const lngSpan=Math.max(...points.map(p=>p.lng))-Math.min(...points.map(p=>p.lng));
  const latPad=fitted?Math.max(.004,latSpan*.22):.030;
  const lngPad=fitted?Math.max(.006,lngSpan*.22):.043;
  const latMin=Math.min(...points.map(p=>p.lat))-latPad,latMax=Math.max(...points.map(p=>p.lat))+latPad;
  const lngMin=Math.min(...points.map(p=>p.lng))-lngPad,lngMax=Math.max(...points.map(p=>p.lng))+lngPad;
  const x = p => (p.lng-lngMin)/(lngMax-lngMin)*1000;
  const y = p => (latMax-p.lat)/(latMax-latMin)*680;
  const route = options.route ? `<polyline points="${places.map(p=>`${x(p)},${y(p)}`).join(' ')}" fill="none" stroke="#2F80ED" stroke-width="4" stroke-linejoin="round" stroke-dasharray="8 7"/>` : '';
  const markers = places.map((p,i) => {
    const cat=KKUNI.categories[p.category]||KKUNI.categories.point;
    const px=x(p), py=y(p);
    if(px<0||px>1000||py<0||py>680)return '';
    return `<g class="map-marker ${options.selected===p.id?'selected':''}" transform="translate(${px},${py})" data-place="${escapeHTML(p.id)}" tabindex="0" role="button" aria-label="${escapeHTML(cat.name+' '+p.name)}"><title>${escapeHTML(p.name)}</title><circle r="${options.selected===p.id?31:27}" fill="${cat.color}" opacity=".13"/><path d="M0 10C-27-13-16-33 0-33S27-13 0 10Z" fill="${cat.color}" stroke="white" stroke-width="3"/><text y="-13" text-anchor="middle" fill="white" font-size="15" font-weight="700">${options.route?i+1:({point:'P',store:'S',tour:'T',food:'F',stay:'H',festival:'E'}[p.category]||'P')}</text><rect x="-75" y="17" width="150" height="28" rx="14" fill="white" opacity=".96"/><text y="36" text-anchor="middle" fill="#274969" font-size="13">${escapeHTML(p.name.slice(0,12))}</text></g>`;
  }).join('');
  return `<div class="local-map ${options.pick?'pick-map':''}" ${options.pick?'id="pick-map"':''}>
  <svg class="map-svg" viewBox="0 0 1000 680" preserveAspectRatio="none" data-bounds="${lngMin},${lngMax},${latMin},${latMax}" aria-label="좌표를 표시하는 시안 지도">
  <defs><pattern id="mapgrid" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M60 0H0V60" fill="none" stroke="#C9D9ED" stroke-width=".6"/></pattern></defs>
  <rect width="1000" height="680" fill="#DCE8F6"/><rect width="1000" height="680" fill="url(#mapgrid)"/>
  <path d="M0 0H666L648 69 674 112 623 168 668 231 617 264 601 334 542 344 505 414 453 456 427 544 322 594 268 680H0Z" fill="#EEF3F9" stroke="#FFFFFF" stroke-width="5"/>
  <path d="M40 98 462 121 545 91M88 290 369 297 604 207M19 506 335 478 505 414M163 0 207 193 253 375 226 601M359 0 347 217 384 445" fill="none" stroke="#D2DFF0" stroke-width="12" stroke-linejoin="round"/>
  <path d="M40 98 462 121 545 91M88 290 369 297 604 207M19 506 335 478 505 414M163 0 207 193 253 375 226 601M359 0 347 217 384 445" fill="none" stroke="white" stroke-width="6" stroke-linejoin="round"/>
  <path d="m87 152 96-38 60 52-72 55-76-20Zm198 182 80-15 40 29-23 55-105-21ZM75 414l82-26 37 37-56 52-69-10Z" fill="#DFEADD"/>
  <g fill="#9EB3CB" font-family="sans-serif" font-size="16"><text x="90" y="82">낚시 여행 지도</text><text x="755" y="327">바다</text><text x="100" y="349">여행의 시작</text></g>
  ${route}${markers}</svg>
  <div class="map-top"><span class="floating-label">${icon(options.pick?'pin':'map',16)} ${options.pick?'지도를 클릭해 위치를 선택하세요':'주변 장소를 한눈에 살펴보세요'}</span></div>
  <div class="map-bottom"><span class="map-disclaimer">좌표 시안 지도 · 해안선은 일러스트입니다</span><span class="coord-caption">${center.lat.toFixed(5)}, ${center.lng.toFixed(5)}</span></div>
  </div>`;
};
window.koreaMap = (selected='jeonnam') => {
  const shapes = [
    ['gangwon','M337 119 377 49 394 85 403 121 431 164 446 201 482 250 422 279 385 253 359 222Z',403,171],
    ['gyeonggi','M277 138 311 110 337 119 359 173 359 222 324 249 286 246 257 212 253 177Z',302,202],
    ['incheon','M243 185 254 176 257 211 279 234 263 251 242 231 228 213Z',237,205],
    ['chungbuk','M324 249 359 222 385 253 422 279 402 306 372 332 361 372 338 363 337 324 313 297Z',362,296],
    ['chungnam','M263 251 286 246 324 249 313 297 337 324 338 363 311 384 272 370 247 337 239 302 217 276Z',272,313],
    ['gyeongbuk','M422 279 482 250 483 304 491 363 497 410 477 438 426 429 397 402 361 372 372 332 402 306Z',444,348],
    ['jeonbuk','M272 370 311 384 338 363 361 372 397 402 376 448 334 466 306 443 270 451 245 428 246 391Z',313,414],
    ['gyeongnam','M397 402 426 429 477 438 482 476 457 500 443 530 397 540 373 520 344 527 334 493 334 466 376 448Z',411,486],
    ['jeonnam','M245 428 270 451 306 443 334 466 334 493 344 527 328 567 296 554 267 570 244 553 218 570 198 541 204 514 179 503 203 477 209 451Z',265,510],
    ['jeju','M211 671q42-28 87-11l-2 19q-48 29-92 14Z',251,679],
    ['seoul','M285 193 299 183 314 195 308 212 291 214Z',300,198],
    ['sejong','M315 318 328 320 330 340 317 343Z',324,328],
    ['daejeon','M326 345 342 341 351 357 340 375 325 368Z',339,359],
    ['daegu','M426 389 440 390 450 404 442 419 425 416 420 401Z',436,407],
    ['gwangju','M269 480 291 475 304 489 294 505 273 502Z',287,492],
    ['ulsan','M477 438 495 432 506 454 489 478 482 476Z',493,456],
    ['busan','M457 500 482 476 494 493 476 513 464 521 443 530Z',474,502]
  ];
  return `<svg class="korea-map" viewBox="140 20 420 700" aria-label="대한민국 시도 선택 지도"><g stroke="#FFFFFF" stroke-width="2.8" stroke-linejoin="round">${shapes.map(([id,path,x,y])=>`<g data-region="${id}" class="province ${selected===id?'active':''}" tabindex="0" role="button" aria-label="${KKUNI.regions.find(r=>r.id===id).name}"><title>${KKUNI.regions.find(r=>r.id===id).name}</title><path d="${path}"/><text x="${x}" y="${y}" text-anchor="middle" stroke="none" font-size="12">${KKUNI.regions.find(r=>r.id===id).short}</text></g>`).join('')}<g fill="#94B6DC"><path d="m170 527 9 3-3 12-10-4Zm16 23 10 8-7 6-9-7Zm14 23 9 1-2 9-11 1Zm30 3 11-1 5 6-11 5Z"/><circle cx="499" cy="173" r="4"/></g></g></svg>`;
};
