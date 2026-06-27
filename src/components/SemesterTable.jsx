import { useState } from 'react'
import { updateDocument } from '../hooks/useFirestore'
import { Icons } from './Icons'
import toast from 'react-hot-toast'

/**
 * Data model per semester:
 * {
 *   marks: number,
 *   backlogs: [{ subject: string, status: "active"|"cleared", clearedDate: string|null }],
 *   verified: "approved" | "rejected" | "pending" | true(legacy),
 *   approvalComment: string,
 *   lastEditedBy: "admin" | "student"
 * }
 */

function migrateSem(sem) {
  // Migrate old count-based format to new array-based format
  if (!sem) return sem
  if (Array.isArray(sem.backlogs)) return sem
  // Old format: backlogs=number, backlogSubjects=string, backlogsCleared=number
  const count = sem.backlogs || 0
  const subjects = (sem.backlogSubjects || '').split(',').map(s => s.trim()).filter(Boolean)
  const cleared = sem.backlogsCleared || 0
  const arr = []
  for (let i = 0; i < Math.max(count, subjects.length); i++) {
    arr.push({
      subject: subjects[i] || `Subject ${i + 1}`,
      status: i < cleared ? 'cleared' : 'active',
      clearedDate: i < cleared ? new Date().toISOString().slice(0, 10) : null,
    })
  }
  return { ...sem, backlogs: arr }
}

export default function SemesterTable({ student, isAdmin }) {
  const rawSemesters = student.semesters || {}
  const semesters = {}
  Object.keys(rawSemesters).forEach(k => { semesters[k] = migrateSem(rawSemesters[k]) })
  const semKeys = Object.keys(semesters).sort()

  const [expandedKey, setExpandedKey] = useState(null)
  const [editKey, setEditKey] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [approvalKey, setApprovalKey] = useState(null)
  const [approvalComment, setApprovalComment] = useState('')
  const [saving, setSaving] = useState(false)

  // Stats
  const totalActive = semKeys.reduce((sum, k) =>
    sum + (semesters[k].backlogs || []).filter(b => b.status === 'active').length, 0)
  const totalBacklogs = semKeys.reduce((sum, k) => sum + (semesters[k].backlogs || []).length, 0)

  function toggle(k) { setExpandedKey(expandedKey === k ? null : k) }

  // ─── INLINE EDIT ───
  function startEdit(k) {
    const sem = semesters[k]
    setEditForm({
      marks: sem.marks ?? '',
      backlogList: (sem.backlogs || []).map(b => ({ ...b })),
      newSubject: '',
    })
    setEditKey(k)
    setExpandedKey(k)
  }

  function cancelEdit() { setEditKey(null); setEditForm({}) }

  function addBacklog() {
    if (!editForm.newSubject.trim()) return
    setEditForm(f => ({
      ...f,
      backlogList: [...f.backlogList, { subject: f.newSubject.trim(), status: 'active', clearedDate: null }],
      newSubject: '',
    }))
  }

  function removeBacklog(idx) {
    setEditForm(f => ({
      ...f,
      backlogList: f.backlogList.filter((_, i) => i !== idx),
    }))
  }

  async function saveEdit(k) {
    setSaving(true)
    try {
      const updated = {}
      Object.keys(semesters).forEach(sk => { updated[sk] = { ...semesters[sk] } })
      updated[k] = {
        ...updated[k],
        marks: editForm.marks !== '' ? parseFloat(editForm.marks) : null,
        backlogs: editForm.backlogList,
        verified: isAdmin ? 'approved' : 'pending',
        approvalComment: isAdmin ? '' : (updated[k].approvalComment || ''),
        lastEditedBy: isAdmin ? 'admin' : 'student',
      }
      await updateDocument('students', student.id, { semesters: updated })
      toast.success(isAdmin ? 'Saved & approved' : 'Submitted for approval')
      setEditKey(null)
      setEditForm({})
    } catch (e) {
      toast.error('Save failed: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  // ─── MARK INDIVIDUAL BACKLOG CLEARED (student) ───
  async function markCleared(semKey, idx) {
    try {
      const updated = {}
      Object.keys(semesters).forEach(sk => { updated[sk] = { ...semesters[sk] } })
      const arr = [...(updated[semKey].backlogs || [])]
      arr[idx] = { ...arr[idx], status: 'cleared', clearedDate: new Date().toISOString().slice(0, 10) }
      updated[semKey] = { ...updated[semKey], backlogs: arr, verified: isAdmin ? 'approved' : 'pending' }
      await updateDocument('students', student.id, { semesters: updated })
      toast.success(`"${arr[idx].subject}" marked as cleared`)
    } catch (e) {
      toast.error('Failed: ' + e.message)
    }
  }

  // ─── APPROVE / REJECT (admin) ───
  async function handleApproval(k, decision) {
    try {
      const updated = {}
      Object.keys(semesters).forEach(sk => { updated[sk] = { ...semesters[sk] } })
      updated[k] = {
        ...updated[k],
        verified: decision,
        approvalComment: decision === 'rejected' ? approvalComment : '',
      }
      await updateDocument('students', student.id, { semesters: updated })
      toast.success(decision === 'approved' ? 'Approved' : 'Rejected with comment')
      setApprovalKey(null)
      setApprovalComment('')
    } catch (e) {
      toast.error('Failed: ' + e.message)
    }
  }

  // ─── APPROVAL BADGE ───
  function ApprovalBadge({ sem, k }) {
    const v = sem.verified
    if (v === 'approved' || v === true) return <span className="badge b-green">{Icons.check} Approved</span>
    if (v === 'rejected') {
      return (
        <div>
          <span className="badge b-rose">Rejected</span>
          {sem.approvalComment && (
            <div style={{ fontSize: 11, color: 'var(--rose)', marginTop: 4, maxWidth: 160, lineHeight: 1.4 }}>
              "{sem.approvalComment}"
            </div>
          )}
        </div>
      )
    }
    // pending
    if (isAdmin) {
      if (approvalKey === k) {
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 180 }}>
            <textarea value={approvalComment} onChange={e => setApprovalComment(e.target.value)}
              placeholder="Comment (required for reject)"
              style={{ padding: '6px 8px', border: '1.5px solid var(--line)', borderRadius: 7,
                fontSize: 12, fontFamily: 'inherit', resize: 'none', minHeight: 50 }} />
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-pri" onClick={() => handleApproval(k, 'approved')}
                style={{ padding: '4px 8px', fontSize: 11, flex: 1 }}>{Icons.check} Approve</button>
              <button className="btn" onClick={() => handleApproval(k, 'rejected')}
                disabled={!approvalComment.trim()}
                style={{ padding: '4px 8px', fontSize: 11, flex: 1, background: 'var(--rose)',
                  color: '#fff', opacity: approvalComment.trim() ? 1 : 0.5 }}>Reject</button>
            </div>
            <button className="btn btn-ghost" onClick={() => { setApprovalKey(null); setApprovalComment('') }}
              style={{ padding: '3px 8px', fontSize: 11 }}>Cancel</button>
          </div>
        )
      }
      return (
        <button className="btn btn-gold" onClick={() => { setApprovalKey(k); setApprovalComment('') }}
          style={{ padding: '4px 10px', fontSize: 12 }}>Review</button>
      )
    }
    return <span className="badge b-gold">Pending review</span>
  }

  return (
    <div className="card p" style={{ gridColumn: '1 / -1' }}>
      <div className="sec-head">
        <h3>Semester-wise academic record</h3>
        {totalActive > 0
          ? <span className="badge b-rose">{totalActive} active backlog{totalActive > 1 ? 's' : ''}</span>
          : totalBacklogs > 0
          ? <span className="badge b-green">{Icons.check} All backlogs cleared</span>
          : null}
      </div>

      {semKeys.length === 0 ? (
        <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
          {isAdmin ? 'No semester records uploaded yet.' : 'No semester records yet. Your admin or HOD will add these.'}
        </div>
      ) : (
        <table className="tbl">
          <thead>
            <tr><th>Semester</th><th>SGPA</th><th>Backlogs</th><th>Status</th><th>Approval</th><th></th></tr>
          </thead>
          <tbody>
            {semKeys.map(k => {
              const sem = semesters[k]
              const bl = sem.backlogs || []
              const activeCount = bl.filter(b => b.status === 'active').length
              const clearedCount = bl.filter(b => b.status === 'cleared').length
              const isEditing = editKey === k
              const isExpanded = expandedKey === k
              const isPending = sem.verified === 'pending' || sem.verified === false

              // ─── EDIT MODE ROW ───
              if (isEditing) {
                return (
                  <tr key={k}>
                    <td colSpan="6" style={{ background: 'var(--indigo-soft)', padding: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                        <b style={{ fontSize: 14 }}>{k.replace('sem', 'Editing Semester ')}</b>
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                          <button className="btn btn-ghost" onClick={cancelEdit}
                            style={{ padding: '5px 12px', fontSize: 12 }}>Cancel</button>
                          <button className="btn btn-pri" onClick={() => saveEdit(k)} disabled={saving}
                            style={{ padding: '5px 12px', fontSize: 12 }}>
                            {saving ? '…' : isAdmin ? <>{Icons.check} Save &amp; approve</> : 'Submit for approval'}
                          </button>
                        </div>
                      </div>

                      <div className="field" style={{ maxWidth: 140, marginBottom: 14 }}>
                        <label style={{ fontSize: 12 }}>SGPA</label>
                        <input type="number" value={editForm.marks}
                          onChange={e => setEditForm(f => ({ ...f, marks: e.target.value }))}
                          placeholder="—" min="0" max="10" step="0.01" />
                      </div>

                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Backlogs</div>
                      {editForm.backlogList.length === 0 && (
                        <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 8 }}>No backlogs recorded.</div>
                      )}
                      {editForm.backlogList.map((b, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8,
                          padding: '8px 10px', background: '#fff', borderRadius: 8, marginBottom: 6,
                          border: '1px solid var(--line)' }}>
                          <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{b.subject}</span>
                          <span className={`badge ${b.status === 'cleared' ? 'b-green' : 'b-rose'}`} style={{ fontSize: 11 }}>
                            {b.status === 'cleared' ? `Cleared ${b.clearedDate || ''}` : 'Active'}
                          </span>
                          <button onClick={() => removeBacklog(idx)}
                            style={{ background: 'none', border: 'none', color: 'var(--rose)', cursor: 'pointer',
                              fontSize: 16, padding: '0 4px', lineHeight: 1 }}>×</button>
                        </div>
                      ))}
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <input value={editForm.newSubject}
                          onChange={e => setEditForm(f => ({ ...f, newSubject: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addBacklog())}
                          placeholder="Add subject name…"
                          style={{ flex: 1, padding: '8px 10px', border: '1.5px solid var(--line)',
                            borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }} />
                        <button className="btn btn-ghost" onClick={addBacklog}
                          style={{ padding: '6px 12px', fontSize: 12 }}>{Icons.plus} Add</button>
                      </div>
                    </td>
                  </tr>
                )
              }

              // ─── NORMAL ROW ───
              return (
                <>
                  <tr key={k} style={isPending ? { background: '#fffbf0' } : {}}
                    onClick={() => bl.length > 0 && toggle(k)}
                    className={bl.length > 0 ? '' : ''}>
                    <td style={{ cursor: bl.length > 0 ? 'pointer' : 'default' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {bl.length > 0 && (
                          <span style={{ fontSize: 10, color: 'var(--muted)', transition: '.15s',
                            transform: isExpanded ? 'rotate(90deg)' : 'none' }}>▶</span>
                        )}
                        <b style={{ fontWeight: 600 }}>{k.replace('sem', 'Semester ')}</b>
                      </div>
                    </td>
                    <td className="mono">{sem.marks ?? '—'}</td>
                    <td>
                      {bl.length === 0
                        ? <span style={{ color: 'var(--muted)' }}>0</span>
                        : activeCount === 0
                        ? <span className="badge b-green">{Icons.check} {clearedCount}/{bl.length} cleared</span>
                        : <span className="badge b-rose">{activeCount} active / {bl.length} total</span>}
                    </td>
                    <td>
                      {bl.length === 0
                        ? <span className="badge b-grey">Clear</span>
                        : activeCount === 0
                        ? <span className="badge b-green">{Icons.check} All cleared</span>
                        : <span className="badge b-rose">{activeCount} pending</span>}
                    </td>
                    <td onClick={e => e.stopPropagation()}><ApprovalBadge sem={sem} k={k} /></td>
                    <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                      <button className="btn btn-ghost" onClick={() => startEdit(k)}
                        style={{ padding: '4px 10px', fontSize: 12 }}>{Icons.gear} Edit</button>
                    </td>
                  </tr>

                  {/* ─── EXPANDED BACKLOG ROWS ─── */}
                  {isExpanded && bl.length > 0 && bl.map((b, idx) => (
                    <tr key={`${k}-bl-${idx}`} style={{ background: '#fafbff' }}>
                      <td style={{ paddingLeft: 40, fontSize: 12.5, color: 'var(--muted)' }}>↳ Backlog</td>
                      <td colSpan="2"><b style={{ fontSize: 13 }}>{b.subject}</b></td>
                      <td>
                        {b.status === 'cleared'
                          ? <span className="badge b-green" style={{ fontSize: 11 }}>{Icons.check} Cleared {b.clearedDate || ''}</span>
                          : <span className="badge b-rose" style={{ fontSize: 11 }}>Active</span>}
                      </td>
                      <td colSpan="2" style={{ textAlign: 'right' }}>
                        {b.status === 'active' && (
                          <button className="btn btn-pri" onClick={() => markCleared(k, idx)}
                            style={{ padding: '4px 10px', fontSize: 11 }}>
                            {Icons.check} Mark cleared
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
