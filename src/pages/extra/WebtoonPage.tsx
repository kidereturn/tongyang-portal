const EPISODES = [
  {
    id: 'episode-1',
    title: '웹툰 예시 1',
    subtitle: '세로형 웹툰 뷰어 예시',
    image: '/webtoon-1.jpg',
  },
  {
    id: 'episode-2',
    title: '웹툰 예시 2',
    subtitle: '업로드 이미지 기반 테스트 컷',
    image: '/webtoon-2.jpg',
  },
]

export default function WebtoonPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-zinc-900 px-6 py-8 text-white shadow-2xl">
        <p className="text-xs font-semibold tracking-[0.24em] text-slate-400">WEBTOON</p>
        <h1 className="mt-2 text-3xl font-black">사내 웹툰관</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
          세로형 컷을 모바일과 데스크톱에서 모두 자연스럽게 읽을 수 있도록 웹툰 뷰어 형태로 배치했습니다.
        </p>
      </div>

      <div className="space-y-8">
        {EPISODES.map((episode, index) => (
          <section
            key={episode.id}
            className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">
                  Episode {index + 1}
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-900">{episode.title}</h2>
                <p className="mt-1 text-sm text-slate-500">{episode.subtitle}</p>
              </div>
              <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                세로 스크롤 감상
              </span>
            </div>

            <div className="bg-[#111318] p-3 sm:p-6">
              <div className="mx-auto max-w-[720px] overflow-hidden rounded-[24px] bg-black shadow-2xl">
                <img
                  src={episode.image}
                  alt={episode.title}
                  className="block w-full"
                />
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
