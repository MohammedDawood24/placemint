import { useAuth } from '../../contexts/AuthContext'
import { useCollection, where } from '../../hooks/useFirestore'
import { Icons } from '../../components/Icons'

const STAGES = ['Applied', 'Shortlisted', 'Aptitude', 'Technical', 'HR', 'Offer', 'Placed']

function PipelineTracker({ stage, rejected }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '4px 0' }}>
      {STAGES.map((s, i) => {
        const done = i < stage, now = i === stage, win = i === STAGES.length - 1 && i <= stage
        return (
          <span key={s} style={{ display: 'contents' }}>
            {i > 0 && <div style={{ height: 3, flex: 1, background: i <= stage ? 'var(--green)' : '#eef0f5',
              minWidth: 12, borderRadius: 3 }} />}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: '0 0 auto' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'grid', placeItems: 'center',
                fontSize: 11, fontWeight: 700,
                background: win ? 'linear-gradient(145deg, var(--gold), #c98a25)' :
                  done ? 'var(--green)' : now ? '#fff' : '#eef0f5',
                color: win ? '#1a1205' : done ? '#fff' : now ? 'var(--indigo)' : 'var(--muted-2)',
                border: now ? '2px solid var(--indigo)' : done ? 'none' : '2px solid #eef0f5',
                boxShadow: now ? '0 0 0 4px var(--indigo-soft)' : win ? '0 0 0 4px var(--gold-soft)' : 'none',
              }}>
                {win ? Icons.cap : done ? Icons.check : i + 1}
              </div>
              <div style={{ fontSize: 10, color: now ? 'var(--indigo)' : 'var(--muted)',
                fontWeight: now ? 600 : 500, whiteSpace: 'nowrap' }}>{s}</div>
            </div>
          </span>
        )
      })}
    </div>
  )
}

export default function StudentApplications() {
  const { userData } = useAuth()
  const { data: apps, loading } = useCollection('applications',
    [where('studentId', '==', userData?.id || 'x')], [userData?.id])
  const { data: jobs } = useCollection('jobs', [], [])

  const jobMap = {}
  jobs.forEach(j => { jobMap[j.id] = j })

  const active = apps.filter(a => a.status !== 'rejected')
  const rejected = apps.filter(a => a.status === 'rejected')

  return (
    <>
      <div className="sec-head">
        <div>
          <h3>My Applications</h3>
          <div className="sub">{loading ? 'Loading…' : `${active.length} active · ${rejected.length} rejected`}</div>
        </div>
      </div>

      {active.length === 0 && !loading ? (
        <div className="card p" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)' }}>
          <div style={{ width: 54, height: 54, borderRadius: 14, background: 'var(--indigo-soft)',
            display: 'grid', placeItems: 'center', margin: '0 auto 14px', color: 'var(--indigo)' }}>{Icons.brief}</div>
          <b style={{ display: 'block', color: 'var(--ink)', fontSize: 15, marginBottom: 5 }}>No applications yet</b>
          Go to Open Drives and apply for a placement.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {active.map(a => {
            const job = jobMap[a.jobId] || {}
            return (
              <div className="card p" key={a.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div className="job-logo" style={{ background: '#4C5BD4', width: 42, height: 42 }}>
                    {(job.companyName || a.studentName || '?')[0]}</div>
                  <div style={{ flex: 1 }}>
                    <b style={{ fontSize: 15, fontWeight: 600 }}>{job.role || 'Unknown role'}</b>
                    <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                      {job.companyName || '—'}{job.package ? ` · ₹${job.package}` : ''}
                    </div>
                  </div>
                  <span className={`badge ${a.stage >= 6 ? 'b-green' : 'b-indigo'}`} style={{ fontSize: 12 }}>
                    {a.stage >= 6 && Icons.cap} {STAGES[a.stage] || 'Applied'}
                  </span>
                </div>
                <PipelineTracker stage={a.stage} />
              </div>
            )
          })}
        </div>
      )}

      {rejected.length > 0 && (
        <>
          <div className="sec-head" style={{ marginTop: 24 }}><h3 style={{ color: 'var(--muted)' }}>Rejected</h3></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rejected.map(a => {
              const job = jobMap[a.jobId] || {}
              return (
                <div className="card p" key={a.id} style={{ opacity: 0.5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="job-logo" style={{ background: '#aaa', width: 38, height: 38 }}>
                      {(job.companyName || '?')[0]}</div>
                    <div style={{ flex: 1 }}>
                      <b style={{ fontSize: 14 }}>{job.role || 'Unknown'}</b>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{job.companyName}</div>
                    </div>
                    <span className="badge b-rose">Rejected at {STAGES[a.stage] || 'Applied'}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </>
  )
}
