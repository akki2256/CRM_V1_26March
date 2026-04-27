import { useCallback, useEffect, useMemo, useState } from 'react'
import { getContactByLabelStats, getToken, type ContactByLabelResponse, type ContactByLabelSlice } from '../api/client'
import Spinner from './Spinner'

/** Matches API: hot / warm / cold from CONTACT.label_code; other = anything else. */
const BUCKET_ORDER = ['hot', 'warm', 'cold', 'other'] as const

const BUCKET_COLOR: Record<string, string> = {
  cold: '#7B61FF',
  hot: '#FFC107',
  warm: '#D85C71',
  other: '#26A69A',
}

const BUCKET_EMOJI: Record<string, string> = {
  cold: '❄️',
  hot: '🔥',
  warm: '♨️',
  other: '',
}

const PERIODS: { value: string; label: string }[] = [
  { value: 'LAST_MONTH', label: 'Last Month' },
  { value: 'LAST_7_DAYS', label: 'Last 7 days' },
  { value: 'THIS_MONTH', label: 'This month' },
  { value: 'YTD', label: 'Year to date' },
  { value: 'ALL', label: 'All time' },
]

const DEFAULT_PERIOD = 'LAST_MONTH'
type PersistedWidgetState = {
  period: string
}

type Props = {
  username?: string | null
}

function countForBucket(slices: ContactByLabelSlice[], bucket: string): number {
  return slices.find((s) => s.bucket === bucket)?.count ?? 0
}

function buildConicGradient(slices: ContactByLabelSlice[], total: number): string {
  if (total <= 0) {
    return '#e5e7eb'
  }
  let at = 0
  const parts: string[] = []
  for (const key of BUCKET_ORDER) {
    const cnt = countForBucket(slices, key)
    const pct = (cnt / total) * 100
    if (pct <= 0) continue
    const next = at + pct
    parts.push(`${BUCKET_COLOR[key]} ${at}% ${next}%`)
    at = next
  }
  if (parts.length === 0) {
    return '#e5e7eb'
  }
  return `conic-gradient(${parts.join(', ')})`
}

export default function ContactByLabelWidget({ username }: Props) {
  const [period, setPeriod] = useState(DEFAULT_PERIOD)
  const [data, setData] = useState<ContactByLabelResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const storageKey = useMemo(
    () => `crm_widget_contact_by_label_${(username ?? 'default').toLowerCase()}`,
    [username],
  )

  const readPersisted = useCallback((): PersistedWidgetState | null => {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return null
    try {
      const parsed = JSON.parse(raw) as Partial<PersistedWidgetState>
      const validPeriod = PERIODS.some((p) => p.value === parsed.period) ? String(parsed.period) : DEFAULT_PERIOD
      return { period: validPeriod }
    } catch {
      return null
    }
  }, [storageKey])

  const savePersisted = useCallback(
    (next: PersistedWidgetState) => {
      localStorage.setItem(storageKey, JSON.stringify(next))
    },
    [storageKey],
  )

  useEffect(() => {
    const persisted = readPersisted()
    if (!persisted) {
      setPeriod(DEFAULT_PERIOD)
      return
    }
    setPeriod(persisted.period)
  }, [readPersisted])

  const load = useCallback(async () => {
    const t = getToken()
    if (!t) {
      setError('Sign in to load this widget.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await getContactByLabelStats(t, period)
      setData(res)
    } catch (e) {
      setData(null)
      setError(e instanceof Error ? e.message : 'Could not load data.')
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    savePersisted({ period })
  }, [period, savePersisted])

  const slices = data?.slices ?? []
  const total = data?.total ?? 0
  const donutBg = useMemo(() => buildConicGradient(slices, total), [slices, total])
  return (
    <article className="widget-card widget-contact-by-label">
      <header className="widget-contact-by-label-header">
        <h3>Contact by Label</h3>
        <label className="widget-contact-by-label-period">
          <span className="visually-hidden">Time range</span>
          <select value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Time range">
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
      </header>

      {error && <p className="error small">{error}</p>}

      <div className="widget-contact-by-label-body">
        {loading && (
          <div className="widget-contact-by-label-loading">
            <Spinner size="sm" /> <span className="muted small">Loading…</span>
          </div>
        )}
        {!loading && (
          <>
            <ul className="widget-contact-by-label-legend">
              {BUCKET_ORDER.map((bucket) => {
                const slice = slices.find((s) => s.bucket === bucket)
                const label = slice?.label ?? bucket
                const count = slice?.count ?? 0
                return (
                  <li key={bucket} className="widget-contact-by-label-legend-row">
                    <span className="widget-contact-by-label-swatch" style={{ background: BUCKET_COLOR[bucket] }} />
                    <span className="widget-contact-by-label-legend-text">
                      <span className="widget-contact-by-label-legend-name">{label}</span>
                      {BUCKET_EMOJI[bucket] ? (
                        <span className="widget-contact-by-label-emoji" aria-hidden>
                          {BUCKET_EMOJI[bucket]}
                        </span>
                      ) : null}
                    </span>
                    <span className="widget-contact-by-label-count">{count}</span>
                  </li>
                )
              })}
            </ul>
            <div className="widget-contact-by-label-chart">
              <div className="widget-contact-by-label-donut-wrap" aria-hidden>
                <div className="widget-contact-by-label-donut-disc" style={{ background: donutBg }} />
                <div className="widget-contact-by-label-donut-inner">
                  <span className="widget-contact-by-label-total-num">{total}</span>
                  <span className="widget-contact-by-label-total-label">Total</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </article>
  )
}
