import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { CheckCircle2, AlertCircle, Info, X, Loader2 } from 'lucide-react'
import clsx from 'clsx'

type ToastKind = 'success' | 'error' | 'info' | 'loading'

export interface ToastItem {
  id: string
  kind: ToastKind
  title: string
  description?: string
  durationMs?: number // ignored for 'loading'
}

interface ToastContextValue {
  push: (item: Omit<ToastItem, 'id'>) => string
  update: (id: string, patch: Partial<Omit<ToastItem, 'id'>>) => void
  dismiss: (id: string) => void
  success: (title: string, description?: string) => string
  error: (title: string, description?: string) => string
  info: (title: string, description?: string) => string
  loading: (title: string, description?: string) => string
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: string) => {
    setItems(prev => prev.filter(t => t.id !== id))
    const handle = timeoutsRef.current.get(id)
    if (handle) {
      clearTimeout(handle)
      timeoutsRef.current.delete(id)
    }
  }, [])

  const scheduleAutoDismiss = useCallback((id: string, durationMs: number) => {
    if (durationMs <= 0) return
    const existing = timeoutsRef.current.get(id)
    if (existing) clearTimeout(existing)
    const handle = setTimeout(() => dismiss(id), durationMs)
    timeoutsRef.current.set(id, handle)
  }, [dismiss])

  const push = useCallback((item: Omit<ToastItem, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const duration = item.durationMs ?? (item.kind === 'error' ? 8000 : item.kind === 'loading' ? 0 : 5000)
    setItems(prev => [...prev, { ...item, id, durationMs: duration }])
    if (item.kind !== 'loading' && duration > 0) {
      scheduleAutoDismiss(id, duration)
    }
    return id
  }, [scheduleAutoDismiss])

  const update = useCallback((id: string, patch: Partial<Omit<ToastItem, 'id'>>) => {
    setItems(prev => prev.map(t => (t.id === id ? { ...t, ...patch } : t)))
    if (patch.kind && patch.kind !== 'loading') {
      const duration = patch.durationMs ?? (patch.kind === 'error' ? 8000 : 5000)
      scheduleAutoDismiss(id, duration)
    }
  }, [scheduleAutoDismiss])

  useEffect(() => {
    const map = timeoutsRef.current
    return () => {
      map.forEach(handle => clearTimeout(handle))
      map.clear()
    }
  }, [])

  const value: ToastContextValue = {
    push,
    update,
    dismiss,
    success: (title, description) => push({ kind: 'success', title, description }),
    error: (title, description) => push({ kind: 'error', title, description }),
    info: (title, description) => push({ kind: 'info', title, description }),
    loading: (title, description) => push({ kind: 'loading', title, description }),
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport items={items} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

function ToastViewport({ items, onDismiss }: { items: ToastItem[]; onDismiss: (id: string) => void }) {
  return (
    <div className="pointer-events-none fixed left-1/2 top-1/2 z-[9999] flex w-[380px] max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-2">
      {items.map(item => (
        <ToastCard key={item.id} item={item} onDismiss={() => onDismiss(item.id)} />
      ))}
    </div>
  )
}

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const config = {
    success: { icon: CheckCircle2, bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-900', iconColor: 'text-emerald-600', accent: 'bg-emerald-500' },
    error: { icon: AlertCircle, bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-900', iconColor: 'text-red-600', accent: 'bg-red-500' },
    info: { icon: Info, bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-900', iconColor: 'text-blue-600', accent: 'bg-blue-500' },
    loading: { icon: Loader2, bg: 'bg-warm-50', border: 'border-warm-200', text: 'text-brand-900', iconColor: 'text-brand-600', accent: 'bg-brand-500' },
  }[item.kind]

  const Icon = config.icon

  return (
    <div
      className={clsx(
        'pointer-events-auto relative overflow-hidden rounded-lg border shadow-lg animate-[toastSlide_0.25s_ease-out]',
        config.bg,
        config.border,
      )}
      role="status"
      aria-live="polite"
    >
      <div className={clsx('absolute inset-y-0 left-0 w-1', config.accent)} />
      <div className="flex items-start gap-3 px-4 py-3 pl-5">
        <Icon
          size={18}
          className={clsx('mt-0.5 shrink-0', config.iconColor, item.kind === 'loading' && 'animate-spin')}
        />
        <div className="flex-1 min-w-0">
          <p className={clsx('text-sm font-semibold leading-tight', config.text)}>{item.title}</p>
          {item.description && (
            <p className={clsx('mt-1 text-xs leading-snug', config.text, 'opacity-80 whitespace-pre-wrap')}>
              {item.description}
            </p>
          )}
        </div>
        {item.kind !== 'loading' && (
          <button
            onClick={onDismiss}
            className={clsx('shrink-0 rounded p-0.5 transition hover:bg-black/5', config.text)}
            aria-label="알림 닫기"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
