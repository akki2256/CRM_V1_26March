import { useCallback, useEffect, useMemo, useState } from 'react'
import { getDealOutcomeTrendStats, getToken, type DealOutcomeTrendPoint } from '../api/client'
import Spinner from './Spinner'

const PERIODS: { value: string; label: string }[] = [
  { value: 'LAST_MONTH', label: 'Last Month' },
  { value: 'LAST_7_DAYS', label: 'Last 7 days' },
  { value: 'THIS_MONTH', label: 'This month' },
  { value: 'YTD', label: 'Year to date' },
  { value: 'ALL', label: 'All time' },
]

const DEFAULT_PERIOD = 'LAST_MONTH'

type Props = {
  username?: string | null
}

function yForValue(value: number, height: number, maxY: number): number {
  return height - (maxY <= 0 ? 0 : (value / maxY) * height)
}

export default function DealOutcomeTrendWidget({ username }: Props) {
  const storageKey = useMemo(() => `crm_widget_deal_outcome_trend_${(username ?? 'default').toLowerCase()}`, [username])
  const [period, setPeriod] = useState(DEFAULT_PERIOD)
  const [points, setPoints] = useState<DealOutcomeTrendPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return
    if (PERIODS.some((p) => p.value === raw)) {
      setPeriod(raw)
    }
  }, [storageKey])

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
      const res = await getDealOutcomeTrendStats(t, period)
      setPoints(res.points)
    } catch (e) {
      setPoints([])
      setError(e instanceof Error ? e.message : 'Could not load data.')
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    localStorage.setItem(storageKey, period)
  }, [period, storageKey])

  useEffect(() => {
    void load()
  }, [load])

  const won = points.map((p) => p.wonCount)
  const lost = points.map((p) => p.lostCount)
  const maxY = Math.max(1, ...won, ...lost)
  const yAxisLabelWidth = 40
  const svgWidth = 520
  const svgHeight = 210
  const plotWidth = svgWidth - yAxisLabelWidth
  const groupWidth = points.length > 0 ? plotWidth / points.length : 0
  const barWidth = Math.max(6, Math.min(18, groupWidth * 0.32))
  const barGap = Math.max(3, Math.min(10, groupWidth * 0.1))
  const yTicks = [maxY, Math.round((maxY * 3) / 4), Math.round(maxY / 2), Math.round(maxY / 4), 0]
  const xStart = points[0]?.day ?? ''
  const xEnd = points[points.length - 1]?.day ?? ''

  return (
    <article className="widget-card widget-deal-outcome-trend">
      <header className="widget-contact-by-label-header">
        <h3>Deals Won/Lost Trend</h3>
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
      {loading && (
        <div className="widget-contact-by-label-loading">
          <Spinner size="sm" /> <span className="muted small">Loading…</span>
        </div>
      )}
      {!loading && points.length === 0 && <p className="muted small">No won/lost deal data for this period.</p>}
      {!loading && points.length > 0 && (
        <>
          <div className="deal-trend-legend">
            <span className="deal-trend-legend-item"><i className="deal-trend-line won" /> Deals won</span>
            <span className="deal-trend-legend-item"><i className="deal-trend-line lost" /> Deals lost</span>
          </div>
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="deal-trend-chart" role="img" aria-label="Deals won and lost over time">
            {yTicks.map((tick) => {
              const y = yForValue(tick, svgHeight, maxY)
              return (
                <g key={`tick-${tick}-${y}`}>
                  <line x1={yAxisLabelWidth} y1={y} x2={svgWidth} y2={y} className="deal-trend-gridline" />
                  <text x={yAxisLabelWidth - 6} y={y + 3} textAnchor="end" className="deal-trend-y-label">
                    {tick}
                  </text>
                </g>
              )
            })}
            <line x1={yAxisLabelWidth} y1={0} x2={yAxisLabelWidth} y2={svgHeight} className="deal-trend-axis" />
            <line x1={yAxisLabelWidth} y1={svgHeight} x2={svgWidth} y2={svgHeight} className="deal-trend-axis" />
            {points.map((point, i) => {
              const gx = yAxisLabelWidth + i * groupWidth + Math.max(0, (groupWidth - (barWidth * 2 + barGap)) / 2)
              const wonH = maxY <= 0 ? 0 : (point.wonCount / maxY) * svgHeight
              const lostH = maxY <= 0 ? 0 : (point.lostCount / maxY) * svgHeight
              return (
                <g key={point.day}>
                  <rect
                    x={gx}
                    y={svgHeight - wonH}
                    width={barWidth}
                    height={wonH}
                    className="deal-trend-bar-won"
                    rx={2}
                  />
                  <rect
                    x={gx + barWidth + barGap}
                    y={svgHeight - lostH}
                    width={barWidth}
                    height={lostH}
                    className="deal-trend-bar-lost"
                    rx={2}
                  />
                </g>
              )
            })}
          </svg>
          <div className="deal-trend-axis-labels">
            <span>{xStart}</span>
            <span>{xEnd}</span>
          </div>
        </>
      )}
    </article>
  )
}
