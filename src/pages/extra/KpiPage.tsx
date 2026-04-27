import { TrendingUp, Award, BarChart2, Star } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

const KPI_DATA = [
  { dept: '안양공장', score: 92, rank: 1, activities: 18, completed: 17 },
  { dept: '인천공장', score: 87, rank: 2, activities: 15, completed: 13 },
  { dept: '파주공장', score: 85, rank: 3, activities: 20, completed: 17 },
  { dept: '본사재무', score: 78, rank: 4, activities: 25, completed: 19 },
  { dept: '양산공장', score: 75, rank: 5, activities: 16, completed: 12 },
  { dept: '영업관리', score: 72, rank: 6, activities: 12, completed: 9 },
]

const CHART_DATA = [
  { month: '1월', 목표: 80, 실적: 65 },
  { month: '2월', 목표: 80, 실적: 72 },
  { month: '3월', 목표: 85, 실적: 78 },
  { month: '4월', 목표: 85, 실적: 85 },
  { month: '5월', 목표: 90, 실적: 82 },
  { month: '6월', 목표: 90, 실적: 88 },
]

export default function KpiPage() {
  return (
    <>
      <div className="pg-head">
        <div className="pg-head-row">
          <div>
            <div className="eyebrow">성과 지표<span className="sep" />KPI Dashboard</div>
            <h1>KPI 결과. <span className="soft">숫자로 본 내부회계관리.</span></h1>
            <p className="lead">부서·월별 달성률과 통제활동 현황을 한눈에. 매일 자정 업데이트됩니다.</p>
          </div>
        </div>
      </div>

      <div className="pg-body space-y-6">
      {/* KPI 요약 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: '전체 완료율', value: '82%', icon: TrendingUp, color: 'brand', change: '+5%' },
          { label: '통제활동 수', value: '420', icon: BarChart2, color: 'blue', change: '' },
          { label: '최고 점수 부서', value: '안양공장', icon: Award, color: 'yellow', change: '92점' },
          { label: '평균 KPI 점수', value: '81.5', icon: Star, color: 'green', change: '점 · 등급 B' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${
              s.color === 'brand' ? 'bg-warm-50 text-brand-700' :
              s.color === 'blue' ? 'bg-blue-50 text-blue-600' :
              s.color === 'yellow' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
            }`}>
              <s.icon size={16} />
            </div>
            <p className="text-xs text-warm-500">{s.label}</p>
            <p className="text-xl font-bold text-brand-900">{s.value}<span className="text-xs text-warm-400 ml-0.5">{s.change}</span></p>
          </div>
        ))}
      </div>

      {/* 차트 + 순위표 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 월별 KPI 추이 */}
        <div className="card p-5">
          <p className="font-bold text-brand-900 mb-4">월별 KPI 달성률 추이</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={CHART_DATA} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E8EB" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: '#8B95A1', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#8B95A1', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #E5E8EB', borderRadius: 8, fontSize: 12 }}
                cursor={{ fill: 'rgba(49, 130, 246, 0.06)' }}
              />
              <Bar dataKey="목표" fill="#C9DDFF" radius={[4, 4, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="실적" fill="#3182F6" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 부서별 순위 */}
        <div className="card p-5">
          <p className="font-bold text-brand-900 mb-4">부서별 점수 순위</p>
          <div className="space-y-3">
            {KPI_DATA.map((d, i) => (
              <div key={d.dept} className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  i === 0 ? 'bg-amber-100 text-amber-700' :
                  i === 1 ? 'bg-warm-100 text-warm-600' :
                  i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-warm-50 text-warm-500'
                }`}>
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between mb-1 text-xs">
                    <span className="font-semibold text-brand-800">{d.dept}</span>
                    <span className="text-warm-500">{d.completed}/{d.activities}건 ({d.score}점)</span>
                  </div>
                  <div className="bg-warm-100 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${i === 0 ? 'bg-amber-400' : i < 3 ? 'bg-warm-500' : 'bg-warm-400'}`}
                      style={{ width: `${d.score}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 상세 테이블 */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-warm-50">
          <p className="font-bold text-brand-900">통제활동별 KPI 상세</p>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>순위</th>
                <th>부서</th>
                <th>KPI 점수</th>
                <th className="text-center">통제활동 수</th>
                <th className="text-center">완료</th>
                <th>완료율</th>
                <th>비고</th>
              </tr>
            </thead>
            <tbody>
              {KPI_DATA.map((d, i) => {
                // 가상 등급 (점수 기준): 90+=A, 85+=B, 80+=C, 75+=D, 70+=E, 미만=F
                const grade = d.score >= 90 ? 'A' : d.score >= 85 ? 'B' : d.score >= 80 ? 'C' : d.score >= 75 ? 'D' : d.score >= 70 ? 'E' : 'F'
                const gradeColor = grade === 'A' ? '#16A34A' : grade === 'B' ? '#3182F6' : grade === 'C' ? '#0891B2' : grade === 'D' ? '#D97706' : grade === 'E' ? '#EA580C' : '#DC2626'
                return (
                <tr key={d.dept}>
                  <td className="text-center">
                    <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-bold ${
                      i === 0 ? 'bg-amber-100 text-amber-700' : 'bg-warm-100 text-warm-500'
                    }`}>{i + 1}</span>
                  </td>
                  <td className="font-semibold text-sm">{d.dept}</td>
                  <td>
                    <span className={`badge ${d.score >= 90 ? 'badge-green' : d.score >= 80 ? 'badge-blue' : 'badge-yellow'}`}>
                      {d.score}점
                    </span>
                    <span style={{ marginLeft: 6, padding: '1px 6px', fontSize: 11, fontWeight: 700, color: gradeColor, border: `1px solid ${gradeColor}`, borderRadius: 4, fontFamily: 'var(--f-mono)' }}>
                      {grade}
                    </span>
                  </td>
                  <td className="text-center">{d.activities}</td>
                  <td className="text-center">{d.completed}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-warm-100 rounded-full h-1.5 max-w-[80px]">
                        <div className="bg-warm-500 h-1.5 rounded-full" style={{ width: `${Math.round(d.completed/d.activities*100)}%` }} />
                      </div>
                      <span className="text-xs text-warm-600">{Math.round(d.completed/d.activities*100)}%</span>
                    </div>
                  </td>
                  <td className="text-xs text-warm-400">
                    {i === 0 ? '🏆 최우수' : i < 3 ? '우수' : ''}
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </>
  )
}
