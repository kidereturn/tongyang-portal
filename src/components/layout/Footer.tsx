import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

const GROUPWARE_URL = 'https://gw.eugenes.co.kr/covicore/login.do'

// 패밀리 사이트 — 2026-04 검증 완료 (각 URL HTTP 200 확인)
// 한국유리공업(LX 인수)·유진저축은행(다올 매각)·유진홈센터(사이트 없음)·유진에코솔루션(사이트 없음)
// 은 동양/유진 그룹 현재 계열사 중 실 운영 URL 로 교체
const FAMILY_SITES: { label: string; href: string; highlight?: boolean }[] = [
  { label: '동양 그룹웨어', href: GROUPWARE_URL, highlight: true },
  { label: '유진그룹', href: 'https://eugenes.co.kr/' },
  { label: '유진기업', href: 'https://eugenecorp.co.kr/' },
  { label: '동양(본사)', href: 'https://tongyanginc.co.kr/' },
  { label: '에이스하드웨어', href: 'https://www.ace-hardware.co.kr/' },
  { label: '유진로봇', href: 'https://yujinrobot.com/' },
  { label: '유진프라이빗에쿼티', href: 'https://www.eugenepe.co.kr/' },
  { label: '유진투자증권', href: 'https://www.eugenefn.com/' },
  { label: '유진자산운용', href: 'http://fund.eugenefn.com/' },
  { label: '유진투자선물', href: 'https://www.eugenefutures.com/' },
  { label: '유진리츠운용', href: 'https://eugenereit.com/' },
  { label: '유진한일합섬', href: 'http://www.hanilsf.co.kr/' },
  { label: '유진로지스틱스', href: 'http://www.eugenelogistics.co.kr/' },
  { label: 'YTN', href: 'https://www.ytn.co.kr' },
]

// 상단 메뉴 — tongyanginc.co.kr 실제 앵커 (#00/#01/#02) + BUSINESS 서브 3개
const TOP_MENUS = [
  { label: 'COMPANY', href: 'https://tongyanginc.co.kr/#00' },
  { label: 'BUSINESS', href: 'https://tongyanginc.co.kr/#01' },
  { label: 'INFORMATION', href: 'https://tongyanginc.co.kr/#02' },
  { label: '건자재네트워크', href: 'https://tongyanginc.co.kr/network/' },
  { label: '건설서비스', href: 'https://tongyanginc.co.kr/house/' },
  { label: '인프라엔지니어링', href: 'https://tongyanginc.co.kr/plant/' },
]

export default function Footer() {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(FAMILY_SITES[0])
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  function go() {
    window.open(selected.href, '_blank', 'noopener,noreferrer')
  }

  // 색상: 사이트 컨셉(토스 스타일 밝은 화이트 + 네이비 포인트)에 어울리는 딥 네이비
  const BG = '#1B2A47'         // 딥 네이비
  const BG_DARKER = '#14223B'
  const TEXT_MUTED = '#A8B2C7'
  const TEXT_STRONG = '#E7ECF4'
  const DIVIDER = '#2A3A5A'
  const ACCENT_BORDER = '#3A4A6B'

  return (
    <footer style={{ marginTop: 64, background: BG, color: TEXT_MUTED }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '40px 40px 28px' }}>
        {/* 상단 열: 로고(좌) + 상단 메뉴(우) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap', paddingBottom: 20 }}>
          {/* Logo — 300% 확대 (36 → 108) */}
          <img
            src="/tongyang_logo_main.png"
            alt="TONGYANG"
            style={{ height: 108, width: 'auto', filter: 'brightness(0) invert(1) opacity(0.95)' }}
          />

          {/* 상단 메뉴 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            {TOP_MENUS.map(m => (
              <a
                key={m.label}
                href={m.href}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: 13, color: TEXT_STRONG, textDecoration: 'none', fontWeight: 600 }}
                onMouseEnter={e => (e.currentTarget.style.color = '#FFFFFF')}
                onMouseLeave={e => (e.currentTarget.style.color = TEXT_STRONG)}
              >{m.label}</a>
            ))}
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: `1px solid ${DIVIDER}`, margin: '0 0 20px' }} />

        {/* 중간 열: 주소 + 연락처 + 담당자 + 패밀리사이트 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 12, color: TEXT_MUTED, lineHeight: 1.7 }}>
            <div>
              서울특별시 영등포구 국제금융로2길 24 (여의도동)
              &nbsp;&nbsp;&nbsp;
              TEL/ 02 - 6150 - 7172
              &nbsp;&nbsp;&nbsp;
              FAX/ 02 - 6150 - 7109
            </div>
            <div style={{ marginTop: 4 }}>
              내부회계팀 담당자:&nbsp;
              <b style={{ color: TEXT_STRONG }}>박한진 과장</b>
              &nbsp;·&nbsp;
              <b style={{ color: TEXT_STRONG }}>최종현 대리</b>
            </div>
          </div>

          {/* 패밀리 사이트 드롭다운 */}
          <div ref={wrapRef} style={{ position: 'relative', minWidth: 240 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => setOpen(v => !v)}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  padding: '10px 14px',
                  fontSize: 13,
                  background: BG_DARKER,
                  border: `1px solid ${ACCENT_BORDER}`,
                  borderRadius: 4,
                  color: '#FFFFFF',
                  cursor: 'pointer',
                }}
              >
                <span>{selected.label}</span>
                <ChevronDown size={14} style={{ transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'rotate(0)' }} />
              </button>
              <button
                onClick={go}
                style={{
                  padding: '10px 18px',
                  fontSize: 12,
                  fontWeight: 700,
                  background: '#3182F6',
                  border: '1px solid #3182F6',
                  borderRadius: 4,
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  letterSpacing: '0.08em',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#1B64DA')}
                onMouseLeave={e => (e.currentTarget.style.background = '#3182F6')}
              >이동</button>
            </div>
            {open && (
              <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, marginBottom: 4, background: BG_DARKER, border: `1px solid ${ACCENT_BORDER}`, borderRadius: 4, maxHeight: 320, overflowY: 'auto', zIndex: 50, boxShadow: '0 -6px 24px -8px rgba(0,0,0,0.4)' }}>
                {FAMILY_SITES.map(s => (
                  <button
                    key={s.label}
                    onClick={() => { setSelected(s); setOpen(false) }}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '10px 14px',
                      fontSize: 12,
                      color: s.highlight ? '#FFFFFF' : '#C5CDDB',
                      fontWeight: s.highlight ? 600 : 400,
                      background: s.label === selected.label ? '#24365A' : 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#24365A')}
                    onMouseLeave={e => (e.currentTarget.style.background = s.label === selected.label ? '#24365A' : 'transparent')}
                  >
                    {s.highlight && '⭐ '}{s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: 28, paddingTop: 16, borderTop: `1px solid ${DIVIDER}`, textAlign: 'left', fontSize: 11, color: '#8996AF', letterSpacing: '0.04em' }}>
          COPYRIGHT(C) 2026 TONGYANG Inc. ALL RIGHT RESERVED.
        </div>
      </div>
    </footer>
  )
}
