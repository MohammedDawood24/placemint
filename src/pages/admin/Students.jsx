import { useState, useMemo, useEffect } from 'react'
import { useCollection, where, orderBy, updateDocument, addDocument } from '../../hooks/useFirestore'
import { Icons, initials } from '../../components/Icons'
import { useSite } from '../../contexts/SiteContext'
import WhatsAppShare from '../../components/WhatsAppShare'
import SemesterTable from '../../components/SemesterTable'
import { createUserWithEmailAndPassword, signOut, getAuth } from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { initializeApp } from 'firebase/app'
import { db } from '../../config/firebase'
import { checkDuplicateUser } from '../../utils/checkDuplicate'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'

// Secondary Firebase app for creating users without losing admin session
let secondaryAuth = null
function getSecondaryAuth() {
  if (!secondaryAuth) {
    const config = JSON.parse(JSON.stringify(db.app.options))
    const secondaryApp = initializeApp(config, 'user-creator-' + Date.now())
    secondaryAuth = getAuth(secondaryApp)
  }
  return secondaryAuth
}

const STATUSES = ['eligible', 'applied', 'shortlisted', 'interview', 'placed', 'blocked']
const STATUS_MAP = {
  placed: ['b-green', 'Placed'], interview: ['b-indigo', 'In interview'],
  shortlisted: ['b-gold', 'Shortlisted'], applied: ['b-indigo', 'Applied'],
  eligible: ['b-grey', 'Eligible'], blocked: ['b-rose', 'Blocked'],
}

// ─── MAIN COMPONENT ───
export default function AdminStudents() {
  const { data: students, loading } = useCollection('students', [orderBy('updatedAt', 'desc')], [])
  const { data: users } = useCollection('users', [where('role', '==', 'student')], [])
  const { branches } = useSite()

  const [view, setView] = useState('list')       // list | detail | add | edit
  const [selectedId, setSelectedId] = useState(null)
  const [search, setSearch] = useState('')
  const [filterDept, setFilterDept] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [page, setPage] = useState(1)
  const perPage = 10

  // Merge users + students
  const userMap = {}
  users.forEach(u => { userMap[u.id] = u })
  const merged = students.map(s => ({
    ...s,
    displayName: userMap[s.id]?.displayName || '—',
    email: userMap[s.id]?.email || '',
    phone: userMap[s.id]?.phone || '',
    approved: userMap[s.id]?.approved,
  }))

  // Filter + search
  const filtered = useMemo(() => {
    return merged.filter(s => {
      if (filterDept && s.department !== filterDept) return false
      if (filterStatus && s.placementStatus !== filterStatus) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          (s.displayName || '').toLowerCase().includes(q) ||
          (s.usn || '').toLowerCase().includes(q) ||
          (s.email || '').toLowerCase().includes(q) ||
          (s.department || '').toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [merged, search, filterDept, filterStatus])

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1) }, [search, filterDept, filterStatus])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const safePage = Math.min(page, totalPages)
  const paginated = filtered.slice((safePage - 1) * perPage, safePage * perPage)

  const selected = selectedId ? merged.find(s => s.id === selectedId) : null

  function handleExport() {
    const rows = filtered.map(s => ({
      'Name': s.displayName,
      'USN': s.usn || '',
      'Department': s.department || '',
      'Semester': s.semester || '',
      'CGPA': s.cgpa ?? '',
      '10th %': s.tenthMarks ?? '',
      '12th %': s.twelfthMarks ?? '',
      'Email': s.email,
      'Phone': s.phone || '',
      'Status': s.placementStatus || '',
      'Placed At': s.placedAt || '',
      'Package (LPA)': s.package ?? '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Students')
    XLSX.writeFile(wb, `PlaceMint_Students_${new Date().toISOString().slice(0,10)}.xlsx`)
    toast.success(`Exported ${rows.length} students`)
  }

  if (view === 'detail' && selected) {
    return <StudentDetail student={selected} onBack={() => { setView('list'); setSelectedId(null) }}
      onEdit={() => setView('edit')} />
  }
  if (view === 'edit' && selected) {
    return <StudentForm student={selected} onBack={() => setView('detail')}
      onSaved={() => setView('detail')} />
  }
  if (view === 'add') {
    return <StudentForm student={null} onBack={() => setView('list')}
      onSaved={() => setView('list')} />
  }

  return (
    <>
      {/* Header */}
      <div className="card p" style={{ marginBottom: 16 }}>
        <div className="sec-head" style={{ marginBottom: 14 }}>
          <div>
            <h3>All students</h3>
            <div className="sub">{loading ? 'Loading…' : `${filtered.length} of ${merged.length} students${filtered.length > perPage ? ` · page ${safePage} of ${totalPages}` : ''}`}</div>
          </div>
          <div style={{ display: 'flex', gap: 9 }}>
            <button className="btn btn-ghost" onClick={handleExport}>{Icons.dl} Export Excel</button>
            <button className="btn btn-pri" onClick={() => setView('add')}>{Icons.plus} Add student</button>
          </div>
        </div>

        {/* Search + Filters */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: 8,
            background: '#fbfbfe', border: '1.5px solid var(--line)', borderRadius: 10, padding: '8px 12px' }}>
            {Icons.search}
            <input placeholder="Search by name, USN, email..." value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ border: 'none', outline: 'none', fontFamily: 'inherit', fontSize: 13, width: '100%',
                color: 'var(--ink)', background: 'transparent' }} />
          </div>
          <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 10, border: '1.5px solid var(--line)',
              fontSize: 13, fontFamily: 'inherit', background: '#fbfbfe', color: 'var(--ink)' }}>
            <option value="">All departments</option>
            {branches.map(b => <option key={b.code} value={b.code}>{b.code} — {b.name}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 10, border: '1.5px solid var(--line)',
              fontSize: 13, fontFamily: 'inherit', background: '#fbfbfe', color: 'var(--ink)' }}>
            <option value="">All statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{STATUS_MAP[s]?.[1] || s}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card p">
        {filtered.length === 0 && !loading ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)' }}>
            <div style={{ width: 54, height: 54, borderRadius: 14, background: 'var(--indigo-soft)',
              display: 'grid', placeItems: 'center', margin: '0 auto 14px', color: 'var(--indigo)' }}>{Icons.cap}</div>
            <b style={{ display: 'block', color: 'var(--ink)', fontSize: 15, marginBottom: 5 }}>
              {search || filterDept || filterStatus ? 'No students match your filters' : 'No students yet'}
            </b>
            {!search && !filterDept && !filterStatus && 'Students will appear here after they register and get approved.'}
          </div>
        ) : (
          <>
          <table className="tbl">
            <thead>
              <tr><th>Student</th><th>Dept</th><th>Sem</th><th>CGPA</th><th>10th / 12th</th><th>Status</th><th>Package</th></tr>
            </thead>
            <tbody>
              {paginated.map(s => {
                const [badge, label] = STATUS_MAP[s.placementStatus] || ['b-grey', s.placementStatus || '—']
                return (
                  <tr key={s.id}>
                    <td>
                      <div className="cell-u" style={{ cursor: 'pointer' }}
                        onClick={() => { setSelectedId(s.id); setView('detail') }}>
                        <div className="av-sm">{initials(s.displayName)}</div>
                        <div>
                          <b style={{ color: 'var(--indigo)', textDecoration: 'underline', textDecorationColor: 'var(--indigo-soft)' }}>
                            {s.displayName}
                          </b>
                          <span className="mono">{s.usn || '—'}</span>
                        </div>
                      </div>
                    </td>
                    <td>{s.department || '—'}</td>
                    <td>{s.semester || '—'}</td>
                    <td><b className="mono">{s.cgpa ?? '—'}</b></td>
                    <td className="mono" style={{ color: 'var(--muted)' }}>
                      {s.tenthMarks ?? '—'}% · {s.twelfthMarks ?? '—'}%
                    </td>
                    <td><span className={`badge ${badge}`}>{label}</span></td>
                    <td className="mono">{s.package ? `₹${s.package}L` : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              paddingTop: 16, marginTop: 16, borderTop: '1px solid var(--line)' }}>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                Showing {(safePage - 1) * perPage + 1}–{Math.min(safePage * perPage, filtered.length)} of {filtered.length}
              </span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button className="btn btn-ghost" disabled={safePage <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  style={{ padding: '6px 12px', fontSize: 13 }}>← Prev</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                  .reduce((acc, p, i, arr) => {
                    if (i > 0 && p - arr[i - 1] > 1) acc.push('...')
                    acc.push(p)
                    return acc
                  }, [])
                  .map((p, i) =>
                    p === '...'
                      ? <span key={'dot' + i} style={{ padding: '6px 4px', fontSize: 13, color: 'var(--muted)' }}>…</span>
                      : <button key={p} className={`btn ${p === safePage ? 'btn-pri' : 'btn-ghost'}`}
                          onClick={() => setPage(p)}
                          style={{ padding: '6px 12px', fontSize: 13, minWidth: 36 }}>{p}</button>
                  )}
                <button className="btn btn-ghost" disabled={safePage >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  style={{ padding: '6px 12px', fontSize: 13 }}>Next →</button>
              </div>
            </div>
          )}
          </>
        )}
      </div>
    </>
  )
}

// ─── WHATSAPP HELPER ───
function formatPhone(phone) {
  if (!phone) return ''
  let cleaned = phone.replace(/[\s\-()]/g, '').replace(/^\+/, '')
  if (cleaned.startsWith('0')) cleaned = '91' + cleaned.slice(1)
  if (cleaned.length === 10) cleaned = '91' + cleaned
  return cleaned
}

function buildWaUrl(s) {
  const msg = `Hello ${s.displayName},

Here are your *PlaceMint* login details:

🔗 Portal: placemint.com
📧 Email: ${s.email}

Use the password shared with you earlier. If you've forgotten it, use the reset option on the login page.

— Placement Cell`
  const waPhone = formatPhone(s.phone)
  return waPhone
    ? `https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`
    : `https://wa.me/?text=${encodeURIComponent(msg)}`
}

// ─── STUDENT DETAIL VIEW ───
function StudentDetail({ student, onBack, onEdit }) {
  const s = student
  const [badge, label] = STATUS_MAP[s.placementStatus] || ['b-grey', '—']
  const semesters = s.semesters || {}
  const semKeys = Object.keys(semesters).sort()

  return (
    <>
      <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: 16 }}>
        ← Back to students
      </button>

      {/* Header card */}
      <div className="card p" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--indigo-soft)',
            color: 'var(--indigo-d)', display: 'grid', placeItems: 'center', fontWeight: 700,
            fontSize: 18, flex: '0 0 auto' }}>{initials(s.displayName)}</div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 2px',
              fontFamily: "'Space Grotesk', sans-serif" }}>{s.displayName}</h3>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
              <span className="mono">{s.usn || '—'}</span> · {s.department || '—'} · Semester {s.semester || '—'}
            </div>
          </div>
          <span className={`badge ${badge}`} style={{ fontSize: 13, padding: '5px 12px' }}>{label}</span>
          <a href={buildWaUrl(s)} target="_blank" rel="noreferrer"
            className="btn" style={{ background: '#25D366', color: '#fff', borderColor: '#25D366', textDecoration: 'none' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            WhatsApp
          </a>
          <button className="btn btn-pri" onClick={onEdit}>{Icons.gear} Edit</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Personal info */}
        <div className="card p">
          <div className="sec-head"><h3>Personal information</h3></div>
          <InfoRow label="Full name" value={s.displayName} />
          <InfoRow label="USN" value={s.usn} mono />
          <InfoRow label="Email" value={s.email} />
          <InfoRow label="Phone" value={s.phone} />
          <InfoRow label="Department" value={s.department} />
          <InfoRow label="Semester" value={s.semester} />
        </div>

        {/* Placement info */}
        <div className="card p">
          <div className="sec-head"><h3>Placement details</h3></div>
          <InfoRow label="Status" value={<span className={`badge ${badge}`}>{label}</span>} />
          <InfoRow label="Placed at" value={s.placedAt || '—'} />
          <InfoRow label="Package" value={s.package ? `₹${s.package} LPA` : '—'} />
          <InfoRow label="CGPA" value={s.cgpa ?? '—'} mono />
          <InfoRow label="10th marks" value={s.tenthMarks != null ? `${s.tenthMarks}%` : '—'} mono />
          <InfoRow label="12th marks" value={s.twelfthMarks != null ? `${s.twelfthMarks}%` : '—'} mono />
        </div>

        {/* Semester-wise marks — inline editable with approval */}
        <SemesterTable student={s} isAdmin={true} />
      </div>
    </>
  )
}

function InfoRow({ label, value, mono }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
      <span style={{ fontSize: 13, color: 'var(--muted)' }}>{label}</span>
      <span style={{ fontSize: 13.5, fontWeight: 500 }}
        className={mono ? 'mono' : ''}>
        {typeof value === 'string' || typeof value === 'number' ? (value || '—') : value}
      </span>
    </div>
  )
}

// ─── ADD / EDIT STUDENT FORM ───
function StudentForm({ student, onBack, onSaved }) {
  const isEdit = !!student
  const { branches } = useSite()

  const [form, setForm] = useState({
    displayName: student?.displayName || '',
    email: student?.email || '',
    password: 'Student@123',
    usn: student?.usn || '',
    department: student?.department || '',
    semester: student?.semester || 1,
    phone: student?.phone || '',
    tenthMarks: student?.tenthMarks ?? '',
    twelfthMarks: student?.twelfthMarks ?? '',
    cgpa: student?.cgpa ?? '',
    placementStatus: student?.placementStatus || 'eligible',
    placedAt: student?.placedAt || '',
    package: student?.package ?? '',
    // Semester-wise marks
    sem1: student?.semesters?.sem1?.marks ?? '', sem2: student?.semesters?.sem2?.marks ?? '',
    sem3: student?.semesters?.sem3?.marks ?? '', sem4: student?.semesters?.sem4?.marks ?? '',
    sem5: student?.semesters?.sem5?.marks ?? '', sem6: student?.semesters?.sem6?.marks ?? '',
    sem7: student?.semesters?.sem7?.marks ?? '', sem8: student?.semesters?.sem8?.marks ?? '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [created, setCreated] = useState(null) // { name, email, password, phone } after successful creation

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSave(e) {
    e.preventDefault()
    setError('')

    if (!form.displayName) return setError('Name is required.')
    if (!isEdit && !form.email) return setError('Email is required.')
    if (!form.usn) return setError('USN is required.')
    if (!form.department) return setError('Department is required.')

    setBusy(true)
    try {
      // Check for duplicate email/phone before creating
      if (!isEdit || (isEdit && form.phone !== student.phone)) {
        const dupError = await checkDuplicateUser(
          isEdit ? null : form.email,
          form.phone,
          isEdit ? student.id : null
        )
        if (dupError) { setError(dupError); setBusy(false); return }
      }
      // Build semesters map
      const semesters = {}
      for (let i = 1; i <= 8; i++) {
        const val = form[`sem${i}`]
        if (val !== '') {
          const existing = student?.semesters?.[`sem${i}`] || {}
          semesters[`sem${i}`] = {
            marks: parseFloat(val),
            backlogs: existing.backlogs || [],
            verified: isAdmin ? 'approved' : (existing.verified || 'pending'),
            approvalComment: existing.approvalComment || '',
            cardUrl: existing.cardUrl || null,
            lastEditedBy: isAdmin ? 'admin' : 'student',
          }
        }
      }

      const studentData = {
        usn: form.usn,
        department: form.department,
        semester: parseInt(form.semester) || 1,
        tenthMarks: form.tenthMarks !== '' ? parseFloat(form.tenthMarks) : null,
        twelfthMarks: form.twelfthMarks !== '' ? parseFloat(form.twelfthMarks) : null,
        cgpa: form.cgpa !== '' ? parseFloat(form.cgpa) : null,
        semesters,
        placementStatus: form.placementStatus,
        placedAt: form.placedAt || null,
        package: form.package !== '' ? parseFloat(form.package) : null,
        profileComplete: !!(form.tenthMarks && form.twelfthMarks && form.cgpa && form.usn),
        updatedAt: serverTimestamp(),
      }

      if (isEdit) {
        // Update existing student
        await updateDocument('students', student.id, studentData)
        await updateDocument('users', student.id, {
          displayName: form.displayName,
          department: form.department,
          phone: form.phone,
        })
        toast.success('Student updated')
        onSaved()
      } else {
        // Create new student — use secondary auth to not lose admin session
        const secAuth = getSecondaryAuth()
        const cred = await createUserWithEmailAndPassword(secAuth, form.email, form.password)
        const uid = cred.user.uid
        await signOut(secAuth)

        // Write user doc
        await setDoc(doc(db, 'users', uid), {
          email: form.email,
          role: 'student',
          displayName: form.displayName,
          department: form.department,
          phone: form.phone,
          approved: true,  // Admin-created students are auto-approved
          createdAt: serverTimestamp(),
        })

        // Write student doc
        await setDoc(doc(db, 'students', uid), {
          ...studentData,
          createdAt: serverTimestamp(),
        })

        // Show WhatsApp share screen instead of going back
        setCreated({ name: form.displayName, email: form.email, password: form.password, phone: form.phone })
      }
    } catch (err) {
      const msg = err.message || 'Save failed.'
      if (msg.includes('email-already-in-use')) {
        setError('This email is already registered.')
      } else {
        setError(msg)
      }
    } finally {
      setBusy(false)
    }
  }

  // Show WhatsApp share screen after successful creation
  if (created) {
    return (
      <>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
          <WhatsAppShare
            name={created.name}
            email={created.email}
            password={created.password}
            phone={created.phone}
            role="student"
            onDone={onSaved}
          />
        </div>
      </>
    )
  }

  return (
    <>
      <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: 16 }}>
        ← {isEdit ? 'Back to details' : 'Back to students'}
      </button>

      <form onSubmit={handleSave}>
        <div className="card p" style={{ marginBottom: 16 }}>
          <div className="sec-head">
            <h3>{isEdit ? 'Edit student' : 'Add new student'}</h3>
          </div>

          {error && <div className="error-msg">{error}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
            <div className="field">
              <label>Full name *</label>
              <input value={form.displayName} onChange={e => set('displayName', e.target.value)} placeholder="Ananya Rao" />
            </div>
            {!isEdit && (
              <div className="field">
                <label>Email *</label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="student@college.edu" />
              </div>
            )}
            {isEdit && (
              <div className="field">
                <label>Email</label>
                <input value={form.email} disabled style={{ opacity: 0.6 }} />
              </div>
            )}
            <div className="field">
              <label>USN *</label>
              <input value={form.usn} onChange={e => set('usn', e.target.value)} placeholder="4SH21CS012" />
            </div>
            <div className="field">
              <label>Department *</label>
              <select value={form.department} onChange={e => set('department', e.target.value)}>
                <option value="">Select</option>
                {branches.map(b => <option key={b.code} value={b.code}>{b.code} — {b.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Semester</label>
              <select value={form.semester} onChange={e => set('semester', e.target.value)}>
                {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Phone</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 98765 43210" />
            </div>
            {!isEdit && (
              <div className="field">
                <label>Default password</label>
                <input value={form.password} onChange={e => set('password', e.target.value)} />
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                  Student will use this to sign in the first time
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Academic marks */}
        <div className="card p" style={{ marginBottom: 16 }}>
          <div className="sec-head"><h3>Academic record</h3></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 20px' }}>
            <div className="field">
              <label>10th marks (%)</label>
              <input type="number" value={form.tenthMarks} onChange={e => set('tenthMarks', e.target.value)}
                placeholder="92" min="0" max="100" step="0.1" />
            </div>
            <div className="field">
              <label>12th / PUC marks (%)</label>
              <input type="number" value={form.twelfthMarks} onChange={e => set('twelfthMarks', e.target.value)}
                placeholder="88" min="0" max="100" step="0.1" />
            </div>
            <div className="field">
              <label>CGPA</label>
              <input type="number" value={form.cgpa} onChange={e => set('cgpa', e.target.value)}
                placeholder="8.5" min="0" max="10" step="0.01" />
            </div>
          </div>

          <div className="sec-head" style={{ marginTop: 10 }}>
            <h3>Semester-wise SGPA</h3>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>Backlogs can be managed from the student detail view after creation</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0 16px' }}>
            {[1,2,3,4,5,6,7,8].map(i => (
              <div className="field" key={i}>
                <label>Sem {i}</label>
                <input type="number" value={form[`sem${i}`]} onChange={e => set(`sem${i}`, e.target.value)}
                  placeholder="—" min="0" max="10" step="0.01" />
              </div>
            ))}
          </div>
        </div>

        {/* Placement status */}
        <div className="card p" style={{ marginBottom: 16 }}>
          <div className="sec-head"><h3>Placement status</h3></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 20px' }}>
            <div className="field">
              <label>Status</label>
              <select value={form.placementStatus} onChange={e => set('placementStatus', e.target.value)}>
                {STATUSES.map(s => <option key={s} value={s}>{STATUS_MAP[s]?.[1] || s}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Placed at (company)</label>
              <input value={form.placedAt} onChange={e => set('placedAt', e.target.value)} placeholder="Bosch" />
            </div>
            <div className="field">
              <label>Package (LPA)</label>
              <input type="number" value={form.package} onChange={e => set('package', e.target.value)}
                placeholder="12.5" min="0" step="0.1" />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" className="btn btn-ghost" onClick={onBack}>Cancel</button>
          <button type="submit" className="btn btn-pri" disabled={busy}>
            {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Create student'}
          </button>
        </div>
      </form>
    </>
  )
}
