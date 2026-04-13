import { BookOpen, ExternalLink, Image, Palette } from 'lucide-react';

const WEBTOONS = [
  {
    id: 'naver',
    title: '내부회계 이야기',
    platform: '네이버 웹툰',
    badgeClass: 'badge-green',
    gradientFrom: '#00C73C',
    gradientTo: '#00A832',
    url: 'https://comic.naver.com/webtoon/detail?titleId=822573&no=1',
    description:
      '내부회계관리제도의 핵심 개념을 쉽고 재미있게 풀어낸 웹툰입니다.',
  },
  {
    id: 'kakao',
    title: 'BLOCK-001',
    platform: '카카오 웹툰',
    badgeClass: 'badge-yellow',
    gradientFrom: '#FEE500',
    gradientTo: '#F5D800',
    url: 'https://webtoon.kakao.com/viewer/BLOCK-001/269104',
    description:
      '블록체인과 내부통제를 소재로 한 흥미진진한 스토리의 웹툰입니다.',
  },
];

export default function WebtoonPage() {
  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 px-8 py-10 text-white shadow-xl">
        <div className="flex items-center gap-3">
          <BookOpen className="h-8 w-8 opacity-80" />
          <p className="text-xs font-semibold uppercase tracking-[0.24em] opacity-70">
            Webtoon
          </p>
        </div>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight">
          내부회계 웹툰
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed opacity-80">
          내부회계관리제도를 쉽고 재미있게 이해할 수 있는 웹툰 콘텐츠를
          제공합니다.
        </p>
      </div>

      {/* Webtoon Cards Grid */}
      <div className="grid gap-6 sm:grid-cols-2">
        {WEBTOONS.map((webtoon) => (
          <div key={webtoon.id} className="card flex flex-col overflow-hidden">
            {/* Thumbnail Placeholder */}
            <div
              className="relative flex h-48 items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${webtoon.gradientFrom}, ${webtoon.gradientTo})`,
              }}
            >
              <div className="flex flex-col items-center gap-2 text-white">
                <Palette className="h-12 w-12 opacity-70" />
                <span className="text-sm font-bold opacity-90">
                  {webtoon.platform}
                </span>
              </div>
            </div>

            {/* Card Body */}
            <div className="flex flex-1 flex-col p-5">
              <div className="mb-3 flex items-center gap-2">
                <span className={webtoon.badgeClass}>{webtoon.platform}</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                {webtoon.title}
              </h2>
              <p className="mt-1 flex-1 text-sm leading-relaxed text-slate-500">
                {webtoon.description}
              </p>
              <a
                href={webtoon.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary mt-4 inline-flex items-center justify-center gap-2"
              >
                보러가기
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* 사내 제작 웹툰 Section */}
      <div className="card p-6">
        <div className="flex items-center gap-3">
          <Image className="h-6 w-6 text-slate-400" />
          <h2 className="text-lg font-bold text-slate-900">사내 제작 웹툰</h2>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-slate-500">
          사내 제작 웹툰 콘텐츠가 준비 중입니다.
        </p>
      </div>
    </div>
  );
}
