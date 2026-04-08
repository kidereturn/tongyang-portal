import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, FileText, X, ChevronLeft, Send, Save, Loader2, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

interface Activity {
  id: string
  control_code: string
  title: string
  controller_id: string | null
}

const ACCEPT = '.pdf,.jpg,.jpeg,.png,.xlsx,.xls,.docx,.doc,.zip'
const MAX_MB = 50

export default function EvidenceNewPage() {
  const { profile } = useAuth()
  const navigate    = useNavigate()

  const [activities, setActivities] = useState<Activity[]>([])
  const [activityId, setActivityId] = useState('')
  const [notes,      setNotes]      = useState('')
  const [file,       setFile]       = useState<File | null>(null)
  const [dragging,   setDragging]   = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { fetchActivities() }, [])

  async function fetchActivities() {
    const { data } = await supabase
      .from('activities')
      .select('id, control_code, title, controller_id')
      .eq('active', true)
      .order('control_code')
    setActivities((data as Activity[]) ?? [])
  }

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) validateAndSetFile(f)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) validateAndSetFile(f)
  }

  function validateAndSetFile(f: File) {
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`파일 크기는 ${MAX_MB}MB 이하여야 합니다.`)
      return
    }
    setError('')
    setFile(f)
  }

  async function handleSave(submitStatus: 'draft' | 'submitted') {
    if (!profile) return
    if (!activityId) { setError('활동을 선택해주세요.'); return }
    if (submitStatus === 'submitted' && !file) { setError('결재 상신 시 파일을 첨부해주세요.'); return }

    setError('')
    setLoading(true)

    try {
      let filePath: string | null = null
      let fileName: string | null = null

      // 파일 업로드
      if (file) {
        const ext  = file.name.split('.').pop()
        const path = `${profile.id}/${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('evidence')
          .upload(path, file, { upsert: false })
        if (upErr) throw upErr
        filePath = path
        fileName = file.name
      }

      // 선택한 활동의 통제책임자 가져오기
      const activity = activities.find(a => a.id === activityId)
      const currentApproverId = submitStatus === 'submitted' ? (activity?.controller_id ?? null) : null

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any
      const { data: rec, error: recErr } = await db
        .from('evidence_records')
        .insert({
          activity_id:         activityId,
          owner_id:            profile.id,
          status:              submitStatus,
          notes:               notes || null,
          file_path:           filePath,
          file_name:           fileName,
          current_approver_id: currentApproverId,
          submitted_at:        submitStatus === 'submitted' ? new Date().toISOString() : null,
          decided_at:          null,
        })
        .select('id')
        .single()

      if (recErr) throw recErr
      if (rec) navigate(`/evidence/${rec.id}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '저장 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/evidence')}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">새 증빙 등록</h1>
          <p className="text-slate-400 text-sm mt-0.5">증빙 자료를 업로드하고 결재를 상신합니다</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-950/50 border border-red-800 text-red-300 text-sm rounded-lg px-4 py-3">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
        {/* 활동 선택 */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            통제 활동 <span className="text-red-400">*</span>
          </label>
          {activities.length === 0 ? (
            <div className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-500 text-sm">
              등록된 활동이 없습니다. 관리자에게 활동 등록을 요청하세요.
            </div>
          ) : (
            <select
              value={activityId}
              onChange={e => setActivityId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-4 py-3 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
            >
              <option value="">활동을 선택하세요</option>
              {activities.map(a => (
                <option key={a.id} value={a.id}>
                  [{a.control_code}] {a.title}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* 비고 */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">비고 / 설명</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="증빙에 대한 설명을 입력하세요 (선택)"
            rows={3}
            className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-4 py-3 placeholder-slate-500 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all resize-none"
          />
        </div>

        {/* 파일 업로드 */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            증빙 파일 첨부
            <span className="text-slate-500 font-normal ml-1.5">(최대 {MAX_MB}MB · PDF, 이미지, Office, ZIP)</span>
          </label>

          {file ? (
            <div className="flex items-center gap-3 bg-slate-800 border border-brand-700 rounded-lg px-4 py-3">
              <FileText size={20} className="text-brand-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{file.name}</p>
                <p className="text-slate-500 text-xs">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <button
                onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = '' }}
                className="text-slate-500 hover:text-red-400 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          ) : (
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleFileDrop}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl px-6 py-10 text-center cursor-pointer transition-all ${
                dragging
                  ? 'border-brand-500 bg-brand-950/30'
                  : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800/50'
              }`}
            >
              <Upload size={28} className="text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">
                파일을 여기에 드래그하거나 <span className="text-brand-400 font-medium">클릭하여 선택</span>
              </p>
              <p className="text-slate-600 text-xs mt-1">{ACCEPT.replace(/\./g, '').replace(/,/g, ' · ').toUpperCase()}</p>
            </div>
          )}
          <input ref={fileRef} type="file" accept={ACCEPT} className="hidden" onChange={handleFileChange} />
        </div>
      </div>

      {/* 버튼 */}
      <div className="flex gap-3">
        <button
          onClick={() => handleSave('draft')}
          disabled={loading || !activityId}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-all border border-slate-700"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          임시저장
        </button>
        <button
          onClick={() => handleSave('submitted')}
          disabled={loading || !activityId}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-all shadow-lg shadow-brand-900/30"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          결재 상신
        </button>
      </div>
    </div>
  )
}
