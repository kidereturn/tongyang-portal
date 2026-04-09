import { BarChart2, TrendingUp, Award, CheckCircle2, Clock } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const LEARNERS = [
  { name: '김포공장품질관리실', completed: 4, total: 6, score: 85, passed: true },
  { name: '안양공장품질관리실', completed: 6, total: 6, score: 100, passed: true },
  { name: '인천공장품질관리실', completed: 5, total: 6, score: 92, passed: true },
  { name: '파주공장품질관리실', completed: 3, total: 6, score: 58, passed: false },
  { name: '양산공장품질관리실', completed: 2, total: 6, score: 42, passed: false },
]

const MONTHLY = [
  { month: '1월', 수강: 12, 완료: 8 },
  { month: '2월', 수강: 18, 완료: 15 },
  { month: '3월', 수강: 25, 완료: 21 },
  { month: '4월', 수강: 30, 완료: 28 },
]

export default function LearningPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
          <BarChart2 size={22} className="text-brand-600" />학습현황
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">내부회계관리 교육 수강 현황</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: '전체 수강자', value: '114', unit: '명', icon: BarChart2, color: 'brand' },
          { label: '이수 완료', value: '76', unit: '명', icon: CheckCircle2, color: 'green' },
          { label: '수강 중', value: '28', unit: '명', icon: Clock, color: 'blue' },
          { label: '평균 점수', value: '75', unit: '점', icon: TrendingUp, color: 'yellow' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${
              s.color === 'brand' ? 'bg-brand-50 text-brand-600' :
              s.color === 'green' ? 'bg-emerald-50 text-emerald-600' :
              s.color === 'blue' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
            }`}>
              <s.icon size={16} />
            </div>
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="text-xl font-black text-gray-900">{s.value}<span className="text-xs text-gray-400 ml-0.5">{s.unit}</span></p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-5">
          <p className="font-bold text-gray-900 mb-4">월별 학습 현황</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={MONTHLY} barSize={16}>
              <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="수강" fill="#e0e7ff" radius={[3,3,0,0]} />
              <Bar dataKey="완료" fill="#4f46e5" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <p className="font-bold text-gray-900 mb-4">부서별 학습 현황</p>
          <div className="space-y-3">
            {LEARNERS.map(l => (
              <div key={l.name} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex justify-between mb-1 text-xs">
                    <span className="font-medium text-gray-700 truncate max-w-[160px]" title={l.name}>{l.name}</span>
                    <span className="text-gray-500 shrink-0 ml-2">{l.completed}/{l.total} ({l.score}점)</span>
                  </div>
                  <div className="bg-gray-100 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${l.passed ? 'bg-emerald-500' : 'bg-amber-400'}`}
                      style={{ width: `${l.completed/l.total*100}%` }}
                    />
                  </div>
                </div>
                <span className={l.passed ? 'badge-green text-xs' : 'badge-yellow text-xs'}>
                  {l.passed ? 'PASS' : '진행중'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 수강자 상세 테이블 */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
          <Award size={16} className="text-brand-600" />
          <p className="font-bold text-gray-900">부서별 학습 성적</p>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>부서명</th>
                <th className="text-center">수강 과정</th>
                <th className="text-center">완료</th>
                <th className="text-center">진도율</th>
                <th className="text-center">평균 점수</th>
                <th className="text-center">이수 여부</th>
              </tr>
            </thead>
            <tbody>
              {LEARNERS.map(l => (
                <tr key={l.name}>
                  <td className="font-medium text-sm">{l.name}</td>
                  <td className="text-center text-sm">{l.total}</td>
                  <td className="text-center text-sm">{l.completed}</td>
                  <td className="text-center">
                    <div className="flex items-center gap-2 justify-center">
                      <div className="w-16 bg-gray-100 rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full ${l.passed ? 'bg-emerald-500' : 'bg-amber-400'}`}
                          style={{ width: `${l.completed/l.total*100}%` }} />
                      </div>
                      <span className="text-xs text-gray-600">{Math.round(l.completed/l.total*100)}%</span>
                    </div>
                  </td>
                  <td className="text-center">
                    <span className={l.score >= 70 ? 'badge-green text-xs' : 'badge-red text-xs'}>{l.score}점</span>
                  </td>
                  <td className="text-center">
                    <span className={l.passed ? 'badge-green text-xs' : 'badge-yellow text-xs'}>
                      {l.passed ? '✓ 이수' : '진행중'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
