import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import {
  changePasswordAfterReset,
  createMaintenanceUser,
  createContact,
  forgotPassword,
  forgotUserId,
  getMaintenanceUserById,
  getActiveUsers,
  getAdminOwners,
  getCodeReference,
  getToken,
  listUserMaintenanceGroups,
  listUserMaintenanceUsers,
  login,
  logout,
  me,
  setToken,
  type GroupOption,
  type MeResponse,
  type UserMaintenanceRow,
} from './api/client'
import Spinner from './components/Spinner'
import { submenuRegistry } from './screens/submenus/submenuRegistry'

type ForgotStep = 'menu' | 'password' | 'userid'
type MenuKey = 'dashboard' | 'sales' | 'marketing' | 'logs' | 'admin'
type CreateNewOption = 'contact' | 'deal'
type YesNo = 'Yes' | 'No'
type TextOperator = 'eq' | 'starts_with' | 'ends_with' | 'not_eq'

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

type UserSearchForm = {
  firstName: string
  firstNameOp: TextOperator
  lastName: string
  lastNameOp: TextOperator
  username: string
  usernameOp: TextOperator
  userGroup: string
  email: string
  emailOp: TextOperator
  phone: string
  phoneOp: TextOperator
}

type AddUserForm = {
  username: string
  firstName: string
  lastName: string
  userGroup: string
  password: string
  email: string
  phoneNumber: string
  addToGroup: string
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

const OPERATOR_OPTIONS: { label: string; value: TextOperator }[] = [
  { label: 'Equal to', value: 'eq' },
  { label: 'Starts with', value: 'starts_with' },
  { label: 'Ends with', value: 'ends_with' },
  { label: 'Not equals to', value: 'not_eq' },
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

const INITIAL_USER_SEARCH_FORM: UserSearchForm = {
  firstName: '',
  firstNameOp: 'eq',
  lastName: '',
  lastNameOp: 'eq',
  username: '',
  usernameOp: 'eq',
  userGroup: '',
  email: '',
  emailOp: 'eq',
  phone: '',
  phoneOp: 'eq',
}

const INITIAL_ADD_USER_FORM: AddUserForm = {
  username: '',
  firstName: '',
  lastName: '',
  userGroup: '',
  password: '',
  email: '',
  phoneNumber: '',
  addToGroup: '',
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
  const [activeSubmenuByMenu, setActiveSubmenuByMenu] = useState<Record<MenuKey, string | null>>({
    dashboard: null,
    sales: null,
    marketing: null,
    logs: null,
    admin: null,
  })
  const [userRows, setUserRows] = useState<UserMaintenanceRow[]>([])
  const [groupsOptions, setGroupsOptions] = useState<GroupOption[]>([])
  const [userMaintenanceLoading, setUserMaintenanceLoading] = useState(false)
  const [searchUsersOpen, setSearchUsersOpen] = useState(false)
  const [searchUsersForm, setSearchUsersForm] = useState<UserSearchForm>(INITIAL_USER_SEARCH_FORM)
  const [addUserOpen, setAddUserOpen] = useState(false)
  const [addUserForm, setAddUserForm] = useState<AddUserForm>(INITIAL_ADD_USER_FORM)
  const [addUserTouched, setAddUserTouched] = useState<Record<string, boolean>>({})
  const [addUserSubmitTried, setAddUserSubmitTried] = useState(false)
  const [displayMenuUserId, setDisplayMenuUserId] = useState<number | null>(null)
  const [displayUserOpen, setDisplayUserOpen] = useState(false)
  const [displayUserRow, setDisplayUserRow] = useState<UserMaintenanceRow | null>(null)
  const [currentUsersPage, setCurrentUsersPage] = useState(1)
  const [searchUsersSubmitting, setSearchUsersSubmitting] = useState(false)
  const [addUserSubmitting, setAddUserSubmitting] = useState(false)

  const [widgetDropdownOpen, setWidgetDropdownOpen] = useState(false)
  const [selectedWidgets, setSelectedWidgets] = useState<string[]>(WIDGET_CHOICES.slice(0, 4))
  const [draftWidgets, setDraftWidgets] = useState<string[]>(selectedWidgets)
  const [preferencesStatus, setPreferencesStatus] = useState<string | null>(null)
  const createNewRef = useRef<HTMLDivElement | null>(null)
  const profileRef = useRef<HTMLDivElement | null>(null)
  const widgetDropdownRef = useRef<HTMLDivElement | null>(null)

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

  const isAdminUser = useMemo(
    () => Boolean(profile?.groups?.some((groupName) => groupName.toLowerCase() === 'admin')),
    [profile?.groups],
  )

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

  function closeFloatingPopups() {
    setCreateNewOpen(false)
    setProfileMenuOpen(false)
    setWidgetDropdownOpen(false)
  }

  const loadUserMaintenanceData = useCallback(
    async (filters?: Partial<UserSearchForm>) => {
      if (!token || !isAdminUser) {
        return
      }
      setUserMaintenanceLoading(true)
      try {
        const [users, groups] = await Promise.all([
          listUserMaintenanceUsers(token, filters),
          listUserMaintenanceGroups(token),
        ])
        setUserRows(users)
        setGroupsOptions(groups)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load users.')
      } finally {
        setUserMaintenanceLoading(false)
      }
    },
    [token, isAdminUser],
  )

  useEffect(() => {
    if (activeMenu === 'admin' && activeSubmenuByMenu.admin === 'User Maintenance') {
      void loadUserMaintenanceData()
    }
  }, [activeMenu, activeSubmenuByMenu.admin, loadUserMaintenanceData])

  useEffect(() => {
    setCurrentUsersPage(1)
  }, [userRows])

  useEffect(() => {
    function handleDocumentMouseDown(event: MouseEvent) {
      const target = event.target as Node
      if (createNewRef.current && createNewRef.current.contains(target)) {
        return
      }
      if (profileRef.current && profileRef.current.contains(target)) {
        return
      }
      if (widgetDropdownRef.current && widgetDropdownRef.current.contains(target)) {
        return
      }
      closeFloatingPopups()
    }
    document.addEventListener('mousedown', handleDocumentMouseDown)
    return () => document.removeEventListener('mousedown', handleDocumentMouseDown)
  }, [])

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
      setActiveMenu('dashboard')
      setActiveSubmenuByMenu({ dashboard: null, sales: null, marketing: null, logs: null, admin: null })
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
    setActiveMenu('dashboard')
    setActiveSubmenuByMenu({ dashboard: null, sales: null, marketing: null, logs: null, admin: null })
  }

  function handleMainMenuClick(item: { key: MenuKey; submenus: string[] }) {
    setActiveMenu(item.key)
    if (item.key === 'dashboard') {
      setActiveSubmenuByMenu((prev) => ({ ...prev, dashboard: null }))
    }
    if (item.key === 'logs') {
      setActiveSubmenuByMenu((prev) => ({ ...prev, logs: 'Logs' }))
    }
    if (item.submenus.length > 0) {
      toggleMainMenuExpand(item.key)
    }
  }

  function handleSubmenuClick(menu: MenuKey, submenu: string) {
    setActiveMenu(menu)
    setActiveSubmenuByMenu((prev) => ({ ...prev, [menu]: submenu }))
    setDisplayMenuUserId(null)
  }

  function toggleMainMenuExpand(key: MenuKey) {
    setExpandedMenus((prev) => ({
      dashboard: false,
      sales: key === 'sales' ? !prev.sales : false,
      marketing: key === 'marketing' ? !prev.marketing : false,
      logs: false,
      admin: key === 'admin' ? !prev.admin : false,
    }))
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

  function addUserValidation(values: AddUserForm): Record<string, string> {
    const errors: Record<string, string> = {}
    const nameRegex = /^[A-Za-z ]+$/
    const digitsRegex = /^\d+$/
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!values.username.trim()) errors.username = 'Username is required.'
    if (!values.firstName.trim()) {
      errors.firstName = 'First Name is required.'
    } else if (!nameRegex.test(values.firstName.trim())) {
      errors.firstName = 'First Name can contain only letters and spaces.'
    }
    if (!values.lastName.trim()) {
      errors.lastName = 'Last Name is required.'
    } else if (!nameRegex.test(values.lastName.trim())) {
      errors.lastName = 'Last Name can contain only letters and spaces.'
    }
    if (!values.userGroup) errors.userGroup = 'User Group is required.'
    if (!values.password) errors.password = 'Password is required.'
    if (!values.email.trim()) {
      errors.email = 'Email is required.'
    } else if (!emailRegex.test(values.email.trim())) {
      errors.email = 'Please enter a valid email address.'
    }
    if (!values.phoneNumber.trim()) {
      errors.phoneNumber = 'Phone Number is required.'
    } else if (!digitsRegex.test(values.phoneNumber.trim())) {
      errors.phoneNumber = 'Phone Number must contain digits only.'
    }
    return errors
  }

  const addUserErrors = useMemo(() => addUserValidation(addUserForm), [addUserForm])

  function showAddUserError(field: keyof AddUserForm): string | null {
    if (!addUserErrors[field]) return null
    if (addUserSubmitTried || addUserTouched[field]) return addUserErrors[field]
    return null
  }

  function touchAddUserField(field: keyof AddUserForm) {
    setAddUserTouched((prev) => ({ ...prev, [field]: true }))
  }

  async function submitUserSearch(e: React.FormEvent) {
    e.preventDefault()
    setSearchUsersSubmitting(true)
    try {
      await loadUserMaintenanceData(searchUsersForm)
      setSearchUsersOpen(false)
    } finally {
      setSearchUsersSubmitting(false)
    }
  }

  async function submitAddUser(e: React.FormEvent) {
    e.preventDefault()
    setAddUserSubmitTried(true)
    if (Object.keys(addUserErrors).length > 0) return
    if (!token) {
      setError('Your session has expired. Please sign in again.')
      return
    }
    setAddUserSubmitting(true)
    try {
      const result = await createMaintenanceUser(token, addUserForm)
      setAddUserOpen(false)
      setAddUserForm(INITIAL_ADD_USER_FORM)
      setAddUserTouched({})
      setAddUserSubmitTried(false)
      setPreferencesStatus(`${result.message} (ID: ${result.userId})`)
      setTimeout(() => setPreferencesStatus(null), 3000)
      await loadUserMaintenanceData(searchUsersForm)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create user.')
    } finally {
      setAddUserSubmitting(false)
    }
  }

  async function openDisplayUser(userId: number) {
    if (!token) return
    try {
      const user = await getMaintenanceUserById(token, userId)
      setDisplayUserRow(user)
      setDisplayUserOpen(true)
      setDisplayMenuUserId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load user details.')
    }
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
  const usersPageSize = 10
  const pagedUserRows = useMemo(() => {
    const start = (currentUsersPage - 1) * usersPageSize
    return userRows.slice(start, start + usersPageSize)
  }, [userRows, currentUsersPage])
  const totalUsersPages = Math.max(1, Math.ceil(userRows.length / usersPageSize))
  const activeSubmenu = activeSubmenuByMenu[activeMenu]
  const submenuKey = activeSubmenu ? `${activeMenu}:${activeSubmenu}` : ''
  const SubmenuComponent = submenuRegistry[submenuKey]

  return (
    <div className="app-root">
      {sessionLoading && (
        <div className="card login-card">
          <p className="muted loading-inline"><Spinner /> Loading session…</p>
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
              {busy ? <><Spinner size="sm" /> Signing in…</> : 'Sign in'}
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
            {MENU_ITEMS.filter((item) => item.key !== 'admin' || isAdminUser).map((item) => (
              <div key={item.key} className="menu-block">
                <div className="menu-main-row">
                  <button type="button" className={`menu-main ${activeMenu === item.key ? 'active' : ''}`} onClick={() => handleMainMenuClick(item)}>
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
                      <button key={subItem} type="button" className="menu-sub" onClick={() => handleSubmenuClick(item.key, subItem)}>{subItem}</button>
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
                <div className="create-new-wrap" ref={createNewRef}>
                  <button
                    type="button"
                    className="secondary create-new-btn"
                    onClick={() => {
                      const shouldOpen = !createNewOpen
                      closeFloatingPopups()
                      setCreateNewOpen(shouldOpen)
                    }}
                  >
                    ➕ Create New
                  </button>
                  {createNewOpen && (
                    <div className="create-new-menu">
                      <button type="button" onClick={() => handleCreateNewOption('contact')}>Contact</button>
                      <button type="button" onClick={() => handleCreateNewOption('deal')}>Deal</button>
                    </div>
                  )}
                </div>
                <div className="profile-wrap" ref={profileRef}>
                  <button
                    type="button"
                    className="profile-icon"
                    onClick={() => {
                      const shouldOpen = !profileMenuOpen
                      closeFloatingPopups()
                      setProfileMenuOpen(shouldOpen)
                    }}
                    aria-label="Open profile menu"
                  >
                    {profile?.firstName?.charAt(0).toUpperCase()}
                  </button>
                  {profileMenuOpen && (
                    <div className="profile-menu">
                      <button type="button">Profile</button>
                      <button type="button">Settings</button>
                      <button type="button">Change Password</button>
                      <button type="button" className="logout-btn" onClick={handleLogout}>Logout</button>
                    </div>
                  )}
                </div>
              </div>
            </header>

            {activeMenu === 'admin' && activeSubmenuByMenu.admin === 'User Maintenance' && isAdminUser ? (
              <section className="user-maintenance">
                <div className="dashboard-actions">
                  <button type="button" className="secondary" onClick={() => setAddUserOpen(true)}>Add User</button>
                  <button type="button" className="secondary" onClick={() => setSearchUsersOpen(true)}>Search users</button>
                </div>
                {preferencesStatus && <p className="info">{preferencesStatus}</p>}
                <div className="table-wrap">
                  <table className="result-table">
                    <thead>
                      <tr>
                        <th>Username</th>
                        <th>First Name</th>
                        <th>Last Name</th>
                        <th>User Group</th>
                        <th>Email</th>
                        <th>Phone Number</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userMaintenanceLoading && (
                        <tr><td colSpan={6}><div className="loading-inline"><Spinner size="sm" /> Loading users...</div></td></tr>
                      )}
                      {!userMaintenanceLoading && userRows.length === 0 && (
                        <tr><td colSpan={6}>No users found.</td></tr>
                      )}
                      {!userMaintenanceLoading && pagedUserRows.map((user) => (
                        <tr key={user.userId}>
                          <td className="username-cell">
                            <button type="button" className="link inline-link" onClick={() => setDisplayMenuUserId(displayMenuUserId === user.userId ? null : user.userId)}>{user.username}</button>
                            {displayMenuUserId === user.userId && (
                              <div className="inline-popup-menu">
                                <button type="button" onClick={() => void openDisplayUser(user.userId)}>Display</button>
                              </div>
                            )}
                          </td>
                          <td>{user.firstName}</td>
                          <td>{user.lastName}</td>
                          <td>{user.userGroups.join(', ')}</td>
                          <td>{user.email}</td>
                          <td>{user.phoneNumber}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="pagination-row">
                  <button type="button" className="secondary" onClick={() => setCurrentUsersPage((p) => Math.max(1, p - 1))} disabled={currentUsersPage === 1}>Previous</button>
                  <span className="muted">Page {currentUsersPage} of {totalUsersPages}</span>
                  <button type="button" className="secondary" onClick={() => setCurrentUsersPage((p) => Math.min(totalUsersPages, p + 1))} disabled={currentUsersPage >= totalUsersPages}>Next</button>
                </div>
              </section>
            ) : (
              <>
                {activeMenu === 'dashboard' && !activeSubmenu ? (
                  <>
                    <div className="dashboard-actions">
                      <div className="widget-dropdown-wrap" ref={widgetDropdownRef}>
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => {
                            const shouldOpen = !widgetDropdownOpen
                            closeFloatingPopups()
                            setWidgetDropdownOpen(shouldOpen)
                          }}
                        >
                          Select widgets
                        </button>
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
                  </>
                ) : (
                  <div className="widgets-grid">
                    {SubmenuComponent ? <SubmenuComponent /> : <div className="widget-card"><h3>Section</h3><p>This section will be available soon.</p></div>}
                  </div>
                )}
              </>
            )}
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

      {searchUsersOpen && (
        <div className="modal-backdrop" role="presentation" onClick={() => setSearchUsersOpen(false)}>
          <div className="modal user-maintenance-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h2>Search users</h2>
            <form className="stack" onSubmit={submitUserSearch}>
              <div className="filter-row"><span>First Name</span><select value={searchUsersForm.firstNameOp} onChange={(e) => setSearchUsersForm((p) => ({ ...p, firstNameOp: e.target.value as TextOperator }))}>{OPERATOR_OPTIONS.map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}</select><input value={searchUsersForm.firstName} onChange={(e) => setSearchUsersForm((p) => ({ ...p, firstName: e.target.value }))} /></div>
              <div className="filter-row"><span>Last Name</span><select value={searchUsersForm.lastNameOp} onChange={(e) => setSearchUsersForm((p) => ({ ...p, lastNameOp: e.target.value as TextOperator }))}>{OPERATOR_OPTIONS.map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}</select><input value={searchUsersForm.lastName} onChange={(e) => setSearchUsersForm((p) => ({ ...p, lastName: e.target.value }))} /></div>
              <div className="filter-row"><span>User Name</span><select value={searchUsersForm.usernameOp} onChange={(e) => setSearchUsersForm((p) => ({ ...p, usernameOp: e.target.value as TextOperator }))}>{OPERATOR_OPTIONS.map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}</select><input value={searchUsersForm.username} onChange={(e) => setSearchUsersForm((p) => ({ ...p, username: e.target.value }))} /></div>
              <div className="filter-row"><span>User Group</span><select value={searchUsersForm.userGroup} onChange={(e) => setSearchUsersForm((p) => ({ ...p, userGroup: e.target.value }))}><option value="">All</option>{groupsOptions.map((g) => <option key={g.groupId} value={g.groupName}>{g.groupName}</option>)}</select><input value="" disabled placeholder="Select from dropdown" /></div>
              <div className="filter-row"><span>Email</span><select value={searchUsersForm.emailOp} onChange={(e) => setSearchUsersForm((p) => ({ ...p, emailOp: e.target.value as TextOperator }))}>{OPERATOR_OPTIONS.map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}</select><input value={searchUsersForm.email} onChange={(e) => setSearchUsersForm((p) => ({ ...p, email: e.target.value }))} /></div>
              <div className="filter-row"><span>Phone</span><select value={searchUsersForm.phoneOp} onChange={(e) => setSearchUsersForm((p) => ({ ...p, phoneOp: e.target.value as TextOperator }))}>{OPERATOR_OPTIONS.map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}</select><input value={searchUsersForm.phone} onChange={(e) => setSearchUsersForm((p) => ({ ...p, phone: e.target.value }))} /></div>
              <div className="row">
                <button type="button" className="secondary" onClick={() => { setSearchUsersForm(INITIAL_USER_SEARCH_FORM); void loadUserMaintenanceData(); setSearchUsersOpen(false) }}>Reset</button>
                <button type="submit" className="primary" disabled={searchUsersSubmitting}>{searchUsersSubmitting ? <><Spinner size="sm" /> Searching...</> : 'Search'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {addUserOpen && (
        <div className="modal-backdrop" role="presentation" onClick={() => setAddUserOpen(false)}>
          <div className="modal user-maintenance-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h2>Add User</h2>
            <form className="stack" onSubmit={submitAddUser}>
              <label className="field"><span>Username *</span><input value={addUserForm.username} onChange={(e) => setAddUserForm((p) => ({ ...p, username: e.target.value }))} onBlur={() => touchAddUserField('username')} />{showAddUserError('username') && <p className="error">{showAddUserError('username')}</p>}</label>
              <label className="field"><span>First Name *</span><input value={addUserForm.firstName} onChange={(e) => setAddUserForm((p) => ({ ...p, firstName: e.target.value }))} onBlur={() => touchAddUserField('firstName')} />{showAddUserError('firstName') && <p className="error">{showAddUserError('firstName')}</p>}</label>
              <label className="field"><span>Last Name *</span><input value={addUserForm.lastName} onChange={(e) => setAddUserForm((p) => ({ ...p, lastName: e.target.value }))} onBlur={() => touchAddUserField('lastName')} />{showAddUserError('lastName') && <p className="error">{showAddUserError('lastName')}</p>}</label>
              <label className="field"><span>User Group *</span><select value={addUserForm.userGroup} onChange={(e) => setAddUserForm((p) => ({ ...p, userGroup: e.target.value }))} onBlur={() => touchAddUserField('userGroup')}><option value="">Select</option>{groupsOptions.map((g) => <option key={g.groupId} value={g.groupName}>{g.groupName}</option>)}</select>{showAddUserError('userGroup') && <p className="error">{showAddUserError('userGroup')}</p>}</label>
              <label className="field"><span>Password *</span><input type="password" value={addUserForm.password} onChange={(e) => setAddUserForm((p) => ({ ...p, password: e.target.value }))} onBlur={() => touchAddUserField('password')} />{showAddUserError('password') && <p className="error">{showAddUserError('password')}</p>}</label>
              <label className="field"><span>Email *</span><input type="email" value={addUserForm.email} onChange={(e) => setAddUserForm((p) => ({ ...p, email: e.target.value }))} onBlur={() => touchAddUserField('email')} />{showAddUserError('email') && <p className="error">{showAddUserError('email')}</p>}</label>
              <label className="field"><span>Phone Number *</span><input value={addUserForm.phoneNumber} inputMode="numeric" onChange={(e) => setAddUserForm((p) => ({ ...p, phoneNumber: e.target.value }))} onBlur={() => touchAddUserField('phoneNumber')} />{showAddUserError('phoneNumber') && <p className="error">{showAddUserError('phoneNumber')}</p>}</label>
              <label className="field"><span>Add to group</span><select value={addUserForm.addToGroup} onChange={(e) => setAddUserForm((p) => ({ ...p, addToGroup: e.target.value }))}><option value="">Select</option>{groupsOptions.map((g) => <option key={g.groupId} value={g.groupName}>{g.groupName}</option>)}</select></label>
              <div className="row">
                <button type="button" className="secondary" onClick={() => setAddUserOpen(false)}>Cancel</button>
                <button type="submit" className="primary" disabled={addUserSubmitting}>{addUserSubmitting ? <><Spinner size="sm" /> Submitting...</> : 'Submit'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {displayUserOpen && displayUserRow && (
        <div className="modal-backdrop" role="presentation" onClick={() => setDisplayUserOpen(false)}>
          <div className="modal user-maintenance-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h2>User display</h2>
            <div className="stack">
              <label className="field"><span>Username</span><input value={displayUserRow.username} disabled /></label>
              <label className="field"><span>First Name</span><input value={displayUserRow.firstName} disabled /></label>
              <label className="field"><span>Last Name</span><input value={displayUserRow.lastName} disabled /></label>
              <label className="field"><span>User Group</span><input value={displayUserRow.userGroups.join(', ')} disabled /></label>
              <label className="field"><span>Email</span><input value={displayUserRow.email} disabled /></label>
              <label className="field"><span>Phone Number</span><input value={displayUserRow.phoneNumber} disabled /></label>
              <div className="row">
                <button type="button" className="secondary" onClick={() => setDisplayUserOpen(false)}>Cancel</button>
              </div>
            </div>
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
        <div className="modal-backdrop" role="presentation" onClick={() => !busy && setChangePwdOpen(false)}>
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
