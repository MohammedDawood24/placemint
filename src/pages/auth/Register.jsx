import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { ROLE_THEME } from '../../config/roles'
import { Icons } from '../../components/Icons'

const DEPARTMENTS = ['CSE', 'ISE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'AIML', 'DS']

export default function Register() {
  const theme = ROLE_THEME.student
  const navigate = useNavigate()
  const { registerStudent } = useAuth()

  const [form, setForm] = useState({
    displayName: '', email: '', password: '', confirmPassword: '',
    usn: '', department: '', semester: '', phone: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [busy, setBusy] = useState(false)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!form.displayName || !form.email || !form.password || !form.usn || !form.department) {
      return setError('Please fill all required fields.')
    }
    if (form.password.length < 6) return setError('Password must be at least 6 characters.')
    if (form.password !== form.confirmPassword) return setError('Passwords do not match.')

    setBusy(true)
    try {
      await registerStudent(form.email, form.password, {
        displayName: form.displayName,
        usn: form.usn,
        department: form.department,
        semester: parseInt(form.semester) || 1,
        phone: form.phone,
      })
      setSuccess(true)
    } catch (err) {
      const msg = err.message || 'Registration failed.'
      if (msg.includes('email-already-in-use')) {
        setError('This email is already registered. Try signing in.')
      } else {
        setError(msg)
      }
    } finally {
      setBusy(false)
    }
  }

  if (success) {
    return (
      <div className="login">
        <div className="login-art" style={{ background: theme.gradient }}>
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
            background: `radial-gradient(50% 40% at 85% 15%, ${theme.glow}, transparent 70%)` }} />
          <div className="brand" style={{ position: 'relative', zIndex: 2 }}>
            <div className="brand-mark" style={{ background: `linear-gradient(145deg, ${theme.accent}, ${theme.accentDark})` }}>P</div>
            <div><div className="brand-name">PlaceMint</div><div className="brand-sub">Campus Placement Platform</div></div>
          </div>
          <div className="login-hero">
            <h1>Welcome to <em style={{ fontStyle: 'normal', color: theme.accent }}>PlaceMint</em>.</h1>
            <p>Your account has been created. Your HOD or coordinator will review and approve it shortly.</p>
          </div>
          <div style={{ height: 40 }} />
        </div>
        <div className="login-form" style={{ justifyContent: 'center', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: 'var(--green-soft)', color: 'var(--green)',
            display: 'grid', placeItems: 'center', margin: '0 auto 20px' }}>
            {Icons.check}
          </div>
          <h2>Registration submitted</h2>
          <p className="lede" style={{ maxWidth: 360, margin: '8px auto 24px' }}>
            Your account is pending approval. You'll be able to sign in once your HOD or placement admin approves it.
          </p>
          <Link to="/" className="btn btn-pri" style={{ textDecoration: 'none', justifyContent: 'center' }}>
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="login">
      <div className="login-art" style={{ background: theme.gradient }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `radial-gradient(50% 40% at 85% 15%, ${theme.glow}, transparent 70%)` }} />
        <div className="brand" style={{ position: 'relative', zIndex: 2 }}>
          <div className="brand-mark" style={{ background: `linear-gradient(145deg, ${theme.accent}, ${theme.accentDark})` }}>P</div>
          <div><div className="brand-name">PlaceMint</div><div className="brand-sub">Campus Placement Platform</div></div>
        </div>
        <div className="login-hero">
          <h1>Join <em style={{ fontStyle: 'normal', color: theme.accent }}>PlaceMint</em> today.</h1>
          <p>Create your profile, upload your academic records, and get matched to campus drives automatically.</p>
        </div>
        <div className="login-footer">
          <span>&copy; 2025 PlaceMint</span>
          <a href="#">Privacy &middot; Terms</a>
        </div>
      </div>

      <form className="login-form" onSubmit={handleSubmit} style={{ overflowY: 'auto' }}>
        <div className="kicker" style={{ color: theme.accent }}>Student registration</div>
        <h2>Create your account</h2>
        <p className="lede">Your account will need approval from your HOD before you can sign in.</p>

        {error && <div className="error-msg">{error}</div>}

        <div className="field">
          <label>Full name *</label>
          <input value={form.displayName} onChange={e => set('displayName', e.target.value)} placeholder="Ananya Rao" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="field">
            <label>USN *</label>
            <input value={form.usn} onChange={e => set('usn', e.target.value)} placeholder="4SH21CS012" />
          </div>
          <div className="field">
            <label>Department *</label>
            <select value={form.department} onChange={e => set('department', e.target.value)}>
              <option value="">Select</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="field">
            <label>Current semester</label>
            <select value={form.semester} onChange={e => set('semester', e.target.value)}>
              {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Phone</label>
            <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 98765 43210" />
          </div>
        </div>

        <div className="field">
          <label>Email *</label>
          <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="yourname@college.edu" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="field">
            <label>Password *</label>
            <input type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Min 6 characters" />
          </div>
          <div className="field">
            <label>Confirm password *</label>
            <input type="password" value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} placeholder="Re-enter password" />
          </div>
        </div>

        <button type="submit" className="signin" style={{ background: theme.accent }} disabled={busy}>
          {busy ? 'Creating account…' : <>Create account {Icons.arrow}</>}
        </button>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>Already registered? </span>
          <Link to="/" style={{ fontSize: 13, color: 'var(--indigo)', fontWeight: 600, textDecoration: 'none' }}>
            Sign in
          </Link>
        </div>
      </form>
    </div>
  )
}
