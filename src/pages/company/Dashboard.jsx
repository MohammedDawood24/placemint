import { useMemo, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useCollection, where, orderBy } from '../../hooks/useFirestore'
import { useDocument } from '../../hooks/useFirestore'
import { Icons, initials } from '../../components/Icons'
import { useSite } from '../../contexts/SiteContext'
import { formatPackage, toLPA } from '../../utils/formatPackage'
import CompanyJobDetail from '../../components/CompanyJobDetail'

const STAGES = ['Applied', 'Shortlisted', 'Aptitude', 'Technical', 'HR', 'Offer', 'Placed']
const STAGE_COLORS = ['#9aa1bd', '#4C5BD4', '#7B1FA2', '#1565C0', '#E0A43B', '#F57C00', '#15A86B']

function Stat({ ic, color, soft, v, l, sub }) {
  return (
    <div className="card stat">
      <div className="ic" style={{ background: soft, color }}>{ic}</div>
      <div className="v">{v}</div>
      <div className="l">{l}</div>
      {sub && <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

export default function CompanyDashboard() {
  const { userData } = useAuth()
  const { siteName } = useSite()
  const { data: company } = useDocument('companies', userData?.id)
  const { data: jobs } = useCollection('jobs',
    [where('companyId', '==', userData?.id || 'x')], [userData?.id])
  const { data: allApps } = useCollection('applications', [], [])

  const [viewJobId, setViewJobId] = useState(null)
  const viewJob = viewJobId ? jobs.find(j => j.id === viewJobId) : null
  if (viewJob) {
    return <CompanyJobDetail job={viewJob}
      onBack={() => setViewJobId(null)} />
  }

  const jobIds = new Set(jobs.map(j => j.id))
  const jobMap = {}
  jobs.forEach(j => { jobMap[j.id] = j })
  const myApps = allApps.filter(a => jobIds.has(a.jobId))
  const activeApps = myApps.filter(a => a.status === 'active')
  const rejectedApps = myApps.filter(a => a.status === 'rejected')

  // Stats
  const openJobs = jobs.filter(j => j.status === 'open')
  const placedCount = activeApps.filter(a => a.stage >= 6).length
  const offerCount = activeApps.filter(a => a.stage >= 5).length
  const packages = jobs.map(j => toLPA(j.packageNumeric)).filter(p => p > 0)
  const highestPkg = packages.length > 0 ? Math.max(...packages) : 0

  // Pipeline counts
  const stageCounts = STAGES.map((_, i) => activeApps.filter(a => a.stage === i).length)
  const maxStageCount = Math.max(...stageCounts, 1)

  // Department breakdown
  const deptBreakdown = useMemo(() => {
    const map = {}
    activeApps.forEach(a => {
      const d = a.department || 'Unknown'
      if (!map[d]) map[d] = { dept: d, total: 0, placed: 0 }
      map[d].total++
      if (a.stage >= 6) map[d].placed++
    })
    return Object.values(map).sort((a, b) => b.total - a.total)
  }, [activeApps])

  // Job-wise performance
  const jobPerformance = useMemo(() => {
    return jobs.map(j => {
      const jApps = myApps.filter(a => a.jobId === j.id)
      const active = jApps.filter(a => a.status === 'active')
      const placed = active.filter(a => a.stage >= 6)
      const rejected = jApps.filter(a => a.status === 'rejected')
      const furthest = active.length > 0 ? Math.max(...active.map(a => a.stage)) : -1
      return {
        ...j, applicants: jApps.length, active: active.length,
        placed: placed.length, rejected: rejected.length,
        furthestStage: furthest,
      }
    }).sort((a, b) => b.applicants - a.applicants)
  }, [jobs, myApps])

  // Recent activity
  const recentApps = useMemo(() => {
    return [...myApps]
      .sort((a, b) => (b.updatedAt?.seconds || b.appliedAt?.seconds || 0) -
        (a.updatedAt?.seconds || a.appliedAt?.seconds || 0))
      .slice(0, 10)
  }, [myApps])

  // Upcoming drives
  const upcomingDrives = jobs.filter(j =>
    j.status === 'open' && j.driveDate?.seconds && j.driveDate.seconds * 1000 > Date.now()
  ).sort((a, b) => (a.driveDate?.seconds || 0) - (b.driveDate?.seconds || 0))

  return (
    <>
      {/* Welcome */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif",
          margin: '0 0 4px' }}>Welcome, {company?.name || userData?.displayName || 'Recruiter'}</h2>
        <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0 }}>
          Your recruiting dashboard at {siteName}.
        </p>
      </div>

      {/* Upcoming drive alert */}
      {upcomingDrives.length > 0 && (
        <div className="notice" style={{ background: 'var(--indigo-soft)', borderColor: '#cfd5ff', marginBottom: 16 }}>
          <span className="ic" style={{ color: 'var(--indigo)' }}>{Icons.cal}</span>
          <div>
            <b style={{ color: 'var(--ink)' }}>Upcoming drive: {upcomingDrives[0].role}</b>
            <p style={{ color: 'var(--indigo-d)' }}>
              {new Date(upcomingDrives[0].driveDate.seconds * 1000).toLocaleDateString('en-IN', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
              })} · {upcomingDrives[0].driveType || 'On-campus'}
              · {activeApps.filter(a => a.jobId === upcomingDrives[0].id).length} candidates
            </p>
          </div>
        </div>
      )}

      {/* Key stats */}
      <div className="cards-row c4" style={{ marginBottom: 16 }}>
        <Stat ic={Icons.brief} color="#4C5BD4" soft="#EEF0FF"
          v={openJobs.length} l="Active postings"
          sub={`${jobs.length} total`} />
        <Stat ic={Icons.users} color="#E0A43B" soft="#FBF1DD"
          v={activeApps.length} l="Total applicants"
          sub={rejectedApps.length > 0 ? `${rejectedApps.length} rejected` : null} />
        <Stat ic={Icons.check} color="#15A86B" soft="#E2F6EE"
          v={placedCount} l="Students placed"
          sub={offerCount > placedCount ? `${offerCount - placedCount} at offer stage` : null} />
        <Stat ic={Icons.spark} color="#C2185B" soft="#FCE4EC"
          v={highestPkg > 0 ? `₹${highestPkg} LPA` : '—'} l="Package offered" />
      </div>

      {/* Pipeline funnel */}
      <div className="card p" style={{ marginBottom: 16 }}>
        <div className="sec-head">
          <div>
            <h3>Hiring pipeline</h3>
            <div className="sub">{activeApps.length} active candidates across all postings</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 160, padding: '0 8px' }}>
          {STAGES.map((s, i) => (
            <div key={s} style={{ flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
              <span style={{ fontSize: 16, fontWeight: 700,
                color: stageCounts[i] > 0 ? STAGE_COLORS[i] : 'var(--muted)' }}>{stageCounts[i]}</span>
              <div style={{
                width: '100%', maxWidth: 60, borderRadius: '8px 8px 0 0',
                background: `linear-gradient(180deg, ${STAGE_COLORS[i]}, ${STAGE_COLORS[i]}dd)`,
                height: `${Math.max((stageCounts[i] / maxStageCount) * 100, stageCounts[i] > 0 ? 8 : 0)}%`,
                transition: '.3s', minHeight: stageCounts[i] > 0 ? 8 : 0,
              }} />
              <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 500, textAlign: 'center' }}>{s}</span>
            </div>
          ))}
        </div>
        {/* Conversion rates */}
        {activeApps.length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginTop: 14, paddingTop: 14,
            borderTop: '1px solid var(--line)', flexWrap: 'wrap' }}>
            {[
              ['Apply → Shortlist', stageCounts[0] > 0 ? ((1 - stageCounts[0] / activeApps.length) * 100).toFixed(0) : '—'],
              ['Shortlist → Offer', (stageCounts[1] + stageCounts[2] + stageCounts[3] + stageCounts[4]) > 0
                ? ((stageCounts[5] + stageCounts[6]) / (stageCounts[1] + stageCounts[2] + stageCounts[3] + stageCounts[4] + stageCounts[5] + stageCounts[6]) * 100).toFixed(0) : '—'],
              ['Overall conversion', activeApps.length > 0 ? ((placedCount / activeApps.length) * 100).toFixed(0) : '—'],
            ].map(([label, val]) => (
              <div key={label} style={{ padding: '6px 12px', background: '#f8f9fc', borderRadius: 8,
                fontSize: 12, display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ color: 'var(--muted)' }}>{label}:</span>
                <b style={{ color: 'var(--ink)', fontWeight: 700 }}>{val}%</b>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Job-wise performance */}
        <div className="card p">
          <div className="sec-head">
            <h3>Posting performance</h3>
            <div className="sub">{jobs.length} posting{jobs.length !== 1 ? 's' : ''}</div>
          </div>
          {jobPerformance.length === 0 ? (
            <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              No postings yet. Create your first job posting.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {jobPerformance.map(j => {
                const total = j.applicants || 1
                return (
                  <div key={j.id} style={{ padding: '12px 14px', background: '#fafbff',
                    borderRadius: 10, border: '1px solid var(--line)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <div style={{ flex: 1 }}>
                        <b style={{ fontSize: 14, fontWeight: 600 }}>{j.role}</b>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                          {j.package || '—'} · {j.applicants} applicant{j.applicants !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <span className={`badge ${j.status === 'open' ? 'b-green' : j.status === 'closed' ? 'b-gold' : 'b-grey'}`}
                        style={{ fontSize: 10 }}>{j.status || 'draft'}</span>
                    </div>
                    {/* Mini pipeline bar */}
                    {j.applicants > 0 && (
                      <div style={{ display: 'flex', height: 8, borderRadius: 8, overflow: 'hidden', background: '#eef0f5' }}>
                        {STAGES.map((s, i) => {
                          const count = myApps.filter(a => a.jobId === j.id && a.stage === i && a.status === 'active').length
                          if (count === 0) return null
                          return (
                            <div key={s} style={{
                              width: `${(count / total) * 100}%`, background: STAGE_COLORS[i],
                              minWidth: count > 0 ? 4 : 0,
                            }} title={`${s}: ${count}`} />
                          )
                        })}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 10, marginTop: 8, fontSize: 11 }}>
                      <span style={{ color: 'var(--muted)' }}>Active: <b style={{ color: 'var(--ink)' }}>{j.active}</b></span>
                      <span style={{ color: 'var(--muted)' }}>Placed: <b style={{ color: 'var(--green)' }}>{j.placed}</b></span>
                      <span style={{ color: 'var(--muted)' }}>Rejected: <b style={{ color: 'var(--rose)' }}>{j.rejected}</b></span>
                      {j.furthestStage >= 0 && (
                        <span style={{ color: 'var(--muted)', marginLeft: 'auto' }}>
                          Furthest: <b style={{ color: STAGE_COLORS[j.furthestStage] }}>{STAGES[j.furthestStage]}</b>
                        </span>
                      )}
                    </div>
                    <button onClick={() => setViewJobId(j.id)}
                      style={{ marginTop: 10, width: '100%', padding: '8px', background: 'none',
                        border: '1.5px solid var(--line)', borderRadius: 8, cursor: 'pointer',
                        fontSize: 12, fontWeight: 600, color: 'var(--indigo)', fontFamily: 'inherit',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      {Icons.eye} View candidates &amp; manage
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Department breakdown */}
        <div className="card p">
          <div className="sec-head">
            <h3>Applicants by department</h3>
          </div>
          {deptBreakdown.length === 0 ? (
            <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              No applicants yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {deptBreakdown.map(d => {
                const maxTotal = Math.max(...deptBreakdown.map(x => x.total), 1)
                return (
                  <div key={d.dept}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <b style={{ fontSize: 13, fontWeight: 600, width: 50 }}>{d.dept}</b>
                      <div style={{ flex: 1, height: 22, borderRadius: 6, background: '#eef0f5',
                        overflow: 'hidden', position: 'relative' }}>
                        <div style={{ height: '100%', width: `${(d.total / maxTotal) * 100}%`,
                          background: 'var(--indigo)', borderRadius: 6, position: 'relative' }}>
                          {d.placed > 0 && (
                            <div style={{ position: 'absolute', right: 0, top: 0, height: '100%',
                              width: `${(d.placed / d.total) * 100}%`, background: 'var(--green)',
                              borderRadius: '0 6px 6px 0' }} />
                          )}
                        </div>
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--muted)', minWidth: 40, textAlign: 'right' }}>
                        {d.total}
                      </span>
                    </div>
                    {d.placed > 0 && (
                      <div style={{ fontSize: 11, color: 'var(--green)', paddingLeft: 58 }}>
                        {d.placed} placed
                      </div>
                    )}
                  </div>
                )
              })}
              <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 11 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--indigo)' }} /> Applied
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--green)' }} /> Placed
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent activity */}
      <div className="card p">
        <div className="sec-head">
          <h3>Recent activity</h3>
          <div className="sub">Latest candidate updates</div>
        </div>
        {recentApps.length === 0 ? (
          <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            No activity yet. Publish a job posting to start receiving applications.
          </div>
        ) : (
          <table className="tbl">
            <thead><tr><th>Candidate</th><th>Role</th><th>Department</th><th>CGPA</th><th>Stage</th><th>Status</th></tr></thead>
            <tbody>
              {recentApps.map(a => {
                const job = jobMap[a.jobId]
                return (
                  <tr key={a.id}>
                    <td>
                      <div className="cell-u">
                        <div className="av-sm">{initials(a.studentName)}</div>
                        <div>
                          <b>{a.studentName}</b>
                          <span className="mono" style={{ fontSize: 11 }}>{a.studentUsn || ''}</span>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 13 }}>{job?.role || '—'}</td>
                    <td>{a.department || '—'}</td>
                    <td className="mono">{a.cgpa ?? '—'}</td>
                    <td>
                      <span className={`badge`} style={{
                        fontSize: 11, background: `${STAGE_COLORS[a.stage]}18`,
                        color: STAGE_COLORS[a.stage],
                      }}>{STAGES[a.stage] || 'Applied'}</span>
                    </td>
                    <td>
                      {a.status === 'rejected'
                        ? <span className="badge b-rose" style={{ fontSize: 10 }}>Rejected</span>
                        : a.stage >= 6
                        ? <span className="badge b-green" style={{ fontSize: 10 }}>{Icons.cap} Placed</span>
                        : <span className="badge b-grey" style={{ fontSize: 10 }}>Active</span>}
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
