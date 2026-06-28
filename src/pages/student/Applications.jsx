import { useAuth } from '../../contexts/AuthContext'
import { useCollection, where } from '../../hooks/useFirestore'
import { Icons } from '../../components/Icons'

const STAGES = ['Applied', 'Shortlisted', 'Aptitude', 'Technical', 'HR', 'Offer', 'Placed']

function PipelineTracker({ stage }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '4px 0' }}>
      {STAGES.map((s, i) => {
        const done = i < stage, now = i === stage, win = i === STAGES.length - 1 && i <= stage
        return (
          <span key={s} style={{ display: 'contents' }}>
            {i > 0 && <div style={{ height: 3, flex: 1, background: i <= stage ? 'var(--green)' : '#eef0f5',
              minWidth: 10, borderRadius: 3 }} />}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, flex: '0 0 auto' }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', display: 'grid', placeItems: 'center',
                fontSize: 10, fontWeight: 700,
                background: win ? 'linear-gradient(145deg, var(--gold), #c98a25)' :
                  done ? 'var(--green)' : now ? '#fff' : '#eef0f5',
                color: win ? '#1a1205' : done ? '#fff' : now ? 'var(--indigo)' : 'var(--muted-2)',
                border: now ? '2px solid var(--indigo)' : done ? 'none' : '2px solid #eef0f5',
                boxShadow: now ? '0 0 0 3px var(--indigo-soft)' : win ? '0 0 0 3px var(--gold-soft)' : 'none',
              }}>
                {win ? Icons.cap : done ? Icons.check : i + 1}
              </div>
              <div style={{ fontSize: 9, color: now ? 'var(--indigo)' : 'var(--muted)',
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

  // Stats
  const placed = active.filter(a => a.stage >= 6)
  const inProgress = active.filter(a => a.stage > 0 && a.stage < 6)

  return (
    <>
      {/* Stats */}
      <div className="cards-row c4" style={{ marginBottom: 20 }}>
        <div className="card stat">
          <div className="ic" style={{ background: 'var(--indigo-soft)', color: 'var(--indigo)' }}>{Icons.brief}</div>
          <div className="v">{active.length}</div>
          <div className="l">Total applications</div>
        </div>
        <div className="card stat">
          <div className="ic" style={{ background: 'var(--gold-soft)', color: 'var(--gold)' }}>{Icons.spark}</div>
          <div className="v">{inProgress.length}</div>
          <div className="l">In progress</div>
        </div>
        <div className="card stat">
          <div className="ic" style={{ background: 'var(--green-soft)', color: 'var(--green)' }}>{Icons.cap}</div>
          <div className="v">{placed.length}</div>
          <div className="l">Offers / Placed</div>
        </div>
        <div className="card stat">
          <div className="ic" style={{ background: 'var(--rose-soft)', color: 'var(--rose)' }}>{Icons.check}</div>
          <div className="v">{rejected.length}</div>
          <div className="l">Rejected</div>
        </div>
      </div>

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
          Go to Open Drives to find and apply for placements.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {active.sort((a, b) => (b.stage || 0) - (a.stage || 0)).map(a => {
            const job = jobMap[a.jobId] || {}
            return (
              <div className="card" key={a.id} style={{ overflow: 'hidden' }}>
                <div style={{ padding: '18px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 11, background: '#4C5BD4',
                      display: 'grid', placeItems: 'center', fontWeight: 700, color: '#fff', fontSize: 18,
                      flex: '0 0 auto' }}>{(job.companyName || '?')[0]}</div>
                    <div style={{ flex: 1 }}>
                      <b style={{ fontSize: 15.5, fontWeight: 600 }}>{job.role || 'Unknown role'}</b>
                      <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                        {job.companyName || '—'}{job.package ? ` · ₹${job.package}` : ''}
                        {job.driveType ? ` · ${job.driveType}` : ''}
                      </div>
                    </div>
                    <span className={`badge ${a.stage >= 6 ? 'b-green' : a.stage >= 4 ? 'b-gold' : 'b-indigo'}`}
                      style={{ fontSize: 12, padding: '5px 12px' }}>
                      {a.stage >= 6 && Icons.cap} {STAGES[a.stage] || 'Applied'}
                    </span>
                  </div>
                  <PipelineTracker stage={a.stage} />
                </div>
                {/* Result footer */}
                {a.stage >= 5 && (
                  <div style={{ padding: '10px 20px', borderTop: '1px solid var(--line)',
                    background: a.stage >= 6 ? 'var(--green-soft)' : 'var(--gold-soft)',
                    fontSize: 13, fontWeight: 600,
                    color: a.stage >= 6 ? '#0c7a4c' : '#9a6c12' }}>
                    {a.stage >= 6
                      ? `🎉 Congratulations! You're placed at ${job.companyName}${job.package ? ` with ₹${job.package}` : ''}`
                      : `📋 Offer stage — awaiting final confirmation`}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {rejected.length > 0 && (
        <>
          <div className="sec-head" style={{ marginTop: 24 }}>
            <h3 style={{ color: 'var(--muted)' }}>Rejected ({rejected.length})</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rejected.map(a => {
              const job = jobMap[a.jobId] || {}
              return (
                <div className="card p" key={a.id} style={{ opacity: 0.5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: '#aaa',
                      display: 'grid', placeItems: 'center', fontWeight: 700, color: '#fff', fontSize: 15,
                      flex: '0 0 auto' }}>{(job.companyName || '?')[0]}</div>
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
