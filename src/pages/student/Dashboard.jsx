import { formatPackage } from '../../utils/formatPackage'
import { useAuth } from '../../contexts/AuthContext'
import { useDocument, useCollection, where, orderBy } from '../../hooks/useFirestore'
import { Icons } from '../../components/Icons'
import { useSite } from '../../contexts/SiteContext'
import Confetti from '../../components/Confetti'

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

export default function StudentDashboard({ onNavigate }) {
  const { userData } = useAuth()
  const { data: student, loading: stuLoading } = useDocument('students', userData?.id)
  const { data: jobs } = useCollection('jobs', [where('status', '==', 'open')], [])
  const { data: myApps } = useCollection('applications',
    [where('studentId', '==', userData?.id || 'x')], [userData?.id])
  const { data: notices } = useCollection('notices',
    [where('department', '==', student?.department || 'x')],
    [student?.department])

  // Active notices for student's department, sorted newest first
  const now = new Date()
  const activeNotices = (notices || []).filter(n => {
    if (n.expiresAt) {
      const exp = n.expiresAt.seconds ? new Date(n.expiresAt.seconds * 1000) : new Date(n.expiresAt)
      if (exp <= now) return false
    }
    return true
  }).sort((a, b) => {
    const ta = a.createdAt?.seconds || 0
    const tb = b.createdAt?.seconds || 0
    return tb - ta
  })

  const { pct, items, missing } = calcProfileCompletion(student, userData)
  const isPlaced = student?.placementStatus === 'placed'
  const hasOffer = myApps.some(a => a.stage === 5 && a.status === 'active')
  const hasPlaced = myApps.some(a => a.stage >= 6 && a.status !== 'rejected') || isPlaced
  const showConfetti = hasPlaced || hasOffer
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
      {showConfetti && <Confetti duration={4500} variant={hasPlaced ? 'cannon' : 'simple'} />}

      {/* Placed banner */}
      {isPlaced && (
        <div className="notice" style={{ background: 'var(--green-soft)', borderColor: '#b5e6cf' }}>
          <span className="ic" style={{ color: 'var(--green)' }}>{Icons.cap}</span>
          <div>
            <b style={{ color: 'var(--ink)' }}>Congratulations! You're placed at {student.placedAt}</b>
            <p style={{ color: '#0c7a4c' }}>
              {student.package ? `Package: ${formatPackage(student.package)} · ` : ''}You can no longer apply for new drives.
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
        <div className="card stat" onClick={() => onNavigate?.('profile')} style={{ cursor: 'pointer' }}>
          <div className="ic" style={{ background: pct === 100 ? 'var(--green-soft)' : 'var(--gold-soft)',
            color: pct === 100 ? 'var(--green)' : 'var(--gold)' }}>{pct === 100 ? Icons.check : Icons.spark}</div>
          <div className="v">{pct}%</div>
          <div className="l">Profile complete</div>
        </div>
        <div className="card stat" onClick={() => onNavigate?.('jobs')} style={{ cursor: 'pointer' }}>
          <div className="ic" style={{ background: 'var(--indigo-soft)', color: 'var(--indigo)' }}>{Icons.brief}</div>
          <div className="v">{eligibleJobs.length}</div>
          <div className="l">Eligible drives</div>
        </div>
        <div className="card stat" onClick={() => onNavigate?.('applications')} style={{ cursor: 'pointer' }}>
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

      {/* Virtual Notice Board */}
      <div className="card p" style={{ marginBottom: 20 }}>
        <div className="sec-head" style={{ cursor: 'pointer' }} onClick={() => onNavigate?.('noticeboard')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>📌</span>
            <div>
              <h3>Virtual Notice Board</h3>
              <div className="sub">{activeNotices.length} active notice{activeNotices.length !== 1 ? 's' : ''} from {student?.department || 'your department'}</div>
            </div>
          </div>
          <span style={{ fontSize: 12, color: 'var(--indigo)', fontWeight: 600 }}>View all →</span>
        </div>
        {activeNotices.length === 0 ? (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            <div style={{ fontSize: 30, marginBottom: 8 }}>📌</div>
            No active notices from your department right now. Check back later.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {activeNotices.slice(0, 4).map(n => {
              const eventDate = n.eventDate?.seconds ? new Date(n.eventDate.seconds * 1000) : n.eventDate ? new Date(n.eventDate) : null
              const expiresAt = n.expiresAt?.seconds ? new Date(n.expiresAt.seconds * 1000) : null
              return (
                <div key={n.id} onClick={() => onNavigate?.('noticeboard')}
                  style={{ display: 'flex', gap: 12, padding: '14px 16px', cursor: 'pointer',
                  background: '#fafbff', borderRadius: 10, border: '1px solid var(--line)', transition: '.15s' }}
                  onMouseOver={e => e.currentTarget.style.borderColor = 'var(--indigo)'}
                  onMouseOut={e => e.currentTarget.style.borderColor = 'var(--line)'}>
                  {eventDate ? (
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--indigo-soft)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      flex: '0 0 auto' }}>
                      <b style={{ fontSize: 16, fontWeight: 700, color: 'var(--indigo-d)', lineHeight: 1 }}>
                        {eventDate.getDate()}</b>
                      <span style={{ fontSize: 9, textTransform: 'uppercase', color: 'var(--muted)' }}>
                        {eventDate.toLocaleDateString('en', { month: 'short' })}</span>
                    </div>
                  ) : (
                    <span style={{ fontSize: 22, flex: '0 0 auto', marginTop: 1 }}>📌</span>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b style={{ fontSize: 14, fontWeight: 700, display: 'block', marginBottom: 3 }}>{n.title}</b>
                    {n.description && (
                      <div style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5,
                        maxHeight: 40, overflow: 'hidden' }}
                        dangerouslySetInnerHTML={{ __html: n.description }} />
                    )}
                    <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                      {eventDate && n.eventTime && <span>⏰ {n.eventTime}</span>}
                      {n.createdByName && <span>By {n.createdByName}</span>}
                      {expiresAt && <span>Till {expiresAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Applications and drives */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
        {/* Active applications */}
        <div className="card p">
          <div className="sec-head" style={{ cursor: 'pointer' }} onClick={() => onNavigate?.('applications')}>
            <h3>My applications</h3>
            <span style={{ fontSize: 12, color: 'var(--indigo)', fontWeight: 600 }}>
              View all →
            </span>
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
                  <div key={a.id} onClick={() => onNavigate?.('applications')}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                    padding: '12px 14px', background: a.stage >= 6 ? 'var(--green-soft)' : '#fafbff',
                    borderRadius: 10, border: '1px solid var(--line)', transition: '.15s' }}
                    onMouseOver={e => e.currentTarget.style.borderColor = 'var(--indigo)'}
                    onMouseOut={e => e.currentTarget.style.borderColor = 'var(--line)'}>
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
          <div className="sec-head" style={{ cursor: 'pointer' }} onClick={() => onNavigate?.('jobs')}>
            <h3>Open drives</h3>
            <span style={{ fontSize: 12, color: 'var(--indigo)', fontWeight: 600 }}>
              View all →
            </span>
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
                  <div key={j.id} onClick={() => onNavigate?.('jobs')}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                    padding: '10px 12px', background: '#fafbff', borderRadius: 10,
                    border: '1px solid var(--line)', transition: '.15s' }}
                    onMouseOver={e => e.currentTarget.style.borderColor = 'var(--indigo)'}
                    onMouseOut={e => e.currentTarget.style.borderColor = 'var(--line)'}>
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
