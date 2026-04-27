import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  bulkUploadContacts,
  getActiveUsers,
  getAdminOwners,
  getCodeReference,
  getToken,
  me,
  sendExportOnMail,
  searchContacts,
  type ContactBulkUploadRow,
  type ContactColumnFilterEntry,
  type ContactListRow,
  type PagedContactsResponse,
} from '../../api/client'
import Spinner from '../../components/Spinner'
import { buildExcelBase64, downloadExcelFile } from '../../utils/excel'

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
const CONTACT_UPLOAD_COLUMNS = [
  { key: 'agentEmail', label: 'Agent Email' },
  { key: 'name', label: 'Name' },
  { key: 'countryCode', label: 'Country Code' },
  { key: 'phoneNumber', label: 'Phone Number' },
  { key: 'email', label: 'Email' },
  { key: 'product', label: 'Product' },
  { key: 'purposeOfLoan', label: 'Purpose of Loan' },
  { key: 'address', label: 'Address' },
  { key: 'income', label: 'Income' },
  { key: 'employmentStatus', label: 'Employment Status' },
  { key: 'mortgage', label: 'Mortgage' },
  { key: 'otherExistingLoans', label: 'Other Existing Loans' },
  { key: 'creditCard', label: 'Credit Card' },
  { key: 'type', label: 'Type' },
  { key: 'segment', label: 'Segment' },
  { key: 'status', label: 'Status' },
  { key: 'label', label: 'Label' },
  { key: 'owner', label: 'Owner' },
  { key: 'subOwner', label: 'Sub Owner' },
  { key: 'account', label: 'Account' },
] as const

const CONTACT_UPLOAD_REQUIRED = new Set([
  'Agent Email',
  'Name',
  'Country Code',
  'Phone Number',
  'Email',
  'Purpose of Loan',
  'Employment Status',
  'Mortgage',
  'Other Existing Loans',
  'Credit Card',
])

type ContactUploadParseResult = { rows: ContactBulkUploadRow[]; errors: string[] }

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

async function parseContactUploadFile(file: File): Promise<ContactUploadParseResult> {
  const ExcelJS = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  const buf = await file.arrayBuffer()
  await workbook.xlsx.load(buf)
  const sheet = workbook.worksheets[0]
  if (!sheet) return { rows: [], errors: ['The workbook does not contain any worksheet.'] }

  const expected = CONTACT_UPLOAD_COLUMNS.map((c) => c.label)
  const headerRow = sheet.getRow(1)
  const actual = expected.map((_, i) => String(headerRow.getCell(i + 1).text ?? '').trim())
  if (actual.length !== expected.length || actual.some((v, i) => v !== expected[i])) {
    return {
      rows: [],
      errors: [`Header mismatch. Expected: ${expected.join(', ')}`, `Found: ${actual.join(', ')}`],
    }
  }

  const errors: string[] = []
  const rows: ContactBulkUploadRow[] = []
  for (let r = 2; r <= sheet.rowCount; r += 1) {
    const row = sheet.getRow(r)
    const values = CONTACT_UPLOAD_COLUMNS.map((_, i) => String(row.getCell(i + 1).text ?? '').trim())
    if (values.every((v) => v === '')) continue
    const mapped = Object.fromEntries(CONTACT_UPLOAD_COLUMNS.map((c, i) => [c.key, values[i]])) as Record<string, string>
    for (const col of CONTACT_UPLOAD_COLUMNS) {
      if (CONTACT_UPLOAD_REQUIRED.has(col.label) && !mapped[col.key]) {
        errors.push(`Row ${r}: ${col.label} is required.`)
      }
    }
    if (mapped.agentEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mapped.agentEmail)) {
      errors.push(`Row ${r}: Agent Email is invalid.`)
    }
    if (mapped.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mapped.email)) {
      errors.push(`Row ${r}: Email is invalid.`)
    }
    if (mapped.countryCode && !/^\d+$/.test(mapped.countryCode)) errors.push(`Row ${r}: Country Code must be digits only.`)
    if (mapped.phoneNumber && !/^\d+$/.test(mapped.phoneNumber)) errors.push(`Row ${r}: Phone Number must be digits only.`)
    if (mapped.income && Number.isNaN(Number(mapped.income))) errors.push(`Row ${r}: Income must be numeric.`)
    for (const yn of ['mortgage', 'otherExistingLoans', 'creditCard'] as const) {
      if (mapped[yn] && !/^(yes|no)$/i.test(mapped[yn])) {
        errors.push(`Row ${r}: ${CONTACT_UPLOAD_COLUMNS.find((c) => c.key === yn)?.label} must be Yes or No.`)
      }
    }

    rows.push({
      agentEmail: mapped.agentEmail,
      name: mapped.name,
      countryCode: mapped.countryCode,
      phoneNumber: mapped.phoneNumber,
      email: mapped.email,
      product: mapped.product,
      purposeOfLoan: mapped.purposeOfLoan,
      address: mapped.address,
      income: mapped.income,
      employmentStatus: mapped.employmentStatus,
      mortgage: mapped.mortgage,
      otherExistingLoans: mapped.otherExistingLoans,
      creditCard: mapped.creditCard,
      type: mapped.type,
      segment: mapped.segment,
      status: mapped.status,
      label: mapped.label,
      owner: mapped.owner,
      subOwner: mapped.subOwner,
      account: mapped.account,
    })
  }
  if (rows.length === 0) errors.push('No data rows found in file.')
  return { rows, errors }
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
  const [exportOpen, setExportOpen] = useState(false)
  const [exportBusy, setExportBusy] = useState(false)
  const [emailBusy, setEmailBusy] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [canExport, setCanExport] = useState(false)
  const [mailSuccess, setMailSuccess] = useState<string | null>(null)
  const [exportColumns, setExportColumns] = useState<Set<ContactColumnId>>(
    () => new Set(CONTACT_COLUMN_META.map((c) => c.id)),
  )
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkFileName, setBulkFileName] = useState<string | null>(null)
  const [bulkRows, setBulkRows] = useState<ContactBulkUploadRow[]>([])
  const [bulkBusy, setBulkBusy] = useState(false)
  const [bulkErrors, setBulkErrors] = useState<string[]>([])
  const [bulkSuccess, setBulkSuccess] = useState<string | null>(null)

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
        const isManagerOrAdmin = p.groups.some((g) => {
          const s = g.toLowerCase()
          return s === 'admin' || s === 'manager'
        })
        setCanExport(isManagerOrAdmin)
      } catch {
        if (!cancelled) {
          setVisible(loadVisibleSet(null))
          setCanExport(false)
        }
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

  function toggleExportColumn(id: ContactColumnId) {
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
      setError('You need to sign in to export contacts.')
      return
    }
    const selected = CONTACT_COLUMN_META.filter((c) => exportColumns.has(c.id))
    if (selected.length === 0) {
      setError('Select at least one column to export.')
      return
    }
    setExportBusy(true)
    setError(null)
    setExportError(null)
    setMailSuccess(null)
    try {
      const allRows: ContactListRow[] = []
      let fetchPageNumber = 0
      const fetchSize = 500
      while (true) {
        const res = await searchContacts(token, {
          page: fetchPageNumber,
          size: fetchSize,
          sortField,
          sortDirection,
          filters: appliedFilters,
        })
        allRows.push(...res.content)
        if (fetchPageNumber >= res.totalPages - 1) break
        fetchPageNumber += 1
      }
      const rows = allRows.map((row) => {
        const out: Record<string, string> = {}
        for (const col of selected) {
          out[col.id] = cellValue(row, col.id)
        }
        return out
      })
      await downloadExcelFile(
        `contacts_export_${new Date().toISOString().slice(0, 10)}.xlsx`,
        selected.map((c) => ({ key: c.id, label: c.label })),
        rows,
      )
      setExportOpen(false)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not export contacts.'
      setError(msg)
      setExportError(msg)
    } finally {
      setExportBusy(false)
    }
  }

  async function sendExportToMail() {
    const token = getToken()
    if (!token) {
      setError('You need to sign in to send contacts export by email.')
      return
    }
    const selected = CONTACT_COLUMN_META.filter((c) => exportColumns.has(c.id))
    if (selected.length === 0) {
      setError('Select at least one column to export.')
      return
    }
    setEmailBusy(true)
    setError(null)
    setExportError(null)
    setMailSuccess(null)
    try {
      const allRows: ContactListRow[] = []
      let fetchPageNumber = 0
      const fetchSize = 500
      while (true) {
        const res = await searchContacts(token, {
          page: fetchPageNumber,
          size: fetchSize,
          sortField,
          sortDirection,
          filters: appliedFilters,
        })
        allRows.push(...res.content)
        if (fetchPageNumber >= res.totalPages - 1) break
        fetchPageNumber += 1
      }
      const rows = allRows.map((row) => {
        const out: Record<string, string> = {}
        for (const col of selected) {
          out[col.id] = cellValue(row, col.id)
        }
        return out
      })
      const fileName = `contacts_export_${new Date().toISOString().slice(0, 10)}.xlsx`
      const built = await buildExcelBase64(
        selected.map((c) => ({ key: c.id, label: c.label })),
        rows,
      )
      await sendExportOnMail(token, { fileName, ...built })
      setExportOpen(false)
      const profile = await me(token)
      setMailSuccess(`Export emailed to ${profile.email}`)
      window.setTimeout(() => setMailSuccess(null), 2600)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not send contacts export email.'
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
    const [labels, owners, activeUsers] = await Promise.all([
      getCodeReference(token, 'LABEL_CONTACT'),
      getAdminOwners(token),
      getActiveUsers(token),
    ])
    const labelOptions = labels.map((x) => x.code).filter(Boolean)
    const ownerOptions = owners.map((x) => x.fullName).filter(Boolean)
    const activeOptions = activeUsers.map((x) => x.fullName).filter(Boolean)

    const ExcelJS = await import('exceljs')
    const workbook = new ExcelJS.Workbook()
    const uploadSheet = workbook.addWorksheet('Upload')
    const listSheet = workbook.addWorksheet('Lists')
    listSheet.state = 'veryHidden'
    uploadSheet.addRow(CONTACT_UPLOAD_COLUMNS.map((c) => c.label))
    uploadSheet.addRow([
      'agent@example.com',
      'Sample Name',
      '61',
      '400000000',
      'contact@example.com',
      'Business Loan',
      'Consolidation',
      '123 Demo Street',
      '55000',
      'Full time',
      'No',
      'No',
      'Yes',
      'People',
      'Master List',
      'Active',
      labelOptions[0] ?? '',
      ownerOptions[0] ?? '',
      activeOptions[0] ?? '',
      activeOptions[0] ?? '',
    ])

    const writeColumn = (col: string, title: string, values: string[]) => {
      listSheet.getCell(`${col}1`).value = title
      values.forEach((v, i) => {
        listSheet.getCell(`${col}${i + 2}`).value = v
      })
    }
    writeColumn('A', 'Mortgage', ['Yes', 'No'])
    writeColumn('B', 'Other Existing Loans', ['Yes', 'No'])
    writeColumn('C', 'Credit Card', ['Yes', 'No'])
    writeColumn('D', 'Type', ['People', 'Organization'])
    writeColumn('E', 'Segment', ['Master List', 'Online'])
    writeColumn('F', 'Status', ['Active', 'Inactive'])
    writeColumn('G', 'Label', labelOptions)
    writeColumn('H', 'Owner', ownerOptions)
    writeColumn('I', 'SubOwner/Account', activeOptions)

    const range = (col: string, n: number) => `Lists!$${col}$2:$${col}$${Math.max(2, n + 1)}`
    const applyList = (cell: string, formula: string) => {
      uploadSheet.getCell(cell).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [formula],
        showErrorMessage: true,
      }
    }
    for (let row = 2; row <= 202; row += 1) {
      applyList(`K${row}`, range('A', 2))
      applyList(`L${row}`, range('B', 2))
      applyList(`M${row}`, range('C', 2))
      applyList(`N${row}`, range('D', 2))
      applyList(`O${row}`, range('E', 2))
      applyList(`P${row}`, range('F', 2))
      if (labelOptions.length > 0) applyList(`Q${row}`, range('G', labelOptions.length))
      if (ownerOptions.length > 0) applyList(`R${row}`, range('H', ownerOptions.length))
      if (activeOptions.length > 0) {
        applyList(`S${row}`, range('I', activeOptions.length))
        applyList(`T${row}`, range('I', activeOptions.length))
      }
    }

    const buffer = (await workbook.xlsx.writeBuffer()) as ArrayBuffer
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `contacts_bulk_upload_sample_${new Date().toISOString().slice(0, 10)}.xlsx`
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
      const parsed = await parseContactUploadFile(file)
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
      setError('You need to sign in to bulk upload contacts.')
      return
    }
    if (!bulkFileName || bulkErrors.length > 0 || bulkRows.length === 0) return
    setBulkBusy(true)
    setBulkSuccess(null)
    try {
      const res = await bulkUploadContacts(token, bulkRows)
      if (!res.success) {
        setBulkErrors(res.errors.length > 0 ? res.errors : ['Upload failed due to validation errors.'])
        return
      }
      setBulkErrors([])
      setBulkSuccess(`Successfully uploaded ${res.savedCount} contact(s).`)
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
          {canExport && (
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
                    aria-label="Bulk upload contacts"
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
                    <p className="muted small">Upload contacts in sample format.</p>
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
          )}
          {canExport && (
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
                <div className="column-picker-panel" role="dialog" aria-label="Export contacts columns">
                  <p className="muted small">Select columns to include in Excel export.</p>
                  {exportError && <p className="error small">{exportError}</p>}
                  <div className="column-picker-list">
                    {CONTACT_COLUMN_META.map((c) => (
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
          )}
        </div>
      </div>

      <p className="muted small contacts-scope-note">
        Rows are limited by your role: agents see contacts they own, co-own, or hold as account; leads include their
        teammates (same user groups); managers and administrators see all contacts.
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
