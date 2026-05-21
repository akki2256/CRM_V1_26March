import { useMemo } from 'react'
import ContactByLabelWidget from './ContactByLabelWidget'
import DealOutcomeTrendWidget from './DealOutcomeTrendWidget'
import GeometricAvatar from './GeometricAvatar'

type Props = {
  username?: string | null
}

const PIPELINE_STAGES = [
  { label: 'New', count: 24, pct: 100, tone: 'lavender' as const },
  { label: 'Qualified', count: 18, pct: 72, tone: 'mint' as const },
  { label: 'Proposal', count: 11, pct: 48, tone: 'orange' as const },
  { label: 'Won', count: 6, pct: 28, tone: 'pink' as const },
]

const RECENT_TASKS = [
  { id: 1, title: 'Follow up Acme renewal', due: 'Today', priority: 'high' as const, owner: 'Jordan Lee' },
  { id: 2, title: 'Send quote — Northwind', due: 'Tomorrow', priority: 'medium' as const, owner: 'Sam Rivera' },
  { id: 3, title: 'Pipeline review prep', due: 'Fri', priority: 'low' as const, owner: 'Alex Kim' },
  { id: 4, title: 'Update deal stages Q2', due: 'Mon', priority: 'medium' as const, owner: 'Taylor Brooks' },
]

const REVENUE_MONTHS = [
  { label: 'Jan', value: 62 },
  { label: 'Feb', value: 74 },
  { label: 'Mar', value: 58 },
  { label: 'Apr', value: 88 },
  { label: 'May', value: 95 },
  { label: 'Jun', value: 82 },
]

const DEAL_SLICES = [
  { label: 'Enterprise', value: 38, color: 'var(--bento-lavender)' },
  { label: 'Mid-market', value: 27, color: 'var(--bento-mint)' },
  { label: 'SMB', value: 22, color: 'var(--bento-orange)' },
  { label: 'Partner', value: 13, color: 'var(--bento-pink)' },
]

export default function BentoDashboard({ username }: Props) {
  const maxRevenue = useMemo(() => Math.max(...REVENUE_MONTHS.map((m) => m.value)), [])
  const totalDeals = DEAL_SLICES.reduce((s, d) => s + d.value, 0)

  return (
    <div className="bento-dashboard">
      <div className="bento-grid">
        <article className="bento-card bento-card--span-2 bento-card--revenue">
          <header className="bento-card-head">
            <div>
              <p className="bento-eyebrow">Forecast</p>
              <h2 className="bento-card-title">Revenue Forecast</h2>
            </div>
            <span className="bento-pill bento-pill--mint">+12.4% vs last quarter</span>
          </header>
          <div className="bento-revenue-body">
            <div className="bento-revenue-stat">
              <span className="bento-stat-value">$284k</span>
              <span className="bento-stat-label">Projected close</span>
            </div>
            <div className="bento-bar-chart" role="img" aria-label="Revenue forecast by month">
              {REVENUE_MONTHS.map((m) => (
                <div key={m.label} className="bento-bar-col">
                  <div
                    className="bento-bar bento-bar--mint"
                    style={{ height: `${(m.value / maxRevenue) * 100}%` }}
                  />
                  <span className="bento-bar-label">{m.label}</span>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="bento-card bento-card--pipeline">
          <header className="bento-card-head">
            <div>
              <p className="bento-eyebrow">Pipeline</p>
              <h2 className="bento-card-title">Lead Pipeline Tracker</h2>
            </div>
            <span className="bento-pill bento-pill--lavender">59 active</span>
          </header>
          <div className="bento-pipeline">
            {PIPELINE_STAGES.map((stage) => (
              <div key={stage.label} className="bento-pipeline-row">
                <div className="bento-pipeline-meta">
                  <span>{stage.label}</span>
                  <strong>{stage.count}</strong>
                </div>
                <div className="bento-pipeline-track">
                  <div
                    className={`bento-pipeline-fill bento-pipeline-fill--${stage.tone}`}
                    style={{ width: `${stage.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="bento-card bento-card--tasks">
          <header className="bento-card-head">
            <div>
              <p className="bento-eyebrow">Today</p>
              <h2 className="bento-card-title">Recent Tasks</h2>
            </div>
            <button type="button" className="bento-text-btn">
              View all
            </button>
          </header>
          <ul className="bento-task-list">
            {RECENT_TASKS.map((task) => (
              <li key={task.id} className="bento-task-item">
                <GeometricAvatar
                  label={task.owner}
                  variant={
                    task.priority === 'high'
                      ? 'pink'
                      : task.priority === 'medium'
                        ? 'orange'
                        : 'mint'
                  }
                  size="sm"
                />
                <div className="bento-task-copy">
                  <span className="bento-task-title">{task.title}</span>
                  <span className="bento-task-due">{task.due}</span>
                </div>
                {task.priority === 'high' && <span className="bento-hot-dot" title="High priority" />}
              </li>
            ))}
          </ul>
        </article>

        <article className="bento-card bento-card--distribution">
          <header className="bento-card-head">
            <div>
              <p className="bento-eyebrow">Mix</p>
              <h2 className="bento-card-title">Deal Distribution</h2>
            </div>
          </header>
          <div className="bento-distribution">
            <div className="bento-donut" role="img" aria-label="Deal distribution by segment">
              <svg viewBox="0 0 120 120" className="bento-donut-svg">
                {(() => {
                  const r = 44
                  const circumference = 2 * Math.PI * r
                  let offset = 0
                  return DEAL_SLICES.map((slice) => {
                    const dash = (slice.value / totalDeals) * circumference
                    const el = (
                      <circle
                        key={slice.label}
                        className="bento-donut-ring"
                        cx="60"
                        cy="60"
                        r={r}
                        stroke={slice.color}
                        strokeDasharray={`${dash} ${circumference - dash}`}
                        strokeDashoffset={-offset}
                      />
                    )
                    offset += dash
                    return el
                  })
                })()}
              </svg>
              <div className="bento-donut-center">
                <strong>{totalDeals}%</strong>
                <span>indexed</span>
              </div>
            </div>
            <ul className="bento-legend">
              {DEAL_SLICES.map((slice) => (
                <li key={slice.label}>
                  <span className="bento-legend-swatch" style={{ background: slice.color }} />
                  <span>{slice.label}</span>
                  <strong>{slice.value}%</strong>
                </li>
              ))}
            </ul>
          </div>
        </article>

        <article className="bento-card bento-card--span-2 bento-card--widget">
          <ContactByLabelWidget username={username} />
        </article>

        <article className="bento-card bento-card--span-2 bento-card--widget">
          <DealOutcomeTrendWidget username={username} />
        </article>
      </div>
    </div>
  )
}
