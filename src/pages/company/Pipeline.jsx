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
            <thead><tr><th>Candidate</th><th>Role</th><th>Dept</th><th>CGPA</th><th>Stage</th><th></th></tr></thead>
            <tbody>
              {myApps.sort((a, b) => b.stage - a.stage).map(a => {
                const job = jobMap[a.jobId]
                return (
                  <tr key={a.id}>
                    <td><div className="cell-u"><div className="av-sm">{initials(a.studentName)}</div>
                      <div><b>{a.studentName}</b>
                        <span className="mono" style={{ fontSize: 11 }}>{a.studentUsn || '—'}</span></div>
                    </div></td>
                    <td style={{ fontSize: 13 }}>{job?.role || '—'}</td>
                    <td>{a.department || '—'}</td>
                    <td className="mono">{a.cgpa ?? '—'}</td>
                    <td><span className={`badge ${a.stage >= 6 ? 'b-green' : 'b-indigo'}`}>
                      {STAGES[a.stage]}</span></td>
                    <td style={{ textAlign: 'right' }}>
                      {a.stage < 6 && (
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                          <button className="btn btn-pri" style={{ padding: '4px 10px', fontSize: 11 }}
                            onClick={() => advance(a)}>→ {STAGES[a.stage + 1]}</button>
                          <button className="btn" style={{ padding: '4px 10px', fontSize: 11, background: 'transparent',
                            border: '1px solid var(--rose)', color: 'var(--rose)', cursor: 'pointer',
                            borderRadius: 10, fontFamily: 'inherit', fontWeight: 600 }}
                            onClick={() => reject(a)}>Reject</button>
                        </div>
                      )}
                      {a.stage >= 6 && <span className="badge b-green">{Icons.cap} Placed</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
