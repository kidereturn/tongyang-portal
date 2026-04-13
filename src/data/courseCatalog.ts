export type CourseItem = {
  id: string
  title: string
  description: string
  youtubeId: string
  durationLabel: string
}

export const COURSE_CATALOG: CourseItem[] = [
  {
    id: 'internal-control-video-01',
    title: '내부회계관리제도 핵심 입문 강좌',
    description: '실제 유튜브 강의를 포털 안에서 시청하고, 사번 기준 학습 진도율을 누적 관리합니다.',
    youtubeId: 'hL8BmGsyfpA',
    durationLabel: '유튜브 원본 기준',
  },
]
