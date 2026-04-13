import { useEffect, useRef, useState } from 'react'
import { Loader2, Trash2, Upload } from 'lucide-react'
import { supabase } from '../../../lib/supabase'

type WebtoonEpisode = {
  id: string
  episode_number: number
  title: string
  image_path: string
  created_at: string
}

export default function WebtoonTab() {
  const [episodes, setEpisodes] = useState<WebtoonEpisode[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadEpisodes() }, [])

  async function loadEpisodes() {
    setLoading(true)
    const db = supabase as any
    const { data } = await db.from('webtoon_episodes').select('*').order('episode_number')
    setEpisodes(data ?? [])
    setLoading(false)
  }

  async function handleUpload() {
    const file = fileRef.current?.files?.[0]
    if (!file) return

    setUploading(true)
    const db = supabase as any

    try {
      const nextNum = episodes.length > 0 ? Math.max(...episodes.map(e => e.episode_number)) + 1 : 1
      const title = newTitle.trim() || `${nextNum}화`

      const ext = file.name.split('.').pop() ?? 'jpg'
      const storagePath = `episode_${nextNum}.${ext}`

      const { error: storageErr } = await (supabase.storage as any)
        .from('webtoon')
        .upload(storagePath, file, { upsert: true })

      if (storageErr) throw new Error(`업로드 실패: ${storageErr.message}`)

      const { error: dbErr } = await db.from('webtoon_episodes').insert({
        episode_number: nextNum,
        title,
        image_path: storagePath,
      })

      if (dbErr) throw new Error(`DB 저장 실패: ${dbErr.message}`)

      setNewTitle('')
      if (fileRef.current) fileRef.current.value = ''
      await loadEpisodes()
      alert(`${nextNum}화 업로드 완료!`)
    } catch (err) {
      alert(err instanceof Error ? err.message : '업로드 중 오류')
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(ep: WebtoonEpisode) {
    if (!confirm(`${ep.episode_number}화를 삭제하시겠습니까?`)) return
    await (supabase.storage as any).from('webtoon').remove([ep.image_path])
    await (supabase as any).from('webtoon_episodes').delete().eq('id', ep.id)
    loadEpisodes()
  }

  function getPublicUrl(path: string) {
    const { data } = (supabase.storage as any).from('webtoon').getPublicUrl(path)
    return data?.publicUrl ?? ''
  }

  return (
    <div className="space-y-5">
      <div className="card p-6">
        <h3 className="mb-1 text-base font-bold text-gray-900">웹툰 에피소드 업로드</h3>
        <p className="mb-4 text-sm text-gray-500">
          이미지를 업로드하면 자동으로 다음 화 번호가 부여됩니다. (JPG/PNG/WEBP 권장)
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder={`제목 (비우면 "${(episodes.length > 0 ? Math.max(...episodes.map(e => e.episode_number)) + 1 : 1)}화")`}
            className="form-input text-sm sm:w-48"
          />
          <input ref={fileRef} type="file" accept="image/*" className="form-input text-sm flex-1" disabled={uploading} />
          <button onClick={handleUpload} disabled={uploading} className="btn-primary shrink-0">
            {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
            {uploading ? '업로드 중...' : '업로드'}
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-3">
          <p className="text-sm font-bold text-gray-900">등록된 에피소드 ({episodes.length}개)</p>
        </div>
        {loading ? (
          <div className="p-5 space-y-3">
            {[1,2,3].map(i => <div key={i} className="skeleton h-16 w-full rounded-xl" />)}
          </div>
        ) : episodes.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-gray-400">등록된 웹툰이 없습니다</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {episodes.map(ep => (
              <div key={ep.id} className="flex items-center gap-4 px-5 py-3">
                <img
                  src={getPublicUrl(ep.image_path)}
                  alt={ep.title}
                  className="h-16 w-12 rounded-lg object-cover bg-gray-100 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-gray-900">{ep.episode_number}화 — {ep.title}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(ep.created_at).toLocaleDateString('ko-KR')}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(ep)}
                  className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 transition"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
