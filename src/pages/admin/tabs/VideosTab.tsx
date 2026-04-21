import { useEffect, useState } from 'react'
import { Loader2, PlayCircle, Trash2, Upload, Pencil, X, Save } from 'lucide-react'
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
  deadline?: string | null
  category?: string | null
}

export default function VideosTab() {
  const [videos, setVideos] = useState<VideoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [videoTitle, setVideoTitle] = useState('')
  const [videoDesc, setVideoDesc] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [editing, setEditing] = useState<VideoRow | null>(null)

  async function fetchVideos() {
    setLoading(true)
    try {
      const { data, error } = await (supabase as any)
        .from('course_videos')
        .select('*')
        .order('sort_order', { ascending: true })
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
    const maxSort = videos.reduce((m, v) => Math.max(m, v.sort_order), 0)

    const { error } = await (supabase as any).from('course_videos').insert({
      title: videoTitle.trim(),
      description: videoDesc.trim() || null,
      youtube_url: fullUrl,
      youtube_id: ytId,
      thumbnail_url: thumbnail,
      is_active: true,
      sort_order: maxSort + 1,
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
    if (!confirm('이 동영상을 삭제하시겠습니까?\n해당 강좌의 수강기록도 함께 초기화됩니다.')) return
    // Clear learning_progress for this course first, then delete the video
    await (supabase as any).from('learning_progress').delete().eq('course_id', id)
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
          <h3 className="text-sm font-bold text-brand-900">등록된 동영상 ({videos.length}개) — 순번순</h3>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-warm-400">불러오는 중...</div>
        ) : videos.length === 0 ? (
          <div className="p-8 text-center text-sm text-warm-400">등록된 동영상이 없습니다.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {videos.map(v => (
              <div key={v.id} className="flex items-center gap-4 px-5 py-3 hover:bg-warm-50">
                <span className="shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700">
                  {v.sort_order}
                </span>
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
                  <p className="text-[11px] text-warm-400 mt-0.5 flex items-center gap-2 flex-wrap">
                    <span>{new Date(v.created_at).toLocaleDateString('ko-KR')}</span>
                    {v.duration && <span>· {v.duration}</span>}
                    {!v.is_active && <span className="text-red-500 font-semibold">비활성</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setEditing(v)}
                    className="text-xs px-2 py-1.5 rounded-lg border border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100 inline-flex items-center gap-1"
                    title="수정"
                  >
                    <Pencil size={13} />
                    수정
                  </button>
                  <button
                    onClick={() => toggleActive(v.id, v.is_active)}
                    className={clsx('text-xs px-3 py-1.5 rounded-lg border font-semibold', v.is_active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-warm-200 bg-warm-50 text-warm-500')}
                  >
                    {v.is_active ? '활성' : '비활성'}
                  </button>
                  <button
                    onClick={() => deleteVideo(v.id)}
                    className="text-xs px-2 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 inline-flex items-center gap-1"
                    title="삭제 (수강기록 포함)"
                  >
                    <Trash2 size={13} />
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <EditVideoModal
          video={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); fetchVideos() }}
        />
      )}
    </div>
  )
}

function EditVideoModal({
  video,
  onClose,
  onSaved,
}: {
  video: VideoRow
  onClose: () => void
  onSaved: () => void
}) {
  const [title, setTitle] = useState(video.title)
  const [description, setDescription] = useState(video.description ?? '')
  const [youtubeUrl, setYoutubeUrl] = useState(video.youtube_url)
  const [duration, setDuration] = useState(video.duration ?? '')
  const [sortOrder, setSortOrder] = useState(video.sort_order)
  const [hasSubtitles, setHasSubtitles] = useState(video.has_subtitles)
  const [deadline, setDeadline] = useState<string>(video.deadline ?? '')
  const [category, setCategory] = useState<string>(video.category ?? '내부통제')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    setError('')
    if (!title.trim()) { setError('제목을 입력해주세요.'); return }

    const ytId = extractYoutubeId(youtubeUrl.trim()) ?? video.youtube_id
    if (!ytId) { setError('올바른 YouTube URL이 아닙니다.'); return }

    const fullUrl = youtubeUrl.trim().startsWith('http')
      ? youtubeUrl.trim()
      : `https://www.youtube.com/watch?v=${ytId}`
    const thumbnail = `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`

    setSaving(true)
    const { error: updateError } = await (supabase as any)
      .from('course_videos')
      .update({
        title: title.trim(),
        description: description.trim() || null,
        youtube_url: fullUrl,
        youtube_id: ytId,
        thumbnail_url: thumbnail,
        duration: duration.trim() || null,
        sort_order: Number.isFinite(sortOrder) ? sortOrder : video.sort_order,
        has_subtitles: hasSubtitles,
        deadline: deadline || null,
        category: category || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', video.id)
    setSaving(false)

    if (updateError) {
      setError('저장 실패: ' + updateError.message)
    } else {
      onSaved()
    }
  }

  return (
    <div
      className="modal-overlay"
      onClick={event => { if (event.target === event.currentTarget) onClose() }}
    >
      <div className="modal-box max-w-lg p-6">
        <div className="mb-4 flex items-start justify-between">
          <h3 className="text-lg font-bold text-brand-900">강좌 수정</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-warm-400 transition hover:bg-warm-100 hover:text-warm-600"
            aria-label="닫기"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="form-label">제목 *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="form-input text-sm"
            />
          </div>
          <div>
            <label className="form-label">설명</label>
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="form-input text-sm"
              placeholder="선택사항"
            />
          </div>
          <div>
            <label className="form-label">YouTube URL</label>
            <input
              value={youtubeUrl}
              onChange={e => setYoutubeUrl(e.target.value)}
              className="form-input text-sm"
              placeholder="https://www.youtube.com/watch?v=... 또는 https://youtu.be/..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">재생시간</label>
              <input
                value={duration}
                onChange={e => setDuration(e.target.value)}
                className="form-input text-sm"
                placeholder="예: 15:08"
              />
            </div>
            <div>
              <label className="form-label">순번 (sort_order)</label>
              <input
                type="number"
                value={sortOrder}
                onChange={e => setSortOrder(Number(e.target.value))}
                className="form-input text-sm"
                min={0}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">수강기한 *</label>
              <input
                type="date"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                className="form-input text-sm"
              />
              <p className="mt-1 text-[11px] text-warm-500">썸네일 및 영상 페이지 하단에 표시됩니다.</p>
            </div>
            <div>
              <label className="form-label">카테고리</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="form-input text-sm"
              >
                <option>내부통제</option>
                <option>재무회계</option>
                <option>규제대응</option>
                <option>리더십</option>
                <option>IT·보안</option>
                <option>필수</option>
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-brand-800 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hasSubtitles}
              onChange={e => setHasSubtitles(e.target.checked)}
              className="h-4 w-4 rounded border-warm-300 text-brand-700"
            />
            자막 사용 가능
          </label>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost" disabled={saving}>
            취소
          </button>
          <button onClick={handleSave} className="btn-primary" disabled={saving}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            저장
          </button>
        </div>
      </div>
    </div>
  )
}
