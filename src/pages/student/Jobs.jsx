import { useState, useMemo } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useDocument, useCollection, where, addDocument } from '../../hooks/useFirestore'
import { Icons } from '../../components/Icons'
import { serverTimestamp } from 'firebase/firestore'
import toast from 'react-hot-toast'

export default function StudentJobs() {
  const { userData } = useAuth()
  const { data: student } = useDocument('students', userData?.id)
  const { data: jobs, loading } = useCollection('jobs', [where('status', '==', 'open')], [])
  const { data: myApps } = useCollection('applications', [where('studentId', '==', userData?.id || 'x')], [userData?.id])

  const [applying, setApplying] = useState(null)

  const appliedJobIds = new Set(myApps.map(a => a.jobId))
  const isPlaced = student?.placementStatus === 'placed'

  // Auto-filter: check eligibility
  const { eligible, ineligible } = useMemo(() => {
    const e = [], ie = []
    jobs.forEach(j => {
      if (!student) { e.push({ ...j, reason: null }); return }
      const reasons = []
      if (j.min10th && student.tenthMarks && student.tenthMarks < j.min10th)
        reasons.push(`10th marks (${student.tenthMarks}% < ${j.min10th}%)`)
      if (j.min12th && student.twelfthMarks && student.twelfthMarks < j.min12th)
        reasons.push(`12th marks (${student.twelfthMarks}% < ${j.min12th}%)`)
      // Legacy support for old minPercentage field
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
  }, [jobs, student])

  async function handleApply(job) {
    if (isPlaced) return toast.error("You're already placed. You can't apply for more drives.")
    if (appliedJobIds.has(job.id)) return toast.error("You've already applied for this drive.")
    setApplying(job.id)
    try {
      await addDocument('applications', {
        jobId: job.id,
        studentId: userData.id,
        studentName: userData.displayName || '',
        studentUsn: student?.usn || '',
        department: student?.department || '',
        cgpa: student?.cgpa || null,
        stage: 0, // Applied
        status: 'active',
        appliedAt: serverTimestamp(),
      })
      toast.success(`Applied for ${job.role} at ${job.companyName}`)
    } catch (e) {
      toast.error('Apply failed: ' + e.message)
    } finally {
      setApplying(null)
    }
  }

  return (
    <>
      {isPlaced && (
        <div className="notice">
          <span className="ic">{Icons.cap}</span>
          <div>
            <b>You're placed at {student.placedAt || 'a company'}!</b>
            <p>Congratulations! You can no longer apply for new drives.</p>
          </div>
        </div>
      )}

      <div className="sec-head">
        <div>
          <h3>Open drives</h3>
          <div className="sub">{loading ? 'Loading…' : `${eligible.length} eligible · ${ineligible.length} not eligible`}</div>
        </div>
      </div>

      {eligible.length === 0 && !loading ? (
        <div className="card p" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)', marginBottom: 20 }}>
          <div style={{ width: 54, height: 54, borderRadius: 14, background: 'var(--indigo-soft)',
            display: 'grid', placeItems: 'center', margin: '0 auto 14px', color: 'var(--indigo)' }}>{Icons.brief}</div>
          <b style={{ display: 'block', color: 'var(--ink)', fontSize: 15, marginBottom: 5 }}>No eligible drives right now</b>
          Check back soon or complete your profile to unlock more drives.
        </div>
      ) : (
        <div className="cards-row c3" style={{ marginBottom: 20 }}>
          {eligible.map(j => {
            const applied = appliedJobIds.has(j.id)
            return (
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
                  {j.driveDate?.seconds && <span className="chip">{new Date(j.driveDate.seconds * 1000).toLocaleDateString()}</span>}
                </div>
                {j.description && (
                  <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}
                    dangerouslySetInnerHTML={{ __html: j.description.length > 150
                      ? j.description.slice(0, 150) + '…' : j.description }} />
                )}
                <div className="job-foot">
                  <span className="badge b-green">{Icons.check} Eligible</span>
                  {applied ? (
                    <span className="badge b-indigo" style={{ marginLeft: 'auto' }}>{Icons.check} Applied</span>
                  ) : isPlaced ? (
                    <span className="badge b-grey" style={{ marginLeft: 'auto' }}>Placed</span>
                  ) : (
                    <button className="btn btn-pri" style={{ marginLeft: 'auto', padding: '6px 16px', fontSize: 13 }}
                      onClick={() => handleApply(j)} disabled={applying === j.id}>
                      {applying === j.id ? 'Applying…' : 'Apply now'}
                    </button>
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
            <h3 style={{ color: 'var(--muted)' }}>Not eligible</h3>
          </div>
          <div className="cards-row c3">
            {ineligible.map(j => (
              <div className="card job" key={j.id} style={{ opacity: 0.6 }}>
                <div className="job-top">
                  <div className="job-logo" style={{ background: '#aaa' }}>{(j.companyName || '?')[0]}</div>
                  <div style={{ flex: 1 }}>
                    <h4>{j.role}</h4>
                    <div className="co">{j.companyName}</div>
                  </div>
                </div>
                <div className="job-meta">
                  {j.package && <span className="chip">₹ {j.package}</span>}
                </div>
                <div className="job-foot" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                  <span className="badge b-rose">Not eligible</span>
                  <span style={{ fontSize: 11, color: 'var(--rose)' }}>{j.reasons.join(' · ')}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}
