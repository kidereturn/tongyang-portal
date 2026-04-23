import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

const GROUPWARE_URL = 'https://gw.eugenes.co.kr/covicore/login.do'

// 패밀리 사이트 — 그룹웨어가 기본(위치 첫번째)
const FAMILY_SITES: { label: string; href: string; highlight?: boolean }[] = [
  { label: '동양 그룹웨어', href: GROUPWARE_URL, highlight: true },
  { label: '유진그룹', href: 'https://www.eugenegroup.co.kr/' },
  { label: '유진기업', href: 'https://www.eugenecorp.co.kr/' },
  { label: '동양(본사)', href: 'https://tongyanginc.co.kr/' },
  { label: '에이스하드웨어', href: 'https://www.acehardware.co.kr/' },
  { label: '유진로봇', href: 'https://www.yujinrobot.com/' },
  { label: '유진프라이빗에쿼티', href: 'https://www.eugenepe.com/' },
  { label: '유진투자증권', href: 'https://www.eugenefn.com/' },
  { label: '유진자산운용', href: 'https://www.eugeneam.com/' },
  { label: '유진투자선물', href: 'https://www.eugenefutures.com/' },
  { label: '유진저축은행', href: 'https://www.eugenesavings.co.kr/' },
  { label: '한국유리공업', href: 'http://www.hankukglass.co.kr/' },
  { label: '유진홈센터', href: 'https://www.eugenehome.co.kr/' },
  { label: '유진에코솔루션', href: 'https://www.eugene-es.co.kr/' },
]

// 상단 메뉴 (스크린샷 참고: COMPANY · BUSINESS · INFORMATION · 건자재네트워크 · 건설서비스 · 인프라엔지니어링)
const TOP_MENUS = [
  { label: 'COMPANY', href: 'https://tongyanginc.co.kr/#01' },
  { label: 'BUSINESS', href: 'https://tongyanginc.co.kr/#02' },
  { label: 'INFORMATION', href: 'https://tongyanginc.co.kr/#03' },
  { label: '건자재네트워크', href: 'https://tongyanginc.co.kr/business/cmn' },
  { label: '건설서비스', href: 'https://tongyanginc.co.kr/business/cs' },
  { label: '인프라엔지니어링', href: 'https://tongyanginc.co.kr/business/ie' },
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

  return (
    <footer style={{ marginTop: 64, background: '#2D2D2D', color: '#A0A0A0' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '40px 40px 28px' }}>
        {/* 상단 열: 로고 + 메뉴 + 법적고지 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap', paddingBottom: 20 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img
              src="/tongyang_logo_main.png"
              alt="동양"
              style={{ height: 36, width: 'auto', filter: 'brightness(0) invert(1) opacity(0.85)' }}
            />
            <span style={{ fontSize: 20, fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.01em', fontFamily: 'serif' }}>
              동양
            </span>
          </div>

          {/* 상단 메뉴 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            {TOP_MENUS.map(m => (
              <a
                key={m.label}
                href={m.href}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: 13, color: '#E0E0E0', textDecoration: 'none', fontWeight: 600 }}
                onMouseEnter={e => (e.currentTarget.style.color = '#FFFFFF')}
                onMouseLeave={e => (e.currentTarget.style.color = '#E0E0E0')}
              >{m.label}</a>
            ))}
          </div>

          {/* 법적고지 · 개인정보처리방침 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, textAlign: 'right' }}>
            <a href="#" style={{ color: '#A0A0A0', textDecoration: 'none' }}>법적고지</a>
            <a href="#" style={{ color: '#A0A0A0', textDecoration: 'none' }}>개인정보처리방침</a>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #404040', margin: '0 0 20px' }} />

        {/* 중간 열: 주소 + 연락처 + 담당자 + 패밀리사이트 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 12, color: '#A0A0A0', lineHeight: 1.7 }}>
            <div>
              서울특별시 영등포구 국제금융로2길 24 (여의도동)
              &nbsp;&nbsp;&nbsp;
              TEL/ 02 - 6150 - 7172
              &nbsp;&nbsp;&nbsp;
              FAX/ 02 - 6150 - 7109
            </div>
            <div style={{ marginTop: 4 }}>
              내부회계팀 담당자:&nbsp;
              <b style={{ color: '#E0E0E0' }}>박한진 과장</b>
              &nbsp;·&nbsp;
              <b style={{ color: '#E0E0E0' }}>최종현 대리</b>
            </div>
          </div>

          {/* 패밀리 사이트 드롭다운 */}
          <div ref={wrapRef} style={{ position: 'relative', minWidth: 220 }}>
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
                  background: '#1A1A1A',
                  border: '1px solid #555',
                  borderRadius: 0,
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
                  padding: '10px 16px',
                  fontSize: 12,
                  fontWeight: 600,
                  background: '#555',
                  border: '1px solid #555',
                  borderRadius: 0,
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  letterSpacing: '0.05em',
                }}
              >이동</button>
            </div>
            {open && (
              <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, marginBottom: 4, background: '#1A1A1A', border: '1px solid #555', maxHeight: 280, overflowY: 'auto', zIndex: 50 }}>
                {FAMILY_SITES.map(s => (
                  <button
                    key={s.label}
                    onClick={() => { setSelected(s); setOpen(false) }}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '9px 14px',
                      fontSize: 12,
                      color: s.highlight ? '#FFFFFF' : '#CBD5E1',
                      fontWeight: s.highlight ? 600 : 400,
                      background: s.label === selected.label ? '#333' : 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#333')}
                    onMouseLeave={e => (e.currentTarget.style.background = s.label === selected.label ? '#333' : 'transparent')}
                  >
                    {s.highlight && '⭐ '}{s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: 28, paddingTop: 16, borderTop: '1px solid #404040', textAlign: 'left', fontSize: 11, color: '#707070', letterSpacing: '0.04em' }}>
          COPYRIGHT(C) 2026 TONGYANG Inc. ALL RIGHT RESERVED.
        </div>
      </div>
    </footer>
  )
}
