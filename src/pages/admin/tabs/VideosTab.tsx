import { useEffect, useState } from 'react'
import { Loader2, PlayCircle, Trash2, Upload } from 'lucide-react'
import clsx from 'clsx'
import { supabase } from '../../../lib/supabase'
import { extractYoutubeId } from '../adminShared'

type VideoRow = {
  id: string
  title: string
  description: string | null
  youtube_url: string
  youtube_id: string
  thumbnail_url: string | null
  duration: string | null
  has_subtitles: boolean
  sort_order: number
  is_active: boolean
  created_at: string
}

export default function VideosTab() {
  const [videos, setVideos] = useState<VideoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [videoTitle, setVideoTitle] = useState('')
  const [videoDesc, setVideoDesc] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  async function fetchVideos() {
    setLoading(true)
    try {
      const { data, error } = await (supabase as any)
        .from('course_videos')
        .select('*')
        .order('created_at', { ascending: false }) as { data: VideoRow[] | null; error: any }
      if (error) {
        setMsg('동영상 목록 로드 실패: ' + error.message)
        setVideos([])
      } else {
        setVideos(data ?? [])
      }
    } catch (e: any) {
      setMsg('동영상 목록 로드 오류: ' + (e.message ?? '알 수 없는 오류'))
      setVideos([])
    }
    setLoading(false)
  }

  useEffect(() => { void fetchVideos() }, [])

  async function addVideo() {
    const ytId = extractYoutubeId(youtubeUrl.trim())
    if (!ytId) { setMsg('올바른 YouTube URL을 입력해주세요.'); return }
    if (!videoTitle.trim()) { setMsg('제목을 입력해주세요.'); return }

    setSaving(true)
    setMsg('')

    const thumbnail = `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`
    const fullUrl = `https://www.youtube.com/watch?v=${ytId}`

    const { error } = await (supabase as any).from('course_videos').insert({
      title: videoTitle.trim(),
      description: videoDesc.trim() || null,
      youtube_url: fullUrl,
      youtube_id: ytId,
      thumbnail_url: thumbnail,
      is_active: true,
      sort_order: 0,
    })

    if (error) {
      setMsg('저장 실패: ' + error.message)
    } else {
      setMsg('동영상이 추가되었습니다.')
      setYoutubeUrl('')
      setVideoTitle('')
      setVideoDesc('')
      fetchVideos()
    }
    setSaving(false)
  }

  async function toggleActive(id: string, current: boolean) {
    await (supabase as any).from('course_videos').update({ is_active: !current }).eq('id', id)
    fetchVideos()
  }

  async function deleteVideo(id: string) {
    if (!confirm('이 동영상을 삭제하시겠습니까?')) return
    await (supabase as any).from('course_videos').delete().eq('id', id)
    fetchVideos()
  }

  return (
    <div className="space-y-6">
      <div className="card p-5 space-y-4">
        <h3 className="text-sm font-bold text-brand-900 flex items-center gap-2">
          <PlayCircle size={16} className="text-brand-700" />새 동영상 추가
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="form-label">YouTube URL *</label>
            <input type="text" value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." className="form-input text-sm" />
          </div>
          <div>
            <label className="form-label">제목 *</label>
            <input type="text" value={videoTitle} onChange={e => setVideoTitle(e.target.value)} placeholder="강좌 제목" className="form-input text-sm" />
          </div>
        </div>
        <div>
          <label className="form-label">설명 (선택)</label>
          <input type="text" value={videoDesc} onChange={e => setVideoDesc(e.target.value)} placeholder="강좌 설명" className="form-input text-sm" />
        </div>
        {msg && <p className={clsx('text-xs', msg.includes('실패') ? 'text-red-600' : 'text-emerald-600')}>{msg}</p>}
        <button onClick={addVideo} disabled={saving} className="btn-primary text-sm flex items-center gap-2">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          동영상 추가
        </button>
        <p className="text-[11px] text-warm-400">
          자막 설정: YouTube Studio → 해당 동영상 → 자막 → 자동 생성 또는 수동 업로드
        </p>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-warm-100">
          <h3 className="text-sm font-bold text-brand-900">등록된 동영상 ({videos.length}개) — 최신순</h3>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-warm-400">불러오는 중...</div>
        ) : videos.length === 0 ? (
          <div className="p-8 text-center text-sm text-warm-400">등록된 동영상이 없습니다.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {videos.map(v => (
              <div key={v.id} className="flex items-center gap-4 px-5 py-3 hover:bg-warm-50">
                <a href={v.youtube_url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                  <img
                    src={v.thumbnail_url ?? ''}
                    alt={v.title}
                    className="h-16 w-28 rounded-lg object-cover bg-warm-200"
                    onError={e => { (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${v.youtube_id}/hqdefault.jpg` }}
                  />
                </a>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-brand-900 truncate">{v.title}</p>
                  {v.description && <p className="text-xs text-warm-500 truncate">{v.description}</p>}
                  <p className="text-[11px] text-warm-400 mt-0.5">
                    {new Date(v.created_at).toLocaleDateString('ko-KR')}
                    {!v.is_active && <span className="ml-2 text-red-500 font-semibold">비활성</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleActive(v.id, v.is_active)}
                    className={clsx('text-xs px-3 py-1.5 rounded-lg border font-semibold', v.is_active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-warm-200 bg-warm-50 text-warm-500')}
                  >
                    {v.is_active ? '활성' : '비활성'}
                  </button>
                  <button
                    onClick={() => deleteVideo(v.id)}
                    className="text-xs px-2 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
