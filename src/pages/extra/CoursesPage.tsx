import { BookOpen, PlayCircle, Clock, CheckCircle2, Lock } from 'lucide-react'

const COURSES = [
  { id: 1, title: '내부회계관리제도 기초 이해', category: '기초', duration: '45분', progress: 100, passed: true, dueDate: '2026-06-30', thumb: '📊' },
  { id: 2, title: '통제활동과 증빙 작성 실무', category: '실무', duration: '60분', progress: 75, passed: false, dueDate: '2026-06-30', thumb: '📋' },
  { id: 3, title: '내부통제 평가 방법론', category: '심화', duration: '55분', progress: 30, passed: false, dueDate: '2026-09-30', thumb: '🔍' },
  { id: 4, title: '재무보고와 내부통제', category: '기초', duration: '40분', progress: 0, passed: false, dueDate: '2026-09-30', thumb: '💼' },
  { id: 5, title: '통제 위험 평가 실습', category: '실무', duration: '50분', progress: 0, passed: false, dueDate: '2026-12-31', thumb: '⚠️' },
  { id: 6, title: 'IT 일반통제 이해', category: '기초', duration: '35분', progress: 0, passed: false, dueDate: '2026-12-31', thumb: '💻' },
]

export default function CoursesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
          <BookOpen size={22} className="text-brand-600" />내강좌
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">내부회계관리제도 교육 과정</p>
      </div>

      {/* 진행 요약 */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: '총 과정', value: COURSES.length, icon: BookOpen, color: 'brand' },
          { label: '수강 완료', value: COURSES.filter(c => c.progress === 100).length, icon: CheckCircle2, color: 'green' },
          { label: '진행 중', value: COURSES.filter(c => c.progress > 0 && c.progress < 100).length, icon: PlayCircle, color: 'blue' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${s.color === 'brand' ? 'bg-brand-50 text-brand-600' : s.color === 'green' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
              <s.icon size={16} />
            </div>
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="text-xl font-black text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* 강좌 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {COURSES.map(course => (
          <div key={course.id} className="card card-hover overflow-hidden group cursor-pointer">
            <div className="h-32 bg-gradient-to-br from-brand-50 to-blue-50 flex items-center justify-center text-5xl">
              {course.thumb}
            </div>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="badge-blue text-xs">{course.category}</span>
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Clock size={10} />{course.duration}
                </span>
              </div>
              <h3 className="font-bold text-gray-900 text-sm mb-3 leading-snug">{course.title}</h3>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">진도율</span>
                  <span className="font-semibold text-gray-700">{course.progress}%</span>
                </div>
                <div className="bg-gray-100 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all ${course.progress === 100 ? 'bg-emerald-500' : 'bg-brand-500'}`}
                    style={{ width: `${course.progress}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-gray-400">기한: {course.dueDate}</span>
                {course.passed
                  ? <span className="badge-green text-xs"><CheckCircle2 size={10} className="inline mr-0.5" />이수완료</span>
                  : course.progress > 0
                  ? <span className="badge-blue text-xs"><PlayCircle size={10} className="inline mr-0.5" />수강중</span>
                  : <span className="badge-gray text-xs"><Lock size={10} className="inline mr-0.5" />미시작</span>
                }
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
