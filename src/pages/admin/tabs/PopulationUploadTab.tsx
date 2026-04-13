import { useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { Loader2, Upload } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { readText, toDateString, PreviewTable, ResultCard } from '../adminShared'

export default function PopulationUploadTab({ onDone }: { onDone: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<Record<string, string>[]>([])
  const [result, setResult] = useState<{ upserted: number; errors: string[] } | null>(null)
  const [progress, setProgress] = useState({ current: 0, total: 0, phase: '' })

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = loaded => {
      const workbook = XLSX.read(loaded.target?.result, { type: 'binary' })
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      setPreview(XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, { defval: '' }).slice(0, 5))
    }
    reader.readAsBinaryString(file)
  }

  async function handleUpload() {
    const file = fileRef.current?.files?.[0]
    if (!file) return

    setUploading(true)
    setResult(null)
    setProgress({ current: 0, total: 0, phase: '파일 읽는 중...' })

    const reader = new FileReader()
    reader.onload = async loaded => {
      const workbook = XLSX.read(loaded.target?.result, { type: 'binary', cellDates: true })
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' })
      const errors: string[] = []
      let upserted = 0
      const db = supabase as any

      setProgress({ current: 0, total: rows.length, phase: '기존 데이터 정리 중...' })

      const uniqueKeys = Array.from(
        new Set(
          rows
            .map(row => {
              const controlCode = readText(row, ['통제번호', 'control_code'])
              const department = readText(row, ['관련부서', 'department'])
              return controlCode && department ? `${controlCode}${department}` : readText(row, ['고유키', 'unique_key'])
            })
            .filter(Boolean)
        )
      )

      for (let index = 0; index < uniqueKeys.length; index += 100) {
        const { error } = await db.from('population_items').delete().in('unique_key', uniqueKeys.slice(index, index + 100))
        if (error) {
          errors.push(`기존 모집단 삭제 실패: ${error.message}`)
          break
        }
      }

      setProgress({ current: 0, total: rows.length, phase: '모집단 등록 중...' })

      for (let index = 0; index < rows.length; index += 1) {
        if (index % 10 === 0) setProgress({ current: index, total: rows.length, phase: '모집단 등록 중...' })
        const row = rows[index]
        const controlCode = readText(row, ['통제번호', 'control_code'])
        const department = readText(row, ['관련부서', 'department'])
        const uniqueKey = controlCode && department ? `${controlCode}${department}` : readText(row, ['고유키', 'unique_key'])
        if (!uniqueKey) continue

        const sampleId = readText(row, ['Sample ID', 'sample_id'])
        const transactionId = String(row['Transaction ID'] ?? row.transaction_id ?? '').trim() || null
        const transactionDate =
          toDateString(row['거래일'] ?? row.transaction_date) ??
          toDateString(row['Transaction Date'] ?? row.transaction_date)

        const payload = {
          unique_key: uniqueKey,
          control_code: controlCode || null,
          dept_code: readText(row, ['부서코드', 'dept_code']) || null,
          related_dept: department || null,
          sample_id: sampleId ? `${sampleId}__${index + 1}` : `${uniqueKey}__${index + 1}`,
          transaction_id: transactionId,
          transaction_date: transactionDate,
          description: readText(row, ['거래설명', 'description']) || null,
          extra_info: readText(row, ['추가 정보 1', 'extra_info']) || null,
          extra_info_2: readText(row, ['추가 정보 2', 'extra_info_2']) || null,
          extra_info_3: readText(row, ['추가 정보 3', 'extra_info_3']) || null,
          extra_info_4: readText(row, ['추가 정보 4', 'extra_info_4']) || null,
        }

        const { error } = await db.from('population_items').insert(payload)
        if (error) errors.push(`[${sampleId || uniqueKey}] ${error.message}`)
        else upserted += 1
      }

      setProgress({ current: rows.length, total: rows.length, phase: '완료' })
      setResult({ upserted, errors })
      setUploading(false)
      onDone()
    }

    reader.readAsBinaryString(file)
  }

  const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0

  return (
    <div className="space-y-5">
      <div className="card p-6">
        <h3 className="mb-1 text-base font-bold text-gray-900">모집단 업로드</h3>
        <p className="mb-4 text-sm text-gray-500">
          모집단 파일은 거래 단위 데이터만 다시 적재합니다. 사용자 생성과는 완전히 분리되어 있습니다.
        </p>

        <div className="flex gap-3">
          <div className="flex-1">
            <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="form-input text-sm" disabled={uploading} />
          </div>
          <button onClick={handleUpload} disabled={uploading} className="btn-primary shrink-0">
            {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
            {uploading ? '처리 중...' : '업로드'}
          </button>
        </div>

        {uploading && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>{progress.phase}</span>
              <span>{progress.current.toLocaleString()} / {progress.total.toLocaleString()} ({pct}%)</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-500 to-emerald-500 transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <PreviewTable rows={preview} />

      {result && (
        <ResultCard
          title="모집단 업로드 완료"
          stats={[
            { label: '적재된 행', value: result.upserted, color: 'text-emerald-600' },
            { label: '미리보기', value: preview.length, color: 'text-blue-600' },
            { label: '오류', value: result.errors.length, color: 'text-red-500' },
          ]}
          errors={result.errors}
        />
      )}
    </div>
  )
}
