import { useEffect, useState, useRef } from 'react'
import { BookOpen, Edit3, FileText, FileUp, Loader2, Plus, Search, Trash2, X, Save, Eye, EyeOff } from 'lucide-react'
import clsx from 'clsx'
import { supabase } from '../../../lib/supabase'
import * as pdfjsLib from 'pdfjs-dist'

// PDF.js worker 설정 (CDN)
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`

interface DocRow {
  id: string
  title: string
  category: string
  content: string
  is_active: boolean
  created_at: string
  updated_at: string
}

const CATEGORIES = [
  '제도 개요', '법규', '프레임워크', '문서', '시스템 사용',
  '워크플로우', '감사 개념', '내부통제', '평가', '용어', '동양 특화',
]

// 클라이언트 측 PDF 텍스트 추출 (pdfjs-dist, API 호출 없음)
async function extractPdfText(file: File): Promise<{ text: string; model: string }> {
  const buffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
  const pages: string[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items
      .map((item: any) => item.str)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (pageText) pages.push(pageText)
  }

  const fullText = pages.join('\n\n')

  if (!fullText || fullText.length < 20) {
    // 텍스트가 거의 없으면 스캔 PDF → Gemini OCR 시도
    return await extractPdfWithGemini(file)
  }

  return { text: fullText, model: `PDF.js (${pdf.numPages}페이지)` }
}

// 스캔 PDF 전용: Gemini OCR 폴백
async function extractPdfWithGemini(file: File): Promise<{ text: string; model: string }> {
  const buffer = await file.arrayBuffer()
  const base64 = btoa(
    new Uint8Array(buffer).reduce((s, b) => s + String.fromCharCode(b), '')
  )

  const res = await fetch('/api/pdf-extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pdf_base64: base64, file_name: file.name }),
  })

  const data = await res.json()
  if (!res.ok || !data.ok) {
    const detail = data.errors ? data.errors.join(' | ') : data.error
    throw new Error(detail ?? '스캔 PDF OCR 실패 (Gemini 쿼터 확인 필요)')
  }
  return { text: data.text, model: `${data.model} OCR` }
}

export default function ChatbotDocsTab() {
  const [docs, setDocs] = useState<DocRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [editing, setEditing] = useState<DocRow | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [pdfExtracting, setPdfExtracting] = useState(false)
  const [pdfProgress, setPdfProgress] = useState('')
  const [batchResults, setBatchResults] = useState<Array<{ name: string; ok: boolean; error?: string }>>([])
  const pdfInputRef = useRef<HTMLInputElement>(null)
  const pdfBatchInputRef = useRef<HTMLInputElement>(null)
  const pdfInputModalRef = useRef<HTMLInputElement>(null)
  const txtInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const db = supabase as any
    const { data } = await db
      .from('chatbot_documents')
      .select('*')
      .order('category')
      .order('title')
    setDocs(data ?? [])
    setLoading(false)
  }

  async function toggleActive(doc: DocRow) {
    const db = supabase as any
    await db.from('chatbot_documents').update({ is_active: !doc.is_active }).eq('id', doc.id)
    setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, is_active: !d.is_active } : d))
  }

  async function deleteDoc(doc: DocRow) {
    if (!confirm(`"${doc.title}" 문서를 삭제하시겠습니까?`)) return
    const db = supabase as any
    await db.from('chatbot_documents').delete().eq('id', doc.id)
    setDocs(prev => prev.filter(d => d.id !== doc.id))
  }

  function openNew() {
    setIsNew(true)
    setEditing({
      id: '', title: '', category: '시스템 사용', content: '', is_active: true,
      created_at: '', updated_at: '',
    })
  }

  function openEdit(doc: DocRow) {
    setIsNew(false)
    setEditing({ ...doc })
  }

  // PDF 업로드 → 텍스트 추출 → 새 문서 편집 모달 열기
  async function handlePdfUpload(file: File) {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      alert('PDF 파일만 업로드 가능합니다.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('파일 크기는 10MB 이하만 가능합니다.')
      return
    }

    setPdfExtracting(true)
    setPdfProgress(`"${file.name}" 텍스트 추출 중... (Gemini AI가 분석합니다)`)

    try {
      const result = await extractPdfText(file)

      // 파일명에서 제목 추출 (.pdf 제거)
      const title = file.name.replace(/\.pdf$/i, '').trim()

      setIsNew(true)
      setEditing({
        id: '', title, category: '문서', content: result.text, is_active: true,
        created_at: '', updated_at: '',
      })
      setPdfProgress('')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'PDF 처리 오류'
      alert(`PDF 텍스트 추출 실패: ${msg}`)
    } finally {
      setPdfExtracting(false)
      // 같은 파일 재선택 가능하도록 input 리셋
      if (pdfInputRef.current) pdfInputRef.current.value = ''
      if (pdfInputModalRef.current) pdfInputModalRef.current.value = ''
    }
  }

  // 모달 내부에서 PDF → 기존 편집 내용에 텍스트 추가/교체
  async function handlePdfInModal(file: File) {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      alert('PDF 파일만 업로드 가능합니다.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('파일 크기는 10MB 이하만 가능합니다.')
      return
    }

    setPdfExtracting(true)
    setPdfProgress('PDF 텍스트 추출 중...')

    try {
      const result = await extractPdfText(file)
      if (editing) {
        const newTitle = editing.title || file.name.replace(/\.pdf$/i, '').trim()
        const newContent = editing.content
          ? editing.content + '\n\n---\n\n' + result.text
          : result.text
        setEditing({ ...editing, title: newTitle, content: newContent })
      }
      setPdfProgress('')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'PDF 처리 오류'
      alert(`PDF 텍스트 추출 실패: ${msg}`)
    } finally {
      setPdfExtracting(false)
      if (pdfInputModalRef.current) pdfInputModalRef.current.value = ''
    }
  }

  // PDF 일괄 업로드 → 텍스트 추출 → DB 바로 저장
  async function handleBatchPdfUpload(files: FileList) {
    const pdfFiles = Array.from(files).filter(f => f.name.toLowerCase().endsWith('.pdf'))
    if (pdfFiles.length === 0) {
      alert('PDF 파일을 선택해 주세요.')
      return
    }
    const oversize = pdfFiles.filter(f => f.size > 10 * 1024 * 1024)
    if (oversize.length) {
      alert(`${oversize.map(f => f.name).join(', ')}\n\n위 파일이 10MB를 초과합니다. 10MB 이하 파일만 업로드 가능합니다.`)
      return
    }

    setPdfExtracting(true)
    setBatchResults([])
    const results: Array<{ name: string; ok: boolean; error?: string }> = []
    const db = supabase as any

    for (let i = 0; i < pdfFiles.length; i++) {
      const file = pdfFiles[i]
      setPdfProgress(`(${i + 1}/${pdfFiles.length}) "${file.name}" 텍스트 추출 중...`)

      try {
        const extracted = await extractPdfText(file)
        const title = file.name.replace(/\.pdf$/i, '').trim()

        const { data } = await db.from('chatbot_documents').insert({
          title,
          category: '문서',
          content: extracted.text,
          is_active: true,
        }).select().single()

        if (data) {
          setDocs(prev => [...prev, data])
          results.push({ name: file.name, ok: true })
        } else {
          results.push({ name: file.name, ok: false, error: 'DB 저장 실패' })
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : '알 수 없는 오류'
        results.push({ name: file.name, ok: false, error: msg })
      }
    }

    setBatchResults(results)
    setPdfExtracting(false)
    setPdfProgress('')
    if (pdfBatchInputRef.current) pdfBatchInputRef.current.value = ''
  }

  // 텍스트 파일 일괄 업로드 → 즉시 DB 저장
  async function handleTextUpload(files: FileList) {
    const textFiles = Array.from(files).filter(f =>
      /\.(txt|md|text|csv|log|json|xml|html|htm)$/i.test(f.name)
    )
    if (textFiles.length === 0) {
      alert('텍스트 파일(.txt, .md 등)을 선택해 주세요.')
      return
    }

    setPdfExtracting(true)
    setBatchResults([])
    const results: Array<{ name: string; ok: boolean; error?: string }> = []
    const db = supabase as any

    for (let i = 0; i < textFiles.length; i++) {
      const file = textFiles[i]
      setPdfProgress(`(${i + 1}/${textFiles.length}) "${file.name}" 저장 중...`)

      try {
        const content = await file.text()
        if (!content.trim()) {
          results.push({ name: file.name, ok: false, error: '빈 파일' })
          continue
        }

        const title = file.name.replace(/\.[^.]+$/, '').trim()
        const { data } = await db.from('chatbot_documents').insert({
          title,
          category: '문서',
          content: content.trim(),
          is_active: true,
        }).select().single()

        if (data) {
          setDocs(prev => [...prev, data])
          results.push({ name: file.name, ok: true })
        } else {
          results.push({ name: file.name, ok: false, error: 'DB 저장 실패' })
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : '알 수 없는 오류'
        results.push({ name: file.name, ok: false, error: msg })
      }
    }

    setBatchResults(results)
    setPdfExtracting(false)
    setPdfProgress('')
    if (txtInputRef.current) txtInputRef.current.value = ''
  }

  async function saveDoc() {
    if (!editing) return
    if (!editing.title.trim() || !editing.content.trim()) {
      alert('제목과 내용을 입력하세요.')
      return
    }
    setSaving(true)
    const db = supabase as any
    const payload = {
      title: editing.title.trim(),
      category: editing.category,
      content: editing.content.trim(),
      is_active: editing.is_active,
    }

    if (isNew) {
      const { data } = await db.from('chatbot_documents').insert(payload).select().single()
      if (data) setDocs(prev => [...prev, data])
    } else {
      const { data } = await db.from('chatbot_documents').update(payload).eq('id', editing.id).select().single()
      if (data) setDocs(prev => prev.map(d => d.id === data.id ? data : d))
    }
    setSaving(false)
    setEditing(null)
  }

  const filtered = docs.filter(d => {
    if (catFilter && d.category !== catFilter) return false
    if (!search) return true
    const q = search.toLowerCase()
    return d.title.toLowerCase().includes(q) || d.content.toLowerCase().includes(q) || d.category.toLowerCase().includes(q)
  })

  const activeCnt = docs.filter(d => d.is_active).length
  const totalChars = docs.filter(d => d.is_active).reduce((s, d) => s + d.content.length, 0)
  const categories = [...new Set(docs.map(d => d.category))]

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 size={24} className="animate-spin text-brand-500" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 요약 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-3 text-center">
          <p className="text-2xl font-bold text-brand-700">{docs.length}</p>
          <p className="text-xs text-warm-500">전체 문서</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-2xl font-bold text-emerald-600">{activeCnt}</p>
          <p className="text-xs text-warm-500">활성 문서</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-2xl font-bold text-brand-600">{categories.length}</p>
          <p className="text-xs text-warm-500">카테고리</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-2xl font-bold text-amber-600">{(totalChars / 1000).toFixed(1)}K</p>
          <p className="text-xs text-warm-500">총 글자수</p>
        </div>
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3">
        <p className="text-xs text-blue-800">
          <strong>💡 문서 기반 AI:</strong> 활성화된 문서가 AI 챗봇의 유일한 지식 소스입니다.
          문서를 추가/수정하면 AI 답변 품질이 즉시 변경됩니다.
          현재 활성 문서 <strong>{activeCnt}건</strong> ({(totalChars / 1000).toFixed(1)}K자)이 AI 컨텍스트에 포함됩니다.
        </p>
      </div>

      {/* PDF 추출 진행 중 */}
      {pdfExtracting && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4">
          <Loader2 size={20} className="animate-spin text-amber-600" />
          <div>
            <p className="text-sm font-semibold text-amber-900">PDF 분석 중...</p>
            <p className="text-xs text-amber-700">{pdfProgress}</p>
          </div>
        </div>
      )}

      {/* 일괄 업로드 결과 */}
      {batchResults.length > 0 && (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold text-emerald-900">
              일괄 업로드 결과: {batchResults.filter(r => r.ok).length}/{batchResults.length}건 성공
            </p>
            <button onClick={() => setBatchResults([])} className="text-xs text-warm-500 hover:text-brand-700">닫기</button>
          </div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {batchResults.map((r, i) => (
              <div key={i} className={clsx('flex items-center gap-2 text-xs px-2 py-1 rounded', r.ok ? 'text-emerald-700' : 'text-red-600 bg-red-50')}>
                <span>{r.ok ? '✓' : '✗'}</span>
                <span className="font-medium">{r.name}</span>
                {r.error && <span className="text-red-500">— {r.error}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 검색/필터/추가 */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="문서 검색..."
            className="form-input pl-9 text-sm w-full"
          />
        </div>
        <select
          value={catFilter}
          onChange={e => setCatFilter(e.target.value)}
          className="form-input text-sm"
        >
          <option value="">전체 카테고리</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={openNew} className="btn-primary text-xs gap-1">
          <Plus size={14} />직접 입력
        </button>
        <label className={clsx(
          'btn-primary text-xs gap-1 bg-brand-600 hover:bg-brand-700 cursor-pointer',
          pdfExtracting && 'opacity-50 pointer-events-none'
        )}>
          <FileUp size={14} />PDF 1건
          <input
            ref={pdfInputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            disabled={pdfExtracting}
            onChange={e => {
              const f = e.target.files?.[0]
              if (f) handlePdfUpload(f)
            }}
          />
        </label>
        <label className={clsx(
          'btn-primary text-xs gap-1 bg-brand-700 hover:bg-brand-700 cursor-pointer',
          pdfExtracting && 'opacity-50 pointer-events-none'
        )}>
          <FileUp size={14} />PDF 일괄
          <input
            ref={pdfBatchInputRef}
            type="file"
            accept=".pdf"
            multiple
            className="hidden"
            disabled={pdfExtracting}
            onChange={e => {
              const files = e.target.files
              if (files && files.length > 0) handleBatchPdfUpload(files)
            }}
          />
        </label>
        <label className={clsx(
          'btn-primary text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 cursor-pointer',
          pdfExtracting && 'opacity-50 pointer-events-none'
        )}>
          <FileText size={14} />텍스트 파일 업로드
          <input
            ref={txtInputRef}
            type="file"
            accept=".txt,.md,.text,.csv,.log,.json,.xml,.html,.htm"
            multiple
            className="hidden"
            disabled={pdfExtracting}
            onChange={e => {
              const files = e.target.files
              if (files && files.length > 0) handleTextUpload(files)
            }}
          />
        </label>
      </div>

      {/* 문서 목록 */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table text-xs">
            <thead>
              <tr>
                <th className="w-10">상태</th>
                <th>카테고리</th>
                <th>제목</th>
                <th className="w-20">글자수</th>
                <th className="w-36">수정일</th>
                <th className="w-28">관리</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(doc => (
                <tr key={doc.id} className={clsx(!doc.is_active && 'opacity-50')}>
                  <td>
                    <button onClick={() => toggleActive(doc)} title={doc.is_active ? '비활성화' : '활성화'}>
                      {doc.is_active
                        ? <Eye size={14} className="text-emerald-500" />
                        : <EyeOff size={14} className="text-warm-400" />
                      }
                    </button>
                  </td>
                  <td>
                    <span className="inline-block rounded-full bg-warm-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700">
                      {doc.category}
                    </span>
                  </td>
                  <td className="font-medium text-brand-900">{doc.title}</td>
                  <td className="text-warm-500">{doc.content.length.toLocaleString()}</td>
                  <td className="text-warm-400">
                    {doc.updated_at ? new Date(doc.updated_at).toLocaleDateString('ko-KR') : '-'}
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(doc)} className="btn-ghost text-xs py-1 px-2">
                        <Edit3 size={12} />수정
                      </button>
                      <button onClick={() => deleteDoc(doc)} className="btn-ghost text-xs py-1 px-2 text-red-500 hover:text-red-700">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-warm-400">문서가 없습니다</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 편집 모달 */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white shadow-md">
            <div className="flex items-center justify-between border-b px-5 py-3">
              <h3 className="font-bold text-brand-900 flex items-center gap-2">
                <BookOpen size={16} className="text-brand-700" />
                {isNew ? '새 문서 추가' : '문서 수정'}
              </h3>
              <button onClick={() => setEditing(null)} className="p-1 hover:bg-warm-100 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-brand-700 mb-1">카테고리</label>
                  <select
                    value={editing.category}
                    onChange={e => setEditing({ ...editing, category: e.target.value })}
                    className="form-input text-sm w-full"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-brand-700 mb-1">상태</label>
                  <label className="flex items-center gap-2 mt-1.5">
                    <input
                      type="checkbox"
                      checked={editing.is_active}
                      onChange={e => setEditing({ ...editing, is_active: e.target.checked })}
                      className="rounded text-brand-700"
                    />
                    <span className="text-sm">{editing.is_active ? '활성' : '비활성'}</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-brand-700 mb-1">제목</label>
                <input
                  value={editing.title}
                  onChange={e => setEditing({ ...editing, title: e.target.value })}
                  placeholder="문서 제목"
                  className="form-input text-sm w-full"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-brand-700">
                    내용 <span className="text-warm-400 font-normal">({editing.content.length.toLocaleString()}자)</span>
                  </label>
                  <label className={clsx(
                    'inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-800 cursor-pointer font-semibold',
                    pdfExtracting && 'opacity-50 pointer-events-none'
                  )}>
                    <FileUp size={12} />PDF에서 추출
                    <input
                      ref={pdfInputModalRef}
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      disabled={pdfExtracting}
                      onChange={e => {
                        const f = e.target.files?.[0]
                        if (f) handlePdfInModal(f)
                      }}
                    />
                  </label>
                </div>
                {pdfExtracting && (
                  <div className="flex items-center gap-2 mb-2 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                    <Loader2 size={12} className="animate-spin" />
                    <span>{pdfProgress || 'PDF 텍스트 추출 중...'}</span>
                  </div>
                )}
                <textarea
                  value={editing.content}
                  onChange={e => setEditing({ ...editing, content: e.target.value })}
                  rows={16}
                  placeholder="AI 챗봇이 참조할 문서 내용을 입력하세요... 또는 위의 'PDF에서 추출' 버튼으로 PDF를 올려 자동 변환할 수 있습니다."
                  className="form-input text-sm w-full font-mono leading-relaxed"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setEditing(null)} className="btn-ghost text-sm">
                  취소
                </button>
                <button onClick={saveDoc} disabled={saving || pdfExtracting} className="btn-primary text-sm gap-1">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {isNew ? '추가' : '저장'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
