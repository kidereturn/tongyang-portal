import { useEffect, useState } from 'react'
import { Download, Loader2, Search } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { type FileRow } from '../adminShared'

export default function FilesTab() {
  const [files, setFiles] = useState<FileRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      const db = supabase as any
      const { data } = await db
        .from('evidence_uploads')
        .select('id, file_name, original_file_name, file_path, unique_key, uploaded_at, owner:owner_id(full_name)')
        .order('uploaded_at', { ascending: false })
        .limit(500)
      setFiles(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  async function downloadFile(path: string, name: string) {
    const { data } = await (supabase.storage as any).from('evidence').createSignedUrl(path, 3600)
    if (!data?.signedUrl) return
    const anchor = document.createElement('a')
    anchor.href = data.signedUrl
    anchor.download = name
    anchor.click()
  }

  const filtered = files.filter(file => {
    if (!search) return true
    return [
      file.original_file_name ?? file.file_name,
      file.file_name,
      file.unique_key ?? '',
      file.owner?.full_name ?? '',
    ].some(value => value.toLowerCase().includes(search.toLowerCase()))
  })

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 size={24} className="animate-spin text-brand-500" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="파일명, 고유키, 업로드 사용자 검색..."
          className="form-input pl-9 text-sm"
        />
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-gray-50 px-4 py-3 text-xs text-gray-500">
          총 <b className="text-gray-700">{filtered.length}</b>개 파일
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>파일명</th>
                <th>고유키</th>
                <th>업로드 사용자</th>
                <th>업로드일</th>
                <th className="text-center">다운로드</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(file => (
                <tr key={file.id}>
                  <td className="max-w-[320px] truncate text-xs text-gray-700">{file.original_file_name ?? file.file_name}</td>
                  <td className="font-mono text-xs text-gray-500">{file.unique_key ?? '-'}</td>
                  <td className="text-xs text-gray-600">{file.owner?.full_name ?? '-'}</td>
                  <td className="text-xs text-gray-400">
                    {file.uploaded_at ? new Date(file.uploaded_at).toLocaleDateString('ko-KR') : '-'}
                  </td>
                  <td className="text-center">
                    <button
                      onClick={() => downloadFile(file.file_path, file.original_file_name ?? file.file_name)}
                      className="inline-flex items-center gap-1 rounded-lg bg-brand-50 px-2 py-1 text-xs text-brand-700 transition-all hover:bg-brand-100"
                    >
                      <Download size={11} />
                      다운로드
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
