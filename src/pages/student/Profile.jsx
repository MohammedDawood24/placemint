import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useDocument, updateDocument } from '../../hooks/useFirestore'
import { Icons } from '../../components/Icons'
import toast from 'react-hot-toast'

export default function StudentProfile() {
  const { userData } = useAuth()
  const { data: student, loading } = useDocument('students', userData?.id)

  const [form, setForm] = useState({
    tenthMarks: '', twelfthMarks: '', cgpa: '',
    usn: '', department: '', semester: '', phone: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (student) {
      setForm({
        tenthMarks: student.tenthMarks ?? '',
        twelfthMarks: student.twelfthMarks ?? '',
        cgpa: student.cgpa ?? '',
        usn: student.usn || '',
        department: student.department || '',
        semester: student.semester || '',
        phone: userData?.phone || '',
      })
    }
  }, [student]) // eslint-disable-line

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSave() {
    setSaving(true)
    try {
      await updateDocument('students', userData.id, {
        tenthMarks: form.tenthMarks ? parseFloat(form.tenthMarks) : null,
        twelfthMarks: form.twelfthMarks ? parseFloat(form.twelfthMarks) : null,
        cgpa: form.cgpa ? parseFloat(form.cgpa) : null,
        usn: form.usn,
        department: form.department,
        semester: form.semester ? parseInt(form.semester) : null,
        profileComplete: !!(form.tenthMarks && form.twelfthMarks && form.cgpa && form.usn && form.department),
      })
      await updateDocument('users', userData.id, { phone: form.phone })
      toast.success('Profile saved')
    } catch (e) {
      toast.error('Save failed: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleClearBacklog(semKey, currentSem) {
    const newCleared = Math.min((currentSem.backlogsCleared || 0) + 1, currentSem.backlogs || 0)
    try {
      const semesters = { ...(student.semesters || {}) }
      semesters[semKey] = { ...semesters[semKey], backlogsCleared: newCleared }
      await updateDocument('students', userData.id, { semesters })
      toast.success(`Backlog cleared — ${newCleared}/${currentSem.backlogs}`)
    } catch (e) {
      toast.error('Update failed: ' + e.message)
    }
  }

  if (loading) {
    return <div className="loading-screen" style={{ minHeight: 200 }}><div className="spinner" /></div>
  }

  const semesters = student?.semesters || {}
  const semKeys = Object.keys(semesters).sort()
  const totalBacklogs = semKeys.reduce((sum, k) => sum + (semesters[k].backlogs || 0), 0)
  const totalCleared = semKeys.reduce((sum, k) => sum + (semesters[k].backlogsCleared || 0), 0)
  const activeBacklogs = totalBacklogs - totalCleared

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card p">
          <div className="sec-head"><div><h3>Academic record</h3></div></div>

          <div className="field">
            <label>10th marks (%)</label>
            <input type="number" value={form.tenthMarks} onChange={e => set('tenthMarks', e.target.value)}
              placeholder="e.g. 92" min="0" max="100" />
          </div>
          <div className="field">
            <label>12th / PUC marks (%)</label>
            <input type="number" value={form.twelfthMarks} onChange={e => set('twelfthMarks', e.target.value)}
              placeholder="e.g. 88" min="0" max="100" />
          </div>
          <div className="field">
            <label>Current CGPA</label>
            <input type="number" step="0.1" value={form.cgpa} onChange={e => set('cgpa', e.target.value)}
              placeholder="e.g. 8.5" min="0" max="10" />
          </div>

          <div style={{ padding: '14px 0', color: 'var(--muted)', fontSize: 12, borderTop: '1px solid var(--line)', marginTop: 8 }}>
            Marks card uploads (Storage) will be enabled in the next increment.
          </div>
        </div>

        <div className="card p" style={{ height: 'fit-content' }}>
          <div className="sec-head"><div><h3>Personal details</h3></div></div>

          <div className="field">
            <label>Full name</label>
            <input value={userData?.displayName || ''} disabled style={{ opacity: 0.6 }} />
          </div>
          <div className="field">
            <label>USN</label>
            <input value={form.usn} onChange={e => set('usn', e.target.value)} placeholder="4SH21CS012" />
          </div>
          <div className="field">
            <label>Department</label>
            <input value={form.department} onChange={e => set('department', e.target.value)} />
          </div>
          <div className="field">
            <label>Semester</label>
            <input type="number" value={form.semester} onChange={e => set('semester', e.target.value)} min="1" max="8" />
          </div>
          <div className="field">
            <label>Email</label>
            <input value={userData?.email || ''} disabled style={{ opacity: 0.6 }} />
          </div>
          <div className="field">
            <label>Phone</label>
            <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 98765 43210" />
          </div>

          <button className="btn btn-pri" onClick={handleSave} disabled={saving} style={{ marginTop: 6 }}>
            {saving ? 'Saving…' : 'Save profile'}
          </button>
        </div>
      </div>

      {/* Semester-wise record with backlog management */}
      <div className="card p" style={{ marginTop: 16 }}>
        <div className="sec-head">
          <h3>Semester-wise record &amp; backlogs</h3>
          {activeBacklogs > 0
            ? <span className="badge b-rose">{activeBacklogs} active backlog{activeBacklogs > 1 ? 's' : ''}</span>
            : totalBacklogs > 0
            ? <span className="badge b-green">{Icons.check} All cleared</span>
            : null}
        </div>

        {semKeys.length === 0 ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            No semester records yet. Your admin or HOD will add these.
          </div>
        ) : (
          <table className="tbl">
            <thead>
              <tr><th>Semester</th><th>SGPA</th><th>Backlogs</th><th>Subjects</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {semKeys.map(k => {
                const sem = semesters[k]
                const has = (sem.backlogs || 0) > 0
                const allCleared = has && (sem.backlogsCleared || 0) >= (sem.backlogs || 0)
                const active = has ? (sem.backlogs || 0) - (sem.backlogsCleared || 0) : 0
                return (
                  <tr key={k}>
                    <td><b style={{ fontWeight: 600 }}>{k.replace('sem', 'Semester ')}</b></td>
                    <td className="mono">{sem.marks ?? '—'}</td>
                    <td>
                      {has
                        ? <span className="mono" style={{ color: allCleared ? 'var(--green)' : 'var(--rose)', fontWeight: 600 }}>
                            {sem.backlogsCleared || 0}/{sem.backlogs}
                          </span>
                        : <span style={{ color: 'var(--muted)' }}>0</span>}
                    </td>
                    <td style={{ fontSize: 12.5, color: 'var(--muted)', maxWidth: 200 }}>
                      {sem.backlogSubjects || '—'}
                    </td>
                    <td>
                      {!has
                        ? <span className="badge b-grey">Clear</span>
                        : allCleared
                        ? <span className="badge b-green">{Icons.check} All cleared</span>
                        : <span className="badge b-rose">{active} active</span>}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {has && !allCleared && (
                        <button className="btn btn-pri" style={{ padding: '5px 12px', fontSize: 12 }}
                          onClick={() => handleClearBacklog(k, sem)}>
                          {Icons.check} Mark 1 cleared
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
