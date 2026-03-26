import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'
import {
  changePasswordAfterReset,
  createContact,
  forgotPassword,
  forgotUserId,
  getActiveUsers,
  getAdminOwners,
  getCodeReference,
  getToken,
  login,
  logout,
  me,
  setToken,
  type MeResponse,
} from './api/client'

type ForgotStep = 'menu' | 'password' | 'userid'
type MenuKey = 'dashboard' | 'sales' | 'marketing' | 'logs' | 'admin'
type CreateNewOption = 'contact' | 'deal'
type YesNo = 'Yes' | 'No'

type ContactForm = {
  agentName: string
  name: string
  countryCode: string
  phoneNumber: string
  email: string
  product: string
  purposeOfLoan: string
  address: string
  income: string
  employmentStatus: string
  mortgage: YesNo | ''
  otherExistingLoans: YesNo | ''
  creditCard: YesNo | ''
  type: 'People' | 'Organization'
  segment: 'Master List' | 'Online'
  status: 'Active' | 'Inactive'
  label: string
  owner: string
  subOwner: string
  account: string
}

const MENU_ITEMS: { key: MenuKey; label: string; icon: string; submenus: string[] }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: '📊', submenus: [] },
  {
    key: 'sales',
    label: 'Sales',
    icon: '💼',
    submenus: ['Accounts', 'Contacts', 'Segments/Lists', 'Deals', 'Activities', 'Quotes', 'Invoices', 'Pricebook', 'Products'],
  },
  { key: 'marketing', label: 'Marketing', icon: '📣', submenus: ['Forms'] },
  { key: 'logs', label: 'Logs', icon: '🗂️', submenus: [] },
  { key: 'admin', label: 'Admin', icon: '🛠️', submenus: ['User Maintenance'] },
]

const WIDGET_CHOICES = [
  'Revenue Summary',
  'Sales Funnel',
  'Pipeline by Stage',
  'Top Accounts',
  'Activities Due',
  'Quote Conversion',
]

const INITIAL_CONTACT_FORM: ContactForm = {
  agentName: '',
  name: '',
  countryCode: '',
  phoneNumber: '',
  email: '',
  product: '',
  purposeOfLoan: '',
  address: '',
  income: '',
  employmentStatus: '',
  mortgage: '',
  otherExistingLoans: '',
  creditCard: '',
  type: 'People',
  segment: 'Master List',
  status: 'Active',
  label: '',
  owner: '',
  subOwner: '',
  account: '',
}

function App() {
  const [token, setTokenState] = useState<string | null>(() => getToken())
  const [profile, setProfile] = useState<MeResponse | null>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [forgotOpen, setForgotOpen] = useState(false)
  const [forgotStep, setForgotStep] = useState<ForgotStep>('menu')
  const [recoveryEmail, setRecoveryEmail] = useState('')
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null)
  const [changePwdOpen, setChangePwdOpen] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [activeMenu, setActiveMenu] = useState<MenuKey>('dashboard')
  const [expandedMenus, setExpandedMenus] = useState<Record<MenuKey, boolean>>({
    dashboard: false,
    sales: false,
    marketing: false,
    logs: false,
    admin: false,
  })

  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [createNewOpen, setCreateNewOpen] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)
  const [contactForm, setContactForm] = useState<ContactForm>(INITIAL_CONTACT_FORM)
  const [contactTouched, setContactTouched] = useState<Record<string, boolean>>({})
  const [contactSubmitTried, setContactSubmitTried] = useState(false)
  const [contactSavedMessage, setContactSavedMessage] = useState<string | null>(null)
  const [contactSubmitting, setContactSubmitting] = useState(false)
  const [productOptions, setProductOptions] = useState<string[]>([])
  const [employmentOptions, setEmploymentOptions] = useState<string[]>([])
  const [labelOptions, setLabelOptions] = useState<string[]>([])
  const [ownerOptions, setOwnerOptions] = useState<string[]>([])
  const [activeUserOptions, setActiveUserOptions] = useState<string[]>([])

  const [widgetDropdownOpen, setWidgetDropdownOpen] = useState(false)
  const [selectedWidgets, setSelectedWidgets] = useState<string[]>(WIDGET_CHOICES.slice(0, 4))
  const [draftWidgets, setDraftWidgets] = useState<string[]>(selectedWidgets)
  const [preferencesStatus, setPreferencesStatus] = useState<string | null>(null)

  const loadProfile = useCallback(async (t: string) => {
    const m = await me(t)
    setProfile(m)
    if (m.mustChangePassword) {
      setChangePwdOpen(true)
    }
  }, [])

  useEffect(() => {
    if (!token) {
      setProfile(null)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        await loadProfile(token)
      } catch {
        if (!cancelled) {
          setToken(null)
          setTokenState(null)
          setProfile(null)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, loadProfile])

  useEffect(() => {
    if (!token) {
      setProductOptions([])
      setEmploymentOptions([])
      setLabelOptions([])
      setOwnerOptions([])
      setActiveUserOptions([])
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const [products, employment, labels, owners, activeUsers] = await Promise.all([
          getCodeReference(token, 'PRODUCT_CONTACT'),
          getCodeReference(token, 'EMPLOYMENT_STATUS_CONTACT'),
          getCodeReference(token, 'LABEL_CONTACT'),
          getAdminOwners(token),
          getActiveUsers(token),
        ])
        if (cancelled) {
          return
        }
        setProductOptions(products.map((x) => x.code))
        setEmploymentOptions(employment.map((x) => x.code))
        setLabelOptions(labels.map((x) => x.code))
        setOwnerOptions(owners.map((x) => x.fullName))
        setActiveUserOptions(activeUsers.map((x) => x.fullName))
      } catch {
        if (!cancelled) {
          setPreferencesStatus('Some dropdowns could not be loaded.')
          setTimeout(() => setPreferencesStatus(null), 2400)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  const preferencesKey = useMemo(() => {
    if (!profile?.username) {
      return null
    }
    return `crm_dashboard_widgets_${profile.username.toLowerCase()}`
  }, [profile?.username])

  useEffect(() => {
    if (!preferencesKey) {
      return
    }
    const saved = localStorage.getItem(preferencesKey)
    if (!saved) {
      return
    }
    try {
      const parsed = JSON.parse(saved) as string[]
      const valid = parsed.filter((item) => WIDGET_CHOICES.includes(item))
      if (valid.length > 0) {
        setSelectedWidgets(valid)
      }
    } catch {
      /* ignore malformed local storage */
    }
  }, [preferencesKey])

  useEffect(() => {
    setDraftWidgets(selectedWidgets)
  }, [selectedWidgets])

  function contactValidation(values: ContactForm): Record<string, string> {
    const errors: Record<string, string> = {}
    const nameRegex = /^[A-Za-z ]+$/
    const digitsRegex = /^\d+$/
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!values.agentName.trim()) {
      errors.agentName = 'Agent Name is required.'
    } else if (!nameRegex.test(values.agentName.trim())) {
      errors.agentName = 'Agent Name can contain only letters and spaces.'
    }

    if (!values.name.trim()) {
      errors.name = 'Name is required.'
    } else if (!nameRegex.test(values.name.trim())) {
      errors.name = 'Name can contain only letters and spaces.'
    }

    if (!values.countryCode.trim()) {
      errors.countryCode = 'Country code is required.'
    } else if (!digitsRegex.test(values.countryCode.trim())) {
      errors.countryCode = 'Country code must contain digits only.'
    }

    if (!values.phoneNumber.trim()) {
      errors.phoneNumber = 'Phone number is required.'
    } else if (!digitsRegex.test(values.phoneNumber.trim())) {
      errors.phoneNumber = 'Phone number must contain digits only.'
    }

    if (!values.email.trim()) {
      errors.email = 'Email is required.'
    } else if (!emailRegex.test(values.email.trim())) {
      errors.email = 'Please enter a valid email address.'
    }

    if (!values.purposeOfLoan.trim()) {
      errors.purposeOfLoan = 'Purpose of loan is required.'
    }

    if (!values.employmentStatus) {
      errors.employmentStatus = 'Employment Status is required.'
    }

    if (!values.mortgage) {
      errors.mortgage = 'Please select Mortgage Yes or No.'
    }

    if (!values.otherExistingLoans) {
      errors.otherExistingLoans = 'Please select Other existing loans Yes or No.'
    }

    if (!values.creditCard) {
      errors.creditCard = 'Please select Credit Card Yes or No.'
    }

    return errors
  }

  const contactErrors = useMemo(() => contactValidation(contactForm), [contactForm])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const res = await login(username.trim(), password)
      setToken(res.accessToken)
      setTokenState(res.accessToken)
      setPassword('')
      if (res.requiresPasswordChange) {
        setChangePwdOpen(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.')
    } finally {
      setBusy(false)
    }
  }

  async function handleLogout() {
    const t = token
    if (t) {
      try {
        await logout(t)
      } catch {
        /* ignore */
      }
    }
    setToken(null)
    setTokenState(null)
    setProfile(null)
    setChangePwdOpen(false)
    setProfileMenuOpen(false)
  }

  function handleMainMenuClick(key: MenuKey) {
    setActiveMenu(key)
  }

  function toggleMainMenuExpand(key: MenuKey) {
    setExpandedMenus((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  function expandOrCollapseAllMenus() {
    const anyExpanded = Object.values(expandedMenus).some(Boolean)
    const next = !anyExpanded
    setExpandedMenus({
      dashboard: false,
      sales: next,
      marketing: next,
      logs: false,
      admin: next,
    })
  }

  function handleCreateNewOption(option: CreateNewOption) {
    setCreateNewOpen(false)
    if (option === 'contact') {
      setContactOpen(true)
      setContactSavedMessage(null)
      setContactForm((prev) => ({
        ...prev,
        product: prev.product || productOptions[0] || '',
        employmentStatus: prev.employmentStatus || employmentOptions[0] || '',
        label: prev.label || labelOptions[0] || '',
        owner: prev.owner || ownerOptions[0] || '',
        subOwner: prev.subOwner || activeUserOptions[0] || '',
        account: prev.account || activeUserOptions[0] || '',
      }))
      return
    }
    setPreferencesStatus('Deal creation will be added soon.')
    setTimeout(() => setPreferencesStatus(null), 2400)
  }

  function handleContactChange<K extends keyof ContactForm>(key: K, value: ContactForm[K]) {
    setContactForm((prev) => ({ ...prev, [key]: value }))
  }

  function touchField(key: keyof ContactForm) {
    setContactTouched((prev) => ({ ...prev, [key]: true }))
  }

  function closeContactPopup() {
    setContactOpen(false)
    setContactTouched({})
    setContactSubmitTried(false)
  }

  async function submitContact(e: React.FormEvent) {
    e.preventDefault()
    setContactSubmitTried(true)
    if (Object.keys(contactErrors).length > 0) {
      return
    }
    if (!token) {
      setError('Your session has expired. Please sign in again.')
      return
    }
    setContactSubmitting(true)
    try {
      const response = await createContact(token, {
        agentName: contactForm.agentName.trim(),
        name: contactForm.name.trim(),
        countryCode: contactForm.countryCode.trim(),
        phoneNumber: contactForm.phoneNumber.trim(),
        email: contactForm.email.trim(),
        product: contactForm.product,
        purposeOfLoan: contactForm.purposeOfLoan.trim(),
        address: contactForm.address.trim(),
        income: contactForm.income.trim(),
        employmentStatus: contactForm.employmentStatus,
        mortgage: contactForm.mortgage as YesNo,
        otherExistingLoans: contactForm.otherExistingLoans as YesNo,
        creditCard: contactForm.creditCard as YesNo,
        type: contactForm.type,
        segment: contactForm.segment,
        status: contactForm.status,
        label: contactForm.label,
        owner: contactForm.owner,
        subOwner: contactForm.subOwner,
        account: contactForm.account,
      })
      setContactOpen(false)
      setContactTouched({})
      setContactSubmitTried(false)
      setContactForm(INITIAL_CONTACT_FORM)
      setContactSavedMessage(`${response.message} (ID: ${response.contactId})`)
      setTimeout(() => setContactSavedMessage(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save contact.')
    } finally {
      setContactSubmitting(false)
    }
  }

  function showContactError(field: keyof ContactForm): string | null {
    if (!contactErrors[field]) {
      return null
    }
    if (contactSubmitTried || contactTouched[field]) {
      return contactErrors[field]
    }
    return null
  }

  function handleWidgetToggle(widgetName: string) {
    setDraftWidgets((prev) =>
      prev.includes(widgetName)
        ? prev.filter((item) => item !== widgetName)
        : [...prev, widgetName],
    )
  }

  function handleWidgetSubmit() {
    setSelectedWidgets(draftWidgets.length > 0 ? draftWidgets : [])
    setWidgetDropdownOpen(false)
  }

  function handleWidgetCancel() {
    setDraftWidgets(selectedWidgets)
    setWidgetDropdownOpen(false)
  }

  function handleSavePreferences() {
    if (!preferencesKey) {
      return
    }
    localStorage.setItem(preferencesKey, JSON.stringify(selectedWidgets))
    setPreferencesStatus('Preferences saved for this user.')
    setTimeout(() => setPreferencesStatus(null), 2400)
  }

  function openForgot() {
    setForgotOpen(true)
    setForgotStep('menu')
    setRecoveryEmail('')
    setRecoveryMessage(null)
    setError(null)
  }

  async function submitForgotPassword(e: React.FormEvent) {
    e.preventDefault()
    setRecoveryMessage(null)
    setBusy(true)
    try {
      const r = await forgotPassword(recoveryEmail.trim())
      setRecoveryMessage(r.message)
    } catch (err) {
      setRecoveryMessage(err instanceof Error ? err.message : 'Request failed.')
    } finally {
      setBusy(false)
    }
  }

  async function submitForgotUserId(e: React.FormEvent) {
    e.preventDefault()
    setRecoveryMessage(null)
    setBusy(true)
    try {
      const r = await forgotUserId(recoveryEmail.trim())
      setRecoveryMessage(r.message)
    } catch (err) {
      setRecoveryMessage(err instanceof Error ? err.message : 'Request failed.')
    } finally {
      setBusy(false)
    }
  }

  async function submitNewPassword(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!token) {
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setBusy(true)
    try {
      const res = await changePasswordAfterReset(token, newPassword)
      setToken(res.accessToken)
      setTokenState(res.accessToken)
      setNewPassword('')
      setConfirmPassword('')
      setChangePwdOpen(false)
      await loadProfile(res.accessToken)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update password.')
    } finally {
      setBusy(false)
    }
  }

  const sessionLoading = Boolean(token && !profile)
  const showDashboard = Boolean(token && profile)

  return (
    <div className="app-root">
      {sessionLoading && (
        <div className="card login-card">
          <p className="muted">Loading session…</p>
        </div>
      )}
      {!token && (
        <div className="card login-card">
          <h1>CRM Sign in</h1>
          <p className="muted">Use your user ID and password.</p>
          <form onSubmit={handleLogin} className="stack">
            <label className="field">
              <span>User ID</span>
              <input autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
            </label>
            <label className="field">
              <span>Password</span>
              <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </label>
            {error && <p className="error">{error}</p>}
            <button type="submit" className="primary" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          <button type="button" className="link" onClick={openForgot}>Forgot password or user ID</button>
        </div>
      )}

      {showDashboard && !sessionLoading && (
        <div className="crm-shell">
          <aside className="left-nav">
            <div className="left-nav-top">
              <div className="left-nav-title">CRM Menu</div>
              <button type="button" className="nav-expand-btn" onClick={expandOrCollapseAllMenus}>Expand options</button>
            </div>
            {MENU_ITEMS.map((item) => (
              <div key={item.key} className="menu-block">
                <div className="menu-main-row">
                  <button type="button" className={`menu-main ${activeMenu === item.key ? 'active' : ''}`} onClick={() => handleMainMenuClick(item.key)}>
                    <span className="menu-icon">{item.icon}</span><span>{item.label}</span>
                  </button>
                  {item.submenus.length > 0 && (
                    <button type="button" className="submenu-toggle" onClick={() => toggleMainMenuExpand(item.key)}>
                      {expandedMenus[item.key] ? '▾' : '▸'}
                    </button>
                  )}
                </div>
                {item.submenus.length > 0 && expandedMenus[item.key] && (
                  <div className="menu-sub-wrap">
                    {item.submenus.map((subItem) => (
                      <button key={subItem} type="button" className="menu-sub">{subItem}</button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </aside>

          <section className="main-panel">
            <header className="top-bar">
              <div>
                <h1>Dashboard</h1>
                <p className="muted">Signed in as <strong>{profile?.firstName} {profile?.lastName}</strong> ({profile?.username})</p>
              </div>
              <div className="top-actions">
                <div className="create-new-wrap">
                  <button type="button" className="secondary create-new-btn" onClick={() => setCreateNewOpen((prev) => !prev)}>➕ Create New</button>
                  {createNewOpen && (
                    <div className="create-new-menu">
                      <button type="button" onClick={() => handleCreateNewOption('contact')}>Contact</button>
                      <button type="button" onClick={() => handleCreateNewOption('deal')}>Deal</button>
                    </div>
                  )}
                </div>
                <div className="profile-wrap">
                  <button type="button" className="profile-icon" onClick={() => setProfileMenuOpen((prev) => !prev)} aria-label="Open profile menu">
                    {profile?.firstName?.charAt(0).toUpperCase()}
                  </button>
                  {profileMenuOpen && (
                    <div className="profile-menu">
                      <a href="#" onClick={(e) => e.preventDefault()}>Profile</a>
                      <a href="#" onClick={(e) => e.preventDefault()}>Settings</a>
                      <a href="#" onClick={(e) => e.preventDefault()}>Change Password</a>
                      <button type="button" onClick={handleLogout}>Log out</button>
                    </div>
                  )}
                </div>
              </div>
            </header>

            <div className="dashboard-actions">
              <div className="widget-dropdown-wrap">
                <button type="button" className="secondary" onClick={() => setWidgetDropdownOpen((prev) => !prev)}>Select widgets</button>
                {widgetDropdownOpen && (
                  <div className="widget-dropdown">
                    <p className="muted small">Choose widgets for your landing dashboard.</p>
                    {WIDGET_CHOICES.map((widgetName) => (
                      <label key={widgetName} className="widget-check">
                        <input type="checkbox" checked={draftWidgets.includes(widgetName)} onChange={() => handleWidgetToggle(widgetName)} />
                        <span>{widgetName}</span>
                      </label>
                    ))}
                    <div className="row">
                      <button type="button" className="link" onClick={handleWidgetCancel}>Cancel</button>
                      <button type="button" className="primary" onClick={handleWidgetSubmit}>Submit</button>
                    </div>
                  </div>
                )}
              </div>
              <button type="button" className="secondary" onClick={handleSavePreferences}>Save Preferences</button>
            </div>
            {preferencesStatus && <p className="info">{preferencesStatus}</p>}
            {contactSavedMessage && <p className="info success-msg">{contactSavedMessage}</p>}
            <div className="widgets-grid">
              {selectedWidgets.length === 0 && (
                <div className="widget-card">
                  <h3>No widgets selected</h3>
                  <p>Open Select widgets and choose items for the dashboard.</p>
                </div>
              )}
              {selectedWidgets.map((widgetName) => (
                <article key={widgetName} className="widget-card"><h3>{widgetName}</h3><p>Analytics report placeholder for {widgetName}.</p></article>
              ))}
            </div>
          </section>
        </div>
      )}

      {contactOpen && (
        <div className="modal-backdrop" role="presentation" onClick={closeContactPopup}>
          <div className="modal contact-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h2>Create Contact</h2>
            <form className="contact-form" onSubmit={submitContact}>
              <label className="field"><span>Agent Name *</span><input value={contactForm.agentName} onChange={(e) => handleContactChange('agentName', e.target.value)} onBlur={() => touchField('agentName')} />{showContactError('agentName') && <p className="error">{showContactError('agentName')}</p>}</label>
              <label className="field"><span>Name *</span><input value={contactForm.name} onChange={(e) => handleContactChange('name', e.target.value)} onBlur={() => touchField('name')} />{showContactError('name') && <p className="error">{showContactError('name')}</p>}</label>
              <div className="field-group">
                <label className="field"><span>Country Code *</span><input value={contactForm.countryCode} onChange={(e) => handleContactChange('countryCode', e.target.value)} onBlur={() => touchField('countryCode')} inputMode="numeric" />{showContactError('countryCode') && <p className="error">{showContactError('countryCode')}</p>}</label>
                <label className="field"><span>Phone Number *</span><input value={contactForm.phoneNumber} onChange={(e) => handleContactChange('phoneNumber', e.target.value)} onBlur={() => touchField('phoneNumber')} inputMode="numeric" />{showContactError('phoneNumber') && <p className="error">{showContactError('phoneNumber')}</p>}</label>
              </div>
              <label className="field"><span>Email *</span><input type="email" value={contactForm.email} onChange={(e) => handleContactChange('email', e.target.value)} onBlur={() => touchField('email')} />{showContactError('email') && <p className="error">{showContactError('email')}</p>}</label>
              <label className="field"><span>Product</span><select value={contactForm.product} onChange={(e) => handleContactChange('product', e.target.value)}><option value="">Select</option>{productOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}</select></label>
              <label className="field"><span>Purpose of loan *</span><input value={contactForm.purposeOfLoan} onChange={(e) => handleContactChange('purposeOfLoan', e.target.value)} onBlur={() => touchField('purposeOfLoan')} />{showContactError('purposeOfLoan') && <p className="error">{showContactError('purposeOfLoan')}</p>}</label>
              <label className="field"><span>Address</span><input value={contactForm.address} onChange={(e) => handleContactChange('address', e.target.value)} /></label>
              <label className="field"><span>Income of Customer</span><input value={contactForm.income} onChange={(e) => handleContactChange('income', e.target.value)} inputMode="decimal" /></label>
              <label className="field"><span>Employment Status *</span><select value={contactForm.employmentStatus} onChange={(e) => handleContactChange('employmentStatus', e.target.value)} onBlur={() => touchField('employmentStatus')}><option value="">Select</option>{employmentOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}</select>{showContactError('employmentStatus') && <p className="error">{showContactError('employmentStatus')}</p>}</label>
              <div className="field"><span>Mortgage *</span><div className="radio-row">{(['Yes', 'No'] as const).map((opt) => (<label key={opt}><input type="radio" name="mortgage" checked={contactForm.mortgage === opt} onChange={() => handleContactChange('mortgage', opt)} onBlur={() => touchField('mortgage')} />{opt}</label>))}</div>{showContactError('mortgage') && <p className="error">{showContactError('mortgage')}</p>}</div>
              <div className="field"><span>Other existing loans *</span><div className="radio-row">{(['Yes', 'No'] as const).map((opt) => (<label key={opt}><input type="radio" name="otherExistingLoans" checked={contactForm.otherExistingLoans === opt} onChange={() => handleContactChange('otherExistingLoans', opt)} onBlur={() => touchField('otherExistingLoans')} />{opt}</label>))}</div>{showContactError('otherExistingLoans') && <p className="error">{showContactError('otherExistingLoans')}</p>}</div>
              <div className="field"><span>Credit Card *</span><div className="radio-row">{(['Yes', 'No'] as const).map((opt) => (<label key={opt}><input type="radio" name="creditCard" checked={contactForm.creditCard === opt} onChange={() => handleContactChange('creditCard', opt)} onBlur={() => touchField('creditCard')} />{opt}</label>))}</div>{showContactError('creditCard') && <p className="error">{showContactError('creditCard')}</p>}</div>
              <div className="field"><span>Type</span><div className="radio-row">{(['People', 'Organization'] as const).map((opt) => (<label key={opt}><input type="radio" name="type" checked={contactForm.type === opt} onChange={() => handleContactChange('type', opt)} />{opt}</label>))}</div></div>
              <div className="field"><span>Segment</span><div className="radio-row">{(['Master List', 'Online'] as const).map((opt) => (<label key={opt}><input type="radio" name="segment" checked={contactForm.segment === opt} onChange={() => handleContactChange('segment', opt)} />{opt}</label>))}</div></div>
              <div className="field"><span>Status</span><div className="radio-row">{(['Active', 'Inactive'] as const).map((opt) => (<label key={opt}><input type="radio" name="status" checked={contactForm.status === opt} onChange={() => handleContactChange('status', opt)} />{opt}</label>))}</div></div>
              <label className="field"><span>Label</span><select value={contactForm.label} onChange={(e) => handleContactChange('label', e.target.value)}><option value="">Select</option>{labelOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}</select></label>
              <label className="field"><span>Owner</span><select value={contactForm.owner} onChange={(e) => handleContactChange('owner', e.target.value)}><option value="">Select</option>{ownerOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}</select></label>
              <label className="field"><span>Sub owner</span><select value={contactForm.subOwner} onChange={(e) => handleContactChange('subOwner', e.target.value)}><option value="">Select</option>{activeUserOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}</select></label>
              <label className="field"><span>Account</span><select value={contactForm.account} onChange={(e) => handleContactChange('account', e.target.value)}><option value="">Select</option>{activeUserOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}</select></label>
              <div className="row"><button type="button" className="secondary" onClick={closeContactPopup} disabled={contactSubmitting}>Cancel</button><button type="submit" className="primary" disabled={contactSubmitting}>{contactSubmitting ? 'Saving...' : 'Submit'}</button></div>
            </form>
          </div>
        </div>
      )}

      {forgotOpen && (
        <div className="modal-backdrop" role="presentation" onClick={() => !busy && setForgotOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="forgot-title" onClick={(e) => e.stopPropagation()}>
            <h2 id="forgot-title">Account recovery</h2>
            {forgotStep === 'menu' && (
              <div className="stack">
                <p className="muted">Choose an option. We will email the address on file if a match exists.</p>
                <button type="button" className="secondary" onClick={() => setForgotStep('password')}>Forgot password</button>
                <button type="button" className="secondary" onClick={() => setForgotStep('userid')}>Forgot user ID</button>
                <button type="button" className="link" onClick={() => setForgotOpen(false)}>Close</button>
              </div>
            )}
            {forgotStep === 'password' && (
              <form className="stack" onSubmit={submitForgotPassword}>
                <p className="muted">Enter your email. You will receive a temporary password valid for 10 minutes.</p>
                <label className="field"><span>Email</span><input type="email" value={recoveryEmail} onChange={(e) => setRecoveryEmail(e.target.value)} required /></label>
                {recoveryMessage && <p className="info">{recoveryMessage}</p>}
                <div className="row"><button type="button" className="link" onClick={() => setForgotStep('menu')}>Back</button><button type="submit" className="primary" disabled={busy}>Send email</button></div>
              </form>
            )}
            {forgotStep === 'userid' && (
              <form className="stack" onSubmit={submitForgotUserId}>
                <p className="muted">Enter your email. We will send your user ID for signing in.</p>
                <label className="field"><span>Email</span><input type="email" value={recoveryEmail} onChange={(e) => setRecoveryEmail(e.target.value)} required /></label>
                {recoveryMessage && <p className="info">{recoveryMessage}</p>}
                <div className="row"><button type="button" className="link" onClick={() => setForgotStep('menu')}>Back</button><button type="submit" className="primary" disabled={busy}>Send email</button></div>
              </form>
            )}
          </div>
        </div>
      )}

      {changePwdOpen && token && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="pwd-title" onClick={(e) => e.stopPropagation()}>
            <h2 id="pwd-title">Set a new password</h2>
            <p className="muted policy">Your new password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character.</p>
            <form className="stack" onSubmit={submitNewPassword}>
              <label className="field"><span>New password</span><input type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required /></label>
              <label className="field"><span>Confirm password</span><input type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required /></label>
              {error && <p className="error">{error}</p>}
              <button type="submit" className="primary" disabled={busy}>{busy ? 'Saving…' : 'Save and continue'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
