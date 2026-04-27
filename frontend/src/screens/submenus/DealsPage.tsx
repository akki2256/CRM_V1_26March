import { useCallback, useEffect, useState } from 'react'
import {
  bulkUploadDeals,
  getDealFormOptions,
  getToken,
  me,
  sendExportOnMail,
  searchDeals,
  type DealBulkUploadRow,
  type DealListRow,
  type PagedDealsResponse,
} from '../../api/client'
import Spinner from '../../components/Spinner'
import { buildExcelBase64, downloadExcelFile } from '../../utils/excel'
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
const DEAL_UPLOAD_COLUMNS = [
  { key: 'contactName', label: 'Contact ID' },
  { key: 'userName', label: 'Deal user ID' },
  { key: 'closingDate', label: 'Closing date' },
  { key: 'stageName', label: 'Stage ID' },
  { key: 'amount', label: 'Amount' },
  { key: 'dealDate', label: 'Deal date' },
  { key: 'pipeline', label: 'Pipeline' },
  { key: 'currency', label: 'Currency' },
  { key: 'dealComments', label: 'Deal comments' },
] as const

const DEAL_UPLOAD_REQUIRED = new Set([
  'Contact ID',
  'Deal user ID',
  'Closing date',
  'Stage ID',
  'Amount',
  'Deal date',
  'Pipeline',
  'Currency',
])

type UploadParseResult = { rows: DealBulkUploadRow[]; errors: string[] }

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

async function parseDealUploadFile(file: File): Promise<UploadParseResult> {
  const ExcelJS = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  const buf = await file.arrayBuffer()
  await workbook.xlsx.load(buf)
  const sheet = workbook.worksheets[0]
  if (!sheet) return { rows: [], errors: ['The workbook does not contain any worksheet.'] }

  const expected = DEAL_UPLOAD_COLUMNS.map((c) => c.label)
  const headerRow = sheet.getRow(1)
  const actual = expected.map((_, i) => String(headerRow.getCell(i + 1).text ?? '').trim())
  if (actual.length !== expected.length || actual.some((v, i) => v !== expected[i])) {
    return {
      rows: [],
      errors: [
        `Header mismatch. Expected: ${expected.join(', ')}`,
        `Found: ${actual.join(', ')}`,
      ],
    }
  }

  const rows: DealBulkUploadRow[] = []
  const errors: string[] = []
  for (let r = 2; r <= sheet.rowCount; r += 1) {
    const row = sheet.getRow(r)
    const values = DEAL_UPLOAD_COLUMNS.map((_, i) => String(row.getCell(i + 1).text ?? '').trim())
    if (values.every((v) => v === '')) continue
    const mapped = Object.fromEntries(DEAL_UPLOAD_COLUMNS.map((c, i) => [c.key, values[i]])) as Record<string, string>

    for (const col of DEAL_UPLOAD_COLUMNS) {
      if (DEAL_UPLOAD_REQUIRED.has(col.label) && !mapped[col.key]) {
        errors.push(`Row ${r}: ${col.label} is required.`)
      }
    }
    if (mapped.amount && Number.isNaN(Number(mapped.amount))) errors.push(`Row ${r}: Amount must be numeric.`)
    if (mapped.closingDate && !isIsoDate(mapped.closingDate)) errors.push(`Row ${r}: Closing date must be YYYY-MM-DD.`)
    if (mapped.dealDate && !isIsoDate(mapped.dealDate)) errors.push(`Row ${r}: Deal date must be YYYY-MM-DD.`)

    rows.push({
      contactName: mapped.contactName,
      userName: mapped.userName,
      closingDate: mapped.closingDate,
      stageName: mapped.stageName,
      amount: mapped.amount,
      dealDate: mapped.dealDate,
      pipeline: mapped.pipeline,
      currency: mapped.currency,
      dealComments: mapped.dealComments ?? '',
    })
  }
  if (rows.length === 0) errors.push('No data rows found in file.')
  return { rows, errors }
}

function formatMoney(amount: number, currency: string): string {
  const sym = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : `${currency} `
  return `${sym}${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDealAge(dealDateIso: string): string {
  if (!dealDateIso) return '—'
  const start = new Date(dealDateIso.includes('T') ? dealDateIso : `${dealDateIso}T00:00:00Z`)
  if (Number.isNaN(start.getTime())) return '—'
  const ms = Date.now() - start.getTime()
  const days = Math.floor(ms / (24 * 60 * 60 * 1000))
  if (days < 0) return '0 days'
  if (days === 0) return 'Today'
  if (days === 1) return '1 day'
  return `${days} days`
}

function displayValue(raw: string | number | null | undefined): string {
  if (raw === null || raw === undefined) return '—'
  const text = String(raw).trim()
  return text === '' ? '—' : text
}

export default function DealsPage({ goToSalesAccount }: SubmenuProps) {
  const [detailDealId, setDetailDealId] = useState<number | null>(null)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(12)
  const [sortField, setSortField] = useState<DealColumnId>('dealId')
  const [sortDirection, setSortDirection] = useState<'ASC' | 'DESC'>('DESC')
  const [data, setData] = useState<PagedDealsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [exportBusy, setExportBusy] = useState(false)
  const [emailBusy, setEmailBusy] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [canExport, setCanExport] = useState(false)
  const [mailSuccess, setMailSuccess] = useState<string | null>(null)
  const [exportColumns, setExportColumns] = useState<Set<DealColumnId>>(() => new Set(DEAL_COLUMN_META.map((c) => c.id)))
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkFileName, setBulkFileName] = useState<string | null>(null)
  const [bulkRows, setBulkRows] = useState<DealBulkUploadRow[]>([])
  const [bulkBusy, setBulkBusy] = useState(false)
  const [bulkErrors, setBulkErrors] = useState<string[]>([])
  const [bulkSuccess, setBulkSuccess] = useState<string | null>(null)

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
      })
      setData(res)
    } catch (e) {
      setData(null)
      setError(e instanceof Error ? e.message : 'Could not load deals.')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, sortField, sortDirection])

  useEffect(() => {
    void fetchPage()
  }, [fetchPage])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const t = getToken()
      if (!t) return
      try {
        const p = await me(t)
        if (cancelled) return
        const isManagerOrAdmin = p.groups.some((g) => {
          const s = g.toLowerCase()
          return s === 'admin' || s === 'manager'
        })
        setCanExport(isManagerOrAdmin)
      } catch {
        if (!cancelled) setCanExport(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  function clearAllSearches() {
    setSortField('dealId')
    setSortDirection('DESC')
    setPage(0)
  }

  const totalPages = data?.totalPages ?? 0
  const canPrev = page > 0
  const canNext = data != null && page < totalPages - 1

  function toggleExportColumn(id: DealColumnId) {
    setExportColumns((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        if (next.size <= 1) return prev
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  async function exportToExcel() {
    const token = getToken()
    if (!token) {
      setError('You need to sign in to export deals.')
      return
    }
    const selected = DEAL_COLUMN_META.filter((c) => exportColumns.has(c.id))
    if (selected.length === 0) {
      setError('Select at least one column to export.')
      return
    }
    setExportBusy(true)
    setError(null)
    setExportError(null)
    setMailSuccess(null)
    try {
      const allRows: DealListRow[] = []
      let fetchPageNumber = 0
      const fetchSize = 500
      while (true) {
        const res = await searchDeals(token, {
          page: fetchPageNumber,
          size: fetchSize,
          sortField,
          sortDirection,
        })
        allRows.push(...res.content)
        if (fetchPageNumber >= res.totalPages - 1) break
        fetchPageNumber += 1
      }
      const rows = allRows.map((row) => {
        const out: Record<string, string> = {}
        for (const col of selected) {
          out[col.id] = displayValue(row[col.id])
        }
        out.stageName = displayValue(row.stageName)
        return out
      })
      await downloadExcelFile(
        `deals_export_${new Date().toISOString().slice(0, 10)}.xlsx`,
        selected.map((c) => ({ key: c.id, label: c.label })),
        rows,
        {
          headerStyle: {
            font: { bold: true },
            fill: { patternType: 'solid', fgColor: { rgb: 'D9D9D9' } },
          },
          rowStyleByColumnValue: {
            key: 'stageName',
            styles: {
              'Closed Won': { fill: { patternType: 'solid', fgColor: { rgb: 'C6EFCE' } } },
              'Lead Generated': {},
            },
          },
        },
      )
      setExportOpen(false)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not export deals.'
      setError(msg)
      setExportError(msg)
    } finally {
      setExportBusy(false)
    }
  }

  async function sendExportToMail() {
    const token = getToken()
    if (!token) {
      setError('You need to sign in to send deals export by email.')
      return
    }
    const selected = DEAL_COLUMN_META.filter((c) => exportColumns.has(c.id))
    if (selected.length === 0) {
      setError('Select at least one column to export.')
      return
    }
    setEmailBusy(true)
    setError(null)
    setExportError(null)
    setMailSuccess(null)
    try {
      const allRows: DealListRow[] = []
      let fetchPageNumber = 0
      const fetchSize = 500
      while (true) {
        const res = await searchDeals(token, {
          page: fetchPageNumber,
          size: fetchSize,
          sortField,
          sortDirection,
        })
        allRows.push(...res.content)
        if (fetchPageNumber >= res.totalPages - 1) break
        fetchPageNumber += 1
      }
      const rows = allRows.map((row) => {
        const out: Record<string, string> = {}
        for (const col of selected) {
          out[col.id] = displayValue(row[col.id])
        }
        out.stageName = displayValue(row.stageName)
        return out
      })
      const fileName = `deals_export_${new Date().toISOString().slice(0, 10)}.xlsx`
      const built = await buildExcelBase64(
        selected.map((c) => ({ key: c.id, label: c.label })),
        rows,
        {
          headerStyle: {
            font: { bold: true },
            fill: { patternType: 'solid', fgColor: { rgb: 'D9D9D9' } },
          },
          rowStyleByColumnValue: {
            key: 'stageName',
            styles: {
              'Closed Won': { fill: { patternType: 'solid', fgColor: { rgb: 'C6EFCE' } } },
              'Lead Generated': {},
            },
          },
        },
      )
      await sendExportOnMail(token, { fileName, ...built })
      setExportOpen(false)
      const profile = await me(token)
      setMailSuccess(`Export emailed to ${profile.email}`)
      window.setTimeout(() => setMailSuccess(null), 2600)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not send deals export email.'
      setError(msg)
      setExportError(msg)
    } finally {
      setEmailBusy(false)
    }
  }

  async function downloadBulkSample() {
    const token = getToken()
    if (!token) {
      setError('You need to sign in to download sample.')
      return
    }
    const options = await getDealFormOptions(token)
    const contactNames = Array.from(
      new Set(options.contacts.map((c) => c.contactName.trim()).filter((name) => name !== '')),
    ).sort((a, b) => a.localeCompare(b))
    const userNames = Array.from(new Set(options.users.map((u) => u.label.trim()).filter((name) => name !== ''))).sort((a, b) =>
      a.localeCompare(b),
    )
    const stageNames = Array.from(
      new Set(options.stages.map((s) => s.stageName.trim()).filter((name) => name !== '')),
    ).sort((a, b) => a.localeCompare(b))
    if (contactNames.length === 0 || userNames.length === 0 || stageNames.length === 0) {
      throw new Error('Could not build sample: contact, active user, or stage options are missing.')
    }

    const ExcelJS = await import('exceljs')
    const workbook = new ExcelJS.Workbook()
    const uploadSheet = workbook.addWorksheet('Upload')
    const listSheet = workbook.addWorksheet('Lists')
    listSheet.state = 'veryHidden'

    uploadSheet.addRow(DEAL_UPLOAD_COLUMNS.map((c) => c.label))
    uploadSheet.addRow([
      contactNames[0] ?? '',
      userNames[0] ?? '',
      '2026-12-31',
      stageNames[0] ?? '',
      '50000.00',
      '2026-01-15',
      'Retail',
      'USD',
      'Sample note',
    ])

    listSheet.getCell('A1').value = 'Contact names'
    contactNames.forEach((name, idx) => {
      listSheet.getCell(`A${idx + 2}`).value = name
    })
    listSheet.getCell('B1').value = 'Deal user names'
    userNames.forEach((name, idx) => {
      listSheet.getCell(`B${idx + 2}`).value = name
    })
    listSheet.getCell('C1').value = 'Stage names'
    stageNames.forEach((name, idx) => {
      listSheet.getCell(`C${idx + 2}`).value = name
    })

    const contactRange = `Lists!$A$2:$A$${Math.max(2, contactNames.length + 1)}`
    const userRange = `Lists!$B$2:$B$${Math.max(2, userNames.length + 1)}`
    const stageRange = `Lists!$C$2:$C$${Math.max(2, stageNames.length + 1)}`
    for (let row = 2; row <= 202; row += 1) {
      uploadSheet.getCell(`A${row}`).dataValidation = {
        type: 'list',
        allowBlank: false,
        formulae: [contactRange],
        showErrorMessage: true,
      }
      uploadSheet.getCell(`B${row}`).dataValidation = {
        type: 'list',
        allowBlank: false,
        formulae: [userRange],
        showErrorMessage: true,
      }
      uploadSheet.getCell(`D${row}`).dataValidation = {
        type: 'list',
        allowBlank: false,
        formulae: [stageRange],
        showErrorMessage: true,
      }
    }

    const buffer = (await workbook.xlsx.writeBuffer()) as ArrayBuffer
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `deals_bulk_upload_sample_${new Date().toISOString().slice(0, 10)}.xlsx`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  async function onBulkFileSelected(file: File | null) {
    setBulkErrors([])
    setBulkSuccess(null)
    if (!file) {
      setBulkFileName(null)
      setBulkRows([])
      return
    }
    try {
      const parsed = await parseDealUploadFile(file)
      setBulkFileName(file.name)
      setBulkRows(parsed.rows)
      setBulkErrors(parsed.errors)
    } catch (e) {
      setBulkFileName(file.name)
      setBulkRows([])
      setBulkErrors([e instanceof Error ? e.message : 'Could not read file.'])
    }
  }

  async function confirmBulkUpload() {
    const token = getToken()
    if (!token) {
      setError('You need to sign in to bulk upload deals.')
      return
    }
    if (!bulkFileName) return
    if (bulkErrors.length > 0) return
    if (bulkRows.length === 0) {
      setBulkErrors(['No valid rows available to upload.'])
      return
    }
    setBulkBusy(true)
    setBulkSuccess(null)
    try {
      const res = await bulkUploadDeals(token, bulkRows)
      if (!res.success) {
        setBulkErrors(res.errors.length > 0 ? res.errors : ['Upload failed due to validation errors.'])
        return
      }
      setBulkErrors([])
      setBulkSuccess(`Successfully uploaded ${res.savedCount} deal(s).`)
      setBulkOpen(false)
      setBulkFileName(null)
      setBulkRows([])
      await fetchPage()
    } catch (e) {
      setBulkErrors([e instanceof Error ? e.message : 'Bulk upload failed.'])
    } finally {
      setBulkBusy(false)
    }
  }

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
        {canExport && (
          <div className="contacts-header-actions">
            <div className="column-picker-wrap">
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setBulkErrors([])
                  setBulkSuccess(null)
                  setBulkOpen((o) => !o)
                }}
              >
                Bulk Upload
              </button>
              {bulkOpen && (
                <div className="modal-backdrop" onClick={() => setBulkOpen(false)}>
                  <div
                    className="modal bulk-upload-modal"
                    role="dialog"
                    aria-label="Bulk upload deals"
                    aria-modal="true"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      className="bulk-upload-close-btn"
                      aria-label="Close bulk upload"
                      onClick={() => setBulkOpen(false)}
                      disabled={bulkBusy}
                    >
                      ×
                    </button>
                    <p className="muted small">Upload deals in sample format (YYYY-MM-DD dates).</p>
                    {bulkFileName && <p className="small">Selected file: {bulkFileName}</p>}
                    {bulkErrors.length > 0 && (
                      <div className="error small">
                        {bulkErrors.slice(0, 8).map((msg, i) => (
                          <div key={`${msg}-${i}`}>{msg}</div>
                        ))}
                      </div>
                    )}
                    {bulkSuccess && <p className="info success-msg">{bulkSuccess}</p>}
                    <div className="export-panel-actions export-panel-actions-start">
                      <button type="button" className="secondary" onClick={() => void downloadBulkSample()} disabled={bulkBusy}>
                        Download Sample
                      </button>
                    </div>
                    <div className="export-panel-actions export-panel-actions-start">
                      <label className="secondary bulk-select-file-btn">
                        Select file
                        <input
                          type="file"
                          accept=".xlsx,.xls"
                          style={{ display: 'none' }}
                          onChange={(e) => void onBulkFileSelected(e.target.files?.[0] ?? null)}
                        />
                      </label>
                      <button
                        type="button"
                        className="primary"
                        onClick={() => void confirmBulkUpload()}
                        disabled={bulkBusy || !bulkFileName || bulkErrors.length > 0}
                      >
                        {bulkBusy ? 'Uploading...' : 'Confirm Upload'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="column-picker-wrap">
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setExportError(null)
                  setExportOpen((o) => !o)
                }}
              >
                Export to Excel
              </button>
              {exportOpen && (
                <div className="column-picker-panel" role="dialog" aria-label="Export deals columns">
                  <p className="muted small">Select columns to include in Excel export.</p>
                  {exportError && <p className="error small">{exportError}</p>}
                  <div className="column-picker-list">
                    {DEAL_COLUMN_META.map((c) => (
                      <label key={c.id} className="column-picker-row">
                        <input type="checkbox" checked={exportColumns.has(c.id)} onChange={() => toggleExportColumn(c.id)} />
                        <span>{c.label}</span>
                      </label>
                    ))}
                  </div>
                  <div className="export-panel-actions">
                    <button type="button" className="secondary" onClick={() => setExportOpen(false)} disabled={exportBusy || emailBusy}>
                      Cancel
                    </button>
                    <button type="button" className="secondary" onClick={() => void sendExportToMail()} disabled={exportBusy || emailBusy}>
                      {emailBusy ? 'Sending...' : 'Send on Mail'}
                    </button>
                    <button type="button" className="primary" onClick={() => void exportToExcel()} disabled={exportBusy || emailBusy}>
                      {exportBusy ? 'Exporting...' : 'Export'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <p className="muted small contacts-scope-note">
        Visibility follows the linked contact: agents see deals whose contact owner, sub-owner, or account matches their
        name; leads include teammates in the same user groups; managers and administrators see all deals.
      </p>

      {error && <p className="error">{error}</p>}
      {mailSuccess && <p className="info success-msg">{mailSuccess}</p>}
      {bulkSuccess && <p className="info success-msg">{bulkSuccess}</p>}

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
            <span className="contacts-inline-label">Tiles per page</span>
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
          <div className="deal-tile-grid">
            {data.content.length === 0 ? (
              <p className="muted deal-tile-empty">No deals match your search and access scope.</p>
            ) : (
              data.content.map((row) => (
                <article
                  key={row.dealId}
                  className="deal-tile"
                  role="button"
                  tabIndex={0}
                  onClick={() => setDetailDealId(row.dealId)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setDetailDealId(row.dealId)
                    }
                  }}
                  aria-label={`Open deal ${row.dealId}`}
                >
                  <p className="deal-tile-contact">{displayValue(row.contactName)}</p>
                  <p className="deal-tile-owner">{displayValue(row.ownerName)}</p>
                  <p className="deal-tile-amount">{formatMoney(row.amount, row.currency)}</p>
                  <p className="deal-tile-quote">$0.00</p>
                  <p className="deal-tile-quote-label">Primary quote amount</p>
                  <button
                    type="button"
                    className="deal-tile-account-link"
                    onClick={(e) => {
                      e.stopPropagation()
                      goToSalesAccount?.(row.accountName)
                    }}
                  >
                    {displayValue(row.accountName)}
                  </button>
                  <div className="deal-tile-icons" aria-label="Deal metadata">
                    <span className="deal-tile-icon-tip">
                      🎯
                      <span className="deal-tile-tooltip">{displayValue(row.purposeOfLoan)}</span>
                    </span>
                    <span className="deal-tile-icon-tip">
                      💬
                      <span className="deal-tile-tooltip small">{displayValue(row.dealComments)}</span>
                    </span>
                    <span className="deal-tile-icon-tip">
                      🕒
                      <span className="deal-tile-tooltip">{formatDealAge(row.dealDate)}</span>
                    </span>
                  </div>
                </article>
              ))
            )}
          </div>
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
