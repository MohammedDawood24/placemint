import { useCollection, where, updateDocument } from '../hooks/useFirestore'
import { Icons, initials } from './Icons'
import { formatPackage } from '../utils/formatPackage'
import toast from 'react-hot-toast'

const STAGES = ['Applied', 'Shortlisted', 'Aptitude', 'Technical', 'HR', 'Offer', 'Placed']
const STAGE_COLORS = ['#9aa1bd', '#4C5BD4', '#7B1FA2', '#1565C0', '#E0A43B', '#F57C00', '#15A86B']

export default function CompanyJobDetail({ job, onBack, onEdit }) {
  const j = job
  const { data: apps } = useCollection('applications', [where('jobId', '==', j.id)], [j.id])
  const active = apps.filter(a => a.status !== 'rejected')
  const rejected = apps.filter(a => a.status === 'rejected')
  const stageCounts = STAGES.map((_, i) => active.filter(a => a.stage === i).length)

  async function advance(app) {
    const newStage = app.stage + 1
    try {
      const updates = { stage: newStage }
      if (newStage === 6) updates.status = 'placed'
      await updateDocument('applications', app.id, updates)
      if (newStage === 6) {
        await updateDocument('students', app.studentId, {
          placementStatus: 'placed', placedAt: j.companyName,
          package: j.packageNumeric || null,
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

  return (
    <>
      <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: 16 }}>← Back</button>

      {/* Job header */}
      <div className="card p" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: '#4C5BD4',
            display: 'grid', placeItems: 'center', fontWeight: 700, color: '#fff',
            fontSize: 22, flex: '0 0 auto' }}>{(j.companyName || '?')[0]}</div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif",
              margin: '0 0 2px' }}>{j.role}</h3>
            <div style={{ fontSize: 14, color: 'var(--muted)' }}>{j.companyName}</div>
          </div>
          <span className={`badge ${j.status === 'open' ? 'b-green' : j.status === 'closed' ? 'b-gold' : 'b-grey'}`}
            style={{ fontSize: 13, padding: '5px 12px' }}>{j.status || 'Draft'}</span>
          {onEdit && (
            <button className="btn btn-pri" onClick={onEdit}>{Icons.gear} Edit</button>
          )}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
          {j.package && <span className="chip">{formatPackage(j.packageNumeric || j.package)}</span>}
          {j.min10th && <span className="chip">10th ≥ {j.min10th}%</span>}
          {j.min12th && <span className="chip">12th ≥ {j.min12th}%</span>}
          {j.minCgpa && <span className="chip">CGPA ≥ {j.minCgpa}</span>}
          <span className="chip">{j.driveType || 'On-campus'}</span>
          {j.driveDate?.seconds && <span className="chip">
            Drive: {new Date(j.driveDate.seconds * 1000).toLocaleDateString()}</span>}
          {j.deadline?.seconds && <span className="chip">
            Deadline: {new Date(j.deadline.seconds * 1000).toLocaleDateString()}</span>}
        </div>

        {(j.eligibleDepartments || []).length > 0 && (
          <div style={{ marginTop: 10, fontSize: 13, color: 'var(--muted)' }}>
            Eligible branches: <b style={{ color: 'var(--ink)' }}>{j.eligibleDepartments.join(', ')}</b>
          </div>
        )}

        {j.description && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line)',
            fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.6 }}
            dangerouslySetInnerHTML={{ __html: j.description }} />
        )}
      </div>

      {/* Pipeline summary */}
      <div className="card p" style={{ marginBottom: 16 }}>
        <div className="sec-head">
          <h3>Hiring pipeline</h3>
          <div className="sub">{active.length} active · {rejected.length} rejected</div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {STAGES.map((s, i) => (
            <div key={s} style={{ flex: 1, textAlign: 'center', padding: '12px 4px',
              background: stageCounts[i] > 0 ? `${STAGE_COLORS[i]}15` : '#f8f9fc',
              borderRadius: 8, border: stageCounts[i] > 0 ? `1.5px solid ${STAGE_COLORS[i]}30` : '1.5px solid transparent' }}>
              <div style={{ fontSize: 22, fontWeight: 700,
                color: stageCounts[i] > 0 ? STAGE_COLORS[i] : 'var(--muted)' }}>
                {stageCounts[i]}</div>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{s}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Registered candidates */}
      <div className="card p">
        <div className="sec-head">
          <h3>Registered candidates</h3>
          <div className="sub">{active.length} active{rejected.length > 0 ? ` · ${rejected.length} rejected` : ''}</div>
        </div>

        {active.length === 0 ? (
          <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            No candidates have registered for this drive yet.
          </div>
        ) : (
          <table className="tbl">
            <thead>
              <tr><th>Candidate</th><th>USN</th><th>Dept</th><th>CGPA</th><th>Current stage</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {active.sort((a, b) => b.stage - a.stage).map(a => (
                <tr key={a.id} style={a.stage >= 6 ? { background: 'var(--green-soft)' } : {}}>
                  <td>
                    <div className="cell-u">
                      <div className="av-sm">{initials(a.studentName)}</div>
                      <div>
                        <b>{a.studentName}</b>
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                          {a.appliedAt?.seconds
                            ? `Applied ${new Date(a.appliedAt.seconds * 1000).toLocaleDateString()}`
                            : ''}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="mono" style={{ fontSize: 12 }}>{a.studentUsn || '—'}</td>
                  <td>{a.department || '—'}</td>
                  <td className="mono">{a.cgpa ?? '—'}</td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
                      fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20,
                      background: `${STAGE_COLORS[a.stage]}15`, color: STAGE_COLORS[a.stage] }}>
                      {a.stage >= 6 && Icons.cap} {STAGES[a.stage]}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {a.stage < 6 ? (
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                        {/* Stage selector */}
                        <select
                          value=""
                          onChange={e => {
                            const newStage = parseInt(e.target.value)
                            if (!isNaN(newStage)) {
                              const updates = { stage: newStage }
                              if (newStage === 6) updates.status = 'placed'
                              updateDocument('applications', a.id, updates).then(() => {
                                if (newStage === 6) {
                                  updateDocument('students', a.studentId, {
                                    placementStatus: 'placed', placedAt: j.companyName,
                                    package: j.packageNumeric || null,
                                  })
                                }
                                toast.success(`${a.studentName} → ${STAGES[newStage]}`)
                              }).catch(e => toast.error('Failed'))
                            }
                          }}
                          style={{ padding: '5px 8px', borderRadius: 8, border: '1.5px solid var(--line)',
                            fontSize: 12, fontFamily: 'inherit', background: '#fff', cursor: 'pointer' }}
                        >
                          <option value="">Move to…</option>
                          {STAGES.slice(a.stage + 1).map((s, idx) => (
                            <option key={s} value={a.stage + 1 + idx}>{s}</option>
                          ))}
                        </select>
                        <button className="btn btn-pri" style={{ padding: '5px 12px', fontSize: 12 }}
                          onClick={() => advance(a)}>
                          → {STAGES[a.stage + 1]}
                        </button>
                        <button className="btn" style={{ padding: '5px 10px', fontSize: 12,
                          background: 'transparent', border: '1px solid var(--rose)', color: 'var(--rose)',
                          cursor: 'pointer', borderRadius: 10, fontFamily: 'inherit', fontWeight: 600 }}
                          onClick={() => reject(a)}>Reject</button>
                      </div>
                    ) : (
                      <span className="badge b-green">{Icons.cap} Placed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Rejected section */}
        {rejected.length > 0 && (
          <>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', padding: '14px 0 8px',
              marginTop: 14, borderTop: '1px solid var(--line)' }}>
              Rejected candidates ({rejected.length})
            </div>
            <table className="tbl">
              <tbody>
                {rejected.map(a => (
                  <tr key={a.id} style={{ opacity: 0.5 }}>
                    <td>
                      <div className="cell-u">
                        <div className="av-sm">{initials(a.studentName)}</div>
                        <b>{a.studentName}</b>
                      </div>
                    </td>
                    <td className="mono" style={{ fontSize: 12 }}>{a.studentUsn || '—'}</td>
                    <td>{a.department || '—'}</td>
                    <td className="mono">{a.cgpa ?? '—'}</td>
                    <td><span className="badge b-rose">Rejected at {STAGES[a.stage]}</span></td>
                    <td></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </>
  )
}
