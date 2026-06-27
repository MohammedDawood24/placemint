import { useState, useMemo } from 'react'
import { useCollection, where, orderBy, updateDocument } from '../../hooks/useFirestore'
import { Icons, initials } from '../../components/Icons'
import { useSite } from '../../contexts/SiteContext'
import WhatsAppShare from '../../components/WhatsAppShare'
import { createUserWithEmailAndPassword, signOut, getAuth } from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { initializeApp } from 'firebase/app'
import { db } from '../../config/firebase'
import { checkDuplicateUser } from '../../utils/checkDuplicate'
import toast from 'react-hot-toast'

let secondaryAuth = null
function getSecondaryAuth() {
  if (!secondaryAuth) {
    const config = JSON.parse(JSON.stringify(db.app.options))
    const secondaryApp = initializeApp(config, 'coord-creator-' + Date.now())
    secondaryAuth = getAuth(secondaryApp)
  }
  return secondaryAuth
}

export default function AdminCoordinators() {
  const { branches } = useSite()
  const { data: coordinators, loading } = useCollection('users',
    [where('role', '==', 'coordinator')], [])
  const { data: allStudents } = useCollection('users',
    [where('role', '==', 'student'), where('approved', '==', true)], [])

  const [view, setView] = useState('list') // list | add | promote
  const [filterDept, setFilterDept] = useState('')
  const [search, setSearch] = useState('')
  const [created, setCreated] = useState(null)

  const filtered = useMemo(() => {
    return coordinators.filter(c => {
      if (filterDept && c.department !== filterDept) return false
      if (search) {
        const q = search.toLowerCase()
        return (c.displayName || '').toLowerCase().includes(q) ||
          (c.email || '').toLowerCase().includes(q) ||
          (c.department || '').toLowerCase().includes(q)
      }
      return true
    })
  }, [coordinators, filterDept, search])

  // Group by department
  const byDept = {}
  filtered.forEach(c => {
    const d = c.department || 'Unassigned'
    if (!byDept[d]) byDept[d] = []
    byDept[d].push(c)
  })

  async function handleRemove(user) {
    if (!confirm(`Remove coordinator status from ${user.displayName}? They will become a regular student.`)) return
    try {
      await updateDocument('users', user.id, { role: 'student' })
      toast.success(`${user.displayName} is now a regular student`)
    } catch (e) {
      toast.error('Failed: ' + e.message)
    }
  }

  if (created) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
        <WhatsAppShare
          name={created.name} email={created.email}
          password={created.password} phone={created.phone}
          role="coordinator"
          onDone={() => { setCreated(null); setView('list') }}
        />
      </div>
    )
  }

  if (view === 'promote') {
    return <PromoteStudent
      students={allStudents}
      branches={branches}
      onBack={() => setView('list')}
      onDone={() => setView('list')}
    />
  }

  if (view === 'add') {
    return <CreateCoordinator
      branches={branches}
      onBack={() => setView('list')}
      onCreated={(data) => { setCreated(data) }}
    />
  }

  return (
    <>
      <div className="card p" style={{ marginBottom: 16 }}>
        <div className="sec-head" style={{ marginBottom: 14 }}>
          <div>
            <h3>Coordinators</h3>
            <div className="sub">{loading ? 'Loading…' : `${coordinators.length} coordinator${coordinators.length !== 1 ? 's' : ''} across departments`}</div>
          </div>
          <div style={{ display: 'flex', gap: 9 }}>
            <button className="btn btn-ghost" onClick={() => setView('promote')}>{Icons.cap} Promote student</button>
            <button className="btn btn-pri" onClick={() => setView('add')}>{Icons.plus} Create new</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: 8,
            background: '#fbfbfe', border: '1.5px solid var(--line)', borderRadius: 10, padding: '8px 12px' }}>
            {Icons.search}
            <input placeholder="Search coordinators…" value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ border: 'none', outline: 'none', fontFamily: 'inherit', fontSize: 13,
                width: '100%', color: 'var(--ink)', background: 'transparent' }} />
          </div>
          <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 10, border: '1.5px solid var(--line)',
              fontSize: 13, fontFamily: 'inherit', background: '#fbfbfe', color: 'var(--ink)' }}>
            <option value="">All departments</option>
            {branches.map(b => <option key={b.code} value={b.code}>{b.code} — {b.name}</option>)}
          </select>
        </div>
      </div>

      {/* Coordinator cards grouped by department */}
      {filtered.length === 0 && !loading ? (
        <div className="card p" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)' }}>
          <div style={{ width: 54, height: 54, borderRadius: 14, background: 'var(--indigo-soft)',
            display: 'grid', placeItems: 'center', margin: '0 auto 14px', color: 'var(--indigo)' }}>{Icons.users}</div>
          <b style={{ display: 'block', color: 'var(--ink)', fontSize: 15, marginBottom: 5 }}>
            {search || filterDept ? 'No coordinators match your filters' : 'No coordinators assigned yet'}
          </b>
          Promote an existing student or create a new coordinator account.
        </div>
      ) : (
        Object.keys(byDept).sort().map(dept => (
          <div key={dept} style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em',
              color: 'var(--muted)', padding: '0 4px 8px' }}>
              {dept} · {byDept[dept].length} coordinator{byDept[dept].length !== 1 ? 's' : ''}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
              {byDept[dept].map(c => (
                <div className="card p" key={c.id} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{ width: 46, height: 46, borderRadius: 12, background: 'var(--indigo-soft)',
                    color: 'var(--indigo-d)', display: 'grid', placeItems: 'center', fontWeight: 700,
                    fontSize: 15, flex: '0 0 auto' }}>{initials(c.displayName)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b style={{ fontSize: 14.5, fontWeight: 600, display: 'block' }}>{c.displayName}</b>
                    <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>{c.email}</div>
                    {c.phone && <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{c.phone}</div>}
                    <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                      <span className="badge b-indigo">{c.department || '—'}</span>
                      {c.approved
                        ? <span className="badge b-green">{Icons.check} Active</span>
                        : <span className="badge b-gold">Pending</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                      {!c.approved && (
                        <button className="btn btn-pri" style={{ padding: '4px 10px', fontSize: 12 }}
                          onClick={async () => {
                            await updateDocument('users', c.id, { approved: true })
                            toast.success('Coordinator approved')
                          }}>{Icons.check} Approve</button>
                      )}
                      <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }}
                        onClick={() => handleRemove(c)}>Remove role</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </>
  )
}

// ─── PROMOTE EXISTING STUDENT ───
function PromoteStudent({ students, branches, onBack, onDone }) {
  const [search, setSearch] = useState('')
  const [filterDept, setFilterDept] = useState('')

  const filtered = useMemo(() => {
    return students.filter(s => {
      if (filterDept && s.department !== filterDept) return false
      if (search) {
        const q = search.toLowerCase()
        return (s.displayName || '').toLowerCase().includes(q) ||
          (s.email || '').toLowerCase().includes(q)
      }
      return true
    })
  }, [students, search, filterDept])

  async function handlePromote(student) {
    if (!confirm(`Promote ${student.displayName} to coordinator for ${student.department || 'their'} department?`)) return
    try {
      await updateDocument('users', student.id, { role: 'coordinator' })
      toast.success(`${student.displayName} is now a coordinator`)
      onDone()
    } catch (e) {
      toast.error('Failed: ' + e.message)
    }
  }

  return (
    <>
      <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: 16 }}>← Back to coordinators</button>

      <div className="card p">
        <div className="sec-head" style={{ marginBottom: 14 }}>
          <div>
            <h3>Promote a student to coordinator</h3>
            <div className="sub">Select an approved student to give coordinator access for their department</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: 8,
            background: '#fbfbfe', border: '1.5px solid var(--line)', borderRadius: 10, padding: '8px 12px' }}>
            {Icons.search}
            <input placeholder="Search students by name or email…" value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ border: 'none', outline: 'none', fontFamily: 'inherit', fontSize: 13,
                width: '100%', color: 'var(--ink)', background: 'transparent' }} />
          </div>
          <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 10, border: '1.5px solid var(--line)',
              fontSize: 13, fontFamily: 'inherit', background: '#fbfbfe' }}>
            <option value="">All departments</option>
            {branches.map(b => <option key={b.code} value={b.code}>{b.code}</option>)}
          </select>
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--muted)', fontSize: 13 }}>
            No eligible students found. Only approved students can be promoted.
          </div>
        ) : (
          <table className="tbl">
            <thead><tr><th>Student</th><th>Department</th><th>Email</th><th></th></tr></thead>
            <tbody>
              {filtered.slice(0, 20).map(s => (
                <tr key={s.id}>
                  <td>
                    <div className="cell-u">
                      <div className="av-sm">{initials(s.displayName)}</div>
                      <b>{s.displayName}</b>
                    </div>
                  </td>
                  <td><span className="badge b-indigo">{s.department || '—'}</span></td>
                  <td style={{ color: 'var(--muted)', fontSize: 13 }}>{s.email}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-pri" onClick={() => handlePromote(s)}
                      style={{ padding: '5px 12px', fontSize: 12 }}>{Icons.users} Promote</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {filtered.length > 20 && (
          <div style={{ textAlign: 'center', padding: '12px', color: 'var(--muted)', fontSize: 12 }}>
            Showing first 20 of {filtered.length} students — use search to narrow down
          </div>
        )}
      </div>
    </>
  )
}

// ─── CREATE NEW COORDINATOR ───
function CreateCoordinator({ branches, onBack, onCreated }) {
  const [form, setForm] = useState({
    displayName: '', email: '', password: 'Coord@123',
    department: '', phone: '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSave(e) {
    e.preventDefault()
    setError('')
    if (!form.displayName) return setError('Name is required.')
    if (!form.email) return setError('Email is required.')
    if (!form.department) return setError('Department is required.')
    if (form.password.length < 6) return setError('Password must be at least 6 characters.')

    setBusy(true)
    try {
      const dupError = await checkDuplicateUser(form.email, form.phone)
      if (dupError) { setError(dupError); setBusy(false); return }

      const secAuth = getSecondaryAuth()
      const cred = await createUserWithEmailAndPassword(secAuth, form.email, form.password)
      const uid = cred.user.uid
      await signOut(secAuth)

      await setDoc(doc(db, 'users', uid), {
        email: form.email,
        role: 'coordinator',
        displayName: form.displayName,
        department: form.department,
        phone: form.phone,
        approved: true,
        createdAt: serverTimestamp(),
      })

      onCreated({
        name: form.displayName, email: form.email,
        password: form.password, phone: form.phone,
      })
    } catch (err) {
      const msg = err.message || 'Creation failed.'
      if (msg.includes('email-already-in-use')) {
        setError('This email is already registered.')
      } else {
        setError(msg)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: 16 }}>← Back to coordinators</button>

      <form onSubmit={handleSave}>
        <div className="card p" style={{ maxWidth: 560 }}>
          <div className="sec-head">
            <h3>Create coordinator account</h3>
          </div>
          <div className="sub" style={{ marginBottom: 16, marginTop: -8 }}>
            This coordinator will be able to log in at the department portal and manage students for their branch.
          </div>

          {error && <div className="error-msg">{error}</div>}

          <div className="field">
            <label>Full name *</label>
            <input value={form.displayName} onChange={e => set('displayName', e.target.value)}
              placeholder="e.g. Priya Sharma" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <div className="field">
              <label>Email *</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                placeholder="coord.cse@college.edu" />
            </div>
            <div className="field">
              <label>Department *</label>
              <select value={form.department} onChange={e => set('department', e.target.value)}>
                <option value="">Select branch</option>
                {branches.map(b => <option key={b.code} value={b.code}>{b.code} — {b.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <div className="field">
              <label>Phone</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)}
                placeholder="+91 98765 43210" />
            </div>
            <div className="field">
              <label>Default password</label>
              <input value={form.password} onChange={e => set('password', e.target.value)} />
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                Coordinator will use this to sign in
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button type="button" className="btn btn-ghost" onClick={onBack}>Cancel</button>
            <button type="submit" className="btn btn-pri" disabled={busy}>
              {busy ? 'Creating…' : 'Create coordinator'}
            </button>
          </div>
        </div>
      </form>
    </>
  )
}
