import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import clsx from 'clsx'

/* ── Types ── */

export type Tab =
  | 'upload-users'
  | 'upload-rcm'
  | 'upload-population'
  | 'users'
  | 'activities'
  | 'files'
  | 'notifications'
  | 'videos'
  | 'webtoon'
  | 'settings'
  | 'login-logs'
  | 'quiz-results'
  | 'notices'
  | 'points'
  | 'chatbot-docs'

export type UserRow = {
  id: string
  email: string
  full_name: string | null
  employee_id: string | null
  department: string | null
  phone: string | null
  role: string
  is_active: boolean
  initial_password: string | null
  created_at: string
}

export type UserUploadInput = {
  employee_id: string
  full_name: string
  role: 'admin' | 'owner' | 'controller'
  department: string | null
  phone: string | null
  contact_email: string | null
  is_active: boolean
}

export type UserUploadResult = {
  createdCount: number
  deletedAuthCount: number
  deletedStorageCount: number
  clearedTables: Record<string, number>
  errors: string[]
}

export type ActivityRow = {
  id: string
  control_code: string | null
  owner_name: string | null
  department: string | null
  title: string | null
  submission_status: string | null
  controller_name: string | null
}

export type FileRow = {
  id: string
  file_name: string
  original_file_name?: string | null
  file_path: string
  unique_key: string | null
  uploaded_at: string | null
  owner?: { full_name: string | null }
}

/* ── Constants ── */

export const ROLE_LABELS: Record<string, string> = {
  admin: '관리자',
  owner: '담당자',
  controller: '승인자',
}

export const ROLE_BADGES: Record<string, string> = {
  admin: 'badge-purple',
  owner: 'badge-green',
  controller: 'badge-blue',
}

export const SUBMISSION_BADGES: Record<string, string> = {
  미완료: 'badge-yellow',
  완료: 'badge-blue',
  승인: 'badge-green',
  반려: 'badge-red',
}

/* ── Utility functions ── */

export function buildLoginEmail(employeeId: string) {
  return `${employeeId.trim()}@tongyanginc.co.kr`
}

export function readText(row: Record<string, unknown>, keys: string[]) {
  return keys.map(key => String(row[key] ?? '').trim()).find(Boolean) ?? ''
}

export function readBoolean(value: string) {
  if (!value) return true
  return ['y', 'yes', 'true', '1', 'active', '활성', '사용'].includes(value.trim().toLowerCase())
}

export function readRole(value: string): 'admin' | 'owner' | 'controller' | null {
  const normalized = value.trim().toLowerCase()
  if (!normalized) return null
  if (['admin', '관리자'].includes(normalized)) return 'admin'
  if (['owner', '담당자', '증빙담당자', '일반사용자', '일반'].includes(normalized)) return 'owner'
  if (['controller', '승인자', '통제책임자'].includes(normalized)) return 'controller'
  return null
}

export function toDateString(value: unknown) {
  if (value instanceof Date) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
  }

  if (typeof value === 'number') {
    const date = new Date(Date.UTC(1899, 11, 30) + Math.floor(value) * 86400000)
    if (Number.isNaN(date.getTime())) return null
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
  }

  const text = String(value ?? '').trim()
  if (!text) return null
  if (/^\d+$/.test(text)) return toDateString(Number.parseInt(text, 10))
  return /^\d{4}-\d{2}-\d{2}$/.test(text.slice(0, 10)) ? text.slice(0, 10) : null
}

/**
 * Retry a Supabase operation when it fails with a transient network error.
 * Typical culprits: "TypeError: Failed to fetch", "NetworkError when attempting to fetch",
 * AbortError from timeouts, and sporadic 5xx responses.
 *
 * Returns the awaited result of `operation()`. The operation should return an object
 * shaped like `{ data, error }` — we inspect both the thrown exception and the returned
 * `error.message` to decide whether to retry.
 */
export async function retryOnNetworkError<T>(
  operation: () => Promise<T>,
  options: { maxAttempts?: number; baseDelayMs?: number; label?: string } = {},
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 3
  const baseDelayMs = options.baseDelayMs ?? 500

  function isTransient(err: unknown): boolean {
    if (!err) return false
    const msg = err instanceof Error ? err.message : String(err)
    const name = err instanceof Error ? err.name : ''
    // Browser-level fetch failures + known flaky patterns
    const patterns = [
      'Failed to fetch',
      'NetworkError',
      'network error',
      'Load failed',
      'ERR_NETWORK',
      'ETIMEDOUT',
      'ECONNRESET',
      'fetch failed',
      'socket hang up',
      'AbortError',
      'timeout',
      '503',
      '504',
    ]
    if (name === 'AbortError' || name === 'TypeError') {
      // TypeError from fetch is almost always network-level
      if (patterns.some(p => msg.toLowerCase().includes(p.toLowerCase()))) return true
      if (name === 'TypeError' && msg.toLowerCase().includes('fetch')) return true
    }
    return patterns.some(p => msg.toLowerCase().includes(p.toLowerCase()))
  }

  let lastError: unknown
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const result = await operation()
      // Check Supabase-style { error } in the result — retry 5xx/network-like messages only
      const maybeError = (result as { error?: { message?: string; code?: string } } | null)?.error
      if (maybeError && isTransient(new Error(maybeError.message ?? ''))) {
        lastError = new Error(`[${options.label ?? 'db'}] ${maybeError.message ?? 'transient error'}`)
        if (attempt === maxAttempts) return result
      } else {
        return result
      }
    } catch (err) {
      lastError = err
      if (!isTransient(err) || attempt === maxAttempts) throw err
    }
    // Exponential backoff with small jitter: 500ms → 1s → 2s
    const delay = baseDelayMs * 2 ** (attempt - 1) + Math.floor(Math.random() * 100)
    await new Promise(resolve => setTimeout(resolve, delay))
  }
  throw lastError ?? new Error('retry exhausted')
}

export function extractYoutubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

/* ── Shared UI Components ── */

export function PreviewTable({ rows }: { rows: Record<string, string>[] }) {
  if (!rows.length) return null

  return (
    <div className="card p-5">
      <p className="mb-3 text-sm font-semibold text-brand-700">파일 미리보기</p>
      <div className="overflow-x-auto">
        <table className="data-table text-xs">
          <thead>
            <tr>
              {Object.keys(rows[0]).slice(0, 8).map(key => (
                <th key={key}>{key}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {Object.values(row).slice(0, 8).map((value, columnIndex) => (
                  <td key={columnIndex}>{String(value)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function ResultCard({
  title,
  stats,
  errors,
  note,
}: {
  title: string
  stats: Array<{ label: string; value: number; color: string }>
  errors: string[]
  note?: string
}) {
  const hasErrors = errors.length > 0

  return (
    <div className={clsx('card p-5', hasErrors ? 'border-amber-100 bg-amber-50/30' : 'border-emerald-100 bg-emerald-50/30')}>
      <div className="mb-3 flex items-center gap-2">
        {hasErrors ? (
          <AlertTriangle size={18} className="text-amber-600" />
        ) : (
          <CheckCircle2 size={18} className="text-emerald-600" />
        )}
        <p className="font-bold text-brand-900">{title}</p>
      </div>

      <div className={clsx('mb-3 grid gap-3', stats.length === 4 ? 'grid-cols-4' : 'grid-cols-3')}>
        {stats.map(item => (
          <div key={item.label} className="text-center">
            <p className={clsx('text-2xl font-bold', item.color)}>{item.value.toLocaleString()}</p>
            <p className="text-xs text-warm-500">{item.label}</p>
          </div>
        ))}
      </div>

      {note && <p className="mb-3 rounded-lg bg-white/70 px-3 py-2 text-xs text-warm-600">{note}</p>}

      {!!errors.length && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-red-700">
            오류/확인 필요 항목 ({errors.length.toLocaleString()}건)
          </p>
          <div className="max-h-72 space-y-1 overflow-y-auto rounded-lg bg-red-50 p-3 border border-red-100">
            {errors.map((error, index) => (
              <p key={index} className="break-all font-mono text-xs text-red-700 leading-relaxed">
                <span className="inline-block w-8 text-right text-red-400 mr-2 select-none">
                  {(index + 1).toString()}.
                </span>
                {error}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
