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
  return (
    <footer className="mt-12 border-t border-slate-200 bg-slate-950 text-slate-200">
      <div className="mx-auto grid max-w-screen-2xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.24em] text-slate-400">TONGYANG LMS</p>
            <h2 className="mt-2 text-2xl font-black text-white">(주)동양 내부회계 LMS</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              내부회계관리제도 운영, 증빙결재, 학습이력, 현장 주소, 공시와 뉴스까지 한 번에 관리하는
              사번 기반 포털입니다.
            </p>
          </div>

          <div className="grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
            <p>대표 사이트: <a className="text-white hover:underline" href="https://tongyanginc.co.kr/" target="_blank" rel="noreferrer">tongyanginc.co.kr</a></p>
            <p>문의: 02-6150-7133</p>
            <p>안내: 법적고지 / 개인정보처리방침 / 이메일주소 무단수집거부</p>
            <p>기준 참고: 동양 공식 사이트 푸터 구성</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm font-bold text-white">패밀리 사이트</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {FAMILY_SITES.map(site => (
                <a
                  key={site.href}
                  href={site.href}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:border-brand-400 hover:text-white"
                >
                  {site.label}
                </a>
              ))}
            </div>
          </div>

          <p className="text-xs text-slate-400">
            Copyright 2026 TONGYANG Inc. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
