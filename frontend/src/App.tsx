import { useCallback, useEffect, useState } from 'react'
import './App.css'
import {
  changePasswordAfterReset,
  forgotPassword,
  forgotUserId,
  getToken,
  login,
  logout,
  me,
  setToken,
  type MeResponse,
} from './api/client'

type ForgotStep = 'menu' | 'password' | 'userid'

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
              <input
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </label>
            <label className="field">
              <span>Password</span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            {error && <p className="error">{error}</p>}
            <button type="submit" className="primary" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          <button type="button" className="link" onClick={openForgot}>
            Forgot password or user ID
          </button>
        </div>
      )}

      {showDashboard && !sessionLoading && (
        <div className="card dashboard">
          <h1>Dashboard</h1>
          <p>
            Signed in as <strong>{profile?.firstName} {profile?.lastName}</strong> ({profile?.username})
          </p>
          <p className="muted">Groups: {profile?.groups?.join(', ') || '—'}</p>
          <button type="button" className="primary" onClick={handleLogout}>
            Log out
          </button>
        </div>
      )}

      {forgotOpen && (
        <div className="modal-backdrop" role="presentation" onClick={() => !busy && setForgotOpen(false)}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="forgot-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="forgot-title">Account recovery</h2>
            {forgotStep === 'menu' && (
              <div className="stack">
                <p className="muted">Choose an option. We will email the address on file if a match exists.</p>
                <button type="button" className="secondary" onClick={() => setForgotStep('password')}>
                  Forgot password
                </button>
                <button type="button" className="secondary" onClick={() => setForgotStep('userid')}>
                  Forgot user ID
                </button>
                <button type="button" className="link" onClick={() => setForgotOpen(false)}>
                  Close
                </button>
              </div>
            )}
            {forgotStep === 'password' && (
              <form className="stack" onSubmit={submitForgotPassword}>
                <p className="muted">Enter your email. You will receive a temporary password valid for 10 minutes.</p>
                <label className="field">
                  <span>Email</span>
                  <input
                    type="email"
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    required
                  />
                </label>
                {recoveryMessage && <p className="info">{recoveryMessage}</p>}
                <div className="row">
                  <button type="button" className="link" onClick={() => setForgotStep('menu')}>
                    Back
                  </button>
                  <button type="submit" className="primary" disabled={busy}>
                    Send email
                  </button>
                </div>
              </form>
            )}
            {forgotStep === 'userid' && (
              <form className="stack" onSubmit={submitForgotUserId}>
                <p className="muted">Enter your email. We will send your user ID for signing in.</p>
                <label className="field">
                  <span>Email</span>
                  <input
                    type="email"
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    required
                  />
                </label>
                {recoveryMessage && <p className="info">{recoveryMessage}</p>}
                <div className="row">
                  <button type="button" className="link" onClick={() => setForgotStep('menu')}>
                    Back
                  </button>
                  <button type="submit" className="primary" disabled={busy}>
                    Send email
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {changePwdOpen && token && (
        <div className="modal-backdrop" role="presentation">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pwd-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="pwd-title">Set a new password</h2>
            <p className="muted policy">
              Your new password must be at least 8 characters and include an uppercase letter, a lowercase letter, a
              number, and a special character.
            </p>
            <form className="stack" onSubmit={submitNewPassword}>
              <label className="field">
                <span>New password</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </label>
              <label className="field">
                <span>Confirm password</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </label>
              {error && <p className="error">{error}</p>}
              <button type="submit" className="primary" disabled={busy}>
                {busy ? 'Saving…' : 'Save and continue'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
