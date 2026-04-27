import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  getDealDetail,
  getDealFormOptions,
  getToken,
  listDealAttachments,
  patchDealAccount,
  patchDealContact,
  patchDealStage,
  uploadDealAttachment,
  type DealAttachmentRow,
  type DealDetail,
  type DealFormOptionsResponse,
} from '../../api/client'
import Spinner from '../../components/Spinner'

type TabId =
  | 'quotes'
  | 'invoices'
  | 'notes'
  | 'attachments'
  | 'linkedAccount'
  | 'linkedContact'
  | 'logs'

const TABS: { id: TabId; label: string }[] = [
  { id: 'quotes', label: 'Quotes' },
  { id: 'invoices', label: 'Invoices' },
  { id: 'notes', label: 'Notes' },
  { id: 'attachments', label: 'Attachments' },
  { id: 'linkedAccount', label: 'Linked Account' },
  { id: 'linkedContact', label: 'Linked Contact' },
  { id: 'logs', label: 'Logs' },
]

function formatDealAge(dealDateIso: string): string {
  if (!dealDateIso) return '—'
  const start = new Date(dealDateIso.includes('T') ? dealDateIso : `${dealDateIso}T00:00:00Z`)
  if (Number.isNaN(start.getTime())) return '—'
  const ms = Date.now() - start.getTime()
  const days = Math.floor(ms / (24 * 60 * 60 * 1000))
  if (days < 0) return '0 days'
  if (days === 0) {
    const hours = Math.floor(ms / (60 * 60 * 1000))
    return hours <= 0 ? 'Less than 1 hour' : `${hours} hour(s)`
  }
  if (days < 60) return `${days} day(s)`
  const months = Math.floor(days / 30)
  return `${months} month(s) (${days} days)`
}

function sliceDate(iso: string): string {
  if (!iso) return '—'
  return iso.length >= 10 ? iso.slice(0, 10) : iso
}

type Props = {
  dealId: number
  onBack: () => void
  goToSalesAccount?: (accountName: string) => void
}

export default function DealDetailPage({ dealId, onBack, goToSalesAccount }: Props) {
  const [detail, setDetail] = useState<DealDetail | null>(null)
  const [options, setOptions] = useState<DealFormOptionsResponse | null>(null)
  const [attachments, setAttachments] = useState<DealAttachmentRow[]>([])
  const [tab, setTab] = useState<TabId>('quotes')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [accountDraft, setAccountDraft] = useState('')
  const [contactDraft, setContactDraft] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    const t = getToken()
    if (!t) {
      setError('Sign in required.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [d, o, att] = await Promise.all([
        getDealDetail(t, dealId),
        getDealFormOptions(t),
        listDealAttachments(t, dealId),
      ])
      setDetail(d)
      setOptions(o)
      setAttachments(att)
      setAccountDraft(d.accountName === '—' ? '' : d.accountName)
      setContactDraft(String(d.contactId))
    } catch (e) {
      setDetail(null)
      setError(e instanceof Error ? e.message : 'Could not load deal.')
    } finally {
      setLoading(false)
    }
  }, [dealId])

  useEffect(() => {
    void load()
  }, [load])

  const ageLabel = useMemo(() => (detail ? formatDealAge(detail.dealDate) : ''), [detail])

  async function onWonLost(won: boolean) {
    const t = getToken()
    if (!t || !detail) return
    setBusy(true)
    setError(null)
    try {
      await patchDealStage(t, dealId, won ? 'Closed Won' : 'Closed Lost')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed.')
    } finally {
      setBusy(false)
    }
  }

  async function saveAccount() {
    const t = getToken()
    if (!t || !detail?.canEditContactAndAccount) return
    setBusy(true)
    setError(null)
    try {
      await patchDealAccount(t, dealId, accountDraft.trim())
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update account.')
    } finally {
      setBusy(false)
    }
  }

  async function saveContact() {
    const t = getToken()
    if (!t || !detail?.canEditContactAndAccount) return
    const id = Number(contactDraft)
    if (!Number.isFinite(id)) return
    setBusy(true)
    setError(null)
    try {
      await patchDealContact(t, dealId, id)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update contact.')
    } finally {
      setBusy(false)
    }
  }

  async function onPickAttachment(files: FileList | null) {
    const t = getToken()
    const f = files?.[0]
    if (!t || !f) return
    setBusy(true)
    setError(null)
    try {
      await uploadDealAttachment(t, dealId, f)
      setAttachments(await listDealAttachments(t, dealId))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.')
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function openSalesFromAccount() {
    if (!detail || detail.accountName === '—') return
    goToSalesAccount?.(detail.accountName)
  }

  if (loading) {
    return (
      <div className="deal-detail-root">
        <div className="deal-detail-loading">
          <Spinner /> <span>Loading deal…</span>
        </div>
      </div>
    )
  }

  if (error && !detail) {
    return (
      <div className="deal-detail-root">
        <p className="error">{error}</p>
        <button type="button" className="secondary" onClick={onBack}>
          ← Back to deals
        </button>
      </div>
    )
  }

  if (!detail) return null

  return (
    <div className="deal-detail-root">
      {error && <p className="error">{error}</p>}
      <div className="deal-detail-layout">
        <nav className="deal-detail-nav" aria-label="Deal workspace">
          <button type="button" className="deal-detail-back" onClick={onBack}>
            ← Deals list
          </button>
          <p className="muted small deal-detail-nav-note">Deal #{detail.dealId}</p>
        </nav>

        <aside className="deal-detail-sideband">
          <div className="deal-sideband-block">
            <div className="deal-sideband-label">Contact</div>
            <div className="deal-sideband-value">{detail.contactName}</div>
          </div>

          <div className="deal-sideband-actions">
            <button type="button" className="deal-won-btn" disabled={busy} onClick={() => void onWonLost(true)}>
              👍 Deal Won
            </button>
            <button type="button" className="deal-lost-btn" disabled={busy} onClick={() => void onWonLost(false)}>
              👎 Deal Lost
            </button>
          </div>

          <div className="deal-sideband-block">
            <div className="deal-sideband-label">Deal age</div>
            <div className="deal-sideband-value">{ageLabel}</div>
            <div className="muted small">From deal date</div>
          </div>

          <div className="deal-sideband-block">
            <div className="deal-sideband-label">Account</div>
            {detail.canEditContactAndAccount ? (
              <>
                <input
                  className="deal-sideband-input"
                  value={accountDraft}
                  onChange={(e) => setAccountDraft(e.target.value)}
                  aria-label="Account name"
                />
                <button type="button" className="secondary small-btn" disabled={busy} onClick={() => void saveAccount()}>
                  Save account
                </button>
              </>
            ) : (
              <button type="button" className="link deal-account-link-btn" onClick={openSalesFromAccount}>
                {detail.accountName}
              </button>
            )}
          </div>

          <div className="deal-sideband-block">
            <div className="deal-sideband-label">Contact on deal</div>
            {detail.canEditContactAndAccount && options ? (
              <>
                <select
                  className="deal-sideband-input"
                  value={contactDraft}
                  onChange={(e) => setContactDraft(e.target.value)}
                  aria-label="Linked contact"
                >
                  {options.contacts.map((c) => (
                    <option key={c.contactId} value={String(c.contactId)}>
                      {c.contactName}
                    </option>
                  ))}
                </select>
                <button type="button" className="secondary small-btn" disabled={busy} onClick={() => void saveContact()}>
                  Save contact
                </button>
              </>
            ) : (
              <div className="deal-sideband-value">{detail.contactName}</div>
            )}
          </div>

          <div className="deal-sideband-block">
            <div className="deal-sideband-label">Closing date</div>
            <div className="deal-sideband-value">{sliceDate(detail.closingDate)}</div>
          </div>
          <div className="deal-sideband-block">
            <div className="deal-sideband-label">Deal date</div>
            <div className="deal-sideband-value">{sliceDate(detail.dealDate)}</div>
          </div>
          <div className="deal-sideband-block">
            <div className="deal-sideband-label">Account owner</div>
            <div className="deal-sideband-value">{detail.ownerName}</div>
          </div>
          <div className="deal-sideband-block">
            <div className="deal-sideband-label">Quote amount</div>
            <div className="deal-sideband-value">$0.00</div>
          </div>
        </aside>

        <main className="deal-detail-main">
          <div className="deal-detail-tabs" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                className={`deal-detail-tab${tab === t.id ? ' active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="deal-detail-tab-panel">
            {tab === 'quotes' && <p className="muted">Quotes — content coming later.</p>}
            {tab === 'invoices' && <p className="muted">Invoices — content coming later.</p>}
            {tab === 'notes' && <p className="muted">Notes — content coming later.</p>}
            {tab === 'attachments' && (
              <div className="deal-attachments-panel">
                <button type="button" className="primary" disabled={busy} onClick={() => fileRef.current?.click()}>
                  Add attachment
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  className="visually-hidden"
                  aria-hidden
                  onChange={(e) => void onPickAttachment(e.target.files)}
                />
                <ul className="deal-attachment-list">
                  {attachments.length === 0 ? (
                    <li className="muted">No attachments yet.</li>
                  ) : (
                    attachments.map((a) => (
                      <li key={a.attachmentId}>
                        {a.fileName}{' '}
                        <span className="muted small">{a.uploadedAt ? a.uploadedAt.slice(0, 16).replace('T', ' ') : ''}</span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            )}
            {tab === 'linkedAccount' && <p className="muted">Linked Account — content coming later.</p>}
            {tab === 'linkedContact' && <p className="muted">Linked Contact — content coming later.</p>}
            {tab === 'logs' && <p className="muted">Logs — content coming later.</p>}
          </div>
        </main>
      </div>
    </div>
  )
}
