import { useState } from 'react'
import { useCollection, where, updateDocument } from '../hooks/useFirestore'
import { Icons, initials } from './Icons'
import { formatPackage } from '../utils/formatPackage'
import Modal from './Modal'
import toast from 'react-hot-toast'

const STAGES = ['Applied', 'Shortlisted', 'Aptitude', 'Technical', 'HR', 'Offer', 'Placed']
const STAGE_COLORS = ['#9aa1bd', '#4C5BD4', '#7B1FA2', '#1565C0', '#E0A43B', '#F57C00', '#15A86B']

const OFFER_STATUS_MAP = {
  pending_student: ['b-gold', 'Awaiting student response'],
  accepted_pending_admin: ['b-gold', 'Accepted — awaiting admin approval'],
  accepted: ['b-green', 'Accepted'],
  rejected: ['b-rose', 'Rejected by student'],
}

export default function CompanyJobDetail({ job, onBack, onEdit, isAdmin }) {
  const j = job
  const { data: apps } = useCollection('applications', [where('jobId', '==', j.id)], [j.id])
  const active = apps.filter(a => a.status !== 'rejected')
  const rejected = apps.filter(a => a.status === 'rejected')
  const stageCounts = STAGES.map((_, i) => active.filter(a => a.stage === i).length)

  const [offerModal, setOfferModal] = useState(null) // application being offered
  const [offerForm, setOfferForm] = useState({ details: '', letterUrl: '' })

  async function advance(app) {
    const newStage = app.stage + 1

    // If advancing to Offer, show offer details modal
    if (newStage === 5) {
      setOfferModal(app)
      setOfferForm({ details: '', letterUrl: '' })
      return
    }

    // If advancing to Placed, check student accepted the offer
    if (newStage === 6) {
      if (app.offerStatus !== 'accepted') {
        if (isAdmin && app.offerStatus === 'accepted_pending_admin') {
          // Admin can approve and place simultaneously
        } else {
          toast.error('Student must accept the offer before being placed.')
          return
        }
      }
    }

    try {
      const updates = { stage: newStage }
      if (newStage === 6) {
        updates.status = 'placed'
        updates.offerStatus = 'accepted'
        updates.adminApprovedResponse = true
      }
      await updateDocument('applications', app.id, updates)
      if (newStage === 6) {
        await updateDocument('students', app.studentId, {
          placementStatus: 'placed', placedAt: j.companyName,
          package: j.packageNumeric || null,
        })
      }
      toast.success(`${app.studentName} → ${STAGES[newStage]}`)
    } catch (e) { toast.error('Failed: ' + e.message) }
  }

  async function submitOffer() {
    if (!offerModal) return
    try {
      await updateDocument('applications', offerModal.id, {
        stage: 5,
        offerDetails: offerForm.details,
        offerLetterUrl: offerForm.letterUrl,
        offerStatus: 'pending_student',
        offeredAt: new Date(),
      })
      toast.success(`Offer sent to ${offerModal.studentName}`)
      setOfferModal(null)
    } catch (e) { toast.error('Failed: ' + e.message) }
  }

  async function approveAcceptance(app) {
    try {
      await updateDocument('applications', app.id, {
        offerStatus: 'accepted',
        adminApprovedResponse: true,
        adminApprovedAt: new Date(),
        stage: 6,
        status: 'placed',
      })
      await updateDocument('students', app.studentId, {
        placementStatus: 'placed', placedAt: j.companyName,
        package: j.packageNumeric || null,
      })
      toast.success(`${app.studentName} placed — acceptance approved`)
    } catch (e) { toast.error('Failed: ' + e.message) }
  }

  async function rejectApp(app) {
    if (!confirm(`Reject ${app.studentName}?`)) return
    try {
      await updateDocument('applications', app.id, { status: 'rejected' })
      toast.success(`${app.studentName} rejected`)
    } catch (e) { toast.error('Failed: ' + e.message) }
  }

  function renderOfferStatus(a) {
    if (a.stage < 5) return null
    const os = a.offerStatus || 'pending_student'

    // Company can't see acceptance until admin approves (unless isAdmin)
    if (os === 'accepted_pending_admin' && !isAdmin) {
      return <span className="badge b-gold" style={{ fontSize: 10 }}>Awaiting response</span>
    }

    const [badge, label] = OFFER_STATUS_MAP[os] || ['b-grey', os]
    return (
      <div>
        <span className={`badge ${badge}`} style={{ fontSize: 10 }}>{label}</span>
        {os === 'rejected' && a.studentResponse && (
          <div style={{ fontSize: 11, color: 'var(--rose)', marginTop: 3, maxWidth: 200 }}>
            Reason: "{a.studentResponse}"
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: 16 }}>← Back</button>

      {/* Job header */}
      <div className="card p" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: '#4C5BD4',
            display: 'grid', placeItems: 'center', fontWeight: 700, color: '#fff',
            fontSize: 22, flex: '0 0 auto' }}>{(j.companyName || '?')[0]}</div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif",
              margin: '0 0 2px' }}>{j.role}</h3>
            <div style={{ fontSize: 14, color: 'var(--muted)' }}>{j.companyName}</div>
          </div>
          <span className={`badge ${j.status === 'open' ? 'b-green' : j.status === 'closed' ? 'b-gold' : 'b-grey'}`}
            style={{ fontSize: 13, padding: '5px 12px' }}>{j.status || 'Draft'}</span>
          {onEdit && <button className="btn btn-pri" onClick={onEdit}>{Icons.gear} Edit</button>}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
          {j.package && <span className="chip">{formatPackage(j.packageNumeric || j.package)}</span>}
          {j.min10th && <span className="chip">10th ≥ {j.min10th}%</span>}
          {j.min12th && <span className="chip">12th ≥ {j.min12th}%</span>}
          {j.minCgpa && <span className="chip">CGPA ≥ {j.minCgpa}</span>}
          <span className="chip">{j.driveType || 'On-campus'}</span>
          {j.driveDate?.seconds && <span className="chip">Drive: {new Date(j.driveDate.seconds * 1000).toLocaleDateString()}</span>}
        </div>
        {j.description && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line)',
            fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.6 }}
            dangerouslySetInnerHTML={{ __html: j.description }} />
        )}
      </div>

      {/* Pipeline */}
      <div className="card p" style={{ marginBottom: 16 }}>
        <div className="sec-head">
          <h3>Hiring pipeline</h3>
          <div className="sub">{active.length} active · {rejected.length} rejected</div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {STAGES.map((s, i) => (
            <div key={s} style={{ flex: 1, textAlign: 'center', padding: '12px 4px',
              background: stageCounts[i] > 0 ? `${STAGE_COLORS[i]}15` : '#f8f9fc',
              borderRadius: 8, border: stageCounts[i] > 0 ? `1.5px solid ${STAGE_COLORS[i]}30` : '1.5px solid transparent' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: stageCounts[i] > 0 ? STAGE_COLORS[i] : 'var(--muted)' }}>
                {stageCounts[i]}</div>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{s}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Candidates */}
      <div className="card p">
        <div className="sec-head">
          <h3>Registered candidates</h3>
          <div className="sub">{active.length} active</div>
        </div>
        {active.length === 0 ? (
          <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            No candidates have registered yet.
          </div>
        ) : (
          <table className="tbl">
            <thead>
              <tr><th>Candidate</th><th>USN</th><th>Dept</th><th>CGPA</th><th>Stage</th>
                <th>Offer status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {active.sort((a, b) => b.stage - a.stage).map(a => (
                <tr key={a.id} style={a.stage >= 6 ? { background: 'var(--green-soft)' } : {}}>
                  <td><div className="cell-u"><div className="av-sm">{initials(a.studentName)}</div>
                    <div><b>{a.studentName}</b></div></div></td>
                  <td className="mono" style={{ fontSize: 12 }}>{a.studentUsn || '—'}</td>
                  <td>{a.department || '—'}</td>
                  <td className="mono">{a.cgpa ?? '—'}</td>
                  <td><span style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20,
                    background: `${STAGE_COLORS[a.stage]}15`, color: STAGE_COLORS[a.stage] }}>
                    {STAGES[a.stage]}</span></td>
                  <td>{renderOfferStatus(a)}</td>
                  <td style={{ textAlign: 'right' }}>
                    {a.stage < 6 ? (
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', flexWrap: 'wrap', alignItems: 'center' }}>
                        {/* Admin approve acceptance */}
                        {isAdmin && a.offerStatus === 'accepted_pending_admin' && (
                          <button className="btn btn-pri" style={{ padding: '4px 10px', fontSize: 11 }}
                            onClick={() => approveAcceptance(a)}>
                            {Icons.check} Approve &amp; place
                          </button>
                        )}
                        {/* Stage selector — move to any stage */}
                        <select value={a.stage}
                          onChange={e => {
                            const newStage = parseInt(e.target.value)
                            if (newStage === a.stage) return
                            if (newStage === 5) { advance({ ...a, stage: 4 }); return } // trigger offer modal
                            if (newStage === 6 && a.offerStatus !== 'accepted') {
                              toast.error('Student must accept offer before placing'); return
                            }
                            const updates = { stage: newStage }
                            if (newStage === 6) { updates.status = 'placed'; updates.offerStatus = 'accepted'; updates.adminApprovedResponse = true }
                            if (newStage < 5) { updates.offerStatus = null; updates.offerDetails = null; updates.offerLetterUrl = null }
                            updateDocument('applications', a.id, updates).then(() => {
                              if (newStage === 6) {
                                updateDocument('students', a.studentId, {
                                  placementStatus: 'placed', placedAt: j.companyName,
                                  package: j.packageNumeric || null,
                                })
                              }
                              // If moving back from placed
                              if (a.stage === 6 && newStage < 6) {
                                updateDocument('students', a.studentId, { placementStatus: null, placedAt: null, package: null })
                              }
                              toast.success(`${a.studentName} → ${STAGES[newStage]}`)
                            }).catch(e => toast.error('Failed'))
                          }}
                          style={{ padding: '5px 8px', borderRadius: 8, border: '1.5px solid var(--line)',
                            fontSize: 12, fontFamily: 'inherit', background: '#fff', cursor: 'pointer', minWidth: 110 }}>
                          {STAGES.map((s, i) => <option key={s} value={i}>{s}</option>)}
                        </select>
                        <button className="btn" style={{ padding: '4px 10px', fontSize: 11,
                          background: 'transparent', border: '1px solid var(--rose)', color: 'var(--rose)',
                          cursor: 'pointer', borderRadius: 10, fontFamily: 'inherit', fontWeight: 600 }}
                          onClick={() => rejectApp(a)}>Reject</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'flex-end' }}>
                        <span className="badge b-green">{Icons.cap} Placed</span>
                        <button className="btn btn-ghost" style={{ padding: '3px 8px', fontSize: 10 }}
                          onClick={() => {
                            if (!confirm(`Revert ${a.studentName} from Placed? This reopens their placement status.`)) return
                            updateDocument('applications', a.id, { stage: 5, status: 'active' })
                            updateDocument('students', a.studentId, { placementStatus: null, placedAt: null, package: null })
                            toast.success(`${a.studentName} reverted to Offer stage`)
                          }}>Revert</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Rejected */}
        {rejected.length > 0 && (
          <>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', padding: '14px 0 8px',
              marginTop: 14, borderTop: '1px solid var(--line)' }}>
              Rejected ({rejected.length})
            </div>
            <table className="tbl"><tbody>
              {rejected.map(a => (
                <tr key={a.id} style={{ opacity: 0.5 }}>
                  <td><div className="cell-u"><div className="av-sm">{initials(a.studentName)}</div>
                    <b>{a.studentName}</b></div></td>
                  <td className="mono" style={{ fontSize: 12 }}>{a.studentUsn || '—'}</td>
                  <td>{a.department || '—'}</td>
                  <td className="mono">{a.cgpa ?? '—'}</td>
                  <td><span className="badge b-rose">Rejected at {STAGES[a.stage]}</span></td>
                  <td></td><td></td>
                </tr>
              ))}
            </tbody></table>
          </>
        )}
      </div>

      {/* Offer details modal */}
      {offerModal && (
        <Modal title={`Send offer to ${offerModal.studentName}`} onClose={() => setOfferModal(null)}>
          <div className="field">
            <label style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, display: 'block' }}>Offer details</label>
            <textarea value={offerForm.details}
              onChange={e => setOfferForm(f => ({ ...f, details: e.target.value }))}
              placeholder="Role, package breakdown, joining date, location, terms..."
              style={{ width: '100%', minHeight: 120, padding: '12px 14px', border: '1.5px solid var(--line)',
                borderRadius: 10, fontSize: 14, fontFamily: 'inherit', lineHeight: 1.6, resize: 'vertical' }} />
          </div>
          <div className="field" style={{ marginTop: 14 }}>
            <label style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, display: 'block' }}>
              Offer letter URL <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(optional — link to PDF)</span>
            </label>
            <input value={offerForm.letterUrl}
              onChange={e => setOfferForm(f => ({ ...f, letterUrl: e.target.value }))}
              placeholder="https://drive.google.com/..."
              style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--line)',
                borderRadius: 10, fontSize: 14, fontFamily: 'inherit' }} />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <button className="btn btn-ghost" onClick={() => setOfferModal(null)}>Cancel</button>
            <button className="btn btn-pri" onClick={submitOffer}
              disabled={!offerForm.details.trim()}>📋 Send offer</button>
          </div>
        </Modal>
      )}
    </>
  )
}
