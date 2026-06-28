import { useMemo } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useCollection, where } from '../../hooks/useFirestore'
import { Icons, initials } from '../../components/Icons'
import { useSite } from '../../contexts/SiteContext'
import { formatPackage, toLPA } from '../../utils/formatPackage'

const STAGES = ['Applied', 'Shortlisted', 'Aptitude', 'Technical', 'HR', 'Offer', 'Placed']

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

export default function HodDashboard() {
  const { userData } = useAuth()
  const { siteName, branches } = useSite()
  const dept = userData?.department || ''
  const deptName = branches.find(b => b.code?.toUpperCase() === dept?.toUpperCase())?.name || dept

  const { data: allUsers } = useCollection('users', [], [])
  const { data: allStudents } = useCollection('students', [], [])
  const { data: jobs } = useCollection('jobs', [], [])
  const { data: applications } = useCollection('applications', [], [])
  const { data: activities } = useCollection('activities', [], [])

  // Department-scoped data
  const deptUsers = allUsers.filter(u =>
    u.role === 'student' && (u.department || '').toUpperCase() === dept.toUpperCase())
  const approvedStudents = deptUsers.filter(u => u.approved === true || u.approved === 'true')
  const pendingApprovals = deptUsers.filter(u => u.approved === false)
  const coordinators = allUsers.filter(u =>
    u.role === 'coordinator' && (u.department || '').toUpperCase() === dept.toUpperCase())

  const deptStudents = allStudents.filter(s =>
    (s.department || '').toUpperCase() === dept.toUpperCase())
  const placedStudents = deptStudents.filter(s => s.placementStatus === 'placed')
  const placementRate = approvedStudents.length > 0
    ? ((placedStudents.length / approvedStudents.length) * 100).toFixed(1) : '0'

  const packages = placedStudents.map(s => toLPA(s.package)).filter(p => p > 0)
  const highestPkg = packages.length > 0 ? Math.max(...packages) : 0
  const avgPkg = packages.length > 0 ? (packages.reduce((a, b) => a + b, 0) / packages.length).toFixed(1) : 0

  // Eligible jobs for this department
  const eligibleJobs = jobs.filter(j =>
    j.status === 'open' && (
      (j.eligibleDepartments || []).length === 0 ||
      j.eligibleDepartments.map(d => d.toUpperCase()).includes(dept.toUpperCase())
    )
  )

  // Department applications
  const deptApps = applications.filter(a =>
    (a.department || '').toUpperCase() === dept.toUpperCase())
  const activeApps = deptApps.filter(a => a.status === 'active')
  const stageCounts = STAGES.map((_, i) => activeApps.filter(a => a.stage === i).length)

  // Pending semester reviews
  const pendingSemReviews = useMemo(() => {
    let count = 0
    deptStudents.forEach(s => {
      Object.values(s.semesters || {}).forEach(sem => {
        if (sem.verified === 'pending' || sem.verified === false) count++
      })
    })
    return count
  }, [deptStudents])

  const pendingMarksReview = deptStudents.filter(s =>
    s.tenthVerified === 'pending' || s.twelfthVerified === 'pending').length

  // Backlog overview
  const backlogStats = useMemo(() => {
    let totalActive = 0, totalCleared = 0, studentsWithBacklogs = 0
    deptStudents.forEach(s => {
      let hasActive = false
      Object.values(s.semesters || {}).forEach(sem => {
        (sem.backlogs || []).forEach(b => {
          if (b.status === 'active') { totalActive++; hasActive = true }
          else if (b.status === 'cleared') totalCleared++
        })
      })
      if (hasActive) studentsWithBacklogs++
    })
    return { totalActive, totalCleared, studentsWithBacklogs }
  }, [deptStudents])

  // Department activities
  const deptActivities = activities.filter(a =>
    (a.department || '').toUpperCase() === dept.toUpperCase() || a.department === 'ALL'
  ).sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0))

  // Top placed students
  const topPlaced = useMemo(() => {
    return placedStudents
      .map(s => ({
        ...s,
        displayName: deptUsers.find(u => u.id === s.id)?.displayName || '—',
        lpa: toLPA(s.package),
      }))
      .sort((a, b) => b.lpa - a.lpa)
      .slice(0, 5)
  }, [placedStudents, deptUsers])

  // Recent applications
  const recentApps = useMemo(() => {
    return [...deptApps]
      .sort((a, b) => (b.appliedAt?.seconds || 0) - (a.appliedAt?.seconds || 0))
      .slice(0, 8)
  }, [deptApps])

  return (
    <>
      {/* Welcome */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif",
          margin: '0 0 4px' }}>
          {dept} Department
        </h2>
        <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0 }}>
          {deptName} · {siteName}
        </p>
      </div>

      {/* Key stats */}
      <div className="cards-row c4">
        <Stat ic={Icons.cap} color="#4C5BD4" soft="#EEF0FF"
          v={approvedStudents.length} l="Students"
          sub={pendingApprovals.length > 0 ? `${pendingApprovals.length} pending` : `${coordinators.length} coordinators`} />
        <Stat ic={Icons.check} color="#15A86B" soft="#E2F6EE"
          v={placedStudents.length} l="Placed"
          sub={`${placementRate}% rate`} />
        <Stat ic={Icons.spark} color="#E0A43B" soft="#FBF1DD"
          v={highestPkg > 0 ? `₹${highestPkg}L` : '—'} l="Highest package"
          sub={avgPkg > 0 ? `Avg ₹${avgPkg}L` : null} />
        <Stat ic={Icons.brief} color="#C2185B" soft="#FCE4EC"
          v={eligibleJobs.length} l="Open drives"
          sub={`${activeApps.length} applications`} />
      </div>

      {/* Pending actions */}
      {(pendingApprovals.length > 0 || pendingSemReviews > 0 || pendingMarksReview > 0 || backlogStats.totalActive > 0) && (
        <div className="card p" style={{ marginBottom: 16 }}>
          <div className="sec-head"><h3>Attention needed</h3></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pendingApprovals.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                background: '#fffbf0', borderRadius: 10, border: '1px solid #f0dcae' }}>
                <span className="badge b-gold" style={{ fontSize: 16, padding: '4px 10px' }}>{pendingApprovals.length}</span>
                <div>
                  <b style={{ fontSize: 13.5, fontWeight: 600 }}>Student registrations awaiting approval</b>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>Go to Approvals to review</div>
                </div>
              </div>
            )}
            {pendingMarksReview > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                background: '#f0f3ff', borderRadius: 10, border: '1px solid #cfd5ff' }}>
                <span className="badge b-indigo" style={{ fontSize: 16, padding: '4px 10px' }}>{pendingMarksReview}</span>
                <div>
                  <b style={{ fontSize: 13.5, fontWeight: 600 }}>10th/12th marks pending review</b>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>Open student details to approve</div>
                </div>
              </div>
            )}
            {pendingSemReviews > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                background: '#f0f3ff', borderRadius: 10, border: '1px solid #cfd5ff' }}>
                <span className="badge b-indigo" style={{ fontSize: 16, padding: '4px 10px' }}>{pendingSemReviews}</span>
                <div>
                  <b style={{ fontSize: 13.5, fontWeight: 600 }}>Semester records pending review</b>
                </div>
              </div>
            )}
            {backlogStats.totalActive > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                background: 'var(--rose-soft)', borderRadius: 10, border: '1px solid #f0c4c5' }}>
                <span className="badge b-rose" style={{ fontSize: 16, padding: '4px 10px' }}>{backlogStats.totalActive}</span>
                <div>
                  <b style={{ fontSize: 13.5, fontWeight: 600 }}>Active backlogs across {backlogStats.studentsWithBacklogs} students</b>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{backlogStats.totalCleared} backlogs cleared so far</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Application pipeline */}
        <div className="card p">
          <div className="sec-head">
            <h3>Placement pipeline</h3>
            <div className="sub">{activeApps.length} active applications</div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {STAGES.map((s, i) => (
              <div key={s} style={{ flex: 1, textAlign: 'center', padding: '12px 4px',
                background: stageCounts[i] > 0 ? 'var(--indigo-soft)' : '#f8f9fc', borderRadius: 8 }}>
                <div style={{ fontSize: 20, fontWeight: 700,
                  color: stageCounts[i] > 0 ? 'var(--indigo-d)' : 'var(--muted)' }}>{stageCounts[i]}</div>
                <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 2 }}>{s}</div>
              </div>
            ))}
          </div>

          {/* Recent applications */}
          {recentApps.length > 0 && (
            <>
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 16, paddingTop: 14,
                borderTop: '1px solid var(--line)', marginBottom: 8 }}>Recent applications</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {recentApps.slice(0, 5).map(a => {
                  const job = jobs.find(j => j.id === a.jobId) || {}
                  return (
                    <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8,
                      padding: '6px 8px', borderRadius: 8, fontSize: 12.5 }}>
                      <div className="av-sm" style={{ width: 26, height: 26, fontSize: 10 }}>
                        {initials(a.studentName)}</div>
                      <b style={{ fontWeight: 600, flex: 1 }}>{a.studentName}</b>
                      <span style={{ color: 'var(--muted)', fontSize: 11 }}>{job.companyName || '—'}</span>
                      <span className={`badge ${a.stage >= 6 ? 'b-green' : 'b-indigo'}`}
                        style={{ fontSize: 10 }}>{STAGES[a.stage]}</span>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* Open drives for this department */}
        <div className="card p">
          <div className="sec-head">
            <h3>Active drives</h3>
            <div className="sub">{eligibleJobs.length} open for {dept}</div>
          </div>
          {eligibleJobs.length === 0 ? (
            <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              No open drives for {dept} right now.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {eligibleJobs.slice(0, 6).map(j => {
                const jApps = deptApps.filter(a => a.jobId === j.id && a.status === 'active')
                const jPlaced = jApps.filter(a => a.stage >= 6)
                return (
                  <div key={j.id} style={{ display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', background: '#fafbff', borderRadius: 10,
                    border: '1px solid var(--line)' }}>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: '#4C5BD4',
                      display: 'grid', placeItems: 'center', fontWeight: 700, color: '#fff',
                      fontSize: 14, flex: '0 0 auto' }}>{(j.companyName || '?')[0]}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <b style={{ fontSize: 13, fontWeight: 600, display: 'block' }}>{j.role}</b>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                        {j.companyName} · {j.package || '—'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{jApps.length}</div>
                      <div style={{ fontSize: 10, color: 'var(--muted)' }}>
                        {jPlaced.length > 0 ? `${jPlaced.length} placed` : 'applied'}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Top placed students */}
        <div className="card p">
          <div className="sec-head">
            <h3>Top placed students</h3>
            <div className="sub">By package</div>
          </div>
          {topPlaced.length === 0 ? (
            <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              No placements yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {topPlaced.map((s, i) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', background: i === 0 ? 'var(--gold-soft)' : '#fafbff',
                  borderRadius: 10, border: '1px solid var(--line)' }}>
                  <span style={{ width: 24, height: 24, borderRadius: 7,
                    background: i === 0 ? 'var(--gold)' : '#4C5BD4',
                    display: 'grid', placeItems: 'center', fontWeight: 700, color: '#fff',
                    fontSize: 11, flex: '0 0 auto' }}>{i + 1}</span>
                  <div style={{ flex: 1 }}>
                    <b style={{ fontSize: 13.5, fontWeight: 600 }}>{s.displayName}</b>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{s.placedAt}</div>
                  </div>
                  <b style={{ fontSize: 14, fontWeight: 700, color: 'var(--green)' }}>
                    {s.lpa > 0 ? `₹${s.lpa}L` : '—'}
                  </b>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activities */}
        <div className="card p">
          <div className="sec-head">
            <h3>Recent activities</h3>
            <div className="sub">{deptActivities.length} event{deptActivities.length !== 1 ? 's' : ''}</div>
          </div>
          {deptActivities.length === 0 ? (
            <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              No activities scheduled.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {deptActivities.slice(0, 5).map(a => {
                const d = a.date?.seconds ? new Date(a.date.seconds * 1000) : null
                const isPast = d && d < new Date()
                return (
                  <div key={a.id} style={{ display: 'flex', gap: 12, padding: '10px 12px',
                    background: '#fafbff', borderRadius: 10, border: '1px solid var(--line)',
                    opacity: isPast ? 0.6 : 1 }}>
                    {d && (
                      <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--indigo-soft)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        flex: '0 0 auto' }}>
                        <b style={{ fontSize: 16, fontWeight: 700, color: 'var(--indigo-d)', lineHeight: 1 }}>
                          {d.getDate()}</b>
                        <span style={{ fontSize: 9, textTransform: 'uppercase', color: 'var(--muted)' }}>
                          {d.toLocaleDateString('en', { month: 'short' })}</span>
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <b style={{ fontSize: 13, fontWeight: 600, display: 'block' }}>{a.title}</b>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                        {a.speaker} · {a.location}
                      </div>
                    </div>
                    <span className={`badge ${isPast ? 'b-grey' : 'b-green'}`} style={{ fontSize: 10, alignSelf: 'center' }}>
                      {isPast ? 'Past' : 'Upcoming'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Department overview strip */}
      <div className="card p" style={{ marginTop: 16 }}>
        <div className="sec-head"><h3>{dept} overview</h3></div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {[
            ['Total students', deptUsers.length, Icons.cap],
            ['Approved', approvedStudents.length, Icons.check],
            ['Pending', pendingApprovals.length, Icons.spark],
            ['Coordinators', coordinators.length, Icons.users],
            ['Placed', placedStudents.length, Icons.cap],
            ['Active backlogs', backlogStats.totalActive, Icons.spark],
            ['Cleared backlogs', backlogStats.totalCleared, Icons.check],
            ['Applications', activeApps.length, Icons.brief],
          ].map(([l, v, ic]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
              background: '#f8f9fc', borderRadius: 8, fontSize: 13 }}>
              <span style={{ color: 'var(--muted)' }}>{ic}</span>
              <b style={{ fontWeight: 600 }}>{v}</b>
              <span style={{ color: 'var(--muted)' }}>{l}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
