import { useAuth } from '../../contexts/AuthContext'
import { useDocument, useCollection, where } from '../../hooks/useFirestore'
import { Icons } from '../../components/Icons'
import { useSite } from '../../contexts/SiteContext'

const STAGES = ['Applied', 'Shortlisted', 'Aptitude', 'Technical', 'HR', 'Offer', 'Placed']

function calcProfileCompletion(student, userData) {
  if (!student) return { pct: 0, items: [], missing: [] }
  const items = [
    { label: 'Full name', done: !!userData?.displayName },
    { label: 'USN', done: !!student.usn },
    { label: 'Department', done: !!student.department },
    { label: 'Phone', done: !!userData?.phone },
    { label: '10th marks', done: student.tenthMarks != null },
    { label: '10th approved', done: student.tenthVerified === 'approved' || student.tenthVerified === true },
    { label: '12th marks', done: student.twelfthMarks != null },
    { label: '12th approved', done: student.twelfthVerified === 'approved' || student.twelfthVerified === true },
    { label: 'Semester records', done: Object.keys(student.semesters || {}).length > 0 },
    { label: 'CGPA', done: student.cgpa != null && student.cgpa > 0 },
  ]
  const done = items.filter(i => i.done).length
  const missing = items.filter(i => !i.done)
  return { pct: Math.round((done / items.length) * 100), items, missing }
}

export { calcProfileCompletion }

export default function StudentDashboard() {
  const { userData } = useAuth()
  const { data: student, loading: stuLoading } = useDocument('students', userData?.id)
  const { data: jobs } = useCollection('jobs', [where('status', '==', 'open')], [])
  const { data: myApps } = useCollection('applications',
    [where('studentId', '==', userData?.id || 'x')], [userData?.id])

  const { pct, items, missing } = calcProfileCompletion(student, userData)
  const isPlaced = student?.placementStatus === 'placed'
  const appliedJobIds = new Set(myApps.map(a => a.jobId))
  const appMap = {}
  myApps.forEach(a => { appMap[a.jobId] = a })

  // Eligible jobs
  const eligibleJobs = jobs.filter(j => {
    if (!student) return false
    if (j.min10th && student.tenthMarks && student.tenthMarks < j.min10th) return false
    if (j.min12th && student.twelfthMarks && student.twelfthMarks < j.min12th) return false
    if (j.minCgpa && student.cgpa && student.cgpa < j.minCgpa) return false
    if (j.eligibleDepartments?.length > 0 && student.department &&
      !j.eligibleDepartments.map(d => d.toUpperCase()).includes(student.department.toUpperCase())) return false
    return true
  })

  if (stuLoading) {
    return <div className="loading-screen" style={{ minHeight: 200 }}><div className="spinner" /></div>
  }

  return (
    <>
      {/* Placed banner */}
      {isPlaced && (
        <div className="notice" style={{ background: 'var(--green-soft)', borderColor: '#b5e6cf' }}>
          <span className="ic" style={{ color: 'var(--green)' }}>{Icons.cap}</span>
          <div>
            <b style={{ color: 'var(--ink)' }}>Congratulations! You're placed at {student.placedAt}</b>
            <p style={{ color: '#0c7a4c' }}>
              {student.package ? `Package: ₹${student.package} LPA · ` : ''}You can no longer apply for new drives.
            </p>
          </div>
        </div>
      )}

      {/* Profile incomplete warning */}
      {pct < 100 && !isPlaced && (
        <div className="notice" style={{ background: 'var(--gold-soft)', borderColor: '#f0dcae' }}>
          <span className="ic" style={{ color: 'var(--gold)' }}>{Icons.spark}</span>
          <div>
            <b>Your profile is {pct}% complete</b>
            <p>Complete your profile to apply for placement drives. Missing: {missing.map(m => m.label).join(', ')}.</p>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="cards-row c4" style={{ marginBottom: 20 }}>
        <div className="card stat">
          <div className="ic" style={{ background: pct === 100 ? 'var(--green-soft)' : 'var(--gold-soft)',
            color: pct === 100 ? 'var(--green)' : 'var(--gold)' }}>{pct === 100 ? Icons.check : Icons.spark}</div>
          <div className="v">{pct}%</div>
          <div className="l">Profile complete</div>
        </div>
        <div className="card stat">
          <div className="ic" style={{ background: 'var(--indigo-soft)', color: 'var(--indigo)' }}>{Icons.brief}</div>
          <div className="v">{eligibleJobs.length}</div>
          <div className="l">Eligible drives</div>
        </div>
        <div className="card stat">
          <div className="ic" style={{ background: 'var(--indigo-soft)', color: 'var(--indigo)' }}>{Icons.check}</div>
          <div className="v">{myApps.filter(a => a.status === 'active').length}</div>
          <div className="l">Active applications</div>
        </div>
        <div className="card stat">
          <div className="ic" style={{ background: isPlaced ? 'var(--green-soft)' : '#f3f4fa',
            color: isPlaced ? 'var(--green)' : 'var(--muted)' }}>{Icons.cap}</div>
          <div className="v">{isPlaced ? '✓' : '—'}</div>
          <div className="l">{isPlaced ? `Placed at ${student.placedAt}` : 'Placement status'}</div>
        </div>
      </div>

      {/* Profile completeness detail */}
      <div className="card p" style={{ marginBottom: 20 }}>
        <div className="sec-head">
          <div>
            <h3>Profile checklist</h3>
            <div className="sub">All items must be completed before you can apply for drives</div>
          </div>
          <span className={`badge ${pct === 100 ? 'b-green' : 'b-gold'}`}>{pct}%</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <div style={{ flex: 1, height: 8, borderRadius: 8, background: '#eef0f5', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, borderRadius: 8,
              background: pct === 100
                ? 'var(--green)'
                : 'linear-gradient(90deg, var(--indigo), var(--gold))',
              transition: '.3s' }} />
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {items.map(item => (
            <span key={item.label} className="chip" style={{
              background: item.done ? 'var(--green-soft)' : 'var(--rose-soft)',
              color: item.done ? '#0c7a4c' : '#b83a3e',
              fontWeight: 600, fontSize: 12,
            }}>
              {item.done ? '✓' : '✗'} {item.label}
            </span>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
        {/* Active applications */}
        <div className="card p">
          <div className="sec-head">
            <h3>My applications</h3>
            <div className="sub">{myApps.filter(a => a.status === 'active').length} active</div>
          </div>
          {myApps.filter(a => a.status === 'active').length === 0 ? (
            <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              {pct < 100 ? 'Complete your profile to start applying.' : 'No applications yet. Check Open Drives.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {myApps.filter(a => a.status === 'active').map(a => {
                const job = jobs.find(j => j.id === a.jobId) || {}
                return (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px', background: a.stage >= 6 ? 'var(--green-soft)' : '#fafbff',
                    borderRadius: 10, border: '1px solid var(--line)' }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: '#4C5BD4',
                      display: 'grid', placeItems: 'center', fontWeight: 700, color: '#fff',
                      fontSize: 15, flex: '0 0 auto' }}>{(job.companyName || '?')[0]}</div>
                    <div style={{ flex: 1 }}>
                      <b style={{ fontSize: 13.5, fontWeight: 600, display: 'block' }}>{job.role || 'Unknown'}</b>
                      <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                        {job.companyName}{job.package ? ` · ₹${job.package}` : ''}
                      </div>
                    </div>
                    <span className={`badge ${a.stage >= 6 ? 'b-green' : a.stage >= 4 ? 'b-gold' : 'b-indigo'}`}
                      style={{ fontSize: 11 }}>
                      {a.stage >= 6 && Icons.cap} {STAGES[a.stage] || 'Applied'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Eligible drives preview */}
        <div className="card p">
          <div className="sec-head">
            <h3>Open drives</h3>
            <div className="sub">{eligibleJobs.length} eligible</div>
          </div>
          {eligibleJobs.length === 0 ? (
            <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              No eligible drives right now. Check back soon.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {eligibleJobs.slice(0, 5).map(j => {
                const applied = appliedJobIds.has(j.id)
                const app = appMap[j.id]
                return (
                  <div key={j.id} style={{ display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', background: '#fafbff', borderRadius: 10,
                    border: '1px solid var(--line)' }}>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: '#4C5BD4',
                      display: 'grid', placeItems: 'center', fontWeight: 700, color: '#fff',
                      fontSize: 14, flex: '0 0 auto' }}>{(j.companyName || '?')[0]}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <b style={{ fontSize: 13, fontWeight: 600, display: 'block' }}>{j.role}</b>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{j.companyName}</div>
                    </div>
                    {applied
                      ? <span className={`badge ${app?.stage >= 6 ? 'b-green' : 'b-indigo'}`} style={{ fontSize: 10 }}>
                          {STAGES[app?.stage] || 'Applied'}
                        </span>
                      : pct < 100
                      ? <span className="badge b-grey" style={{ fontSize: 10 }}>Profile incomplete</span>
                      : isPlaced
                      ? <span className="badge b-grey" style={{ fontSize: 10 }}>Placed</span>
                      : <span className="badge b-green" style={{ fontSize: 10 }}>{Icons.check} Eligible</span>
                    }
                  </div>
                )
              })}
              {eligibleJobs.length > 5 && (
                <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', padding: '4px 0' }}>
                  +{eligibleJobs.length - 5} more drives available
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
