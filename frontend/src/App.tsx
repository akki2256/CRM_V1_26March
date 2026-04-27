import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import {
  changePasswordAfterReset,
  createAlignment,
  createMaintenanceUser,
  createContact,
  createDeal,
  DEAL_CURRENCY_OPTIONS,
  forgotPassword,
  forgotUserId,
  getDealFormOptions,
  getMaintenanceUserById,
  getActiveUsers,
  getAdminOwners,
  getCodeReference,
  getToken,
  patchUserAlignment,
  listAlignmentOptions,
  listUserMaintenanceGroups,
  listUserMaintenanceUsers,
  login,
  logout,
  me,
  setToken,
  type AlignmentOption,
  type DealFormOptionsResponse,
  type GroupOption,
  type MeResponse,
  type UserMaintenanceRow,
} from './api/client'
import ContactByLabelWidget from './components/ContactByLabelWidget'
import DealOutcomeTrendWidget from './components/DealOutcomeTrendWidget'
import Spinner from './components/Spinner'
import { submenuRegistry } from './screens/submenus/submenuRegistry'

type ForgotStep = 'menu' | 'password' | 'userid'
type MenuKey = 'dashboard' | 'sales' | 'marketing' | 'logs' | 'admin'
type CreateNewOption = 'contact' | 'deal'
type YesNo = 'Yes' | 'No'
type ThemeName = 'navy' | 'slate-blue' | 'midnight-purple' | 'forest-night' | 'frost-light' | 'sand-light'

const THEME_OPTIONS: { value: ThemeName; label: string }[] = [
  { value: 'navy', label: '🔵 Deep Navy' },
  { value: 'slate-blue', label: '⚪ Bluish Grey' },
  { value: 'midnight-purple', label: '🟣 Midnight Purple' },
  { value: 'forest-night', label: '🟢 Forest Night' },
  { value: 'frost-light', label: '🔷 Frost Light' },
  { value: 'sand-light', label: '🟠 Sand Light' },
]

type ContactForm = {
  agentEmail: string
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
    submenus: [
      'Accounts',
      'Contacts',
      'Segments/Lists',
      'Deals',
      'Sales',
      'Activities',
    ],
  },
  { key: 'marketing', label: 'Marketing', icon: '📣', submenus: ['Forms'] },
  { key: 'logs', label: 'Logs', icon: '🗂️', submenus: [] },
  { key: 'admin', label: 'Admin', icon: '🛠️', submenus: ['User Maintenance'] },
]

const WIDGET_CHOICES = [
  'Contact by Label',
  'Deals Won/Lost Trend',
  'Revenue Summary',
  'Sales Funnel',
  'Pipeline by Stage',
  'Top Accounts',
  'Activities Due',
  'Quote Conversion',
]

type UserColumnId = 'username' | 'firstName' | 'lastName' | 'userGroups' | 'alignments' | 'email' | 'phoneNumber'

const USER_COLUMN_META: { id: UserColumnId; label: string }[] = [
  { id: 'username', label: 'Username' },
  { id: 'firstName', label: 'First Name' },
  { id: 'lastName', label: 'Last Name' },
  { id: 'userGroups', label: 'User Group' },
  { id: 'alignments', label: 'Alignment' },
  { id: 'email', label: 'Email' },
  { id: 'phoneNumber', label: 'Phone Number' },
]

const CONTACT_FORM_PRODUCT_OPTIONS = ['Business Loan', 'Car Loan', 'Personal Loan', 'Equity Loan'] as const

const CONTACT_FORM_PURPOSE_OPTIONS = [
  'Consolidation',
  'Home Improvement',
  'Medical',
  'Business Cash Flow',
] as const

const CONTACT_FORM_EMPLOYMENT_OPTIONS = ['Self Employed', 'Full time', 'Part time', 'Casual'] as const

/** Dial codes stored in CONTACT.country_code (digits). Default Australia +61. */
const COUNTRY_PHONE_OPTIONS: { flag: string; name: string; dial: string; value: string }[] = [
  { flag: '🇦🇺', name: 'Australia', dial: '+61', value: '61' },
  { flag: '🇳🇿', name: 'New Zealand', dial: '+64', value: '64' },
  { flag: '🇺🇸', name: 'United States / Canada', dial: '+1', value: '1' },
  { flag: '🇬🇧', name: 'United Kingdom', dial: '+44', value: '44' },
  { flag: '🇮🇳', name: 'India', dial: '+91', value: '91' },
  { flag: '🇸🇬', name: 'Singapore', dial: '+65', value: '65' },
  { flag: '🇭🇰', name: 'Hong Kong', dial: '+852', value: '852' },
  { flag: '🇯🇵', name: 'Japan', dial: '+81', value: '81' },
  { flag: '🇨🇳', name: 'China', dial: '+86', value: '86' },
  { flag: '🇩🇪', name: 'Germany', dial: '+49', value: '49' },
  { flag: '🇫🇷', name: 'France', dial: '+33', value: '33' },
]

const INITIAL_CONTACT_FORM: ContactForm = {
  agentEmail: '',
  name: '',
  countryCode: '61',
  phoneNumber: '',
  email: '',
  product: CONTACT_FORM_PRODUCT_OPTIONS[0],
  purposeOfLoan: '',
  address: '',
  income: '',
  employmentStatus: CONTACT_FORM_EMPLOYMENT_OPTIONS[0],
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

type DealForm = {
  contactId: string
  userId: string
  closingDate: string
  dealDate: string
  stageId: string
  amount: string
  pipeline: string
  currency: string
}

function emptyDealForm(profile: MeResponse | null): DealForm {
  const today = new Date().toISOString().slice(0, 10)
  return {
    contactId: '',
    userId: profile ? String(profile.userId) : '',
    closingDate: '',
    dealDate: today,
    stageId: '',
    amount: '',
    pipeline: 'Default Pipeline',
    currency: 'AUD',
  }
}

function App() {
  const [theme, setTheme] = useState<ThemeName>(() => {
    const saved = localStorage.getItem('crm_theme')
    if (THEME_OPTIONS.some((opt) => opt.value === saved)) {
      return saved as ThemeName
    }
    return 'navy'
  })
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
  const contactOpenedFromDealRef = useRef(false)
  const [dealOpen, setDealOpen] = useState(false)
  const [dealForm, setDealForm] = useState<DealForm>(() => emptyDealForm(null))
  const [dealOptions, setDealOptions] = useState<DealFormOptionsResponse | null>(null)
  const [dealOptionsLoading, setDealOptionsLoading] = useState(false)
  const [dealTouched, setDealTouched] = useState<Record<string, boolean>>({})
  const [dealSubmitTried, setDealSubmitTried] = useState(false)
  const [dealSubmitting, setDealSubmitting] = useState(false)
  const [dealSavedMessage, setDealSavedMessage] = useState<string | null>(null)
  const dealContactPickerRef = useRef<HTMLDivElement>(null)
  const [dealContactPickerOpen, setDealContactPickerOpen] = useState(false)
  const [dealContactSearch, setDealContactSearch] = useState('')
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
  const [salesAccountHighlight, setSalesAccountHighlight] = useState<string | null>(null)
  const [userRows, setUserRows] = useState<UserMaintenanceRow[]>([])
  const [groupsOptions, setGroupsOptions] = useState<GroupOption[]>([])
  const [alignmentOptions, setAlignmentOptions] = useState<AlignmentOption[]>([])
  const [userMaintenanceLoading, setUserMaintenanceLoading] = useState(false)
  const [addAlignmentOpen, setAddAlignmentOpen] = useState(false)
  const [alignmentNameDraft, setAlignmentNameDraft] = useState('')
  const [addAlignmentError, setAddAlignmentError] = useState<string | null>(null)
  const [savingAlignmentUserId, setSavingAlignmentUserId] = useState<number | null>(null)
  const [addAlignmentSubmitting, setAddAlignmentSubmitting] = useState(false)
  const [userColumnFilterDraft, setUserColumnFilterDraft] = useState<Record<UserColumnId, string>>({
    username: '',
    firstName: '',
    lastName: '',
    userGroups: '',
    alignments: '',
    email: '',
    phoneNumber: '',
  })
  const [appliedUserColumnFilters, setAppliedUserColumnFilters] = useState<Record<UserColumnId, string>>({
    username: '',
    firstName: '',
    lastName: '',
    userGroups: '',
    alignments: '',
    email: '',
    phoneNumber: '',
  })
  const [hoveredUserHeader, setHoveredUserHeader] = useState<UserColumnId | null>(null)
  const [addUserOpen, setAddUserOpen] = useState(false)
  const [addUserForm, setAddUserForm] = useState<AddUserForm>(INITIAL_ADD_USER_FORM)
  const [addUserTouched, setAddUserTouched] = useState<Record<string, boolean>>({})
  const [addUserSubmitTried, setAddUserSubmitTried] = useState(false)
  const [displayMenuUserId, setDisplayMenuUserId] = useState<number | null>(null)
  const [displayUserOpen, setDisplayUserOpen] = useState(false)
  const [displayUserRow, setDisplayUserRow] = useState<UserMaintenanceRow | null>(null)
  const [currentUsersPage, setCurrentUsersPage] = useState(1)
  const [addUserSubmitting, setAddUserSubmitting] = useState(false)

  const [widgetDropdownOpen, setWidgetDropdownOpen] = useState(false)
  const [selectedWidgets, setSelectedWidgets] = useState<string[]>([
    'Contact by Label',
    'Revenue Summary',
    'Sales Funnel',
    'Pipeline by Stage',
  ])
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
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('crm_theme', theme)
  }, [theme])

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
      setLabelOptions([])
      setOwnerOptions([])
      setActiveUserOptions([])
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const [labels, owners, activeUsers] = await Promise.all([
          getCodeReference(token, 'LABEL_CONTACT'),
          getAdminOwners(token),
          getActiveUsers(token),
        ])
        if (cancelled) {
          return
        }
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

  const isAdminOrManagerUser = useMemo(
    () =>
      Boolean(
        profile?.groups?.some((groupName) => {
          const g = groupName.toLowerCase()
          return g === 'admin' || g === 'manager'
        }),
      ),
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

  const loadUserMaintenanceData = useCallback(async () => {
    if (!token || !isAdminOrManagerUser) {
      return
    }
    setUserMaintenanceLoading(true)
    try {
      const [users, groups, alignments] = await Promise.all([
        listUserMaintenanceUsers(token),
        listUserMaintenanceGroups(token),
        listAlignmentOptions(token),
      ])
      setUserRows(users)
      setGroupsOptions(groups)
      setAlignmentOptions(alignments)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load users.')
    } finally {
      setUserMaintenanceLoading(false)
    }
  }, [token, isAdminOrManagerUser])

  const loadDealFormOptions = useCallback(async () => {
    if (!token) {
      return
    }
    setDealOptionsLoading(true)
    try {
      const opts = await getDealFormOptions(token)
      setDealOptions(opts)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load deal form.')
    } finally {
      setDealOptionsLoading(false)
    }
  }, [token])

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

    if (!values.agentEmail.trim()) {
      errors.agentEmail = "Agent's email is required."
    } else if (!emailRegex.test(values.agentEmail.trim())) {
      errors.agentEmail = 'Please enter a valid agent email address.'
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

  function dealValidation(values: DealForm): Record<string, string> {
    const errors: Record<string, string> = {}
    if (!values.contactId.trim()) {
      errors.contactId = 'Contact is required.'
    }
    if (!values.userId.trim()) {
      errors.userId = 'Account is required.'
    }
    if (!values.closingDate.trim()) {
      errors.closingDate = 'Closing date is required.'
    }
    if (!values.dealDate.trim()) {
      errors.dealDate = 'Deal date is required.'
    }
    if (!values.stageId.trim()) {
      errors.stageId = 'Stage is required.'
    }
    const amtRaw = values.amount.trim()
    if (!amtRaw) {
      errors.amount = 'Amount is required.'
    } else if (!/^\d+(\.\d+)?$/.test(amtRaw)) {
      errors.amount = 'Amount must be a valid number.'
    } else if (Number(amtRaw) < 0) {
      errors.amount = 'Amount cannot be negative.'
    }
    if (!values.pipeline.trim()) {
      errors.pipeline = 'Pipeline is required.'
    }
    if (!values.currency.trim()) {
      errors.currency = 'Currency is required.'
    }
    return errors
  }

  const dealErrors = useMemo(() => dealValidation(dealForm), [dealForm])

  const filteredDealContacts = useMemo(() => {
    const list = dealOptions?.contacts ?? []
    const q = dealContactSearch.trim().toLowerCase()
    if (!q) {
      return list
    }
    return list.filter(
      (c) =>
        c.contactName.toLowerCase().includes(q) ||
        (c.purposeOfLoan ?? '').toLowerCase().includes(q) ||
        (c.accountName ?? '').toLowerCase().includes(q),
    )
  }, [dealOptions, dealContactSearch])

  const selectedDealContact = useMemo(() => {
    if (!dealForm.contactId.trim() || !dealOptions) {
      return null
    }
    return dealOptions.contacts.find((c) => String(c.contactId) === dealForm.contactId) ?? null
  }, [dealForm.contactId, dealOptions])

  useEffect(() => {
    if (!dealContactPickerOpen) {
      return
    }
    function onDocMouseDown(event: MouseEvent) {
      const root = dealContactPickerRef.current
      if (root && !root.contains(event.target as Node)) {
        setDealContactPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [dealContactPickerOpen])

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

  const navigateToSalesAccount = useCallback((accountName: string) => {
    setActiveMenu('sales')
    setExpandedMenus((prev) => ({ ...prev, sales: true }))
    setActiveSubmenuByMenu((prev) => ({ ...prev, sales: 'Sales' }))
    setSalesAccountHighlight(accountName)
  }, [])

  function handleSubmenuClick(menu: MenuKey, submenu: string) {
    setActiveMenu(menu)
    setActiveSubmenuByMenu((prev) => ({ ...prev, [menu]: submenu }))
    setDisplayMenuUserId(null)
    if (menu !== 'sales' || submenu !== 'Sales') {
      setSalesAccountHighlight(null)
    }
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
      await loadUserMaintenanceData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create user.')
    } finally {
      setAddUserSubmitting(false)
    }
  }

  async function submitAddAlignment(e: React.FormEvent) {
    e.preventDefault()
    setAddAlignmentError(null)
    if (!token) {
      setAddAlignmentError('Your session has expired. Please sign in again.')
      return
    }
    if (!alignmentNameDraft.trim()) {
      setAddAlignmentError('Alignment Name is required.')
      return
    }
    setAddAlignmentSubmitting(true)
    try {
      const created = await createAlignment(token, alignmentNameDraft.trim())
      setAlignmentOptions((prev) => [...prev, created].sort((a, b) => a.alignmentName.localeCompare(b.alignmentName)))
      setAddAlignmentOpen(false)
      setAlignmentNameDraft('')
      setPreferencesStatus(`Alignment "${created.alignmentName}" created.`)
      setTimeout(() => setPreferencesStatus(null), 2400)
      await loadUserMaintenanceData()
    } catch (err) {
      setAddAlignmentError(err instanceof Error ? err.message : 'Could not create alignment.')
    } finally {
      setAddAlignmentSubmitting(false)
    }
  }

  async function changeUserAlignment(userId: number, alignmentIdRaw: string) {
    if (!token) {
      setError('Your session has expired. Please sign in again.')
      return
    }
    const alignmentId = Number(alignmentIdRaw)
    if (!Number.isFinite(alignmentId)) return
    setSavingAlignmentUserId(userId)
    try {
      await patchUserAlignment(token, userId, alignmentId)
      setUserRows((prev) =>
        prev.map((row) => {
          if (row.userId !== userId) return row
          const selected = alignmentOptions.find((a) => a.alignmentId === alignmentId)
          return {
            ...row,
            selectedAlignmentId: alignmentId,
            alignments: selected ? [selected.alignmentName] : row.alignments,
          }
        }),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update alignment.')
    } finally {
      setSavingAlignmentUserId(null)
    }
  }

  function applyUserHeaderContains(col: UserColumnId) {
    setAppliedUserColumnFilters((prev) => ({ ...prev, [col]: userColumnFilterDraft[col].trim() }))
    setCurrentUsersPage(1)
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
      contactOpenedFromDealRef.current = false
      setContactForm((prev) => ({
        ...prev,
        agentEmail: '',
        countryCode: COUNTRY_PHONE_OPTIONS.some((c) => c.value === prev.countryCode) ? prev.countryCode : '61',
        product: (CONTACT_FORM_PRODUCT_OPTIONS as readonly string[]).includes(prev.product)
          ? prev.product
          : CONTACT_FORM_PRODUCT_OPTIONS[0],
        employmentStatus: (CONTACT_FORM_EMPLOYMENT_OPTIONS as readonly string[]).includes(prev.employmentStatus)
          ? prev.employmentStatus
          : CONTACT_FORM_EMPLOYMENT_OPTIONS[0],
        label: prev.label || labelOptions[0] || '',
        owner: prev.owner || ownerOptions[0] || '',
        subOwner: prev.subOwner || activeUserOptions[0] || '',
        account: prev.account || activeUserOptions[0] || '',
      }))
      return
    }
    setDealOpen(true)
    setDealSavedMessage(null)
    setDealSubmitTried(false)
    setDealTouched({})
    setDealContactPickerOpen(false)
    setDealContactSearch('')
    setDealForm(emptyDealForm(profile))
    void loadDealFormOptions()
  }

  function handleContactChange<K extends keyof ContactForm>(key: K, value: ContactForm[K]) {
    setContactForm((prev) => ({ ...prev, [key]: value }))
  }

  function touchField(key: keyof ContactForm) {
    setContactTouched((prev) => ({ ...prev, [key]: true }))
  }

  function closeContactPopup() {
    contactOpenedFromDealRef.current = false
    setContactOpen(false)
    setContactTouched({})
    setContactSubmitTried(false)
  }

  function closeDealPopup() {
    setDealOpen(false)
    setDealSubmitTried(false)
    setDealTouched({})
    setDealOptions(null)
    setDealContactPickerOpen(false)
    setDealContactSearch('')
  }

  function openAddContactFromDeal() {
    if (!token) {
      setError('Your session has expired. Please sign in again.')
      return
    }
    setDealContactPickerOpen(false)
    setDealContactSearch('')
    contactOpenedFromDealRef.current = true
    setContactSavedMessage(null)
    setContactOpen(true)
    setContactForm((prev) => ({
      ...prev,
      agentEmail: '',
      countryCode: COUNTRY_PHONE_OPTIONS.some((c) => c.value === prev.countryCode) ? prev.countryCode : '61',
      product: (CONTACT_FORM_PRODUCT_OPTIONS as readonly string[]).includes(prev.product)
        ? prev.product
        : CONTACT_FORM_PRODUCT_OPTIONS[0],
      employmentStatus: (CONTACT_FORM_EMPLOYMENT_OPTIONS as readonly string[]).includes(prev.employmentStatus)
        ? prev.employmentStatus
        : CONTACT_FORM_EMPLOYMENT_OPTIONS[0],
      label: prev.label || labelOptions[0] || '',
      owner: prev.owner || ownerOptions[0] || '',
      subOwner: prev.subOwner || activeUserOptions[0] || '',
      account: prev.account || activeUserOptions[0] || '',
    }))
  }

  function applyCurrentUserAsDealAccount() {
    if (!profile) {
      return
    }
    setDealForm((prev) => ({ ...prev, userId: String(profile.userId) }))
  }

  function handleDealChange<K extends keyof DealForm>(key: K, value: DealForm[K]) {
    setDealForm((prev) => ({ ...prev, [key]: value }))
  }

  function touchDealField(key: keyof DealForm) {
    setDealTouched((prev) => ({ ...prev, [key]: true }))
  }

  function showDealError(field: keyof DealForm): string | null {
    if (!dealErrors[field]) {
      return null
    }
    if (dealSubmitTried || dealTouched[field]) {
      return dealErrors[field]
    }
    return null
  }

  async function submitDeal(e: React.FormEvent) {
    e.preventDefault()
    setDealSubmitTried(true)
    if (Object.keys(dealErrors).length > 0) {
      return
    }
    if (!token) {
      setError('Your session has expired. Please sign in again.')
      return
    }
    setDealSubmitting(true)
    try {
      const response = await createDeal(token, {
        contactId: Number(dealForm.contactId),
        userId: Number(dealForm.userId),
        closingDate: dealForm.closingDate,
        stageId: Number(dealForm.stageId),
        amount: Number(dealForm.amount.trim()),
        dealDate: dealForm.dealDate,
        pipeline: dealForm.pipeline.trim(),
        currency: dealForm.currency.trim(),
      })
      setDealOpen(false)
      setDealSubmitTried(false)
      setDealTouched({})
      setDealForm(emptyDealForm(profile))
      setDealOptions(null)
      setDealSavedMessage(`${response.message} (ID: ${response.dealId})`)
      setTimeout(() => setDealSavedMessage(null), 4000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save deal.')
    } finally {
      setDealSubmitting(false)
    }
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
        agentEmail: contactForm.agentEmail.trim(),
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
      const fromDeal = contactOpenedFromDealRef.current
      contactOpenedFromDealRef.current = false
      if (fromDeal) {
        setContactOpen(false)
        setContactTouched({})
        setContactSubmitTried(false)
        setContactForm(INITIAL_CONTACT_FORM)
        setDealForm((prev) => ({ ...prev, contactId: String(response.contactId) }))
        try {
          const opts = await getDealFormOptions(token)
          setDealOptions(opts)
        } catch {
          /* dropdown refresh is best-effort */
        }
        return
      }
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
  const filteredUserRows = useMemo(() => {
    return userRows.filter((row) =>
      USER_COLUMN_META.every((col) => {
        const q = appliedUserColumnFilters[col.id].trim().toLowerCase()
        if (!q) return true
        const value =
          col.id === 'userGroups'
            ? row.userGroups.join(', ')
            : col.id === 'alignments'
              ? row.alignments.join(', ')
              : String(row[col.id] ?? '')
        return value.toLowerCase().includes(q)
      }),
    )
  }, [userRows, appliedUserColumnFilters])
  const pagedUserRows = useMemo(() => {
    const start = (currentUsersPage - 1) * usersPageSize
    return filteredUserRows.slice(start, start + usersPageSize)
  }, [filteredUserRows, currentUsersPage])
  const totalUsersPages = Math.max(1, Math.ceil(filteredUserRows.length / usersPageSize))
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
            {MENU_ITEMS.filter((item) => item.key !== 'admin' || isAdminOrManagerUser).map((item) => (
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
                <label className="theme-select-wrap">
                  <span>Theme</span>
                  <select
                    className="theme-select"
                    value={theme}
                    onChange={(e) => setTheme(e.target.value as ThemeName)}
                    title="Choose dashboard color theme"
                  >
                    {THEME_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
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

            {activeMenu === 'admin' && activeSubmenuByMenu.admin === 'User Maintenance' && isAdminOrManagerUser ? (
              <section className="user-maintenance">
                <div className="dashboard-actions">
                  <button type="button" className="secondary" onClick={() => setAddUserOpen(true)}>Add User</button>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => {
                      setAddAlignmentError(null)
                      setAlignmentNameDraft('')
                      setAddAlignmentOpen(true)
                    }}
                  >
                    Add New Alignment
                  </button>
                </div>
                {preferencesStatus && <p className="info">{preferencesStatus}</p>}
                <div className="table-wrap">
                  <table className="result-table">
                    <thead>
                      <tr>
                        {USER_COLUMN_META.map((col) => (
                          <th
                            key={col.id}
                            className="contacts-header-cell"
                            onMouseEnter={() => setHoveredUserHeader(col.id)}
                            onMouseLeave={() => setHoveredUserHeader((prev) => (prev === col.id ? null : prev))}
                          >
                            <span>{col.label}</span>
                            {hoveredUserHeader === col.id && (
                              <div className="contacts-header-quick-filter">
                                <input
                                  type="text"
                                  className="contacts-header-quick-input"
                                  placeholder="Search"
                                  value={userColumnFilterDraft[col.id]}
                                  onChange={(e) =>
                                    setUserColumnFilterDraft((prev) => ({ ...prev, [col.id]: e.target.value }))
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault()
                                      applyUserHeaderContains(col.id)
                                    }
                                  }}
                                />
                                <button
                                  type="button"
                                  className="contacts-header-quick-btn"
                                  onClick={() => applyUserHeaderContains(col.id)}
                                  aria-label={`Search ${col.label}`}
                                  title={`Search ${col.label}`}
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
                      {userMaintenanceLoading && (
                        <tr><td colSpan={7}><div className="loading-inline"><Spinner size="sm" /> Loading users...</div></td></tr>
                      )}
                      {!userMaintenanceLoading && filteredUserRows.length === 0 && (
                        <tr><td colSpan={7}>No users found.</td></tr>
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
                          <td>
                            <select
                              value={user.selectedAlignmentId ?? ''}
                              onMouseEnter={(e) => e.currentTarget.focus()}
                              onChange={(e) => void changeUserAlignment(user.userId, e.target.value)}
                              disabled={savingAlignmentUserId === user.userId}
                            >
                              <option value="" disabled>
                                Select
                              </option>
                              {alignmentOptions.map((opt) => (
                                <option key={opt.alignmentId} value={opt.alignmentId}>
                                  {opt.alignmentName}
                                </option>
                              ))}
                            </select>
                          </td>
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
                    {dealSavedMessage && <p className="info success-msg">{dealSavedMessage}</p>}
                    <div className="widgets-grid">
                      {selectedWidgets.length === 0 && (
                        <div className="widget-card">
                          <h3>No widgets selected</h3>
                          <p>Open Select widgets and choose items for the dashboard.</p>
                        </div>
                      )}
                      {selectedWidgets.map((widgetName) =>
                        widgetName === 'Contact by Label' ? (
                          <ContactByLabelWidget key={widgetName} username={profile?.username ?? null} />
                        ) : widgetName === 'Deals Won/Lost Trend' ? (
                          <DealOutcomeTrendWidget key={widgetName} username={profile?.username ?? null} />
                        ) : (
                          <article key={widgetName} className="widget-card">
                            <h3>{widgetName}</h3>
                            <p>Analytics report placeholder for {widgetName}.</p>
                          </article>
                        ),
                      )}
                    </div>
                  </>
                ) : (
                  <div className="submenu-panel">
                    {SubmenuComponent ? (
                      <SubmenuComponent
                        goToSalesAccount={navigateToSalesAccount}
                        salesAccountHighlight={salesAccountHighlight}
                      />
                    ) : (
                      <div className="widget-card">
                        <h3>Section</h3>
                        <p>This section will be available soon.</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      )}

      {contactOpen && (
        <div
          className={`modal-backdrop${dealOpen ? ' modal-backdrop-elevated' : ''}`}
          role="presentation"
          onClick={closeContactPopup}
        >
          <div className="modal contact-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h2>Create Contact</h2>
            <form className="contact-form" onSubmit={submitContact}>
              <label className="field"><span>Agent's email *</span><input type="email" value={contactForm.agentEmail} onChange={(e) => handleContactChange('agentEmail', e.target.value)} onBlur={() => touchField('agentEmail')} />{showContactError('agentEmail') && <p className="error">{showContactError('agentEmail')}</p>}</label>
              <label className="field"><span>Name *</span><input value={contactForm.name} onChange={(e) => handleContactChange('name', e.target.value)} onBlur={() => touchField('name')} />{showContactError('name') && <p className="error">{showContactError('name')}</p>}</label>
              <div className="field-group">
                <label className="field">
                  <span>Country *</span>
                  <select
                    className="contact-country-select"
                    value={contactForm.countryCode}
                    onChange={(e) => handleContactChange('countryCode', e.target.value)}
                    onBlur={() => touchField('countryCode')}
                    aria-label="Country calling code"
                  >
                    {COUNTRY_PHONE_OPTIONS.map((c) => (
                      <option key={`${c.value}-${c.name}`} value={c.value}>
                        {c.flag} {c.name} ({c.dial})
                      </option>
                    ))}
                  </select>
                  {showContactError('countryCode') && <p className="error">{showContactError('countryCode')}</p>}
                </label>
                <label className="field"><span>Phone Number *</span><input value={contactForm.phoneNumber} onChange={(e) => handleContactChange('phoneNumber', e.target.value)} onBlur={() => touchField('phoneNumber')} inputMode="numeric" />{showContactError('phoneNumber') && <p className="error">{showContactError('phoneNumber')}</p>}</label>
              </div>
              <label className="field"><span>Contact Email *</span><input type="email" value={contactForm.email} onChange={(e) => handleContactChange('email', e.target.value)} onBlur={() => touchField('email')} />{showContactError('email') && <p className="error">{showContactError('email')}</p>}</label>
              <label className="field">
                <span>Product</span>
                <select value={contactForm.product} onChange={(e) => handleContactChange('product', e.target.value)}>
                  {CONTACT_FORM_PRODUCT_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Purpose *</span>
                <select value={contactForm.purposeOfLoan} onChange={(e) => handleContactChange('purposeOfLoan', e.target.value)} onBlur={() => touchField('purposeOfLoan')}>
                  <option value="">Select</option>
                  {CONTACT_FORM_PURPOSE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                {showContactError('purposeOfLoan') && <p className="error">{showContactError('purposeOfLoan')}</p>}
              </label>
              <label className="field"><span>Address</span><input value={contactForm.address} onChange={(e) => handleContactChange('address', e.target.value)} /></label>
              <label className="field"><span>Income of Customer</span><input value={contactForm.income} onChange={(e) => handleContactChange('income', e.target.value)} inputMode="decimal" /></label>
              <label className="field">
                <span>Employment Status *</span>
                <select
                  value={contactForm.employmentStatus}
                  onChange={(e) => handleContactChange('employmentStatus', e.target.value)}
                  onBlur={() => touchField('employmentStatus')}
                >
                  {CONTACT_FORM_EMPLOYMENT_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                {showContactError('employmentStatus') && <p className="error">{showContactError('employmentStatus')}</p>}
              </label>
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

      {dealOpen && (
        <div className="modal-backdrop" role="presentation" onClick={closeDealPopup}>
          <div className="modal deal-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <form className="deal-form" onSubmit={submitDeal}>
              <div className="deal-modal-header">
                <h2>Add Deal</h2>
                <div className="deal-modal-header-actions">
                  <button type="button" className="secondary" onClick={closeDealPopup} disabled={dealSubmitting}>
                    Cancel
                  </button>
                  <button type="submit" className="primary" disabled={dealSubmitting || dealOptionsLoading}>
                    {dealSubmitting ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
              {dealOptionsLoading && <p className="muted small deal-form-loading">Loading contacts, accounts, and stages…</p>}
              <div className="field deal-contact-field">
                <span>Contact *</span>
                <div className="deal-contact-picker" ref={dealContactPickerRef}>
                  <button
                    type="button"
                    className="deal-contact-picker-trigger"
                    disabled={dealOptionsLoading}
                    aria-expanded={dealContactPickerOpen}
                    aria-haspopup="listbox"
                    onClick={() => {
                      setDealContactPickerOpen((open) => {
                        if (!open) {
                          setDealContactSearch('')
                        }
                        return !open
                      })
                    }}
                  >
                    <span className="deal-contact-picker-trigger-text">
                      {selectedDealContact?.contactName?.trim()
                        ? selectedDealContact.contactName
                        : 'Select contact'}
                    </span>
                    <span className="deal-contact-picker-chevron" aria-hidden>
                      ▾
                    </span>
                  </button>
                  {dealContactPickerOpen && (
                    <div className="deal-contact-picker-panel" role="listbox">
                      <div className="deal-contact-picker-title">Select contact</div>
                      <input
                        type="search"
                        className="deal-contact-picker-search"
                        placeholder="Search.."
                        value={dealContactSearch}
                        onChange={(e) => setDealContactSearch(e.target.value)}
                        autoComplete="off"
                      />
                      <ul className="deal-contact-picker-list">
                        {filteredDealContacts.length === 0 && (
                          <li className="deal-contact-picker-empty muted small">No contacts match your search.</li>
                        )}
                        {filteredDealContacts.map((c) => {
                          const purpose = (c.purposeOfLoan ?? '').trim() || '—'
                          const account = (c.accountName ?? '').trim() || '—'
                          const active = String(c.contactId) === dealForm.contactId
                          return (
                            <li key={c.contactId} role="option" aria-selected={active}>
                              <button
                                type="button"
                                className={`deal-contact-picker-row${active ? ' is-active' : ''}`}
                                onClick={() => {
                                  handleDealChange('contactId', String(c.contactId))
                                  touchDealField('contactId')
                                  setDealContactPickerOpen(false)
                                  setDealContactSearch('')
                                }}
                              >
                                <span className="deal-contact-picker-name">{c.contactName || '—'}</span>
                                <span className="deal-contact-picker-meta">
                                  <span className="deal-contact-picker-purpose">{purpose}</span>
                                  <span className="deal-contact-picker-account">{account}</span>
                                </span>
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                      <button type="button" className="deal-contact-picker-add" onClick={openAddContactFromDeal}>
                        + Add Contact
                      </button>
                    </div>
                  )}
                </div>
                {showDealError('contactId') && <p className="error">{showDealError('contactId')}</p>}
              </div>
              <div className="field field-row-with-action">
                <span>Account *</span>
                <div className="field-row-with-action-inner">
                  <select
                    value={dealForm.userId}
                    onChange={(e) => handleDealChange('userId', e.target.value)}
                    onBlur={() => touchDealField('userId')}
                    disabled={dealOptionsLoading}
                  >
                    <option value="">Select user</option>
                    {(dealOptions?.users ?? []).map((u) => (
                      <option key={u.userId} value={String(u.userId)}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                  <button type="button" className="secondary compact-action" onClick={applyCurrentUserAsDealAccount}>
                    Add user
                  </button>
                </div>
                {showDealError('userId') && <p className="error">{showDealError('userId')}</p>}
              </div>
              <label className="field">
                <span>Closing date *</span>
                <input
                  type="date"
                  value={dealForm.closingDate}
                  onChange={(e) => handleDealChange('closingDate', e.target.value)}
                  onBlur={() => touchDealField('closingDate')}
                  disabled={dealOptionsLoading}
                />
                {showDealError('closingDate') && <p className="error">{showDealError('closingDate')}</p>}
              </label>
              <label className="field">
                <span>Stage *</span>
                <select
                  value={dealForm.stageId}
                  onChange={(e) => handleDealChange('stageId', e.target.value)}
                  onBlur={() => touchDealField('stageId')}
                  disabled={dealOptionsLoading}
                >
                  <option value="">Select stage</option>
                  {(dealOptions?.stages ?? []).map((s) => (
                    <option key={s.stageId} value={String(s.stageId)}>
                      {s.stageName}
                    </option>
                  ))}
                </select>
                {showDealError('stageId') && <p className="error">{showDealError('stageId')}</p>}
              </label>
              <label className="field">
                <span>Amount *</span>
                <input
                  value={dealForm.amount}
                  onChange={(e) => handleDealChange('amount', e.target.value)}
                  onBlur={() => touchDealField('amount')}
                  inputMode="decimal"
                  disabled={dealOptionsLoading}
                />
                {showDealError('amount') && <p className="error">{showDealError('amount')}</p>}
              </label>
              <label className="field">
                <span>Deal date *</span>
                <input
                  type="date"
                  value={dealForm.dealDate}
                  onChange={(e) => handleDealChange('dealDate', e.target.value)}
                  onBlur={() => touchDealField('dealDate')}
                  disabled={dealOptionsLoading}
                />
                {showDealError('dealDate') && <p className="error">{showDealError('dealDate')}</p>}
              </label>
              <label className="field">
                <span>Pipeline</span>
                <input
                  value={dealForm.pipeline}
                  onChange={(e) => handleDealChange('pipeline', e.target.value)}
                  onBlur={() => touchDealField('pipeline')}
                  disabled={dealOptionsLoading}
                />
                {showDealError('pipeline') && <p className="error">{showDealError('pipeline')}</p>}
              </label>
              <label className="field">
                <span>Currency *</span>
                <select
                  value={dealForm.currency}
                  onChange={(e) => handleDealChange('currency', e.target.value)}
                  onBlur={() => touchDealField('currency')}
                  disabled={dealOptionsLoading}
                >
                  {DEAL_CURRENCY_OPTIONS.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
                {showDealError('currency') && <p className="error">{showDealError('currency')}</p>}
              </label>
            </form>
          </div>
        </div>
      )}

      {addAlignmentOpen && (
        <div className="modal-backdrop" role="presentation" onClick={() => setAddAlignmentOpen(false)}>
          <div className="modal user-maintenance-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h2>Add New Alignment</h2>
            <form className="stack" onSubmit={submitAddAlignment}>
              <label className="field">
                <span>Alignment Name</span>
                <input value={alignmentNameDraft} onChange={(e) => setAlignmentNameDraft(e.target.value)} />
              </label>
              {addAlignmentError && <p className="error">{addAlignmentError}</p>}
              <div className="row">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setAddAlignmentOpen(false)
                    setAlignmentNameDraft('')
                    setAddAlignmentError(null)
                  }}
                  disabled={addAlignmentSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="primary" disabled={addAlignmentSubmitting}>
                  {addAlignmentSubmitting ? <><Spinner size="sm" /> Saving...</> : 'Save'}
                </button>
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
