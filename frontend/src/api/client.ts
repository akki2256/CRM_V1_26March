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
