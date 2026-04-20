import { useCallback, useEffect, useState } from 'react'
import {
  getToken,
  searchDeals,
  type ContactColumnFilterEntry,
  type DealListRow,
  type PagedDealsResponse,
} from '../../api/client'
import Spinner from '../../components/Spinner'
import DealDetailPage from './DealDetailPage'
import type { SubmenuProps } from './submenuRegistry'

type ColumnKind = 'id' | 'text' | 'number' | 'datetime'

type DealColumnId = keyof DealListRow

type ColumnMeta = {
  id: DealColumnId
  label: string
  kind: ColumnKind
}

const DEAL_COLUMN_META: ColumnMeta[] = [
  { id: 'dealId', label: 'Deal ID', kind: 'id' },
  { id: 'contactId', label: 'Contact ID', kind: 'id' },
  { id: 'contactName', label: 'Contact name', kind: 'text' },
  { id: 'ownerName', label: 'Owner', kind: 'text' },
  { id: 'subOwnerName', label: 'Sub-owner', kind: 'text' },
  { id: 'accountName', label: 'Account', kind: 'text' },
  { id: 'dealUserId', label: 'Deal user ID', kind: 'id' },
  { id: 'dealUserName', label: 'Deal user', kind: 'text' },
  { id: 'closingDate', label: 'Closing date', kind: 'datetime' },
  { id: 'stageId', label: 'Stage ID', kind: 'id' },
  { id: 'stageName', label: 'Stage', kind: 'text' },
  { id: 'amount', label: 'Amount', kind: 'number' },
  { id: 'dealDate', label: 'Deal date', kind: 'datetime' },
  { id: 'pipeline', label: 'Pipeline', kind: 'text' },
  { id: 'currency', label: 'Currency', kind: 'text' },
  { id: 'purposeOfLoan', label: 'Purpose of loan', kind: 'text' },
  { id: 'dealComments', label: 'Deal comments', kind: 'text' },
]

const PAGE_SIZE_OPTIONS = [12, 24, 36, 48] as const

function initialDraft(): Record<string, { op: string; value: string }> {
  const d: Record<string, { op: string; value: string }> = {}
  for (const c of DEAL_COLUMN_META) {
    d[c.id] = { op: 'CONTAINS', value: '' }
  }
  return d
}

function buildFilters(draft: Record<string, { op: string; value: string }>): ContactColumnFilterEntry[] {
  const out: ContactColumnFilterEntry[] = []
  for (const col of DEAL_COLUMN_META) {
    const cell = draft[col.id]
    if (!cell) continue
    const value = cell.value.trim()
    if (value === '') continue
    out.push({ column: col.id, op: 'CONTAINS', value })
  }
  return out
}

function cellValue(row: DealListRow, id: DealColumnId): string {
  const v = row[id]
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'number') return String(v)
  return String(v)
}

export default function DealsPage({ goToSalesAccount }: SubmenuProps) {
  const [detailDealId, setDetailDealId] = useState<number | null>(null)
  const [draftFilters, setDraftFilters] = useState(initialDraft)
  const [appliedFilters, setAppliedFilters] = useState<ContactColumnFilterEntry[]>([])
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(12)
  const [sortField, setSortField] = useState<DealColumnId>('dealId')
  const [sortDirection, setSortDirection] = useState<'ASC' | 'DESC'>('DESC')
  const [data, setData] = useState<PagedDealsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hoveredHeader, setHoveredHeader] = useState<DealColumnId | null>(null)

  const fetchPage = useCallback(async () => {
    const t = getToken()
    if (!t) {
      setError('You need to sign in to view deals.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await searchDeals(t, {
        page,
        size: pageSize,
        sortField,
        sortDirection,
        filters: appliedFilters,
      })
      setData(res)
    } catch (e) {
      setData(null)
      setError(e instanceof Error ? e.message : 'Could not load deals.')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, sortField, sortDirection, appliedFilters])

  useEffect(() => {
    void fetchPage()
  }, [fetchPage])

  function updateDraft(col: DealColumnId, patch: Partial<{ op: string; value: string }>) {
    setDraftFilters((prev) => ({
      ...prev,
      [col]: { ...prev[col], ...patch },
    }))
  }

  function applyHeaderContains(col: DealColumnId) {
    const raw = draftFilters[col]?.value ?? ''
    const nextDraft = {
      ...draftFilters,
      [col]: { op: 'CONTAINS', value: raw.trim() },
    }
    setDraftFilters(nextDraft)
    setAppliedFilters(buildFilters(nextDraft))
    setPage(0)
  }

  function clearAllSearches() {
    setDraftFilters(initialDraft())
    setAppliedFilters([])
    setPage(0)
  }

  const totalPages = data?.totalPages ?? 0
  const canPrev = page > 0
  const canNext = data != null && page < totalPages - 1

  if (detailDealId != null) {
    return (
      <DealDetailPage
        dealId={detailDealId}
        onBack={() => setDetailDealId(null)}
        goToSalesAccount={goToSalesAccount}
      />
    )
  }

  return (
    <div className="contacts-page deals-page">
      <div className="contacts-page-header">
        <h2>Deals</h2>
      </div>

      <p className="muted small contacts-scope-note">
        Visibility follows the linked contact: agents see deals whose contact owner, sub-owner, or account matches their
        name; leads include teammates in the same user groups; managers and administrators see all deals.
      </p>

      {error && <p className="error">{error}</p>}

      <div className="contacts-table-toolbar">
        <div className="contacts-sort-inline">
          <label>
            <span className="contacts-inline-label">Sort by</span>
            <select
              value={sortField}
              onChange={(e) => {
                setSortField(e.target.value as DealColumnId)
                setPage(0)
              }}
            >
              {DEAL_COLUMN_META.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="contacts-inline-label">Direction</span>
            <select
              value={sortDirection}
              onChange={(e) => {
                setSortDirection(e.target.value as 'ASC' | 'DESC')
                setPage(0)
              }}
            >
              <option value="ASC">Ascending</option>
              <option value="DESC">Descending</option>
            </select>
          </label>
        </div>
        <div className="contacts-page-size">
          <label>
            <span className="contacts-inline-label">Rows per page</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setPage(0)
              }}
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="secondary" onClick={clearAllSearches} disabled={loading}>
            Clear search
          </button>
        </div>
      </div>

      <div className="table-wrap contacts-table-wrap">
        {loading && (
          <div className="contacts-loading">
            <Spinner /> <span>Loading…</span>
          </div>
        )}
        {!loading && data && (
          <table className="result-table deals-result-table">
            <thead>
              <tr>
                {DEAL_COLUMN_META.map((c) => (
                  <th
                    key={c.id}
                    className="contacts-header-cell"
                    onMouseEnter={() => setHoveredHeader(c.id)}
                    onMouseLeave={() => setHoveredHeader((prev) => (prev === c.id ? null : prev))}
                    onFocusCapture={() => setHoveredHeader(c.id)}
                    onBlurCapture={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                        setHoveredHeader((prev) => (prev === c.id ? null : prev))
                      }
                    }}
                  >
                    <button
                      type="button"
                      className="contacts-sort-btn"
                      onClick={() => {
                        if (sortField === c.id) {
                          setSortDirection((d) => (d === 'ASC' ? 'DESC' : 'ASC'))
                        } else {
                          setSortField(c.id)
                          setSortDirection(c.id === 'dealId' ? 'DESC' : 'ASC')
                        }
                        setPage(0)
                      }}
                    >
                      {c.label}
                      {sortField === c.id ? (sortDirection === 'ASC' ? ' ▲' : ' ▼') : ''}
                    </button>
                    {hoveredHeader === c.id && (
                      <div className="contacts-header-quick-filter">
                        <input
                          type="text"
                          className="contacts-header-quick-input"
                          placeholder="Search"
                          value={draftFilters[c.id]?.value ?? ''}
                          onChange={(e) => updateDraft(c.id, { value: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              applyHeaderContains(c.id)
                            }
                          }}
                        />
                        <button
                          type="button"
                          className="contacts-header-quick-btn"
                          onClick={() => applyHeaderContains(c.id)}
                          aria-label={`Search ${c.label}`}
                          title={`Search ${c.label}`}
                        >
                          🔍
                        </button>
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.content.length === 0 ? (
                <tr>
                  <td colSpan={DEAL_COLUMN_META.length} className="muted">
                    No deals match your search and access scope.
                  </td>
                </tr>
              ) : (
                data.content.map((row) => (
                  <tr
                    key={row.dealId}
                    role="button"
                    tabIndex={0}
                    onClick={() => setDetailDealId(row.dealId)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setDetailDealId(row.dealId)
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    {DEAL_COLUMN_META.map((c) => (
                      <td key={c.id}>{cellValue(row, c.id)}</td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {data && !loading && (
        <div className="pagination-row contacts-pagination">
          <span className="muted small">
            {data.totalElements === 0
              ? 'No records'
              : `Showing ${data.number * data.size + 1}–${Math.min(
                  (data.number + 1) * data.size,
                  data.totalElements,
                )} of ${data.totalElements}`}
          </span>
          <div className="contacts-page-nav">
            <button type="button" className="secondary" disabled={!canPrev} onClick={() => setPage((p) => p - 1)}>
              Previous
            </button>
            <span className="small">
              {data.totalElements === 0
                ? 'Page 0 / 0'
                : `Page ${data.number + 1} / ${Math.max(1, data.totalPages)}`}
            </span>
            <button type="button" className="secondary" disabled={!canNext} onClick={() => setPage((p) => p + 1)}>
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
