import { useEffect, useRef, useState } from 'react'
import { Map, MapPin, Building2, Phone, Navigation } from 'lucide-react'

declare global {
  interface Window {
    kakao: any
  }
}

const LOCATIONS = [
  { name: '본사 (서울)', address: '서울특별시 성동구 아차산로 78', tel: '02-2253-4000', lat: 37.5469, lng: 127.0559, dept: '경영지원팀', color: '#4f46e5' },
  { name: '안양공장', address: '경기도 안양시 만안구 삼막로 155', tel: '031-444-1234', lat: 37.3943, lng: 126.9568, dept: '안양공장품질관리실', color: '#0891b2' },
  { name: '인천공장', address: '인천광역시 남동구 논현동 100', tel: '032-820-1234', lat: 37.4105, lng: 126.7245, dept: '인천공장품질관리실', color: '#059669' },
  { name: '파주공장', address: '경기도 파주시 탄현면 금승리 100', tel: '031-940-1234', lat: 37.7668, lng: 126.7291, dept: '파주공장품질관리실', color: '#d97706' },
  { name: '양산공장', address: '경상남도 양산시 웅상읍 100', tel: '055-380-1234', lat: 35.3795, lng: 129.1842, dept: '양산공장품질관리실', color: '#dc2626' },
]

export default function MapPage() {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const [selected, setSelected] = useState<number>(0)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapError, setMapError] = useState(false)

  // 카카오 지도 스크립트 동적 로드
  useEffect(() => {
    const KAKAO_KEY = import.meta.env.VITE_KAKAO_MAP_KEY
    if (!KAKAO_KEY) { setMapError(true); return }

    if (window.kakao?.maps) {
      setMapLoaded(true)
      return
    }

    const script = document.createElement('script')
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_KEY}&autoload=false`
    script.async = true
    script.onload = () => {
      window.kakao.maps.load(() => setMapLoaded(true))
    }
    script.onerror = () => {
      // Kakao 실패 시 Google Maps iframe 대체
      setMapError(true)
    }
    document.head.appendChild(script)
  }, [])

  // 지도 초기화
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return

    const center = new window.kakao.maps.LatLng(37.3, 127.5)
    const map = new window.kakao.maps.Map(mapRef.current, {
      center,
      level: 10,
    })
    mapInstance.current = map

    // 마커 및 인포윈도우 생성
    const infowindow = new window.kakao.maps.InfoWindow({ zIndex: 1 })

    const markers = LOCATIONS.map((loc, i) => {
      const position = new window.kakao.maps.LatLng(loc.lat, loc.lng)

      // 커스텀 마커 이미지
      const markerImage = new window.kakao.maps.MarkerImage(
        `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" width="30" height="36" viewBox="0 0 30 36">
            <path d="M15 0C6.716 0 0 6.716 0 15c0 10.313 13.125 21 15 21S30 25.313 30 15C30 6.716 23.284 0 15 0z" fill="${loc.color}"/>
            <circle cx="15" cy="14" r="6" fill="white"/>
          </svg>
        `)}`,
        new window.kakao.maps.Size(30, 36),
        new window.kakao.maps.Point(15, 36)
      )

      const marker = new window.kakao.maps.Marker({ position, image: markerImage, map })

      window.kakao.maps.event.addListener(marker, 'click', () => {
        infowindow.setContent(`
          <div style="padding:10px 14px;min-width:180px;font-family:Pretendard,sans-serif">
            <p style="font-weight:700;font-size:13px;color:#1f2937;margin-bottom:4px">${loc.name}</p>
            <p style="font-size:11px;color:#6b7280;margin-bottom:2px">${loc.address}</p>
            <p style="font-size:11px;color:#6b7280">${loc.tel}</p>
          </div>
        `)
        infowindow.open(map, marker)
        setSelected(i)
      })

      return marker
    })

    markersRef.current = markers

    // 첫 번째 위치 표시
    moveTo(0)
  }, [mapLoaded])

  function moveTo(idx: number) {
    setSelected(idx)
    if (!mapInstance.current) return
    const loc = LOCATIONS[idx]
    const position = new window.kakao.maps.LatLng(loc.lat, loc.lng)
    mapInstance.current.panTo(position)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
          <Map size={22} className="text-brand-600" />지도
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">(주)동양 사업장 위치 안내</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 카카오 지도 */}
        <div className="lg:col-span-2 card overflow-hidden" style={{ height: '480px' }}>
          {mapError ? (
            // Kakao 로드 실패 시 Google Maps iframe으로 대체
            <iframe
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://www.google.com/maps/embed/v1/place?key=${import.meta.env.VITE_GOOGLE_MAPS_KEY}&q=${encodeURIComponent(LOCATIONS[selected].address)}&zoom=14&language=ko`}
            />
          ) : !mapLoaded ? (
            <div className="w-full h-full flex items-center justify-center bg-gray-50">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-gray-500">지도 로딩 중...</p>
              </div>
            </div>
          ) : (
            <div ref={mapRef} className="w-full h-full" />
          )}
        </div>

        {/* 사업장 목록 */}
        <div className="space-y-3">
          <p className="font-bold text-gray-900">사업장 목록</p>
          {LOCATIONS.map((loc, i) => (
            <button
              key={i}
              onClick={() => moveTo(i)}
              className={`w-full text-left card p-4 transition-all duration-200 ${
                selected === i
                  ? 'border-brand-200 bg-brand-50/30 shadow-md'
                  : 'hover:border-brand-200 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                  style={{ backgroundColor: loc.color + '20', color: loc.color }}
                >
                  <Building2 size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-sm text-gray-900">{loc.name}</p>
                    {selected === i && (
                      <Navigation size={12} className="text-brand-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1 truncate">
                    <MapPin size={10} className="shrink-0" />{loc.address}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                    <Phone size={10} />{loc.tel}
                  </p>
                  <span
                    className="inline-flex items-center text-[10px] mt-1.5 px-2 py-0.5 rounded-full font-medium"
                    style={{ backgroundColor: loc.color + '15', color: loc.color }}
                  >
                    {loc.dept}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
