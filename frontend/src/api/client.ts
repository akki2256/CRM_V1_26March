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
