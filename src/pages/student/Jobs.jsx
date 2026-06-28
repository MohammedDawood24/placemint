import { useState, useMemo } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useDocument, useCollection, where, addDocument } from '../../hooks/useFirestore'
import { Icons } from '../../components/Icons'
import { calcProfileCompletion } from './Dashboard'
import { serverTimestamp } from 'firebase/firestore'
import toast from 'react-hot-toast'

const STAGES = ['Applied', 'Shortlisted', 'Aptitude', 'Technical', 'HR', 'Offer', 'Placed']

export default function StudentJobs() {
  const { userData } = useAuth()
  const { data: student } = useDocument('students', userData?.id)
  const { data: jobs, loading } = useCollection('jobs', [where('status', '==', 'open')], [])
  const { data: myApps } = useCollection('applications',
    [where('studentId', '==', userData?.id || 'x')], [userData?.id])

  const [applying, setApplying] = useState(null)
  const [search, setSearch] = useState('')

  const { pct } = calcProfileCompletion(student, userData)
  const canApply = pct === 100
  const appliedJobIds = new Set(myApps.map(a => a.jobId))
  const appMap = {}
  myApps.forEach(a => { appMap[a.jobId] = a })
  const isPlaced = student?.placementStatus === 'placed'

  const { eligible, ineligible } = useMemo(() => {
    const e = [], ie = []
    jobs.forEach(j => {
      // Search filter
      if (search) {
        const q = search.toLowerCase()
        if (!(j.role || '').toLowerCase().includes(q) && !(j.companyName || '').toLowerCase().includes(q)) return
      }
      if (!student) { e.push({ ...j, reason: null }); return }
      const reasons = []
      if (j.min10th && student.tenthMarks && student.tenthMarks < j.min10th)
        reasons.push(`10th marks (${student.tenthMarks}% < ${j.min10th}%)`)
      if (j.min12th && student.twelfthMarks && student.twelfthMarks < j.min12th)
        reasons.push(`12th marks (${student.twelfthMarks}% < ${j.min12th}%)`)
      if (!j.min10th && !j.min12th && j.minPercentage) {
        if (student.tenthMarks && student.tenthMarks < j.minPercentage)
          reasons.push(`10th marks (${student.tenthMarks}% < ${j.minPercentage}%)`)
        if (student.twelfthMarks && student.twelfthMarks < j.minPercentage)
          reasons.push(`12th marks (${student.twelfthMarks}% < ${j.minPercentage}%)`)
      }
      if (j.minCgpa && student.cgpa && student.cgpa < j.minCgpa)
        reasons.push(`CGPA (${student.cgpa} < ${j.minCgpa})`)
      if (j.eligibleDepartments?.length > 0 && student.department &&
        !j.eligibleDepartments.map(d => d.toUpperCase()).includes(student.department.toUpperCase()))
        reasons.push(`Branch (${student.department} not eligible)`)
      if (reasons.length > 0) ie.push({ ...j, reasons })
      else e.push({ ...j, reason: null })
    })
    return { eligible: e, ineligible: ie }
  }, [jobs, student, search])

  async function handleApply(job) {
    if (!canApply) return toast.error('Complete your profile (100%) before applying.')
    if (isPlaced) return toast.error("You're already placed.")
    if (appliedJobIds.has(job.id)) return toast.error("Already applied.")
    setApplying(job.id)
    try {
      await addDocument('applications', {
        jobId: job.id, studentId: userData.id,
        studentName: userData.displayName || '', studentUsn: student?.usn || '',
        department: student?.department || '', cgpa: student?.cgpa || null,
        stage: 0, status: 'active', appliedAt: serverTimestamp(),
      })
      toast.success(`Applied for ${job.role} at ${job.companyName}`)
    } catch (e) { toast.error('Apply failed: ' + e.message) }
    finally { setApplying(null) }
  }

  return (
    <>
      {/* Profile incomplete block */}
      {!canApply && !isPlaced && (
        <div className="notice" style={{ background: 'var(--gold-soft)', borderColor: '#f0dcae' }}>
          <span className="ic" style={{ color: 'var(--gold)' }}>{Icons.lock}</span>
          <div>
            <b>Profile {pct}% complete — applications locked</b>
            <p>Complete all profile items (10th, 12th marks with approval, semester records, etc.) to unlock applications.</p>
          </div>
        </div>
      )}

      {isPlaced && (
        <div className="notice" style={{ background: 'var(--green-soft)', borderColor: '#b5e6cf' }}>
          <span className="ic" style={{ color: 'var(--green)' }}>{Icons.cap}</span>
          <div>
            <b style={{ color: 'var(--ink)' }}>You're placed at {student.placedAt}!</b>
            <p style={{ color: '#0c7a4c' }}>You can view drives but can't apply to new ones.</p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="card p" style={{ marginBottom: 16 }}>
        <div className="sec-head" style={{ marginBottom: 14 }}>
          <div>
            <h3>Open Drives</h3>
            <div className="sub">{loading ? 'Loading…' : `${eligible.length} eligible · ${ineligible.length} not eligible`}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fbfbfe',
          border: '1.5px solid var(--line)', borderRadius: 10, padding: '8px 12px' }}>
          {Icons.search}
          <input placeholder="Search by role or company..." value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ border: 'none', outline: 'none', fontFamily: 'inherit', fontSize: 13,
              width: '100%', color: 'var(--ink)', background: 'transparent' }} />
        </div>
      </div>

      {/* Eligible drives */}
      {eligible.length === 0 && !loading ? (
        <div className="card p" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)', marginBottom: 20 }}>
          <div style={{ width: 54, height: 54, borderRadius: 14, background: 'var(--indigo-soft)',
            display: 'grid', placeItems: 'center', margin: '0 auto 14px', color: 'var(--indigo)' }}>{Icons.brief}</div>
          <b style={{ display: 'block', color: 'var(--ink)', fontSize: 15, marginBottom: 5 }}>No eligible drives</b>
          {search ? 'Try a different search.' : 'Check back soon or complete your profile to unlock more.'}
        </div>
      ) : (
        <div className="cards-row c2" style={{ marginBottom: 20 }}>
          {eligible.map(j => {
            const applied = appliedJobIds.has(j.id)
            const app = appMap[j.id]
            const rejected = app?.status === 'rejected'
            return (
              <div className="card" key={j.id} style={{ overflow: 'hidden' }}>
                <div style={{ padding: '18px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 11, background: '#4C5BD4',
                      display: 'grid', placeItems: 'center', fontWeight: 700, color: '#fff', fontSize: 18,
                      flex: '0 0 auto' }}>{(j.companyName || '?')[0]}</div>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontSize: 15.5, fontWeight: 600, margin: '0 0 2px' }}>{j.role}</h4>
                      <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{j.companyName}</div>
                    </div>
                    <span className="badge b-green">{Icons.check} Eligible</span>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                    {j.package && <span className="chip">₹ {j.package}</span>}
                    {j.min10th && <span className="chip">10th ≥ {j.min10th}%</span>}
                    {j.min12th && <span className="chip">12th ≥ {j.min12th}%</span>}
                    {j.minCgpa && <span className="chip">CGPA ≥ {j.minCgpa}</span>}
                    <span className="chip">{j.driveType || 'On-campus'}</span>
                    {j.driveDate?.seconds && <span className="chip">{new Date(j.driveDate.seconds * 1000).toLocaleDateString()}</span>}
                  </div>

                  {j.description && (
                    <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 12,
                      maxHeight: 60, overflow: 'hidden' }}
                      dangerouslySetInnerHTML={{ __html: j.description }} />
                  )}
                </div>

                {/* Footer — status-dependent */}
                <div style={{ padding: '12px 20px', borderTop: '1px solid var(--line)',
                  background: applied ? (app?.stage >= 6 ? 'var(--green-soft)' : '#f8f9ff') : '#fafbff',
                  display: 'flex', alignItems: 'center', gap: 10 }}>
                  {applied ? (
                    <>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', flex: 1 }}>
                        {rejected ? 'Rejected' : `Status: ${STAGES[app?.stage] || 'Applied'}`}
                      </span>
                      <span className={`badge ${rejected ? 'b-rose' : app?.stage >= 6 ? 'b-green' : app?.stage >= 3 ? 'b-gold' : 'b-indigo'}`}>
                        {rejected ? 'Rejected' : app?.stage >= 6 ? <>{Icons.cap} Placed</> : `Stage ${(app?.stage || 0) + 1}/7`}
                      </span>
                    </>
                  ) : !canApply ? (
                    <>
                      <span style={{ fontSize: 12, color: 'var(--muted)', flex: 1 }}>
                        {Icons.lock} Complete profile ({pct}%) to apply
                      </span>
                      <span className="badge b-grey">Locked</span>
                    </>
                  ) : isPlaced ? (
                    <span style={{ fontSize: 12, color: 'var(--muted)', flex: 1 }}>You're already placed</span>
                  ) : (
                    <>
                      <span style={{ fontSize: 12, color: 'var(--green)', flex: 1 }}>Ready to apply</span>
                      <button className="btn btn-pri" style={{ padding: '7px 20px', fontSize: 13 }}
                        onClick={() => handleApply(j)} disabled={applying === j.id}>
                        {applying === j.id ? 'Applying…' : 'Register for drive'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Ineligible drives */}
      {ineligible.length > 0 && (
        <>
          <div className="sec-head" style={{ marginTop: 10 }}>
            <h3 style={{ color: 'var(--muted)' }}>Not eligible ({ineligible.length})</h3>
          </div>
          <div className="cards-row c3">
            {ineligible.map(j => (
              <div className="card" key={j.id} style={{ opacity: 0.55 }}>
                <div style={{ padding: '16px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: '#aaa',
                      display: 'grid', placeItems: 'center', fontWeight: 700, color: '#fff', fontSize: 15,
                      flex: '0 0 auto' }}>{(j.companyName || '?')[0]}</div>
                    <div style={{ flex: 1 }}>
                      <b style={{ fontSize: 14, fontWeight: 600 }}>{j.role}</b>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{j.companyName}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                    {j.package && <span className="chip">₹ {j.package}</span>}
                  </div>
                  <div style={{ padding: '8px 10px', background: 'var(--rose-soft)', borderRadius: 8 }}>
                    <span className="badge b-rose" style={{ fontSize: 11, marginBottom: 4 }}>Not eligible</span>
                    <div style={{ fontSize: 11, color: 'var(--rose)', marginTop: 4 }}>
                      {j.reasons.join(' · ')}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}
