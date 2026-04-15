import { useEffect, useRef, useState } from 'react'
import { ImagePlus, Loader2, Trash2, Upload } from 'lucide-react'
import { supabase } from '../../../lib/supabase'

type WebtoonEpisode = {
  id: string
  episode_number: number
  title: string
  image_path: string
  created_at: string
  updated_at: string | null
}

const MAX_CHUNK_HEIGHT = 4000
const MAX_WIDTH = 1200
const JPEG_QUALITY = 0.90

/**
 * createImageBitmap를 사용하여 원본 이미지의 일부만 디코딩 후 리사이즈.
 * 전체 이미지를 메모리에 올리지 않으므로 아무리 큰 이미지도 안전.
 */
async function splitAndCompress(
  file: File,
  onProgress?: (msg: string) => void,
): Promise<Blob[]> {
  onProgress?.('이미지 정보 읽는 중...')

  // 1) 원본 크기 파악 (작은 bitmap으로)
  const probe = await createImageBitmap(file)
  const origW = probe.width
  const origH = probe.height
  probe.close()

  const origMB = (file.size / 1024 / 1024).toFixed(1)
  const scale = Math.min(1, MAX_WIDTH / origW)
  const outW = Math.round(origW * scale)
  const outH = Math.round(origH * scale)

  // 원본 좌표 기준 chunk 높이
  const srcChunkH = Math.round(MAX_CHUNK_HEIGHT / scale)
  const chunkCount = Math.ceil(origH / srcChunkH)

  onProgress?.(`원본: ${origW}×${origH} (${origMB}MB) → ${outW}×${outH}, ${chunkCount}조각 분할`)

  const blobs: Blob[] = []

  for (let i = 0; i < chunkCount; i++) {
    const srcY = i * srcChunkH
    const srcH = Math.min(srcChunkH, origH - srcY)
    const dstH = Math.round(srcH * scale)

    onProgress?.(`조각 ${i + 1}/${chunkCount} 디코딩 중... (원본 y=${srcY}~${srcY + srcH})`)

    // 핵심: createImageBitmap로 해당 영역만 디코딩 + 리사이즈
    const bitmap = await createImageBitmap(file, 0, srcY, origW, srcH, {
      resizeWidth: outW,
      resizeHeight: dstH,
      resizeQuality: 'high',
    })

    const canvas = document.createElement('canvas')
    canvas.width = outW
    canvas.height = dstH
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(bitmap, 0, 0)
    bitmap.close()

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        b => b ? resolve(b) : reject(new Error(`조각 ${i + 1} 변환 실패`)),
        'image/jpeg',
        JPEG_QUALITY,
      )
    })

    blobs.push(blob)
    const totalMB = blobs.reduce((s, b) => s + b.size, 0) / 1024 / 1024
    onProgress?.(`조각 ${i + 1}/${chunkCount} 완료 (누적 ${totalMB.toFixed(1)}MB)`)
  }

  const totalMB = blobs.reduce((s, b) => s + b.size, 0) / 1024 / 1024
  onProgress?.(`압축 완료! ${chunkCount}조각, 총 ${totalMB.toFixed(1)}MB (원본 ${origMB}MB)`)
  return blobs
}

export default function WebtoonTab() {
  const [episodes, setEpisodes] = useState<WebtoonEpisode[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('')
  const [replacingId, setReplacingId] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const replaceRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadEpisodes() }, [])

  async function loadEpisodes() {
    setLoading(true)
    const db = supabase as any
    const { data } = await db.from('webtoon_episodes').select('*').order('episode_number')
    setEpisodes(data ?? [])
    setLoading(false)
  }

  async function uploadFile(file: File, episodeNum: number): Promise<string> {
    if (file.size <= 2 * 1024 * 1024) {
      setUploadStatus('파일이 충분히 작아 원본 그대로 업로드합니다')
      const path = `episode_${episodeNum}.jpg`
      const { error } = await (supabase.storage as any)
        .from('webtoon')
        .upload(path, file, { upsert: true, cacheControl: '0', contentType: file.type })
      if (error) throw new Error(`업로드 실패: ${error.message}`)
      return path
    }

    const blobs = await splitAndCompress(file, setUploadStatus)

    if (blobs.length === 1) {
      const path = `episode_${episodeNum}.jpg`
      setUploadStatus('스토리지 업로드 중...')
      const { error } = await (supabase.storage as any)
        .from('webtoon')
        .upload(path, blobs[0], { upsert: true, cacheControl: '0', contentType: 'image/jpeg' })
      if (error) throw new Error(`업로드 실패: ${error.message}`)
      return path
    }

    const paths: string[] = []
    for (let i = 0; i < blobs.length; i++) {
      const path = `episode_${episodeNum}_${i + 1}.jpg`
      setUploadStatus(`스토리지 업로드: ${i + 1}/${blobs.length} 조각...`)
      const { error } = await (supabase.storage as any)
        .from('webtoon')
        .upload(path, blobs[i], { upsert: true, cacheControl: '0', contentType: 'image/jpeg' })
      if (error) throw new Error(`조각 ${i + 1} 업로드 실패: ${error.message}`)
      paths.push(path)
    }
    return paths.join(',')
  }

  async function removeOldImages(imagePath: string) {
    const paths = imagePath.split(',').map(p => p.trim()).filter(Boolean)
    if (paths.length > 0) {
      await (supabase.storage as any).from('webtoon').remove(paths)
    }
  }

  async function handleUpload() {
    const file = fileRef.current?.files?.[0]
    if (!file) { alert('파일을 선택해주세요'); return }

    setUploading(true)
    setUploadStatus('준비 중...')

    try {
      const nextNum = episodes.length > 0 ? Math.max(...episodes.map(e => e.episode_number)) + 1 : 1
      const title = newTitle.trim() || `${nextNum}화`
      const imagePath = await uploadFile(file, nextNum)

      setUploadStatus('DB 저장 중...')
      const { error: dbErr } = await (supabase as any).from('webtoon_episodes').insert({
        episode_number: nextNum,
        title,
        image_path: imagePath,
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
      setUploadStatus('')
    }
  }

  async function handleReplace(ep: WebtoonEpisode) {
    const file = replaceRef.current?.files?.[0]
    if (!file) return

    setReplacingId(ep.id)
    setUploadStatus('준비 중...')
    try {
      await removeOldImages(ep.image_path)
      const imagePath = await uploadFile(file, ep.episode_number)

      setUploadStatus('DB 업데이트 중...')
      const { error: dbErr } = await (supabase as any)
        .from('webtoon_episodes')
        .update({ image_path: imagePath, updated_at: new Date().toISOString() })
        .eq('id', ep.id)

      if (dbErr) throw new Error(`DB 업데이트 실패: ${dbErr.message}`)

      if (replaceRef.current) replaceRef.current.value = ''
      await loadEpisodes()
      alert(`${ep.episode_number}화 이미지 교체 완료!`)
    } catch (err) {
      alert(err instanceof Error ? err.message : '교체 중 오류')
    } finally {
      setReplacingId(null)
      setUploadStatus('')
    }
  }

  async function handleDelete(ep: WebtoonEpisode) {
    if (!confirm(`${ep.episode_number}화를 삭제하시겠습니까?`)) return
    await removeOldImages(ep.image_path)
    await (supabase as any).from('webtoon_episodes').delete().eq('id', ep.id)
    loadEpisodes()
  }

  function getPublicUrl(path: string) {
    const { data } = (supabase.storage as any).from('webtoon').getPublicUrl(path)
    const url = data?.publicUrl ?? ''
    return url ? `${url}?t=${Date.now()}` : ''
  }

  function partCount(imagePath: string) {
    return imagePath.split(',').filter(Boolean).length
  }

  return (
    <div className="space-y-5">
      <div className="card p-6">
        <h3 className="mb-1 text-base font-bold text-gray-900">웹툰 에피소드 업로드</h3>
        <p className="mb-4 text-sm text-gray-500">
          이미지를 업로드하면 자동으로 다음 화 번호가 부여됩니다. 큰 이미지(2MB+)는 자동 분할 압축됩니다.
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
            {uploading ? '처리 중...' : '새 에피소드 업로드'}
          </button>
        </div>
        {uploadStatus && (
          <div className="mt-3 rounded-lg bg-blue-50 px-4 py-2.5 text-xs text-blue-700 font-medium">
            {uploadStatus}
          </div>
        )}
      </div>

      <input
        ref={replaceRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={() => {
          const ep = episodes.find(e => e.id === replacingId)
          if (ep) handleReplace(ep)
        }}
      />

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
                  src={getPublicUrl(ep.image_path.split(',')[0])}
                  alt={ep.title}
                  className="h-16 w-12 rounded-lg object-cover bg-gray-100 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-gray-900">
                    {ep.episode_number}화 — {ep.title}
                    {partCount(ep.image_path) > 1 && (
                      <span className="ml-2 text-xs text-blue-500 font-normal">
                        ({partCount(ep.image_path)}조각)
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(ep.created_at).toLocaleDateString('ko-KR')}
                    {ep.updated_at && ep.updated_at !== ep.created_at && (
                      <span className="ml-2 text-blue-500">
                        (수정: {new Date(ep.updated_at).toLocaleDateString('ko-KR')})
                      </span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => { setReplacingId(ep.id); replaceRef.current?.click() }}
                  disabled={replacingId === ep.id}
                  className="rounded-lg p-2 text-gray-400 hover:bg-blue-50 hover:text-blue-500 transition"
                  title="이미지 교체"
                >
                  {replacingId === ep.id ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}
                </button>
                <button
                  onClick={() => handleDelete(ep)}
                  className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 transition"
                  title="삭제"
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
