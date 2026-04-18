import { useEffect, useState } from 'react'
import { Loader2, Search, Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import { supabase } from '../../../lib/supabase'
import { type ActivityRow, SUBMISSION_BADGES } from '../adminShared'
import { useToast } from '../../../components/Toast'

export default function ActivitiesTab({ refreshKey }: { refreshKey: number }) {
  const toast = useToast()
  const [activities, setActivities] = useState<ActivityRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [processing, setProcessing] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const db = supabase as any
      const { data } = await db
        .from('activities')
        .select('id, control_code, owner_name, department, title, submission_status, controller_name')
        .order('control_code')
        .order('department')
      setActivities(data ?? [])
      setLoading(false)
    }
    load()
  }, [refreshKey])

  async function resetStatus(id: string) {
    if (!window.confirm('이 통제활동의 상신 상태를 미완료로 초기화할까요?')) return
    setProcessing(id)
    const db = supabase as any
    await db.from('activities').update({ submission_status: '미완료' }).eq('id', id)
    setActivities(previous =>
      previous.map(item => (item.id === id ? { ...item, submission_status: '미완료' } : item))
    )
    setProcessing(null)
  }

  const filtered = activities.filter(item => {
    if (!search) return true
    return [item.control_code ?? '', item.owner_name ?? '', item.department ?? '', item.title ?? ''].some(value =>
      value.toLowerCase().includes(search.toLowerCase())
    )
  })

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 size={24} className="animate-spin text-brand-500" />
      </div>
    )
  }

  async function exportToExcel() {
    // Re-fetch with ALL columns for complete export
    const db = supabase as any
    const { data: fullRows } = await db.from('activities').select('*').order('control_code').order('department')
    const sourceRows = fullRows ?? filtered
    const rows = sourceRows.map((item: any, index: number) => ({
      번호: index + 1,
      통제번호: item.control_code ?? '',
      고유키: item.unique_key ?? '',
      담당자: item.owner_name ?? '',
      담당자사번: item.owner_employee_id ?? '',
      관련부서: item.department ?? '',
      통제활동명: item.title ?? '',
      '제출 증빙 설명': item.description ?? '',
      승인자: item.controller_name ?? '',
      승인자사번: item.controller_employee_id ?? '',
      상신상태: item.submission_status ?? '',
      주기: item.cycle ?? '',
      '핵심/비핵심': item.key_control ? '핵심' : '비핵심',
      '수동/자동': item.manual_control ? '수동' : '자동',
      배점: item.base_score ?? '',
      환산점수: item.converted_score ?? '',
      활성: item.active ? 'Y' : 'N',
    }))
    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'RCM')
    XLSX.writeFile(workbook, `RCM_${new Date().toISOString().slice(0, 10)}.xlsx`)
    toast.success('엑셀 다운로드 완료', `RCM ${rows.length.toLocaleString()}건 내보내기`)
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400" />
          <input
            type="text"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="통제번호, 담당자, 부서 검색..."
            className="form-input pl-9 text-sm"
          />
        </div>
        <button onClick={exportToExcel} className="btn-secondary text-xs px-3 py-2 shrink-0">
          <Download size={14} />엑셀 다운로드
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-warm-50 px-4 py-3 text-xs text-warm-500">
          총 <b className="text-brand-700">{filtered.length}</b>건
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>통제번호</th>
                <th>담당자</th>
                <th>부서</th>
                <th>통제활동명</th>
                <th>승인자</th>
                <th>상신상태</th>
                <th className="text-center">관리</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id}>
                  <td>
                    <code className="rounded bg-warm-100 px-1.5 py-0.5 text-xs text-warm-600">{item.control_code ?? '-'}</code>
                  </td>
                  <td className="text-sm font-medium text-brand-800">{item.owner_name ?? '-'}</td>
                  <td className="text-xs text-warm-500">{item.department ?? '-'}</td>
                  <td className="max-w-[220px] truncate text-xs text-warm-600">{item.title ?? '-'}</td>
                  <td className="text-xs text-warm-500">{item.controller_name ?? '-'}</td>
                  <td>
                    <span className={SUBMISSION_BADGES[item.submission_status ?? ''] ?? 'badge-gray'}>
                      {item.submission_status ?? '-'}
                    </span>
                  </td>
                  <td className="text-center">
                    <button
                      onClick={() => resetStatus(item.id)}
                      disabled={processing === item.id || item.submission_status === '미완료'}
                      className="rounded-lg px-2 py-1 text-xs text-orange-600 transition-all hover:bg-orange-50 disabled:opacity-30"
                    >
                      {processing === item.id ? <Loader2 size={11} className="inline animate-spin" /> : '초기화'}
                    </button>
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
