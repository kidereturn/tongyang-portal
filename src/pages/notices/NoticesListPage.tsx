import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Megaphone, BookOpen, FileText, AlertCircle } from 'lucide-react'
import clsx from 'clsx'
import { supabase } from '../../lib/supabase'
import { safeQuery } from '../../lib/queryWithTimeout'

type Notice = {
  id: string
  type: string | null
  title: string
  body?: string | null
  badge?: string | null
  badge_color?: string | null
  is_pinned?: boolean | null
  created_at: string
}

const FILTERS = [
  { key: 'all', label: '전체' },
  { key: 'notice', label: '공지' },
  { key: 'manual', label: '매뉴얼' },
  { key: 'event', label: '이벤트' },
  { key: 'important', label: '중요' },
]

const TYPE_ICONS: Record<string, React.ElementType> = {
  manual: BookOpen,
  notice: Megaphone,
  event: FileText,
  important: AlertCircle,
}

export default function NoticesListPage() {
  const [items, setItems] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const { data } = await safeQuery<Notice[]>(
        (supabase as any)
          .from('notices')
          .select('id, type, title, body, badge, badge_color, is_pinned, created_at')
          .order('is_pinned', { ascending: false })
          .order('created_at', { ascending: false }),
        12_000,
        'notices.list',
      )
      setItems(data ?? [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  const filtered = items.filter(n => {
    if (filter !== 'all') {
      const t = (n.type ?? '').toLowerCase()
      const b = (n.badge ?? '').toLowerCase()
      if (!t.includes(filter) && !b.includes(filter)) return false
    }
    if (search && !n.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const counts = {
    all: items.length,
    notice: items.filter(n => (n.type ?? '').includes('notice') || (n.badge ?? '').includes('공지')).length,
    manual: items.filter(n => (n.type ?? '').includes('manual') || (n.badge ?? '').includes('매뉴얼')).length,
    event: items.filter(n => (n.type ?? '').includes('event') || (n.badge ?? '').includes('이벤트')).length,
    important: items.filter(n => (n.type ?? '').includes('important') || (n.badge ?? '').includes('중요')).length,
  } as Record<string, number>

  return (
    <>
      <div className="pg-head">
        <div className="pg-head-row">
          <div>
            <div className="eyebrow">Notices · Manuals<span className="sep" />공지사항 & 매뉴얼</div>
            <h1>공지사항 &amp; 매뉴얼. <span className="soft">알아야 할 모든 것.</span></h1>
            <p className="lead">최신 공지, 매뉴얼, 이벤트 소식을 한 페이지에서 확인하세요. 중요 표시가 있는 항목을 놓치지 마세요.</p>
          </div>
          <div className="actions">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--at-ivory)', border: '1px solid var(--at-ink-hair)', borderRadius: 10, fontSize: 12, color: 'var(--at-ink-mute)' }}>
              <Megaphone size={14} /> {items.length}건
            </div>
          </div>
        </div>
      </div>

      <div className="pg-body">
        <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={clsx('filter-chip', filter === f.key && 'active')}
              style={{ cursor: 'pointer' }}
            >
              {f.label} <span style={{ opacity: 0.6, marginLeft: 4, fontFamily: 'var(--f-mono)', fontSize: 10 }}>{counts[f.key] ?? 0}</span>
            </button>
          ))}
          <div style={{ marginLeft: 'auto' }}>
            <input
              type="text"
              placeholder="제목 검색..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid var(--at-ink-hair)', borderRadius: 8, fontSize: 12, minWidth: 220 }}
            />
          </div>
        </div>

        {loading ? (
          <div className="at-card" style={{ padding: 32, textAlign: 'center', color: 'var(--at-ink-mute)' }}>로딩 중...</div>
        ) : filtered.length === 0 ? (
          <div className="at-card" style={{ padding: 48, textAlign: 'center', color: 'var(--at-ink-mute)' }}>
            <Megaphone size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <p>표시할 공지가 없습니다.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(n => {
              const Icon = TYPE_ICONS[(n.type ?? 'notice').toLowerCase()] ?? Megaphone
              return (
                <Link
                  key={n.id}
                  to={`/notice/${n.id}`}
                  className="at-card"
                  style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 16, textDecoration: 'none', color: 'inherit', transition: 'all 0.15s' }}
                >
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--at-ivory)', color: 'var(--at-blue)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <Icon size={20} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      {n.badge && (
                        <span className={`at-tag ${n.badge_color ?? 'blue'}`} style={{ fontSize: 10 }}>{n.badge}</span>
                      )}
                      {n.is_pinned && (
                        <span style={{ fontSize: 10, color: '#F59E0B', fontWeight: 700 }}>📌 PINNED</span>
                      )}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--at-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {n.title}
                    </div>
                    {n.body && (
                      <p style={{ marginTop: 4, fontSize: 12, color: 'var(--at-ink-mute)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {n.body.slice(0, 120)}
                      </p>
                    )}
                  </div>
                  <div style={{ fontSize: 11, fontFamily: 'var(--f-mono)', color: 'var(--at-ink-mute)', flexShrink: 0 }}>
                    {new Date(n.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
