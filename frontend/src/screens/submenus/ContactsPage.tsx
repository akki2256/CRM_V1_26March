import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  getToken,
  me,
  searchContacts,
  type ContactColumnFilterEntry,
  type ContactListRow,
  type PagedContactsResponse,
} from '../../api/client'
import Spinner from '../../components/Spinner'

type ColumnKind = 'id' | 'text' | 'number' | 'yn'

type ContactColumnId = keyof ContactListRow

type ColumnMeta = {
  id: ContactColumnId
  label: string
  kind: ColumnKind
}

const CONTACT_COLUMN_META: ColumnMeta[] = [
  { id: 'contactId', label: 'Contact ID', kind: 'id' },
  { id: 'agentEmail', label: "Agent email", kind: 'text' },
  { id: 'contactName', label: 'Name', kind: 'text' },
  { id: 'countryCode', label: 'Country code', kind: 'text' },
  { id: 'phoneNumber', label: 'Phone', kind: 'text' },
  { id: 'email', label: 'Email', kind: 'text' },
  { id: 'productCode', label: 'Product', kind: 'text' },
  { id: 'purposeOfLoan', label: 'Purpose of loan', kind: 'text' },
  { id: 'addressText', label: 'Address', kind: 'text' },
  { id: 'customerIncome', label: 'Income', kind: 'number' },
  { id: 'employmentStatusCode', label: 'Employment', kind: 'text' },
  { id: 'mortgageYn', label: 'Mortgage', kind: 'yn' },
  { id: 'otherExistingLoansYn', label: 'Other loans', kind: 'yn' },
  { id: 'creditCardYn', label: 'Credit card', kind: 'yn' },
  { id: 'typeCode', label: 'Type', kind: 'text' },
  { id: 'segmentCode', label: 'Segment', kind: 'text' },
  { id: 'statusCode', label: 'Status', kind: 'text' },
  { id: 'labelCode', label: 'Label', kind: 'text' },
  { id: 'ownerName', label: 'Owner', kind: 'text' },
  { id: 'subOwnerName', label: 'Sub-owner', kind: 'text' },
  { id: 'accountName', label: 'Account', kind: 'text' },
]

const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50] as const

const TEXT_OPS = [
  { value: 'CONTAINS', label: 'Contains' },
  { value: 'EQ', label: 'Equals' },
  { value: 'STARTS_WITH', label: 'Starts with' },
  { value: 'ENDS_WITH', label: 'Ends with' },
  { value: 'NE', label: 'Not equals' },
  { value: 'IS_EMPTY', label: 'Is empty' },
  { value: 'IS_NOT_EMPTY', label: 'Is not empty' },
]

const NUM_OPS = [
  { value: 'EQ', label: 'Equals' },
  { value: 'NE', label: 'Not equals' },
  { value: 'GT', label: 'Greater than' },
  { value: 'LT', label: 'Less than' },
  { value: 'GTE', label: 'At least' },
  { value: 'LTE', label: 'At most' },
  { value: 'IS_EMPTY', label: 'Is empty' },
  { value: 'IS_NOT_EMPTY', label: 'Is not empty' },
]

const YN_OPS = [
  { value: 'EQ', label: 'Equals' },
  { value: 'NE', label: 'Not equals' },
  { value: 'IS_EMPTY', label: 'Is empty' },
  { value: 'IS_NOT_EMPTY', label: 'Is not empty' },
]

function storageKey(username: string | null) {
  return `crm_contacts_columns_${username ?? 'default'}`
}

function defaultOp(kind: ColumnKind): string {
  if (kind === 'text') return 'CONTAINS'
  return 'EQ'
}

function initialDraft(): Record<string, { op: string; value: string }> {
  const d: Record<string, { op: string; value: string }> = {}
  for (const c of CONTACT_COLUMN_META) {
    d[c.id] = { op: defaultOp(c.kind), value: '' }
  }
  return d
}

function loadVisibleSet(username: string | null): Set<string> {
  const all = new Set(CONTACT_COLUMN_META.map((c) => c.id))
  try {
    const raw = localStorage.getItem(storageKey(username))
    if (!raw) return all
    const arr = JSON.parse(raw) as unknown
    if (!Array.isArray(arr) || arr.length === 0) return all
    const next = new Set<string>()
    for (const x of arr) {
      if (typeof x === 'string' && CONTACT_COLUMN_META.some((c) => c.id === x)) {
        next.add(x)
      }
    }
    return next.size === 0 ? all : next
  } catch {
    return all
  }
}

function saveVisibleSet(username: string | null, set: Set<string>) {
  localStorage.setItem(storageKey(username), JSON.stringify([...set]))
}

function opsForKind(kind: ColumnKind): { value: string; label: string }[] {
  if (kind === 'text') return TEXT_OPS
  if (kind === 'number' || kind === 'id') return NUM_OPS
  return YN_OPS
}

function ynLabel(v: string | null | undefined): string {
  if (v == null || v === '') return '—'
  return v === 'Y' ? 'Yes' : v === 'N' ? 'No' : v
}

function cellValue(row: ContactListRow, id: ContactColumnId): string {
  const v = row[id]
  if (v === null || v === undefined) return '—'
  if (id === 'mortgageYn' || id === 'otherExistingLoansYn' || id === 'creditCardYn') {
    return ynLabel(String(v))
  }
  if (typeof v === 'number') return String(v)
  return String(v)
}

function buildFilters(draft: Record<string, { op: string; value: string }>): ContactColumnFilterEntry[] {
  const out: ContactColumnFilterEntry[] = []
  for (const col of CONTACT_COLUMN_META) {
    const cell = draft[col.id]
    if (!cell) continue
    const op = cell.op
    const value = cell.value.trim()
    if (op === 'IS_EMPTY' || op === 'IS_NOT_EMPTY') {
      out.push({ column: col.id, op, value: '' })
      continue
    }
    if (value === '') continue
    out.push({ column: col.id, op, value })
  }
  return out
}

export default function ContactsPage() {
  const [username, setUsername] = useState<string | null>(null)
  const [visible, setVisible] = useState<Set<string>>(() => new Set(CONTACT_COLUMN_META.map((c) => c.id)))
  const [columnPickerOpen, setColumnPickerOpen] = useState(false)
  const [draftFilters, setDraftFilters] = useState(initialDraft)
  const [appliedFilters, setAppliedFilters] = useState<ContactColumnFilterEntry[]>([])
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [sortField, setSortField] = useState<ContactColumnId>('contactId')
  const [sortDirection, setSortDirection] = useState<'ASC' | 'DESC'>('DESC')
  const [data, setData] = useState<PagedContactsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hoveredHeader, setHoveredHeader] = useState<ContactColumnId | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const t = getToken()
      if (!t) {
        setError('You need to sign in to view contacts.')
        setLoading(false)
        return
      }
      try {
        const p = await me(t)
        if (cancelled) return
        setUsername(p.username)
        setVisible(loadVisibleSet(p.username))
      } catch {
        if (!cancelled) setVisible(loadVisibleSet(null))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const visibleColumns = useMemo(
    () => CONTACT_COLUMN_META.filter((c) => visible.has(c.id)),
    [visible],
  )

  const fetchPage = useCallback(async () => {
    const t = getToken()
    if (!t) {
      setError('You need to sign in to view contacts.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await searchContacts(t, {
        page,
        size: pageSize,
        sortField,
        sortDirection,
        filters: appliedFilters,
      })
      setData(res)
    } catch (e) {
      setData(null)
      setError(e instanceof Error ? e.message : 'Could not load contacts.')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, sortField, sortDirection, appliedFilters])

  useEffect(() => {
    void fetchPage()
  }, [fetchPage])

  function toggleColumn(id: string) {
    setVisible((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        if (next.size <= 1) return prev
        next.delete(id)
      } else {
        next.add(id)
      }
      saveVisibleSet(username, next)
      return next
    })
  }

  function handleSortClick(col: ContactColumnId) {
    if (sortField === col) {
      setSortDirection((d) => (d === 'ASC' ? 'DESC' : 'ASC'))
    } else {
      setSortField(col)
      setSortDirection(col === 'contactId' ? 'DESC' : 'ASC')
    }
    setPage(0)
  }

  function updateDraft(col: ContactColumnId, patch: Partial<{ op: string; value: string }>) {
    setDraftFilters((prev) => ({
      ...prev,
      [col]: { ...prev[col], ...patch },
    }))
  }

  function applyHeaderContains(col: ContactColumnId) {
    const raw = draftFilters[col]?.value ?? ''
    const nextDraft = {
      ...draftFilters,
      [col]: { op: 'CONTAINS', value: raw.trim() },
    }
    setDraftFilters(nextDraft)
    setAppliedFilters(buildFilters(nextDraft))
    setPage(0)
  }

  const totalPages = data?.totalPages ?? 0
  const canPrev = page > 0
  const canNext = data != null && page < totalPages - 1

  return (
    <div className="contacts-page">
      <div className="contacts-page-header">
        <h2>Contacts</h2>
        <div className="contacts-header-actions">
          <div className="column-picker-wrap">
            <button type="button" className="secondary" onClick={() => setColumnPickerOpen((o) => !o)}>
              Columns
            </button>
            {columnPickerOpen && (
              <div className="column-picker-panel" role="dialog" aria-label="Choose columns">
                <p className="muted small">Select which columns appear in the table.</p>
                <div className="column-picker-list">
                  {CONTACT_COLUMN_META.map((c) => (
                    <label key={c.id} className="column-picker-row">
                      <input type="checkbox" checked={visible.has(c.id)} onChange={() => toggleColumn(c.id)} />
                      <span>{c.label}</span>
                    </label>
                  ))}
                </div>
                <button type="button" className="link small" onClick={() => setColumnPickerOpen(false)}>
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="muted small contacts-scope-note">
        Rows are limited by your role: agents see contacts they own, co-own, or hold as account; leads include their
        teammates (same user groups); managers and administrators see all contacts.
      </p>

      {error && <p className="error">{error}</p>}

      <div className="contacts-table-toolbar">
        <div className="contacts-sort-inline">
          <label>
            <span className="contacts-inline-label">Sort by</span>
            <select
              value={sortField}
              onChange={(e) => {
                setSortField(e.target.value as ContactColumnId)
                setPage(0)
              }}
            >
              {CONTACT_COLUMN_META.map((c) => (
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
        </div>
      </div>

      <div className="table-wrap contacts-table-wrap">
        {loading && (
          <div className="contacts-loading">
            <Spinner /> <span>Loading…</span>
          </div>
        )}
        {!loading && data && (
          <table className="result-table contacts-result-table">
            <thead>
              <tr>
                {visibleColumns.map((c) => (
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
                    <button type="button" className="contacts-sort-btn" onClick={() => handleSortClick(c.id)}>
                      {c.label}
                      {sortField === c.id ? (sortDirection === 'ASC' ? ' ▲' : ' ▼') : ''}
                    </button>
                    {c.kind === 'text' && hoveredHeader === c.id && (
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
                  <td colSpan={Math.max(1, visibleColumns.length)} className="muted">
                    No contacts match your filters and access scope.
                  </td>
                </tr>
              ) : (
                data.content.map((row) => (
                  <tr key={row.contactId}>
                    {visibleColumns.map((c) => (
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
