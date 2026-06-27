import { useAuth } from '../../contexts/AuthContext'
import { useDocument, useCollection, where } from '../../hooks/useFirestore'
import { Icons } from '../../components/Icons'

export default function StudentDashboard() {
  const { userData } = useAuth()
  const { data: student, loading: stuLoading } = useDocument('students', userData?.id)
  const { data: jobs, loading: jobsLoading } = useCollection('jobs', [where('status', '==', 'open')], [])

  // Calculate profile completeness
  const checks = student ? [
    student.tenthMarks != null,
    student.twelfthMarks != null,
    student.cgpa != null,
    student.usn,
    student.department,
  ] : []
  const pct = checks.length ? Math.round((checks.filter(Boolean).length / checks.length) * 100) : 0

  // Filter eligible jobs
  const eligibleJobs = jobs.filter(j => {
    if (!student) return true
    if (j.minPercentage && student.tenthMarks && student.tenthMarks < j.minPercentage) return false
    if (j.eligibleDepartments?.length > 0 && student.department &&
      !j.eligibleDepartments.includes(student.department)) return false
    return true
  })

  return (
    <>
      {pct < 100 && (
        <div className="notice" style={{ background: 'var(--indigo-soft)', borderColor: '#cfd5ff' }}>
          <span className="ic" style={{ color: 'var(--indigo)' }}>{Icons.spark}</span>
          <div>
            <b style={{ color: 'var(--ink)' }}>Your profile is {pct}% complete</b>
            <p style={{ color: 'var(--indigo-d)' }}>
              Complete your academic records to unlock all eligible drives.
            </p>
          </div>
        </div>
      )}

      <div className="card p" style={{ marginBottom: 22 }}>
        <div className="sec-head">
          <div>
            <h3>Profile completeness</h3>
            <div className="sub">Complete all records to become eligible</div>
          </div>
          <span className={`badge ${pct === 100 ? 'b-green' : 'b-gold'}`}>{pct}%</span>
        </div>
        <div className="profile-bar">
          <div className="pbar"><i style={{ width: `${pct}%` }} /></div>
        </div>
      </div>

      <div className="sec-head">
        <div>
          <h3>Open drives for you</h3>
          <div className="sub">
            {jobsLoading ? 'Loading…' : `${eligibleJobs.length} drive${eligibleJobs.length !== 1 ? 's' : ''} matching your profile`}
          </div>
        </div>
      </div>

      {eligibleJobs.length === 0 && !jobsLoading ? (
        <div className="card p" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)' }}>
          <div style={{ width: 54, height: 54, borderRadius: 14, background: 'var(--indigo-soft)',
            display: 'grid', placeItems: 'center', margin: '0 auto 14px', color: 'var(--indigo)' }}>{Icons.brief}</div>
          <b style={{ display: 'block', color: 'var(--ink)', fontSize: 15, marginBottom: 5 }}>No open drives right now</b>
          Check back soon — you'll be notified when new drives are posted.
        </div>
      ) : (
        <div className="cards-row c3" style={{ marginBottom: 0 }}>
          {eligibleJobs.map(j => (
            <div className="card job" key={j.id}>
              <div className="job-top">
                <div className="job-logo" style={{ background: '#4C5BD4' }}>{(j.companyName || '?')[0]}</div>
                <div style={{ flex: 1 }}>
                  <h4>{j.role}</h4>
                  <div className="co">{j.companyName}</div>
                </div>
              </div>
              <div className="job-meta">
                {j.package && <span className="chip">₹ {j.package}</span>}
                <span className="chip">{j.driveType || 'On-campus'}</span>
              </div>
              <div className="job-foot">
                <span className="badge b-green">{Icons.check} Eligible</span>
                <button className="btn btn-pri" style={{ marginLeft: 'auto' }}>Apply now</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
