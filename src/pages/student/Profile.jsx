import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useDocument, updateDocument } from '../../hooks/useFirestore'
import { Icons } from '../../components/Icons'
import SemesterTable from '../../components/SemesterTable'
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

  useEffect(() => {
    if (student) {
      const sems = student.semesters || {}
      const sgpas = Object.values(sems)
        .map(s => s.marks)
        .filter(v => v != null && !isNaN(v) && v > 0)
      if (sgpas.length > 0) {
        const avg = (sgpas.reduce((a, b) => a + b, 0) / sgpas.length).toFixed(2)
        setForm(f => ({ ...f, cgpa: avg }))
      }
    }
  }, [student?.semesters]) // eslint-disable-line

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSave() {
    setSaving(true)
    try {
      const updates = {
        tenthMarks: form.tenthMarks ? parseFloat(form.tenthMarks) : null,
        twelfthMarks: form.twelfthMarks ? parseFloat(form.twelfthMarks) : null,
        cgpa: form.cgpa ? parseFloat(form.cgpa) : null,
        usn: form.usn,
        department: form.department,
        semester: form.semester ? parseInt(form.semester) : null,
        profileComplete: !!(form.tenthMarks && form.twelfthMarks && form.cgpa && form.usn && form.department),
      }
      // Set to pending if student changed marks (and not already approved)
      if (student?.tenthVerified !== 'approved' && form.tenthMarks) {
        updates.tenthVerified = 'pending'
      }
      if (student?.twelfthVerified !== 'approved' && form.twelfthMarks) {
        updates.twelfthVerified = 'pending'
      }
      await updateDocument('students', userData.id, updates)
      await updateDocument('users', userData.id, { phone: form.phone })
      toast.success('Profile saved')
    } catch (e) {
      toast.error('Save failed: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="loading-screen" style={{ minHeight: 200 }}><div className="spinner" /></div>
  }

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card p">
          <div className="sec-head"><div><h3>Academic record</h3></div></div>
          <div className="field">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              10th marks (%)
              {student?.tenthVerified === 'approved'
                ? <span className="badge b-green" style={{ fontSize: 10 }}>{Icons.check} Approved</span>
                : student?.tenthVerified === 'rejected'
                ? <span className="badge b-rose" style={{ fontSize: 10 }}>Rejected — re-enter</span>
                : student?.tenthMarks != null
                ? <span className="badge b-gold" style={{ fontSize: 10 }}>Pending</span>
                : null}
            </label>
            {student?.tenthVerified === 'approved' ? (
              <input type="number" value={form.tenthMarks} disabled
                style={{ opacity: 0.6, background: 'var(--green-soft)' }} />
            ) : (
              <input type="number" value={form.tenthMarks} onChange={e => set('tenthMarks', e.target.value)}
                placeholder="e.g. 92" min="0" max="100" />
            )}
          </div>
          <div className="field">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              12th / PUC marks (%)
              {student?.twelfthVerified === 'approved'
                ? <span className="badge b-green" style={{ fontSize: 10 }}>{Icons.check} Approved</span>
                : student?.twelfthVerified === 'rejected'
                ? <span className="badge b-rose" style={{ fontSize: 10 }}>Rejected — re-enter</span>
                : student?.twelfthMarks != null
                ? <span className="badge b-gold" style={{ fontSize: 10 }}>Pending</span>
                : null}
            </label>
            {student?.twelfthVerified === 'approved' ? (
              <input type="number" value={form.twelfthMarks} disabled
                style={{ opacity: 0.6, background: 'var(--green-soft)' }} />
            ) : (
              <input type="number" value={form.twelfthMarks} onChange={e => set('twelfthMarks', e.target.value)}
                placeholder="e.g. 88" min="0" max="100" />
            )}
          </div>
          <div className="field">
            <label>Current CGPA <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 400 }}>(auto-calculated from SGPAs)</span></label>
            <input type="number" step="0.1" value={form.cgpa} readOnly
              placeholder="Calculated from semester records" min="0" max="10"
              style={{ background: 'var(--green-soft)', borderColor: 'var(--green)', cursor: 'default' }} />
          </div>
          <div style={{ padding: '14px 0', color: 'var(--muted)', fontSize: 12, borderTop: '1px solid var(--line)', marginTop: 8 }}>
            Marks card uploads will be enabled in the next increment.
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

      {/* Semester table — student edits go to pending, admin edits auto-approve */}
      {student && <div style={{ marginTop: 16 }}><SemesterTable student={student} isAdmin={false} /></div>}
    </>
  )
}
