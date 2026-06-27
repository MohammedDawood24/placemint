import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { ROLE_THEME } from '../../config/roles'
import { Icons } from '../../components/Icons'

export default function Login({ portalRole }) {
  const theme = ROLE_THEME[portalRole]
  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const others = [
    { id: 'student', label: 'Student', path: '/', color: '#E0A43B' },
    { id: 'hod', label: 'Department', path: '/department', color: '#4C5BD4' },
    { id: 'company', label: 'Company', path: '/company', color: '#15A86B' },
    { id: 'admin', label: 'Admin', path: '/admin', color: '#E5575B' },
  ].filter(p => p.id !== portalRole)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email || !password) return setError('Enter your email and password.')
    setError('')
    setBusy(true)
    try {
      await login(email, password, portalRole)
      // App.jsx auto-redirects to /dashboard once userData is set
    } catch (err) {
      const msg = err.message || 'Sign in failed.'
      if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password') || msg.includes('auth/user-not-found')) {
        setError('Invalid email or password.')
      } else {
        setError(msg)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login">
      {/* ---- art / left panel ---- */}
      <div className="login-art" style={{ background: theme.gradient }}>
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `radial-gradient(50% 40% at 85% 15%, ${theme.glow}, transparent 70%)`
        }} />

        <div className="brand">
          <div className="brand-mark" style={{
            background: `linear-gradient(145deg, ${theme.accent}, ${theme.accentDark})`
          }}>P</div>
          <div>
            <div className="brand-name">PlaceMint</div>
            <div className="brand-sub">Campus Placement Platform</div>
          </div>
        </div>

        <div className="login-hero">
          <h1>
            {theme.headline[0]}
            <em style={{ fontStyle: 'normal', color: theme.accent }}>{theme.headline[1]}</em>
            {theme.headline[2]}
          </h1>
          <p>{theme.lead}</p>
        </div>

        {/* pipeline */}
        <div className="pipe">
          <div className="pipe-label">{theme.pipelineCaption}</div>
          <div className="pipe-rail">
            {theme.pipelineLabels.map((s, i, a) => (
              <span key={s} style={{ display: 'contents' }}>
                {i > 0 && <div className={`pipe-line ${i <= a.length - 1 ? 'on' : ''}`} />}
                <div className="pipe-node">
                  <div
                    className={`pipe-dot ${i === a.length - 1 ? 'win' : 'on'}`}
                    style={i === a.length - 1 ? {
                      background: `linear-gradient(145deg, ${theme.accent}, ${theme.accentDark})`,
                      width: 24, height: 24, display: 'grid', placeItems: 'center'
                    } : {}}
                  >
                    {i === a.length - 1 && Icons.check}
                  </div>
                  <div
                    className={`pipe-cap ${i === a.length - 1 ? 'win' : ''}`}
                    style={i === a.length - 1 ? { color: theme.accent } : {}}
                  >{s}</div>
                </div>
              </span>
            ))}
          </div>
        </div>

        <div className="login-footer">
          <span>&copy; 2025 PlaceMint</span>
          <a href="#">Privacy &middot; Terms</a>
        </div>
      </div>

      {/* ---- form / right panel ---- */}
      <form className="login-form" onSubmit={handleSubmit}>
        <div className="kicker" style={{ color: theme.accent }}>{theme.kicker}</div>
        <h2>Sign in to continue</h2>
        <p className="lede">
          {portalRole === 'student' && 'Use the credentials shared by your placement cell or coordinator.'}
          {portalRole === 'hod' && 'HODs and coordinators — sign in with your department account.'}
          {portalRole === 'company' && 'Welcome back. Sign in with your recruiter credentials.'}
          {portalRole === 'admin' && 'Placement cell administrators only. Restricted access.'}
        </p>

        {error && <div className="error-msg">{error}</div>}

        <div className="field">
          <label>Email address</label>
          <input
            type="email"
            placeholder={theme.emailPlaceholder}
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>

        <div className="field" style={{ position: 'relative' }}>
          <label>Password</label>
          <input
            type={showPw ? 'text' : 'password'}
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPw(!showPw)}
            style={{
              position: 'absolute', right: 12, top: 33, background: 'none',
              border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4
            }}
          >{showPw ? Icons.eye : Icons.lock}</button>
        </div>

        <button
          type="submit"
          className="signin"
          style={{ background: theme.accent }}
          disabled={busy}
        >
          {busy ? 'Signing in…' : <>Sign in {Icons.arrow}</>}
        </button>

        <div className="forgot"><a href="#">Forgot password?</a></div>

        {/* Student registration link */}
        {portalRole === 'student' && (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>New student? </span>
            <Link to="/register" style={{ fontSize: 13, color: 'var(--indigo)', fontWeight: 600, textDecoration: 'none' }}>
              Create an account
            </Link>
          </div>
        )}

        {/* Portal switcher */}
        <div className="portal-links">
          <p>Looking for a different portal?</p>
          <div className="portal-grid">
            {others.map(o => (
              <Link key={o.id} to={o.path} className="portal-chip">
                <span className="pc-dot" style={{ background: o.color }} />
                <span>{o.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </form>
    </div>
  )
}
