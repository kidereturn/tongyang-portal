import { useEffect, useState } from 'react'
import { Loader2, Lock, Unlock } from 'lucide-react'
import { supabase } from '../../../lib/supabase'

export default function SettingsTab() {
  const [uploadBlocked, setUploadBlocked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const { data } = await (supabase as any)
          .from('site_settings')
          .select('value')
          .eq('key', 'evidence_upload_blocked')
          .maybeSingle()
        if (data?.value?.blocked) setUploadBlocked(true)
      } catch { /* */ }
      setLoading(false)
    }
    load()
  }, [])

  async function toggleUploadBlock() {
    setSaving(true)
    const newBlocked = !uploadBlocked
    try {
      await (supabase as any)
        .from('site_settings')
        .update({
          value: { blocked: newBlocked },
          updated_at: new Date().toISOString(),
        })
        .eq('key', 'evidence_upload_blocked')
      setUploadBlocked(newBlocked)
    } catch {
      alert('설정 변경에 실패했습니다.')
    }
    setSaving(false)
  }

  if (loading) return <div className="card p-8 text-center text-sm text-slate-400">로딩 중...</div>

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h3 className="text-lg font-black text-slate-900 mb-4">증빙 업로드 차단/허용</h3>
        <p className="text-sm text-slate-500 mb-4">
          전체 사용자의 증빙 업로드를 일괄 차단하거나 허용합니다.
          차단 시 담당자들은 증빙 파일을 업로드할 수 없습니다.
        </p>

        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl border-2 transition-all ${
            uploadBlocked
              ? 'border-red-200 bg-red-50'
              : 'border-emerald-200 bg-emerald-50'
          }`}>
            {uploadBlocked ? (
              <Lock size={24} className="text-red-600" />
            ) : (
              <Unlock size={24} className="text-emerald-600" />
            )}
            <div>
              <p className={`text-lg font-black ${uploadBlocked ? 'text-red-700' : 'text-emerald-700'}`}>
                {uploadBlocked ? '업로드 차단 중' : '업로드 허용 중'}
              </p>
              <p className="text-xs text-slate-500">
                {uploadBlocked ? '모든 사용자의 증빙 업로드가 차단되어 있습니다' : '사용자들이 정상적으로 증빙을 업로드할 수 있습니다'}
              </p>
            </div>
          </div>

          <button
            onClick={toggleUploadBlock}
            disabled={saving}
            className={`px-6 py-3 rounded-xl font-bold text-sm transition-all ${
              uploadBlocked
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'bg-red-600 text-white hover:bg-red-700'
            }`}
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : (
              uploadBlocked ? '업로드 허용하기' : '업로드 차단하기'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
