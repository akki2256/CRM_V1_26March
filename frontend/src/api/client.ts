const TOKEN_KEY = 'crm_access_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

export type LoginResponse = {
  accessToken: string
  requiresPasswordChange: boolean
}

export type MeResponse = {
  userId: number
  username: string
  firstName: string
  lastName: string
  email: string
  groups: string[]
  mustChangePassword: boolean
}

export type ForgotResponse = {
  message: string
}

export type CodeReferenceItem = {
  code: string
  sequenceNo: number
}

export type UserOption = {
  fullName: string
}

export type ContactCreateRequest = {
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
  mortgage: 'Yes' | 'No'
  otherExistingLoans: 'Yes' | 'No'
  creditCard: 'Yes' | 'No'
  type: 'People' | 'Organization'
  segment: 'Master List' | 'Online'
  status: 'Active' | 'Inactive'
  label: string
  owner: string
  subOwner: string
  account: string
}

export type ContactCreateResponse = {
  contactId: number
  message: string
}

export type UserMaintenanceRow = {
  userId: number
  username: string
  firstName: string
  lastName: string
  userGroups: string[]
  email: string
  phoneNumber: string
}

export type GroupOption = {
  groupId: number
  groupName: string
}

export type UserCreateRequest = {
  username: string
  firstName: string
  lastName: string
  userGroup: string
  password: string
  email: string
  phoneNumber: string
  addToGroup: string
}

export type UserCreateResponse = {
  userId: number
  message: string
}

export type UserSearchFilters = {
  firstName: string
  firstNameOp: string
  lastName: string
  lastNameOp: string
  username: string
  usernameOp: string
  email: string
  emailOp: string
  phone: string
  phoneOp: string
  userGroup: string
}

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text()
  if (!text) {
    return {} as T
  }
  return JSON.parse(text) as T
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!res.ok) {
    const body = await parseJson<{ message?: string }>(res)
    throw new Error(body.message ?? 'Login failed.')
  }
  return parseJson<LoginResponse>(res)
}

export type ContactByLabelSlice = {
  bucket: string
  label: string
  count: number
}

export type ContactByLabelResponse = {
  slices: ContactByLabelSlice[]
  total: number
}

export async function getContactByLabelStats(token: string, period: string): Promise<ContactByLabelResponse> {
  const params = new URLSearchParams({ period })
  const res = await fetch(`/api/dashboard/contact-by-label?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const body = await parseJson<{ message?: string }>(res)
    throw new Error(body.message ?? 'Could not load contact labels.')
  }
  return parseJson<ContactByLabelResponse>(res)
}

export async function me(token: string): Promise<MeResponse> {
  const res = await fetch('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    throw new Error('Session expired.')
  }
  return parseJson<MeResponse>(res)
}

export async function logout(token: string): Promise<void> {
  await fetch('/api/auth/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function forgotPassword(email: string): Promise<ForgotResponse> {
  const res = await fetch('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  if (!res.ok) {
    const body = await parseJson<{ message?: string }>(res)
    throw new Error(body.message ?? 'Request failed.')
  }
  return parseJson<ForgotResponse>(res)
}

export async function forgotUserId(email: string): Promise<ForgotResponse> {
  const res = await fetch('/api/auth/forgot-userid', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  if (!res.ok) {
    const body = await parseJson<{ message?: string }>(res)
    throw new Error(body.message ?? 'Request failed.')
  }
  return parseJson<ForgotResponse>(res)
}

export async function changePasswordAfterReset(
  token: string,
  newPassword: string,
): Promise<LoginResponse> {
  const res = await fetch('/api/auth/change-password-after-reset', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ newPassword }),
  })
  if (!res.ok) {
    const body = await parseJson<{ message?: string }>(res)
    throw new Error(body.message ?? 'Could not update password.')
  }
  return parseJson<LoginResponse>(res)
}

export async function getCodeReference(
  token: string,
  categorySid: string,
): Promise<CodeReferenceItem[]> {
  const res = await fetch(`/api/reference/code-reference/${encodeURIComponent(categorySid)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    throw new Error('Could not load dropdown values.')
  }
  return parseJson<CodeReferenceItem[]>(res)
}

export async function getAdminOwners(token: string): Promise<UserOption[]> {
  const res = await fetch('/api/reference/users/admin-owners', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    throw new Error('Could not load owner options.')
  }
  return parseJson<UserOption[]>(res)
}

export async function getActiveUsers(token: string): Promise<UserOption[]> {
  const res = await fetch('/api/reference/users/active', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    throw new Error('Could not load active user options.')
  }
  return parseJson<UserOption[]>(res)
}

export type ContactColumnFilterOp = string

export type ContactColumnFilterEntry = {
  column: string
  op: ContactColumnFilterOp
  value: string
}

export type ContactSearchBody = {
  page?: number
  size?: number
  sortField?: string
  sortDirection?: 'ASC' | 'DESC'
  filters?: ContactColumnFilterEntry[]
}

export type ContactListRow = {
  contactId: number
  agentEmail: string
  contactName: string
  countryCode: string
  phoneNumber: string
  email: string
  productCode: string | null
  purposeOfLoan: string
  addressText: string | null
  customerIncome: number | null
  employmentStatusCode: string
  mortgageYn: string
  otherExistingLoansYn: string
  creditCardYn: string
  typeCode: string | null
  segmentCode: string | null
  statusCode: string | null
  labelCode: string | null
  ownerName: string | null
  subOwnerName: string | null
  accountName: string | null
}

export type PagedContactsResponse = {
  content: ContactListRow[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

export async function searchContacts(token: string, body: ContactSearchBody): Promise<PagedContactsResponse> {
  const res = await fetch('/api/contacts/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const bodyJson = await parseJson<{ message?: string }>(res)
    throw new Error(bodyJson.message ?? 'Could not load contacts.')
  }
  return parseJson<PagedContactsResponse>(res)
}

export type DealSearchBody = {
  page?: number
  size?: number
  sortField?: string
  sortDirection?: 'ASC' | 'DESC'
  filters?: ContactColumnFilterEntry[]
}

export type DealListRow = {
  dealId: number
  contactId: number
  contactName: string
  ownerName: string
  subOwnerName: string
  accountName: string
  dealUserId: number
  dealUserName: string
  closingDate: string
  stageId: number
  stageName: string
  amount: number
  dealDate: string
  pipeline: string
  currency: string
  purposeOfLoan: string
  dealComments: string
}

export type DealDetail = {
  dealId: number
  contactId: number
  contactName: string
  purposeOfLoan: string
  ownerName: string
  subOwnerName: string
  accountName: string
  dealUserId: number
  dealUserName: string
  closingDate: string
  stageId: number
  stageName: string
  amount: number
  dealDate: string
  pipeline: string
  currency: string
  dealComments: string
  canEditContactAndAccount: boolean
}

export type DealAttachmentRow = {
  attachmentId: number
  fileName: string
  uploadedAt: string
}

export type PagedDealsResponse = {
  content: DealListRow[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

export async function searchDeals(token: string, body: DealSearchBody): Promise<PagedDealsResponse> {
  const res = await fetch('/api/deals/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const bodyJson = await parseJson<{ message?: string }>(res)
    throw new Error(bodyJson.message ?? 'Could not load deals.')
  }
  return parseJson<PagedDealsResponse>(res)
}

export async function getDealDetail(token: string, dealId: number): Promise<DealDetail> {
  const res = await fetch(`/api/deals/detail/${dealId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const bodyJson = await parseJson<{ message?: string }>(res)
    throw new Error(bodyJson.message ?? 'Could not load deal.')
  }
  return parseJson<DealDetail>(res)
}

export async function patchDealStage(token: string, dealId: number, stageName: 'Closed Won' | 'Closed Lost'): Promise<void> {
  const res = await fetch(`/api/deals/detail/${dealId}/stage`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ stageName }),
  })
  if (!res.ok) {
    const bodyJson = await parseJson<{ message?: string }>(res)
    throw new Error(bodyJson.message ?? 'Could not update stage.')
  }
}

export async function patchDealContact(token: string, dealId: number, contactId: number): Promise<void> {
  const res = await fetch(`/api/deals/detail/${dealId}/contact`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ contactId }),
  })
  if (!res.ok) {
    const bodyJson = await parseJson<{ message?: string }>(res)
    throw new Error(bodyJson.message ?? 'Could not update contact.')
  }
}

export async function patchDealAccount(token: string, dealId: number, accountName: string): Promise<void> {
  const res = await fetch(`/api/deals/detail/${dealId}/account`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ accountName }),
  })
  if (!res.ok) {
    const bodyJson = await parseJson<{ message?: string }>(res)
    throw new Error(bodyJson.message ?? 'Could not update account.')
  }
}

export async function listDealAttachments(token: string, dealId: number): Promise<DealAttachmentRow[]> {
  const res = await fetch(`/api/deals/detail/${dealId}/attachments`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const bodyJson = await parseJson<{ message?: string }>(res)
    throw new Error(bodyJson.message ?? 'Could not load attachments.')
  }
  return parseJson<DealAttachmentRow[]>(res)
}

export async function uploadDealAttachment(token: string, dealId: number, file: File): Promise<DealAttachmentRow> {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch(`/api/deals/detail/${dealId}/attachments`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  })
  if (!res.ok) {
    const bodyJson = await parseJson<{ message?: string }>(res)
    throw new Error(bodyJson.message ?? 'Upload failed.')
  }
  return parseJson<DealAttachmentRow>(res)
}

export type DealContactOption = {
  contactId: number
  contactName: string
  purposeOfLoan: string
  accountName: string
}

export type DealUserOption = {
  userId: number
  label: string
}

export type DealStageOption = {
  stageId: number
  stageName: string
}

export type DealFormOptionsResponse = {
  contacts: DealContactOption[]
  users: DealUserOption[]
  stages: DealStageOption[]
}

export type DealCreateRequest = {
  contactId: number
  userId: number
  closingDate: string
  stageId: number
  amount: number
  dealDate: string
  pipeline: string
  currency: string
}

export type DealCreateResponse = {
  dealId: number
  message: string
}

/** ISO code → stored value; labels shown in UI */
export const DEAL_CURRENCY_OPTIONS: { code: string; label: string }[] = [
  { code: 'AUD', label: 'Australian Dollar (AUD)' },
  { code: 'USD', label: 'US Dollar (USD)' },
  { code: 'EUR', label: 'Euro (EUR)' },
  { code: 'GBP', label: 'British Pound (GBP)' },
  { code: 'JPY', label: 'Japanese Yen (JPY)' },
  { code: 'CHF', label: 'Swiss Franc (CHF)' },
  { code: 'CAD', label: 'Canadian Dollar (CAD)' },
  { code: 'NZD', label: 'New Zealand Dollar (NZD)' },
  { code: 'SGD', label: 'Singapore Dollar (SGD)' },
  { code: 'HKD', label: 'Hong Kong Dollar (HKD)' },
  { code: 'CNY', label: 'Chinese Yuan (CNY)' },
  { code: 'INR', label: 'Indian Rupee (INR)' },
  { code: 'MXN', label: 'Mexican Peso (MXN)' },
  { code: 'ZAR', label: 'South African Rand (ZAR)' },
  { code: 'SEK', label: 'Swedish Krona (SEK)' },
]

export async function getDealFormOptions(token: string): Promise<DealFormOptionsResponse> {
  const res = await fetch('/api/deals/form-options', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const body = await parseJson<{ message?: string }>(res)
    throw new Error(body.message ?? 'Could not load deal form.')
  }
  return parseJson<DealFormOptionsResponse>(res)
}

export async function createDeal(token: string, payload: DealCreateRequest): Promise<DealCreateResponse> {
  const res = await fetch('/api/deals', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const body = await parseJson<{ message?: string }>(res)
    throw new Error(body.message ?? 'Could not save deal.')
  }
  return parseJson<DealCreateResponse>(res)
}

export async function createContact(
  token: string,
  payload: ContactCreateRequest,
): Promise<ContactCreateResponse> {
  const res = await fetch('/api/contacts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const body = await parseJson<{ message?: string }>(res)
    throw new Error(body.message ?? 'Could not save contact.')
  }
  return parseJson<ContactCreateResponse>(res)
}

export async function listUserMaintenanceUsers(
  token: string,
  filters?: Partial<UserSearchFilters>,
): Promise<UserMaintenanceRow[]> {
  const params = new URLSearchParams()
  if (filters) {
    Object.entries(filters).forEach(([k, v]) => {
      if (v && String(v).trim() !== '') {
        params.set(k, String(v))
      }
    })
  }
  const query = params.toString()
  const res = await fetch(`/api/admin/user-maintenance/users${query ? `?${query}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const body = await parseJson<{ message?: string }>(res)
    throw new Error(body.message ?? 'Could not load users.')
  }
  return parseJson<UserMaintenanceRow[]>(res)
}

export async function listUserMaintenanceGroups(token: string): Promise<GroupOption[]> {
  const res = await fetch('/api/admin/user-maintenance/groups', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const body = await parseJson<{ message?: string }>(res)
    throw new Error(body.message ?? 'Could not load groups.')
  }
  return parseJson<GroupOption[]>(res)
}

export async function createMaintenanceUser(
  token: string,
  payload: UserCreateRequest,
): Promise<UserCreateResponse> {
  const res = await fetch('/api/admin/user-maintenance/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const body = await parseJson<{ message?: string }>(res)
    throw new Error(body.message ?? 'Could not create user.')
  }
  return parseJson<UserCreateResponse>(res)
}

export async function getMaintenanceUserById(token: string, userId: number): Promise<UserMaintenanceRow> {
  const res = await fetch(`/api/admin/user-maintenance/users/${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const body = await parseJson<{ message?: string }>(res)
    throw new Error(body.message ?? 'Could not load user details.')
  }
  return parseJson<UserMaintenanceRow>(res)
}
