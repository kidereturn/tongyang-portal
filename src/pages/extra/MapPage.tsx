import { Map, MapPin, Building2, Phone } from 'lucide-react'

const LOCATIONS = [
  { name: '본사 (서울)', address: '서울특별시 성동구 아차산로 78', tel: '02-2253-4000', lat: 37.5469, lng: 127.0559, dept: '경영지원팀' },
  { name: '안양공장', address: '경기도 안양시 만안구 삼막로 155', tel: '031-444-1234', lat: 37.3943, lng: 126.9568, dept: '안양공장품질관리실' },
  { name: '인천공장', address: '인천광역시 남동구 논현동 100', tel: '032-820-1234', lat: 37.4105, lng: 126.7245, dept: '인천공장품질관리실' },
  { name: '파주공장', address: '경기도 파주시 탄현면 금승리 100', tel: '031-940-1234', lat: 37.7668, lng: 126.7291, dept: '파주공장품질관리실' },
  { name: '양산공장', address: '경상남도 양산시 웅상읍 100', tel: '055-380-1234', lat: 35.3795, lng: 129.1842, dept: '양산공장품질관리실' },
]

export default function MapPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
          <Map size={22} className="text-brand-600" />지도
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">(주)동양 사업장 위치 안내</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 지도 영역 */}
        <div className="lg:col-span-2 card overflow-hidden" style={{ height: '480px' }}>
          <div className="w-full h-full bg-gradient-to-br from-blue-50 to-gray-100 flex flex-col items-center justify-center relative">
            {/* 임시 지도 대체 (실제 구현 시 카카오/네이버 지도 API 사용) */}
            <div className="absolute inset-0 opacity-20">
              {/* 한국 지도 외형 */}
              <svg viewBox="0 0 300 400" className="w-full h-full">
                <path d="M100,50 L200,60 L220,100 L230,150 L210,200 L220,250 L200,300 L180,350 L150,370 L120,360 L90,320 L70,270 L80,220 L70,180 L80,130 L90,80 Z"
                  fill="#dbeafe" stroke="#93c5fd" strokeWidth="2" />
              </svg>
            </div>

            {/* 마커 표시 */}
            {LOCATIONS.map((loc, i) => (
              <div key={i} className="absolute" style={{
                left: `${(loc.lng - 125) / 5 * 100}%`,
                top: `${(38.5 - loc.lat) / 5 * 100}%`,
                transform: 'translate(-50%, -100%)'
              }}>
                <div className="bg-brand-600 text-white text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap shadow-sm font-semibold mb-0.5">
                  {loc.name}
                </div>
                <MapPin size={16} className="text-brand-600 mx-auto" />
              </div>
            ))}

            <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur rounded-lg px-3 py-2 text-xs text-gray-500">
              * 실제 지도는 카카오/네이버 API 연동 예정
            </div>
          </div>
        </div>

        {/* 사업장 목록 */}
        <div className="space-y-3">
          <p className="font-bold text-gray-900">사업장 목록</p>
          {LOCATIONS.map((loc, i) => (
            <div key={i} className="card p-4 cursor-pointer hover:border-brand-200 transition-colors group">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0 group-hover:bg-brand-100 transition-colors">
                  <Building2 size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-gray-900">{loc.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                    <MapPin size={10} />{loc.address}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                    <Phone size={10} />{loc.tel}
                  </p>
                  <span className="badge-blue text-[10px] mt-1.5 inline-flex">{loc.dept}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
