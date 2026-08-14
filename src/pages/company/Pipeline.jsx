import React, { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useCollection, where, updateDocument } from '../../hooks/useFirestore'
import { Icons, initials } from '../../components/Icons'
import toast from 'react-hot-toast'

const STAGES = ['Applied', 'Shortlisted', 'Aptitude', 'Technical', 'HR', 'Offer', 'Placed']

export default function CompanyPipeline() {
  const { userData } = useAuth()
  const { data: jobs } = useCollection('jobs',
    [where('companyId', '==', userData?.id || 'x')], [userData?.id])
  const { data: apps, loading } = useCollection('applications', [], [])
  const [expandedApp, setExpandedApp] = useState(null)

  const jobIds = new Set(jobs.map(j => j.id))
  const jobMap = {}
  jobs.forEach(j => { jobMap[j.id] = j })
  const myApps = apps.filter(a => jobIds.has(a.jobId) && a.status !== 'rejected')

  async function advance(app) {
    const newStage = app.stage + 1
    try {
      const updates = { stage: newStage }
      if (newStage === 6) updates.status = 'placed'
      await updateDocument('applications', app.id, updates)
      if (newStage === 6) {
        const job = jobMap[app.jobId]
        await updateDocument('students', app.studentId, {
          placementStatus: 'placed', placedAt: job?.companyName || '',
          package: job?.packageNumeric || null,
        })
      }
      toast.success(`${app.studentName} → ${STAGES[newStage]}`)
    } catch (e) { toast.error('Failed: ' + e.message) }
  }

  async function reject(app) {
    if (!confirm(`Reject ${app.studentName}?`)) return
    try {
      await updateDocument('applications', app.id, { status: 'rejected' })
      toast.success(`${app.studentName} rejected`)
    } catch (e) { toast.error('Failed: ' + e.message) }
  }

  // Group by stage
  const byStage = STAGES.map((_, i) => myApps.filter(a => a.stage === i))

  return (
    <>
      <div className="sec-head" style={{ marginBottom: 16 }}>
        <div>
          <h3>Candidate Pipeline</h3>
          <div className="sub">{loading ? 'Loading…' : `${myApps.length} active candidate${myApps.length !== 1 ? 's' : ''} across ${jobs.length} posting${jobs.length !== 1 ? 's' : ''}`}</div>
        </div>
      </div>

      {/* Stage columns */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        {STAGES.map((s, i) => (
          <div key={s} style={{ flex: 1, textAlign: 'center', padding: '10px 4px',
            background: byStage[i].length > 0 ? 'var(--indigo-soft)' : '#f8f9fc', borderRadius: 8 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: byStage[i].length > 0 ? 'var(--indigo-d)' : 'var(--muted)' }}>
              {byStage[i].length}</div>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{s}</div>
          </div>
        ))}
      </div>

      {myApps.length === 0 && !loading ? (
        <div className="card p" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)' }}>
          No candidates yet. Publish a job posting and students will start applying.
        </div>
      ) : (
        <div className="card p">
          <table className="tbl">
            <thead><tr><th>Candidate</th><th>Role</th><th>Dept</th><th>CGPA</th><th>Stage</th><th>Offer</th><th></th></tr></thead>
            <tbody>
              {myApps.sort((a, b) => b.stage - a.stage).map(a => {
                const job = jobMap[a.jobId]
                return (
                  <React.Fragment key={a.id}>
                  <tr style={{ ...(a.stage >= 6 ? { background: 'var(--green-soft)' } : {}),
                    ...(a.stage >= 5 ? { cursor: 'pointer' } : {}) }}
                    onClick={() => a.stage >= 5 && setExpandedApp(expandedApp === a.id ? null : a.id)}>
                    <td><div className="cell-u"><div className="av-sm">{initials(a.studentName)}</div>
                      <div><b>{a.studentName}</b>
                        <span className="mono" style={{ fontSize: 11 }}>{a.studentUsn || '—'}</span>
                        {a.stage >= 5 && <span style={{ fontSize: 10, color: 'var(--indigo)', marginLeft: 6 }}>
                          {expandedApp === a.id ? '▼' : '▶'} offer</span>}
                      </div>
                    </div></td>
                    <td style={{ fontSize: 13 }}>{job?.role || '—'}</td>
                    <td>{a.department || '—'}</td>
                    <td className="mono">{a.cgpa ?? '—'}</td>
                    <td><span className={`badge ${a.stage >= 6 ? 'b-green' : 'b-indigo'}`}>
                      {STAGES[a.stage]}</span></td>
                    <td>
                      {a.stage >= 5 ? (
                        a.offerStatus === 'accepted' || a.offerStatus === 'accepted_pending_admin'
                          ? <span className="badge b-green" style={{ fontSize: 10 }}>Accepted</span>
                          : a.offerStatus === 'rejected'
                          ? <span className="badge b-rose" style={{ fontSize: 10 }}>Declined</span>
                          : a.offerStatus === 'pending_student'
                          ? <span className="badge b-gold" style={{ fontSize: 10 }}>Awaiting</span>
                          : <span style={{ fontSize: 11, color: 'var(--muted)' }}>—</span>
                      ) : <span style={{ fontSize: 11, color: 'var(--muted)' }}>—</span>}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {a.stage < 6 ? (
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', alignItems: 'center' }}>
                          <select value={a.stage}
                            onChange={e => {
                              const ns = parseInt(e.target.value)
                              if (ns === a.stage) return
                              const updates = { stage: ns }
                              if (ns === 6) { updates.status = 'placed' }
                              if (ns < 5) { updates.offerStatus = null }
                              updateDocument('applications', a.id, updates).then(() => {
                                if (ns === 6) {
                                  const job = jobMap[a.jobId]
                                  updateDocument('students', a.studentId, {
                                    placementStatus: 'placed', placedAt: job?.companyName || '',
                                    package: job?.packageNumeric || null,
                                  })
                                }
                                if (a.stage === 6 && ns < 6) {
                                  updateDocument('students', a.studentId, { placementStatus: null, placedAt: null, package: null })
                                }
                                toast.success(`${a.studentName} → ${STAGES[ns]}`)
                              }).catch(() => toast.error('Failed'))
                            }}
                            style={{ padding: '5px 8px', borderRadius: 8, border: '1.5px solid var(--line)',
                              fontSize: 12, fontFamily: 'inherit', background: '#fff', cursor: 'pointer' }}>
                            {STAGES.map((s, i) => <option key={s} value={i}>{s}</option>)}
                          </select>
                          <button className="btn" style={{ padding: '4px 10px', fontSize: 11, background: 'transparent',
                            border: '1px solid var(--rose)', color: 'var(--rose)', cursor: 'pointer',
                            borderRadius: 10, fontFamily: 'inherit', fontWeight: 600 }}
                            onClick={() => reject(a)}>Reject</button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'flex-end' }}>
                          <span className="badge b-green">{Icons.cap} Placed</span>
                          <button className="btn btn-ghost" style={{ padding: '3px 8px', fontSize: 10 }}
                            onClick={() => {
                              if (!confirm(`Revert ${a.studentName} from Placed?`)) return
                              updateDocument('applications', a.id, { stage: 5, status: 'active' })
                              updateDocument('students', a.studentId, { placementStatus: null, placedAt: null, package: null })
                              toast.success(`${a.studentName} reverted to Offer`)
                            }}>Revert</button>
                        </div>
                      )}
                    </td>
                  </tr>
                  {expandedApp === a.id && a.stage >= 5 && (
                    <tr><td colSpan="7" style={{ padding: 0 }}>
                      <div style={{ padding: '14px 20px', background: '#f8f9fc', borderTop: '1px dashed var(--line)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase',
                              letterSpacing: '0.5px', marginBottom: 6 }}>Offer details</div>
                            {a.offerDetails
                              ? <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--ink-2)', margin: 0,
                                  whiteSpace: 'pre-wrap', background: '#fff', padding: '10px 12px', borderRadius: 8,
                                  border: '1px solid var(--line)' }}>{a.offerDetails}</p>
                              : <span style={{ fontSize: 12, color: 'var(--muted)' }}>No details provided</span>}
                            {(a.offerLetterUrl || a.offerLetterFile) && (
                              <div style={{ marginTop: 8, display: 'flex', gap: 12 }}>
                                {a.offerLetterUrl && <a href={a.offerLetterUrl} target="_blank" rel="noreferrer"
                                  style={{ fontSize: 12, color: 'var(--indigo)', fontWeight: 600 }}>🔗 Offer letter (link)</a>}
                                {a.offerLetterFile && <a href={a.offerLetterFile} download={a.offerLetterFileName || 'offer'}
                                  style={{ fontSize: 12, color: 'var(--indigo)', fontWeight: 600 }}>📄 Download offer letter</a>}
                              </div>
                            )}
                          </div>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase',
                              letterSpacing: '0.5px', marginBottom: 6 }}>Student response</div>
                            {a.consentText ? (
                              <div style={{ fontSize: 13, lineHeight: 1.5, color: '#0c7a4c', background: 'var(--green-soft)',
                                padding: '10px 12px', borderRadius: 8, border: '1px solid #b5e6cf' }}>
                                <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>✓ Accepted
                                  {a.studentRespondedAt && ` · ${new Date(a.studentRespondedAt.seconds
                                    ? a.studentRespondedAt.seconds * 1000 : a.studentRespondedAt).toLocaleDateString()}`}</div>
                                {a.consentText}
                              </div>
                            ) : a.offerStatus === 'rejected' ? (
                              <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--rose)', background: 'var(--rose-soft)',
                                padding: '10px 12px', borderRadius: 8 }}>
                                <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>✗ Declined</div>
                                {a.studentResponse || 'No reason provided'}
                              </div>
                            ) : <span style={{ fontSize: 12, color: 'var(--muted)' }}>Awaiting student response</span>}
                          </div>
                        </div>
                      </div>
                    </td></tr>
                  )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
