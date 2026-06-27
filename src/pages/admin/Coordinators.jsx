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
    const secondaryApp = initializeApp(config, 'dept-creator-' + Date.now())
    secondaryAuth = getAuth(secondaryApp)
  }
  return secondaryAuth
}

export default function AdminCoordinators() {
  const { branches } = useSite()
  const { data: allUsers, loading } = useCollection('users', [], [])

  const [view, setView] = useState('departments') // departments | dept-detail | create-hod | create-coord
  const [selectedDept, setSelectedDept] = useState(null)
  const [created, setCreated] = useState(null)

  const hods = allUsers.filter(u => u.role === 'hod')
  const coordinators = allUsers.filter(u => u.role === 'coordinator')
  // Only pure students — exclude anyone who is also an HOD or coordinator
  const hodAndCoordIds = new Set([...hods.map(h => h.id), ...coordinators.map(c => c.id)])
  const students = allUsers.filter(u =>
    u.role === 'student' && (u.approved === true || u.approved === 'true') && !hodAndCoordIds.has(u.id)
  )

  function hodForDept(code) { return hods.find(h => (h.department || '').trim().toUpperCase() === code.toUpperCase()) }
  function coordsForDept(code) { return coordinators.filter(c => (c.department || '').trim().toUpperCase() === code.toUpperCase()) }
  function studentsForDept(code) { return students.filter(s => (s.department || '').trim().toUpperCase() === code.toUpperCase()) }

  // WhatsApp share screen after creation
  if (created) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
        <WhatsAppShare
          name={created.name} email={created.email}
          password={created.password} phone={created.phone}
          role={created.role}
          onDone={() => { setCreated(null); setView(selectedDept ? 'dept-detail' : 'departments') }}
        />
      </div>
    )
  }

  if (view === 'create-hod') {
    return <CreateAccount
      role="hod" roleLabel="HOD" department={selectedDept}
      branches={branches} onBack={() => setView('dept-detail')}
      onCreated={data => setCreated({ ...data, role: 'hod' })}
    />
  }

  if (view === 'create-coord') {
    return <CreateAccount
      role="coordinator" roleLabel="Coordinator" department={selectedDept}
      branches={branches} onBack={() => setView('dept-detail')}
      onCreated={data => setCreated({ ...data, role: 'coordinator' })}
    />
  }

  if (view === 'dept-detail' && selectedDept) {
    return <DeptDetail
      deptCode={selectedDept}
      branches={branches}
      hod={hodForDept(selectedDept)}
      coords={coordsForDept(selectedDept)}
      students={studentsForDept(selectedDept)}
      allUsers={allUsers}
      onBack={() => { setView('departments'); setSelectedDept(null) }}
      onCreateHod={() => setView('create-hod')}
      onCreateCoord={() => setView('create-coord')}
    />
  }

  // ─── DEPARTMENT OVERVIEW ───
  return (
    <>
      <div className="sec-head" style={{ marginBottom: 16 }}>
        <div>
          <h3>Department Management</h3>
          <div className="sub">Manage HODs and student coordinators for each branch</div>
        </div>
      </div>

      {loading ? (
        <div className="loading-screen" style={{ minHeight: 200 }}><div className="spinner" /></div>
      ) : branches.length === 0 ? (
        <div className="card p" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)' }}>
          <div style={{ width: 54, height: 54, borderRadius: 14, background: 'var(--indigo-soft)',
            display: 'grid', placeItems: 'center', margin: '0 auto 14px', color: 'var(--indigo)' }}>{Icons.cap}</div>
          <b style={{ display: 'block', color: 'var(--ink)', fontSize: 15, marginBottom: 5 }}>No branches configured</b>
          Go to Site Settings → Branches to add your college's departments first.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
          {branches.map(b => {
            const hod = hodForDept(b.code)
            const coords = coordsForDept(b.code)
            const stuCount = studentsForDept(b.code).length
            return (
              <div className="card" key={b.code}
                style={{ cursor: 'pointer', transition: '.15s', overflow: 'hidden' }}
                onClick={() => { setSelectedDept(b.code); setView('dept-detail') }}
                onMouseOver={e => e.currentTarget.style.borderColor = 'var(--indigo)'}
                onMouseOut={e => e.currentTarget.style.borderColor = ''}>
                {/* Header bar */}
                <div style={{ background: 'var(--indigo-soft)', padding: '12px 18px',
                  borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <b style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif",
                    color: 'var(--indigo-d)' }}>{b.code}</b>
                  <span style={{ fontSize: 13, color: 'var(--muted)', flex: 1 }}>{b.name}</span>
                  <span style={{ fontSize: 12, color: 'var(--indigo)' }}>→</span>
                </div>
                <div style={{ padding: '14px 18px' }}>
                  {/* HOD */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    {hod ? (
                      <>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--green-soft)',
                          color: 'var(--green)', display: 'grid', placeItems: 'center', fontWeight: 700,
                          fontSize: 12, flex: '0 0 auto' }}>{initials(hod.displayName)}</div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{hod.displayName}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)' }}>HOD</div>
                        </div>
                        <span className="badge b-green" style={{ marginLeft: 'auto', fontSize: 10 }}>
                          {Icons.check} Active
                        </span>
                      </>
                    ) : (
                      <>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: '#eef0f5',
                          color: 'var(--muted)', display: 'grid', placeItems: 'center', fontSize: 14,
                          flex: '0 0 auto' }}>?</div>
                        <span style={{ fontSize: 13, color: 'var(--muted)' }}>No HOD assigned</span>
                      </>
                    )}
                  </div>
                  {/* Stats */}
                  <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                    <span style={{ color: 'var(--muted)' }}>
                      <b style={{ color: 'var(--ink)', fontWeight: 600 }}>{coords.length}</b> coordinator{coords.length !== 1 ? 's' : ''}
                    </span>
                    <span style={{ color: 'var(--muted)' }}>
                      <b style={{ color: 'var(--ink)', fontWeight: 600 }}>{stuCount}</b> student{stuCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

// ─── DEPARTMENT DETAIL VIEW ───
function DeptDetail({ deptCode, branches, hod, coords, students: rawStudents, allUsers, onBack, onCreateHod, onCreateCoord }) {
  const [showStudents, setShowStudents] = useState(false)
  const [search, setSearch] = useState('')
  const branchName = branches.find(b => b.code === deptCode)?.name || deptCode

  // Defensive: only students for THIS department, excluding HOD/coordinators
  const hodAndCoordIds = new Set([
    ...(hod ? [hod.id] : []),
    ...coords.map(c => c.id),
  ])
  const students = rawStudents.filter(s =>
    (s.department || '').trim().toUpperCase() === deptCode.toUpperCase() && !hodAndCoordIds.has(s.id)
  )

  const filteredStudents = useMemo(() => {
    if (!search) return students
    const q = search.toLowerCase()
    return students.filter(s =>
      (s.displayName || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q)
    )
  }, [students, search])

  async function removeHod(user) {
    if (!confirm(`Remove HOD access from ${user.displayName}?`)) return
    try {
      await updateDocument('users', user.id, { role: 'student' })
      toast.success('HOD access removed')
    } catch (e) { toast.error('Failed: ' + e.message) }
  }

  async function removeCoord(user) {
    if (!confirm(`Remove coordinator status from ${user.displayName}? They become a regular student.`)) return
    try {
      await updateDocument('users', user.id, { role: 'student' })
      toast.success('Coordinator removed')
    } catch (e) { toast.error('Failed: ' + e.message) }
  }

  async function promoteToCoord(user) {
    if (!confirm(`Make ${user.displayName} a student coordinator for ${deptCode}?`)) return
    try {
      await updateDocument('users', user.id, { role: 'coordinator' })
      toast.success(`${user.displayName} is now a coordinator`)
    } catch (e) { toast.error('Failed: ' + e.message) }
  }

  async function promoteStudentToHod(user) {
    if (!confirm(`Assign ${user.displayName} as HOD for ${deptCode}? This gives them full department control.`)) return
    try {
      await updateDocument('users', user.id, { role: 'hod' })
      toast.success(`${user.displayName} is now HOD`)
    } catch (e) { toast.error('Failed: ' + e.message) }
  }

  return (
    <>
      <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: 16 }}>← Back to departments</button>

      {/* Department header */}
      <div className="card p" style={{ marginBottom: 16, background: 'var(--indigo-soft)', border: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--indigo)',
            color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700,
            fontSize: 22, fontFamily: "'Space Grotesk', sans-serif", flex: '0 0 auto' }}>{deptCode[0]}</div>
          <div>
            <h3 style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif",
              margin: '0 0 2px' }}>{deptCode}</h3>
            <div style={{ fontSize: 14, color: 'var(--indigo-d)' }}>{branchName}</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 16, textAlign: 'center' }}>
            <div><div style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)' }}>{students.length}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Students</div></div>
            <div><div style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)' }}>{coords.length}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Coordinators</div></div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* HOD Card */}
        <div className="card p">
          <div className="sec-head">
            <h3>Department HOD</h3>
            {!hod && <button className="btn btn-pri" onClick={onCreateHod}
              style={{ padding: '5px 12px', fontSize: 12 }}>{Icons.plus} Assign HOD</button>}
          </div>

          {hod ? (
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--green-soft)',
                color: 'var(--green)', display: 'grid', placeItems: 'center', fontWeight: 700,
                fontSize: 16, flex: '0 0 auto' }}>{initials(hod.displayName)}</div>
              <div style={{ flex: 1 }}>
                <b style={{ fontSize: 15, fontWeight: 600, display: 'block' }}>{hod.displayName}</b>
                <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>{hod.email}</div>
                {hod.phone && <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{hod.phone}</div>}
                <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                  {hod.approved
                    ? <span className="badge b-green">{Icons.check} Active</span>
                    : <button className="btn btn-pri" style={{ padding: '4px 10px', fontSize: 12 }}
                        onClick={async () => { await updateDocument('users', hod.id, { approved: true }); toast.success('Approved') }}>
                        {Icons.check} Approve
                      </button>}
                  <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }}
                    onClick={() => removeHod(hod)}>Remove</button>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--muted)', fontSize: 13 }}>
              No HOD assigned to this department. Create a new HOD account or promote from the student list below.
            </div>
          )}

          {!hod && (
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 12, borderTop: '1px solid var(--line)',
              paddingTop: 12 }}>
              HODs can approve student registrations, manage activities, and view department placement reports.
              They log in at <b>/department</b>.
            </div>
          )}
        </div>

        {/* Student Coordinators Card */}
        <div className="card p">
          <div className="sec-head">
            <h3>Student Coordinators</h3>
            <button className="btn btn-ghost" onClick={onCreateCoord}
              style={{ padding: '5px 12px', fontSize: 12 }}>{Icons.plus} Create new</button>
          </div>

          {coords.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--muted)', fontSize: 13 }}>
              No coordinators assigned. Select students from the list below or create a new account.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {coords.map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', background: '#fafbff', borderRadius: 10, border: '1px solid var(--line)' }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--indigo-soft)',
                    color: 'var(--indigo-d)', display: 'grid', placeItems: 'center', fontWeight: 700,
                    fontSize: 12, flex: '0 0 auto' }}>{initials(c.displayName)}</div>
                  <div style={{ flex: 1 }}>
                    <b style={{ fontSize: 13.5, fontWeight: 600 }}>{c.displayName}</b>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{c.email}</div>
                  </div>
                  {c.approved
                    ? <span className="badge b-green" style={{ fontSize: 10 }}>{Icons.check}</span>
                    : <button className="btn btn-pri" style={{ padding: '3px 8px', fontSize: 11 }}
                        onClick={async () => { await updateDocument('users', c.id, { approved: true }); toast.success('Approved') }}>
                        Approve</button>}
                  <button onClick={() => removeCoord(c)}
                    style={{ background: 'none', border: 'none', color: 'var(--rose)', cursor: 'pointer',
                      fontSize: 14, padding: '2px 6px' }}>×</button>
                </div>
              ))}
            </div>
          )}

          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 12, borderTop: '1px solid var(--line)',
            paddingTop: 12 }}>
            Coordinators help collect data from their classmates. They log in at <b>/department</b> with limited access.
          </div>
        </div>
      </div>

      {/* Student List */}
      <div className="card p">
        <div className="sec-head" style={{ marginBottom: showStudents ? 14 : 0 }}>
          <div style={{ cursor: 'pointer' }} onClick={() => setShowStudents(!showStudents)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, color: 'var(--muted)', transition: '.15s',
                transform: showStudents ? 'rotate(90deg)' : 'none', display: 'inline-block' }}>▶</span>
              <h3>{deptCode} Students</h3>
            </div>
            <div className="sub">{students.length} approved students · click to {showStudents ? 'collapse' : 'expand and assign roles'}</div>
          </div>
        </div>

        {showStudents && (
          <>
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8,
                background: '#fbfbfe', border: '1.5px solid var(--line)', borderRadius: 10, padding: '8px 12px' }}>
                {Icons.search}
                <input placeholder="Search students…" value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ border: 'none', outline: 'none', fontFamily: 'inherit', fontSize: 13,
                    width: '100%', color: 'var(--ink)', background: 'transparent' }} />
              </div>
            </div>

            {filteredStudents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--muted)', fontSize: 13 }}>
                {search ? 'No students match your search.' : 'No approved students in this department yet.'}
              </div>
            ) : (
              <table className="tbl">
                <thead><tr><th>Student</th><th>Email</th><th>Dept</th><th>Phone</th><th></th></tr></thead>
                <tbody>
                  {filteredStudents.map(s => (
                    <tr key={s.id}>
                      <td>
                        <div className="cell-u">
                          <div className="av-sm">{initials(s.displayName)}</div>
                          <b>{s.displayName}</b>
                        </div>
                      </td>
                      <td style={{ color: 'var(--muted)', fontSize: 13 }}>{s.email}</td>
                      <td><span className="badge b-indigo" style={{ fontSize: 10 }}>{s.department || '—'}</span></td>
                      <td style={{ color: 'var(--muted)', fontSize: 13 }}>{s.phone || '—'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button className="btn btn-ghost" onClick={() => promoteToCoord(s)}
                            style={{ padding: '4px 10px', fontSize: 11 }}>{Icons.users} Make coordinator</button>
                          {!hod && (
                            <button className="btn btn-pri" onClick={() => promoteStudentToHod(s)}
                              style={{ padding: '4px 10px', fontSize: 11 }}>{Icons.cap} Make HOD</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </>
  )
}

// ─── CREATE HOD / COORDINATOR ACCOUNT ───
function CreateAccount({ role, roleLabel, department, branches, onBack, onCreated }) {
  const [form, setForm] = useState({
    displayName: '', email: '', password: role === 'hod' ? 'Hod@123' : 'Coord@123',
    department: department || '', phone: '',
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
      await signOut(secAuth)

      await setDoc(doc(db, 'users', cred.user.uid), {
        email: form.email, role,
        displayName: form.displayName, department: form.department,
        phone: form.phone, approved: true, createdAt: serverTimestamp(),
      })

      onCreated({ name: form.displayName, email: form.email, password: form.password, phone: form.phone })
    } catch (err) {
      const msg = err.message || 'Creation failed.'
      setError(msg.includes('email-already-in-use') ? 'This email is already registered.' : msg)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: 16 }}>← Back to department</button>
      <form onSubmit={handleSave}>
        <div className="card p" style={{ maxWidth: 520 }}>
          <div className="sec-head"><h3>Create {roleLabel} account</h3></div>
          <div className="sub" style={{ marginBottom: 16, marginTop: -8 }}>
            {role === 'hod'
              ? 'This HOD will have full control over their department — approvals, activities, reports.'
              : 'This coordinator will help collect student data for their department.'}
          </div>

          {error && <div className="error-msg">{error}</div>}

          <div className="field">
            <label>Full name *</label>
            <input value={form.displayName} onChange={e => set('displayName', e.target.value)}
              placeholder={role === 'hod' ? 'e.g. Dr. Vasudha M' : 'e.g. Priya Sharma'} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <div className="field">
              <label>Email *</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                placeholder={`${role}.${(form.department || 'dept').toLowerCase()}@college.edu`} />
            </div>
            <div className="field">
              <label>Department *</label>
              <select value={form.department} onChange={e => set('department', e.target.value)}>
                <option value="">Select</option>
                {branches.map(b => <option key={b.code} value={b.code}>{b.code} — {b.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <div className="field">
              <label>Phone</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 98765 43210" />
            </div>
            <div className="field">
              <label>Default password</label>
              <input value={form.password} onChange={e => set('password', e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button type="button" className="btn btn-ghost" onClick={onBack}>Cancel</button>
            <button type="submit" className="btn btn-pri" disabled={busy}>
              {busy ? 'Creating…' : `Create ${roleLabel.toLowerCase()}`}
            </button>
          </div>
        </div>
      </form>
    </>
  )
}
