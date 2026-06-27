import { useState } from 'react'
import { updateDocument } from '../hooks/useFirestore'
import { Icons } from './Icons'
import toast from 'react-hot-toast'

/**
 * Semester-wise academic record table with inline editing.
 *
 * Props:
 *   student — full student document (with .semesters map and .id)
 *   isAdmin — if true, edits are auto-approved and approve button shows for pending rows
 */
export default function SemesterTable({ student, isAdmin }) {
  const semesters = student.semesters || {}
  const semKeys = Object.keys(semesters).sort()

  const [editKey, setEditKey] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)

  const totalBacklogs = semKeys.reduce((sum, k) => sum + (semesters[k].backlogs || 0), 0)
  const totalCleared = semKeys.reduce((sum, k) => sum + (semesters[k].backlogsCleared || 0), 0)
  const activeBacklogs = totalBacklogs - totalCleared

  function startEdit(k) {
    const sem = semesters[k]
    setEditForm({
      marks: sem.marks ?? '',
      backlogs: sem.backlogs ?? 0,
      backlogSubjects: sem.backlogSubjects || '',
      backlogsCleared: sem.backlogsCleared ?? 0,
    })
    setEditKey(k)
  }

  function cancelEdit() { setEditKey(null); setEditForm({}) }

  async function saveEdit(k) {
    setSaving(true)
    try {
      const updated = { ...(student.semesters || {}) }
      updated[k] = {
        ...updated[k],
        marks: editForm.marks !== '' ? parseFloat(editForm.marks) : null,
        backlogs: editForm.backlogs !== '' ? parseInt(editForm.backlogs) : 0,
        backlogSubjects: editForm.backlogSubjects || '',
        backlogsCleared: editForm.backlogsCleared !== '' ? parseInt(editForm.backlogsCleared) : 0,
        verified: isAdmin ? true : false,
        lastEditedBy: isAdmin ? 'admin' : 'student',
      }
      await updateDocument('students', student.id, { semesters: updated })
      toast.success(isAdmin ? 'Saved & approved' : 'Submitted for approval')
      setEditKey(null)
    } catch (e) {
      toast.error('Save failed: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  async function approveRow(k) {
    try {
      const updated = { ...(student.semesters || {}) }
      updated[k] = { ...updated[k], verified: true }
      await updateDocument('students', student.id, { semesters: updated })
      toast.success(`Semester ${k.replace('sem', '')} approved`)
    } catch (e) {
      toast.error('Approval failed: ' + e.message)
    }
  }

  const inp = (val, key, type = 'number', placeholder = '—', extra = {}) => (
    <input type={type} value={val}
      onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))}
      placeholder={placeholder}
      style={{ width: '100%', padding: '6px 8px', border: '1.5px solid var(--indigo)',
        borderRadius: 7, fontSize: 12.5, fontFamily: type === 'number' ? "'JetBrains Mono', monospace" : 'inherit',
        background: '#fff', ...extra }} />
  )

  return (
    <div className="card p" style={{ gridColumn: '1 / -1' }}>
      <div className="sec-head">
        <h3>Semester-wise academic record</h3>
        {activeBacklogs > 0
          ? <span className="badge b-rose">{activeBacklogs} active backlog{activeBacklogs > 1 ? 's' : ''}</span>
          : totalBacklogs > 0
          ? <span className="badge b-green">{Icons.check} All backlogs cleared</span>
          : null}
      </div>

      {semKeys.length === 0 ? (
        <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
          No semester records {isAdmin ? 'uploaded yet.' : 'yet. Your admin or HOD will add these.'}
        </div>
      ) : (
        <table className="tbl">
          <thead>
            <tr>
              <th>Semester</th><th>SGPA</th><th>Backlogs</th><th>Subjects</th><th>Status</th>
              <th>Approval</th><th></th>
            </tr>
          </thead>
          <tbody>
            {semKeys.map(k => {
              const sem = semesters[k]
              const hasBacklogs = (sem.backlogs || 0) > 0
              const allCleared = hasBacklogs && (sem.backlogsCleared || 0) >= (sem.backlogs || 0)
              const activeCount = hasBacklogs ? (sem.backlogs || 0) - (sem.backlogsCleared || 0) : 0
              const isEditing = editKey === k
              const isPending = sem.verified === false

              if (isEditing) {
                return (
                  <tr key={k} style={{ background: 'var(--indigo-soft)' }}>
                    <td><b style={{ fontWeight: 600 }}>{k.replace('sem', 'Sem ')}</b></td>
                    <td style={{ width: 80 }}>{inp(editForm.marks, 'marks', 'number', 'SGPA', { maxWidth: 70 })}</td>
                    <td style={{ width: 65 }}>{inp(editForm.backlogs, 'backlogs', 'number', '0', { maxWidth: 55 })}</td>
                    <td>{inp(editForm.backlogSubjects, 'backlogSubjects', 'text', 'e.g. Maths, Physics')}</td>
                    <td style={{ width: 65 }}>{inp(editForm.backlogsCleared, 'backlogsCleared', 'number', '0', { maxWidth: 55 })}</td>
                    <td colSpan="2" style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost" onClick={cancelEdit}
                          style={{ padding: '5px 10px', fontSize: 12 }}>Cancel</button>
                        <button className="btn btn-pri" onClick={() => saveEdit(k)} disabled={saving}
                          style={{ padding: '5px 10px', fontSize: 12 }}>
                          {saving ? '…' : isAdmin ? <>{Icons.check} Save &amp; approve</> : 'Submit for approval'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              }

              return (
                <tr key={k} style={isPending ? { background: '#fffbf0' } : {}}>
                  <td><b style={{ fontWeight: 600 }}>{k.replace('sem', 'Semester ')}</b></td>
                  <td className="mono">{sem.marks ?? '—'}</td>
                  <td>
                    {hasBacklogs
                      ? <span className="mono" style={{ color: allCleared ? 'var(--green)' : 'var(--rose)', fontWeight: 600 }}>
                          {sem.backlogs}
                        </span>
                      : <span style={{ color: 'var(--muted)' }}>0</span>}
                  </td>
                  <td style={{ fontSize: 12.5, color: 'var(--muted)', maxWidth: 200 }}>
                    {sem.backlogSubjects || '—'}
                  </td>
                  <td>
                    {!hasBacklogs
                      ? <span className="badge b-grey">Clear</span>
                      : allCleared
                      ? <span className="badge b-green">{Icons.check} Cleared ({sem.backlogsCleared}/{sem.backlogs})</span>
                      : <span className="badge b-rose">{activeCount} active</span>}
                  </td>
                  <td>
                    {isPending
                      ? isAdmin
                        ? <button className="btn btn-gold" onClick={() => approveRow(k)}
                            style={{ padding: '4px 10px', fontSize: 12 }}>{Icons.check} Approve</button>
                        : <span className="badge b-gold">Pending review</span>
                      : <span className="badge b-green">{Icons.check} Approved</span>}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-ghost" onClick={() => startEdit(k)}
                      style={{ padding: '4px 10px', fontSize: 12 }}>{Icons.gear} Edit</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
