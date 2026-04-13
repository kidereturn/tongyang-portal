import { useEffect, useMemo, useRef, useState } from 'react'
import { Building2, Map, MapPin, Navigation, Search } from 'lucide-react'
import clsx from 'clsx'
import { SITE_LOCATIONS } from '../../data/siteLocations'

declare global {
  interface Window {
    kakao?: {
      maps: any
    }
  }
}

type Provider = 'kakao' | 'google' | 'vworld'

const PROVIDERS: Array<{ id: Provider; label: string; description: string }> = [
  { id: 'kakao', label: 'Kakao 지도', description: '가장 빠르게 이동하고 마커를 직접 확인' },
  { id: 'google', label: 'Google 지도', description: '키 없이 안정적으로 임베드 표시' },
  { id: 'vworld', label: 'VWorld 지도', description: '국내 지도 포털 화면으로 비교 확인' },
]

export default function MapPage() {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const [provider, setProvider] = useState<Provider>('google')
  const [selectedId, setSelectedId] = useState(SITE_LOCATIONS[0]?.id ?? '')
  const [search, setSearch] = useState('')
  const [kakaoReady, setKakaoReady] = useState(false)

  const selectedLocation = useMemo(
    () => SITE_LOCATIONS.find(location => location.id === selectedId) ?? SITE_LOCATIONS[0],
    [selectedId]
  )

  const filteredLocations = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    if (!keyword) return SITE_LOCATIONS

    return SITE_LOCATIONS.filter(location =>
      [location.name, location.address, location.postalCode]
        .some(value => value.toLowerCase().includes(keyword))
    )
  }, [search])

  useEffect(() => {
    if (!import.meta.env.VITE_KAKAO_MAP_KEY) return
    if (window.kakao?.maps) {
      setKakaoReady(true)
      return
    }

    const script = document.createElement('script')
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${import.meta.env.VITE_KAKAO_MAP_KEY}&autoload=false`
    script.async = true
    script.onload = () => {
      window.kakao?.maps.load(() => setKakaoReady(true))
    }

    document.head.appendChild(script)
    return () => {
      document.head.removeChild(script)
    }
  }, [])

  useEffect(() => {
    if (!kakaoReady || !mapRef.current || !selectedLocation) return

    const center = new window.kakao!.maps.LatLng(selectedLocation.lat, selectedLocation.lng)
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new window.kakao!.maps.Map(mapRef.current, {
        center,
        level: 9,
      })

      markersRef.current = SITE_LOCATIONS.map(location => {
        const marker = new window.kakao!.maps.Marker({
          map: mapInstanceRef.current,
          position: new window.kakao!.maps.LatLng(location.lat, location.lng),
          title: location.name,
        })

        const infoWindow = new window.kakao!.maps.InfoWindow({
          content: `
            <div style="padding:10px 12px; min-width:220px; font-family:Pretendard,sans-serif;">
              <div style="font-weight:700; color:#111827; margin-bottom:4px;">${location.name}</div>
              <div style="font-size:12px; color:#475569;">${location.address}</div>
            </div>
          `,
        })

        window.kakao!.maps.event.addListener(marker, 'click', () => {
          setSelectedId(location.id)
          infoWindow.open(mapInstanceRef.current, marker)
        })

        return { id: location.id, marker, infoWindow }
      })
    }

    mapInstanceRef.current.setCenter(center)
    mapInstanceRef.current.setLevel(4)

    markersRef.current.forEach((entry: { id: string; marker: any; infoWindow: any }) => {
      if (entry.id === selectedLocation.id) {
        entry.infoWindow.open(mapInstanceRef.current, entry.marker)
      } else {
        entry.infoWindow.close()
      }
    })
  }, [kakaoReady, selectedLocation])

  const googleUrl = selectedLocation
    ? `https://www.google.com/maps?q=${encodeURIComponent(selectedLocation.address)}&z=15&hl=ko&output=embed`
    : ''

  const vworldUrl = selectedLocation
    ? `https://map.vworld.kr/map/maps.do?lon=${selectedLocation.lng}&lat=${selectedLocation.lat}&zoom=16`
    : 'https://map.vworld.kr/map/maps.do'

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 px-6 py-8 text-white shadow-2xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.24em] text-slate-400">MAP CENTER</p>
            <h1 className="mt-2 flex items-center gap-2 text-3xl font-black">
              <Map size={28} className="text-brand-300" />
              사업장 지도
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              업로드하신 <strong className="text-white">사업장 주소.xlsx</strong> 기준 28개 사업장을 한 화면에서 비교합니다.
              목록을 누르면 선택한 사업장으로 즉시 확대 이동합니다.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            {PROVIDERS.map(item => (
              <button
                key={item.id}
                onClick={() => setProvider(item.id)}
                className={clsx(
                  'rounded-2xl border px-4 py-3 text-left transition',
                  provider === item.id
                    ? 'border-brand-300 bg-brand-500/20 text-white'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10'
                )}
              >
                <p className="text-sm font-bold">{item.label}</p>
                <p className="mt-1 text-xs text-slate-400">{item.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 px-5 py-4">
            <p className="text-sm font-bold text-slate-900">
              현재 선택: <span className="text-brand-700">{selectedLocation?.name}</span>
            </p>
            <p className="mt-1 text-sm text-slate-500">{selectedLocation?.address}</p>
          </div>

          <div className="h-[560px] bg-slate-100">
            {provider === 'kakao' ? (
              kakaoReady ? (
                <div ref={mapRef} className="h-full w-full" />
              ) : (
                <div className="flex h-full items-center justify-center bg-slate-50 text-sm text-slate-500">
                  Kakao 지도를 불러오는 중입니다.
                </div>
              )
            ) : (
              <iframe
                title={`${provider}-map`}
                src={provider === 'google' ? googleUrl : vworldUrl}
                className="h-full w-full border-0"
                loading="lazy"
              />
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-xl">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                className="form-input pl-9"
                placeholder="사업장명 또는 주소 검색"
              />
            </div>
            <p className="mt-3 text-xs text-slate-400">
              총 {SITE_LOCATIONS.length}개 사업장 중 {filteredLocations.length}개 표시
            </p>
          </div>

          <div className="max-h-[620px] space-y-3 overflow-y-auto pr-1">
            {filteredLocations.map(location => (
              <button
                key={location.id}
                onClick={() => setSelectedId(location.id)}
                className={clsx(
                  'w-full rounded-[24px] border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg',
                  selectedLocation?.id === location.id
                    ? 'border-brand-200 bg-brand-50/60'
                    : 'border-slate-200 hover:border-brand-100'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white">
                    <Building2 size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-slate-900">{location.name}</p>
                        <p className="mt-1 text-xs text-slate-400">우편번호 {location.postalCode}</p>
                      </div>
                      {selectedLocation?.id === location.id && (
                        <span className="rounded-full bg-brand-600 px-2.5 py-1 text-[11px] font-semibold text-white">
                          선택됨
                        </span>
                      )}
                    </div>
                    <p className="mt-3 flex items-start gap-2 text-sm leading-6 text-slate-600">
                      <MapPin size={14} className="mt-1 shrink-0 text-brand-500" />
                      <span>{location.address}</span>
                    </p>
                    <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                      <Navigation size={12} />
                      위도 {location.lat.toFixed(4)} / 경도 {location.lng.toFixed(4)}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
