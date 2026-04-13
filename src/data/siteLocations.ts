export type SiteLocation = {
  id: string
  name: string
  postalCode: string
  address: string
  lat: number
  lng: number
}

export const SITE_LOCATIONS: SiteLocation[] = [
  { id: 'site-01', name: '기획팀(정보전략)', postalCode: '04366', address: '서울시 용산구 청파로 75, 3층 유진아이티서비스', lat: 37.5332614, lng: 126.95901 },
  { id: 'site-02', name: '건자재유통사업팀', postalCode: '49273', address: '부산 서구 원양로 291-1', lat: 35.058879, lng: 129.0119881 },
  { id: 'site-03', name: '연구개발팀', postalCode: '10024', address: '경기도 김포시 김포대로 2822-1', lat: 37.7173403, lng: 126.5451454 },
  { id: 'site-04', name: '안양공장', postalCode: '15843', address: '경기 군포시 농심로 85', lat: 37.3600791, lng: 126.9486496 },
  { id: 'site-05', name: '인천공장', postalCode: '22771', address: '인천 서구 중봉대로 386번길 19', lat: 37.4892631, lng: 126.6411828 },
  { id: 'site-06', name: '파주공장', postalCode: '10858', address: '경기 파주시 탄현면 헤이리로 199', lat: 37.8027265, lng: 126.7037667 },
  { id: 'site-07', name: '김포공장', postalCode: '10024', address: '경기 김포시 월곶면 김포대로 2822', lat: 37.7164494, lng: 126.5441967 },
  { id: 'site-08', name: '부산공장', postalCode: '49273', address: '부산 서구 원양로 268', lat: 35.074528, lng: 129.0062109 },
  { id: 'site-09', name: '서부산공장', postalCode: '46749', address: '부산 강서구 과학산단로 141', lat: 35.1330346, lng: 128.8605453 },
  { id: 'site-10', name: '김해공장', postalCode: '50853', address: '경남 김해시 한림면 김해대로 1538번길 41', lat: 35.3234, lng: 128.7537 },
  { id: 'site-11', name: '정관공장', postalCode: '46026', address: '부산 기장군 정관읍 산단7로 8-19', lat: 35.3171032, lng: 129.2065382 },
  { id: 'site-12', name: '양산공장', postalCode: '50592', address: '경남 양산시 유산공단3길 7', lat: 35.3569414, lng: 129.0263475 },
  { id: 'site-13', name: '창원공장', postalCode: '51708', address: '경남 창원시 성산구 적현로279번길 6', lat: 35.198164, lng: 128.6048004 },
  { id: 'site-14', name: '대구공장', postalCode: '38494', address: '경북 경산시 진량읍 동자1길 50', lat: 35.8460474, lng: 128.4932291 },
  { id: 'site-15', name: '울산공장', postalCode: '44962', address: '울산 울주군 옹촌면 웅촌로 607-31', lat: 35.5726442, lng: 129.3691103 },
  { id: 'site-16', name: '아산공장', postalCode: '31442', address: '충남 아산시 영인면 아산온천로 16-99', lat: 36.855097, lng: 126.9696201 },
  { id: 'site-17', name: '전주공장', postalCode: '55331', address: '전북 완주군 봉동읍 봉동로 453-30', lat: 35.9602198, lng: 127.1333937 },
  { id: 'site-18', name: '군산공장', postalCode: '54007', address: '전북 군산시 외항로 466', lat: 35.9541035, lng: 126.5537552 },
  { id: 'site-19', name: '원주공장', postalCode: '26356', address: '강원 원주시 흥업면 사제로 281', lat: 37.3095976, lng: 127.9081573 },
  { id: 'site-20', name: '제주공장', postalCode: '63299', address: '제주시 선반로14길 10', lat: 33.5135862, lng: 126.5690301 },
  { id: 'site-21', name: '골재사업소', postalCode: '49273', address: '부산 서구 원양로 291-1', lat: 35.058879, lng: 129.0119881 },
  { id: 'site-22', name: '예산공장', postalCode: '32401', address: '충남 예산군 고덕면 호음덕령길 60', lat: 36.6826993, lng: 126.7546825 },
  { id: 'site-23', name: '보령발전본부 토목공사 현장', postalCode: '33408', address: '충남 보령시 오천면 오천해안로 89-37', lat: 36.4388627, lng: 126.5195354 },
  { id: 'site-24', name: '음성 금왕 물류센터 현장', postalCode: '27680', address: '충북 음성군 금왕읍 금왕테크노1길 4', lat: 36.9915, lng: 127.5968 },
  { id: 'site-25', name: '서대문 은평지사 현장', postalCode: '122874', address: '서울시 은평구 수색동 160-1번지 2층', lat: 37.5815, lng: 126.8892 },
  { id: 'site-26', name: '이태원 111 복합문화시설 현장', postalCode: '04350', address: '서울시 용산구 이태원로27길 39-11 르씨엘 2층', lat: 37.5349, lng: 126.9943 },
  { id: 'site-27', name: '한국건강관리협회 인천사옥 현장', postalCode: '21569', address: '인천광역시 남동구 구월동 1347 3층', lat: 37.4517, lng: 126.7013 },
  { id: 'site-28', name: '광양 바이오매스 현장', postalCode: '545040', address: '전라남도 광양시 황금동 2317', lat: 34.9132611, lng: 127.6433442 },
]
