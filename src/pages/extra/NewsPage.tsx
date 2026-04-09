import { Newspaper, ExternalLink, TrendingUp, Calendar } from 'lucide-react'

const NEWS = [
  { id: 1, category: '법규', title: '2026년 내부회계관리제도 감리 강화 방침 발표', date: '2026-04-07', source: '금융감독원', isNew: true, summary: '금융감독원이 2026년부터 중소기업을 포함한 전 상장사에 대해 내부회계관리제도 감리를 강화한다고 발표했습니다.' },
  { id: 2, category: '판례', title: '내부통제 미비로 인한 손해배상 책임 인정 판결', date: '2026-04-02', source: '대법원', isNew: false, summary: '대법원은 내부통제 시스템을 적절히 운영하지 않은 기업에 대해 이사의 손해배상 책임을 인정하는 판결을 내렸습니다.' },
  { id: 3, category: '업무', title: '통제활동 증빙 작성 우수사례 가이드 배포', date: '2026-03-28', source: '한국공인회계사회', isNew: false, summary: '증빙 작성의 주요 오류 유형과 우수사례를 정리한 가이드가 배포되었습니다.' },
  { id: 4, category: 'ESG', title: 'ESG 경영과 내부통제 연계 방안 세미나 개최', date: '2026-03-20', source: '한국거래소', isNew: false, summary: 'ESG 공시 의무화에 따른 내부통제와의 연계 방안을 논의하는 세미나가 개최됩니다.' },
  { id: 5, category: '기술', title: 'AI 기반 내부통제 자동화 솔루션 도입 트렌드', date: '2026-03-15', source: '딜로이트', isNew: false, summary: '인공지능 기술을 활용한 내부통제 자동화 솔루션의 도입이 확산되고 있습니다.' },
]

const DART_NEWS = [
  { company: '(주)동양', type: '주요사항보고', title: '이사 선임의 건', date: '2026-04-05' },
  { company: '(주)동양', type: '사업보고서', title: '2025년도 사업보고서', date: '2026-03-31' },
  { company: '(주)동양', type: '감사보고서', title: '2025년 감사보고서', date: '2026-03-30' },
  { company: '(주)동양', type: '주요사항보고', title: '분기보고서 (2025.12)', date: '2026-02-14' },
  { company: '(주)동양', type: '주요사항보고', title: '증권신고서(합병)', date: '2026-01-20' },
]

const CATEGORY_CLS: Record<string, string> = {
  '법규': 'badge-red', '판례': 'badge-purple', '업무': 'badge-blue',
  'ESG': 'badge-green', '기술': 'badge-yellow'
}

export default function NewsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
          <Newspaper size={22} className="text-brand-600" />뉴스·분석
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">내부회계관리 관련 최신 정보</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 뉴스 목록 */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-bold text-gray-900">최신 업무 정보</p>
            <span className="text-xs text-gray-400">자동 업데이트 예정</span>
          </div>
          {NEWS.map(news => (
            <div key={news.id} className="card card-hover p-5 cursor-pointer">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={CATEGORY_CLS[news.category] ?? 'badge-gray'}>{news.category}</span>
                    {news.isNew && <span className="badge bg-red-500 text-white text-[10px] px-1.5 py-0">NEW</span>}
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm mb-1.5 leading-snug">{news.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{news.summary}</p>
                  <div className="flex items-center gap-3 mt-2.5 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Calendar size={10} />{news.date}</span>
                    <span>{news.source}</span>
                  </div>
                </div>
                <ExternalLink size={14} className="text-gray-300 shrink-0 mt-1" />
              </div>
            </div>
          ))}
        </div>

        {/* DART 공시 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-bold text-gray-900 flex items-center gap-1.5">
              <TrendingUp size={16} className="text-brand-600" />DART 공시
            </p>
            <span className="text-xs text-gray-400">(주)동양</span>
          </div>
          <div className="card overflow-hidden">
            {DART_NEWS.map((d, i) => (
              <div key={i} className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${i < DART_NEWS.length - 1 ? 'border-b border-gray-50' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="badge-blue text-xs mb-1 inline-flex">{d.type}</span>
                    <p className="text-sm text-gray-800 font-medium leading-snug">{d.title}</p>
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                      <Calendar size={10} />{d.date}
                    </p>
                  </div>
                  <ExternalLink size={12} className="text-gray-300 shrink-0" />
                </div>
              </div>
            ))}
            <div className="p-3 text-center">
              <button className="text-xs text-brand-600 hover:underline flex items-center gap-1 mx-auto">
                DART에서 전체보기 <ExternalLink size={11} />
              </button>
            </div>
          </div>

          {/* 공지사항 */}
          <div>
            <p className="font-bold text-gray-900 mb-3">공지사항</p>
            <div className="card overflow-hidden">
              {[
                { title: '2026년 내부회계 평가 일정 안내', date: '2026-04-01', isNew: true },
                { title: '증빙 업로드 시스템 개선 안내', date: '2026-03-25', isNew: false },
                { title: '통제책임자 교육 일정', date: '2026-03-18', isNew: false },
              ].map((n, i) => (
                <div key={i} className={`px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors ${i > 0 ? 'border-t border-gray-50' : ''}`}>
                  <div className="flex items-center gap-2">
                    {n.isNew && <span className="badge bg-red-500 text-white text-[10px] px-1.5 py-0">NEW</span>}
                    <span className="text-sm text-gray-700">{n.title}</span>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">{n.date}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
