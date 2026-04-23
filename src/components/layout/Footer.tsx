import { useState, useRef, useEffect } from 'react'
import { ChevronDown, ExternalLink } from 'lucide-react'

const GROUPWARE_URL = 'https://gw.eugenes.co.kr/groupware/portal'

// 패밀리 사이트 — 그룹웨어가 기본(위치 첫번째)
const FAMILY_SITES: { label: string; href: string; highlight?: boolean }[] = [
  { label: '동양 그룹웨어', href: GROUPWARE_URL, highlight: true },
  { label: '유진그룹', href: 'https://www.eugenes.co.kr/' },
  { label: '유진기업', href: 'https://eugenecorp.co.kr/' },
  { label: '동양(본사)', href: 'https://tongyanginc.co.kr/' },
  { label: '에이스하드웨어', href: 'https://www.ace-hardware.co.kr/' },
  { label: '유진한일합섬', href: 'http://www.hanilsf.co.kr/' },
  { label: '유진투자증권', href: 'https://www.eugenefn.com/' },
  { label: '유진자산운용', href: 'http://fund.eugenefn.com/' },
  { label: '유진투자선물', href: 'https://www.eugenefutures.com/' },
]

export default function Footer() {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(FAMILY_SITES[0]) // 기본 = 그룹웨어
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
    <footer style={{ marginTop: 64, background: '#1E293B', color: '#CBD5E1' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '48px 32px 32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 32, marginBottom: 36 }}>
          {/* 회사 정보 */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <img
                src="/tongyang_logo_main.png"
                alt="동양"
                style={{
                  height: 32,
                  width: 'auto',
                  filter: 'brightness(0) invert(1)',
                }}
              />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#FFFFFF', letterSpacing: '0.02em' }}>
                TONGYANG
              </span>
            </div>
            <p style={{ fontSize: 11, lineHeight: 1.7, color: '#94A3B8', margin: 0 }}>
              (주)동양 · 내부회계관리 PORTAL<br/>
              서울특별시 중구 청계천로 100<br/>
              대표이사: 유경선 · 사업자등록번호: 116-81-06993
            </p>
          </div>

          {/* 연락처 */}
          <div>
            <div style={{ fontSize: 11, color: '#64748B', letterSpacing: '0.12em', fontWeight: 700, marginBottom: 12 }}>CONTACT</div>
            <div style={{ fontSize: 12, lineHeight: 1.9, color: '#CBD5E1' }}>
              <div>내부회계팀: <b style={{ color: '#FFFFFF' }}>02-6150-7172</b></div>
              <div>박한진 과장 · 최종현 대리</div>
              <div style={{ marginTop: 4, fontSize: 11, color: '#94A3B8' }}>평일 09:00 ~ 18:00</div>
            </div>
          </div>

          {/* 바로가기 */}
          <div>
            <div style={{ fontSize: 11, color: '#64748B', letterSpacing: '0.12em', fontWeight: 700, marginBottom: 12 }}>QUICK LINKS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
              <a href={GROUPWARE_URL} target="_blank" rel="noreferrer" style={{ color: '#CBD5E1', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <ExternalLink size={11} />동양 그룹웨어
              </a>
              <a href="https://tongyanginc.co.kr/" target="_blank" rel="noreferrer" style={{ color: '#CBD5E1', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <ExternalLink size={11} />tongyanginc.co.kr
              </a>
              <a href="https://dart.fss.or.kr/" target="_blank" rel="noreferrer" style={{ color: '#CBD5E1', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <ExternalLink size={11} />DART 전자공시
              </a>
            </div>
          </div>

          {/* 패밀리 사이트 드롭다운 */}
          <div>
            <div style={{ fontSize: 11, color: '#64748B', letterSpacing: '0.12em', fontWeight: 700, marginBottom: 12 }}>FAMILY SITE</div>
            <div ref={wrapRef} style={{ position: 'relative' }}>
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
                    fontSize: 12,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 6,
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
                    background: '#3182F6',
                    border: 'none',
                    borderRadius: 6,
                    color: '#FFFFFF',
                    cursor: 'pointer',
                  }}
                >
                  GO
                </button>
              </div>
              {open && (
                <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, marginBottom: 4, background: '#0F172A', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, maxHeight: 260, overflowY: 'auto', zIndex: 50 }}>
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
                        background: s.label === selected.label ? 'rgba(49,130,246,0.25)' : 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                      onMouseLeave={e => (e.currentTarget.style.background = s.label === selected.label ? 'rgba(49,130,246,0.25)' : 'transparent')}
                    >
                      {s.highlight && '⭐ '}{s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontSize: 11, color: '#64748B' }}>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, color: '#CBD5E1' }}>법적고지</span>
            <a href="#" style={{ color: '#94A3B8', textDecoration: 'none' }}>개인정보처리방침</a>
            <a href="#" style={{ color: '#94A3B8', textDecoration: 'none' }}>이메일주소 무단수집거부</a>
            <a href="#" style={{ color: '#94A3B8', textDecoration: 'none' }}>이용약관</a>
          </div>
          <div>COPYRIGHT &copy; 2026 TONGYANG Inc. ALL RIGHT RESERVED.</div>
        </div>
      </div>
    </footer>
  )
}
