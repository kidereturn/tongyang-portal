import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

const FAMILY_SITES = [
  { label: '유진그룹', href: 'https://www.eugenes.co.kr/' },
  { label: '유진기업', href: 'https://eugenecorp.co.kr/' },
  { label: '동양', href: 'https://tongyanginc.co.kr/' },
  { label: '에이스하드웨어', href: 'https://www.ace-hardware.co.kr/' },
  { label: '유진한일합섬', href: 'http://www.hanilsf.co.kr/' },
  { label: '유진투자증권', href: 'https://www.eugenefn.com/' },
  { label: '유진자산운용', href: 'http://fund.eugenefn.com/' },
  { label: '유진투자선물', href: 'https://www.eugenefutures.com/' },
]

export default function Footer() {
  const [familyOpen, setFamilyOpen] = useState(false)

  return (
    <footer className="mt-12 border-t border-slate-200 bg-slate-950 text-slate-200">
      <div className="mx-auto flex max-w-screen-2xl flex-wrap items-center justify-between gap-4 px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-400">
          <span className="font-bold text-white">(주)동양 내부회계 LMS</span>
          <a className="hover:text-white transition" href="https://tongyanginc.co.kr/" target="_blank" rel="noreferrer">tongyanginc.co.kr</a>
          <span>문의: 02-6150-7172</span>
          <span>법적고지 · 개인정보처리방침 · 이메일주소 무단수집거부</span>
          <span>© 2026 TONGYANG Inc.</span>
        </div>

        {/* 패밀리 사이트 드롭다운 */}
        <div className="relative">
          <button
            onClick={() => setFamilyOpen(v => !v)}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
          >
            패밀리 사이트
            <ChevronDown size={14} className={`transition ${familyOpen ? 'rotate-180' : ''}`} />
          </button>
          {familyOpen && (
            <div className="absolute bottom-full right-0 mb-1 w-48 rounded-xl border border-white/10 bg-slate-900 py-1 shadow-xl z-50">
              {FAMILY_SITES.map(site => (
                <a
                  key={site.href}
                  href={site.href}
                  target="_blank"
                  rel="noreferrer"
                  className="block px-3 py-2 text-xs text-slate-300 transition hover:bg-white/10 hover:text-white"
                >
                  {site.label}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </footer>
  )
}
