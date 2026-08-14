import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useCollection, where, updateDocument } from '../../hooks/useFirestore'
import { Icons } from '../../components/Icons'
import { formatPackage } from '../../utils/formatPackage'
import Confetti from '../../components/Confetti'
import Modal from '../../components/Modal'
import toast from 'react-hot-toast'

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

  const [rejectModal, setRejectModal] = useState(null)
  const [rejectReason, setRejectReason] = useState('')

  const jobMap = {}
  jobs.forEach(j => { jobMap[j.id] = j })

  const active = apps.filter(a => a.status !== 'rejected')
  const rejected = apps.filter(a => a.status === 'rejected')
  const placed = active.filter(a => a.stage >= 6)
  const inProgress = active.filter(a => a.stage > 0 && a.stage < 6)
  const hasOfferOrPlaced = active.some(a => a.stage >= 5)

  async function acceptOffer(app) {
    if (!confirm('Accept this offer? This will be sent to the placement admin for approval.')) return
    try {
      await updateDocument('applications', app.id, {
        offerStatus: 'accepted_pending_admin',
        studentRespondedAt: new Date(),
      })
      toast.success('Acceptance submitted — awaiting admin approval')
    } catch (e) { toast.error('Failed: ' + e.message) }
  }

  async function submitRejection() {
    if (!rejectModal) return
    if (!rejectReason.trim()) return toast.error('Please provide a reason for rejection')
    try {
      await updateDocument('applications', rejectModal.id, {
        offerStatus: 'rejected',
        studentResponse: rejectReason.trim(),
        studentRespondedAt: new Date(),
      })
      toast.success('Offer rejected')
      setRejectModal(null)
      setRejectReason('')
    } catch (e) { toast.error('Failed: ' + e.message) }
  }

  return (
    <>
      {hasOfferOrPlaced && <Confetti duration={4000} />}

      {/* Stats */}
      <div className="cards-row c4" style={{ marginBottom: 20 }}>
        {[
          [Icons.brief, 'var(--indigo)', 'var(--indigo-soft)', active.length, 'Total applications'],
          [Icons.spark, 'var(--gold)', 'var(--gold-soft)', inProgress.length, 'In progress'],
          [Icons.cap, 'var(--green)', 'var(--green-soft)', placed.length, 'Placed'],
          [Icons.check, 'var(--rose)', 'var(--rose-soft)', rejected.length, 'Rejected'],
        ].map(([ic, color, soft, v, l], i) => (
          <div className="card stat" key={i}>
            <div className="ic" style={{ background: soft, color }}>{ic}</div>
            <div className="v">{v}</div>
            <div className="l">{l}</div>
          </div>
        ))}
      </div>

      <div className="sec-head">
        <h3>My Applications</h3>
        <div className="sub">{loading ? 'Loading…' : `${active.length} active · ${rejected.length} rejected`}</div>
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
            const isOfferStage = a.stage === 5
            const needsResponse = isOfferStage && a.offerStatus === 'pending_student'
            const accepted = a.offerStatus === 'accepted_pending_admin' || a.offerStatus === 'accepted'

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
                        {job.companyName || '—'}{job.package ? ` · ${formatPackage(job.packageNumeric)}` : ''}
                      </div>
                    </div>
                    <span className={`badge ${a.stage >= 6 ? 'b-green' : a.stage >= 5 ? 'b-gold' : 'b-indigo'}`}
                      style={{ fontSize: 12, padding: '5px 12px' }}>
                      {a.stage >= 6 && Icons.cap} {STAGES[a.stage]}
                    </span>
                  </div>
                  <PipelineTracker stage={a.stage} />
                </div>

                {/* Offer details section */}
                {isOfferStage && (
                  <div style={{ padding: '16px 20px', borderTop: '1px solid var(--line)',
                    background: needsResponse ? '#fffbf0' : accepted ? 'var(--green-soft)' : '#fafbff' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                      📋 Offer details
                      {needsResponse && <span className="badge b-gold" style={{ fontSize: 10 }}>Action required</span>}
                      {accepted && <span className="badge b-green" style={{ fontSize: 10 }}>
                        {a.offerStatus === 'accepted_pending_admin' ? 'Accepted — awaiting admin approval' : 'Accepted'}</span>}
                      {a.offerStatus === 'rejected' && <span className="badge b-rose" style={{ fontSize: 10 }}>Rejected</span>}
                    </div>
                    {a.offerDetails && (
                      <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--ink-2)', margin: '0 0 12px',
                        whiteSpace: 'pre-wrap' }}>{a.offerDetails}</p>
                    )}
                    {a.offerLetterUrl && (
                      <a href={a.offerLetterUrl} target="_blank" rel="noreferrer"
                        style={{ fontSize: 13, color: 'var(--indigo)', fontWeight: 600, display: 'inline-flex',
                          alignItems: 'center', gap: 6, marginBottom: 12 }}>
                        {Icons.dl} View offer letter
                      </a>
                    )}

                    {/* Accept / Reject buttons */}
                    {needsResponse && (
                      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                        <button className="btn btn-pri" onClick={() => acceptOffer(a)}
                          style={{ padding: '10px 24px', fontSize: 14 }}>
                          {Icons.check} Accept offer
                        </button>
                        <button className="btn" onClick={() => { setRejectModal(a); setRejectReason('') }}
                          style={{ padding: '10px 24px', fontSize: 14, background: 'transparent',
                            border: '1.5px solid var(--rose)', color: 'var(--rose)', cursor: 'pointer',
                            borderRadius: 10, fontFamily: 'inherit', fontWeight: 600 }}>
                          Decline offer
                        </button>
                      </div>
                    )}

                    {a.offerStatus === 'rejected' && a.studentResponse && (
                      <div style={{ marginTop: 8, padding: '10px 12px', background: 'var(--rose-soft)',
                        borderRadius: 8, fontSize: 13 }}>
                        <b>Your reason:</b> {a.studentResponse}
                      </div>
                    )}
                  </div>
                )}

                {/* Placed footer */}
                {a.stage >= 6 && (
                  <div style={{ padding: '12px 20px', borderTop: '1px solid var(--line)',
                    background: 'var(--green-soft)', fontSize: 13, fontWeight: 600, color: '#0c7a4c' }}>
                    🎉 Congratulations! You're placed at {job.companyName}
                    {job.package ? ` with ${formatPackage(job.packageNumeric)}` : ''}
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
                    <span className="badge b-rose">Rejected at {STAGES[a.stage]}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Reject reason modal */}
      {rejectModal && (
        <Modal title="Decline offer" onClose={() => setRejectModal(null)}>
          <p style={{ fontSize: 14, color: 'var(--ink-2)', marginBottom: 14, lineHeight: 1.5 }}>
            You're about to decline the offer from <b>{jobMap[rejectModal.jobId]?.companyName}</b>.
            Please provide a reason — this will be recorded and shared with the placement admin.
          </p>
          <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
            placeholder="e.g. Accepted a better offer, personal reasons, location preference..."
            style={{ width: '100%', minHeight: 100, padding: '12px 14px', border: '1.5px solid var(--line)',
              borderRadius: 10, fontSize: 14, fontFamily: 'inherit', lineHeight: 1.6, resize: 'vertical' }} />
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button className="btn btn-ghost" onClick={() => setRejectModal(null)}>Cancel</button>
            <button className="btn" onClick={submitRejection}
              disabled={!rejectReason.trim()}
              style={{ padding: '10px 20px', background: 'var(--rose)', color: '#fff', border: 'none',
                borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                opacity: rejectReason.trim() ? 1 : 0.5 }}>
              Confirm decline
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}
