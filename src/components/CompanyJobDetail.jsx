import React, { useState } from 'react'
import { useCollection, where, updateDocument } from '../hooks/useFirestore'
import { Icons, initials } from './Icons'
import { formatPackage } from '../utils/formatPackage'
import { notifyOfferReceived, notifyStageUpdate, notifyPlaced } from '../utils/email'
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
  const [offerForm, setOfferForm] = useState({ details: '', letterUrl: '', letterFile: null, letterFileName: '', letterMode: 'upload' })
  const [expandedApp, setExpandedApp] = useState(null)
  const [editOfferApp, setEditOfferApp] = useState(null)

  async function advance(app) {
    const newStage = app.stage + 1

    // If advancing to Offer, show offer details modal
    if (newStage === 5) {
      setOfferModal(app)
      setOfferForm({ details: '', letterUrl: '', letterFile: null, letterFileName: '', letterMode: 'upload' })
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
      const data = {
        stage: 5,
        offerDetails: offerForm.details,
        offerLetterUrl: offerForm.letterMode === 'link' ? offerForm.letterUrl : '',
        offerLetterFile: offerForm.letterMode === 'upload' && offerForm.letterFile ? offerForm.letterFile : null,
        offerLetterFileName: offerForm.letterFileName || '',
        offerStatus: 'pending_student',
        offeredAt: new Date(),
      }
      await updateDocument('applications', offerModal.id, data)
      toast.success(`Offer sent to ${offerModal.studentName}`)
      notifyOfferReceived(offerModal.studentName, offerModal.studentName, j.role, j.companyName).catch(() => {})
      setOfferModal(null)
    } catch (e) { toast.error('Failed: ' + e.message) }
  }

  function handleFileUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 800000) { toast.error('File too large. Max 800KB. Use a link for larger files.'); return }
    const reader = new FileReader()
    reader.onload = () => {
      setOfferForm(f => ({ ...f, letterFile: reader.result, letterFileName: file.name }))
    }
    reader.readAsDataURL(file)
  }

  function startEditOffer(app) {
    setOfferForm({
      details: app.offerDetails || '',
      letterUrl: app.offerLetterUrl || '',
      letterFile: app.offerLetterFile || null,
      letterFileName: app.offerLetterFileName || '',
      letterMode: app.offerLetterFile ? 'upload' : 'link',
    })
    setEditOfferApp(app)
  }

  async function saveUpdatedOffer() {
    if (!editOfferApp) return
    try {
      await updateDocument('applications', editOfferApp.id, {
        offerDetails: offerForm.details,
        offerLetterUrl: offerForm.letterMode === 'link' ? offerForm.letterUrl : (editOfferApp.offerLetterUrl || ''),
        offerLetterFile: offerForm.letterMode === 'upload' && offerForm.letterFile ? offerForm.letterFile : (editOfferApp.offerLetterFile || null),
        offerLetterFileName: offerForm.letterFileName || editOfferApp.offerLetterFileName || '',
        offerStatus: 'pending_student',
      })
      toast.success('Offer updated — student will see the new details')
      setEditOfferApp(null)
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
      notifyPlaced(app.studentName, app.studentName, j.role, j.companyName, j.packageNumeric).catch(() => {})
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
                <React.Fragment key={a.id}>
                <tr style={{ ...(a.stage >= 6 ? { background: 'var(--green-soft)' } : {}),
                  ...(a.stage >= 5 ? { cursor: 'pointer' } : {}) }}
                  onClick={() => a.stage >= 5 && setExpandedApp(expandedApp === a.id ? null : a.id)}>
                  <td><div className="cell-u"><div className="av-sm">{initials(a.studentName)}</div>
                    <div><b>{a.studentName}</b>
                    {a.stage >= 5 && <span style={{ fontSize: 10, color: 'var(--indigo)', marginLeft: 6 }}>
                      {expandedApp === a.id ? '▼' : '▶'} offer info</span>}
                    </div></div></td>
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
                {expandedApp === a.id && a.stage >= 5 && (
                  <tr><td colSpan="7" style={{ padding: 0 }}>
                    <div style={{ padding: '14px 20px', background: '#f8f9fc', borderTop: '1px dashed var(--line)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase',
                            letterSpacing: '0.5px', marginBottom: 6 }}>Offer details</div>
                          {a.offerDetails
                            ? <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--ink-2)', margin: 0,
                                whiteSpace: 'pre-wrap', background: '#fff', padding: '10px 12px', borderRadius: 8,
                                border: '1px solid var(--line)' }}>{a.offerDetails}</p>
                            : <span style={{ fontSize: 12, color: 'var(--muted)' }}>No details provided</span>}
                          {(a.offerLetterUrl || a.offerLetterFile) && (
                            <div style={{ marginTop: 8, display: 'flex', gap: 12 }}>
                              {a.offerLetterUrl && <a href={a.offerLetterUrl} target="_blank" rel="noreferrer"
                                style={{ fontSize: 12, color: 'var(--indigo)', fontWeight: 600 }}>🔗 Offer letter (link)</a>}
                              {a.offerLetterFile && <a href={a.offerLetterFile} download={a.offerLetterFileName || 'offer'}
                                style={{ fontSize: 12, color: 'var(--indigo)', fontWeight: 600 }}>📄 Download offer letter</a>}
                            </div>
                          )}
                        </div>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase',
                            letterSpacing: '0.5px', marginBottom: 6 }}>Student response</div>
                          {a.consentText ? (
                            <div style={{ fontSize: 13, lineHeight: 1.5, color: '#0c7a4c', background: 'var(--green-soft)',
                              padding: '10px 12px', borderRadius: 8, border: '1px solid #b5e6cf' }}>
                              <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>✓ Accepted
                                {a.studentRespondedAt && ` · ${new Date(a.studentRespondedAt.seconds
                                  ? a.studentRespondedAt.seconds * 1000 : a.studentRespondedAt).toLocaleDateString()}`}</div>
                              {a.consentText}
                            </div>
                          ) : a.offerStatus === 'rejected' ? (
                            <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--rose)', background: 'var(--rose-soft)',
                              padding: '10px 12px', borderRadius: 8 }}>
                              <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>✗ Declined</div>
                              {a.studentResponse || 'No reason provided'}
                            </div>
                          ) : <span style={{ fontSize: 12, color: 'var(--muted)' }}>Awaiting student response</span>}
                        </div>
                      </div>
                      {/* Edit offer button — only before admin approval */}
                      {a.stage === 5 && a.offerStatus !== 'accepted' && (
                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
                          <button className="btn btn-ghost" onClick={e => { e.stopPropagation(); startEditOffer(a) }}
                            style={{ fontSize: 12 }}>
                            {Icons.gear} Update offer details
                          </button>
                          <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 10 }}>
                            Re-upload letter or update offer text — student will need to re-accept
                          </span>
                        </div>
                      )}
                      {a.offerStatus === 'accepted' && (
                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)',
                          fontSize: 12, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          {Icons.lock} Offer locked — accepted and approved by placement admin
                        </div>
                      )}
                    </div>
                  </td></tr>
                )}
                </React.Fragment>
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
          <div style={{ marginTop: 14 }}>
            <label style={{ fontWeight: 600, fontSize: 14, marginBottom: 10, display: 'block' }}>
              Offer letter <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(optional)</span>
            </label>
            {/* Toggle */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 12, background: '#f3f4fa', borderRadius: 10, padding: 3 }}>
              <button type="button"
                onClick={() => setOfferForm(f => ({ ...f, letterMode: 'upload' }))}
                style={{ flex: 1, padding: '8px', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                  background: offerForm.letterMode === 'upload' ? '#fff' : 'transparent',
                  color: offerForm.letterMode === 'upload' ? 'var(--indigo)' : 'var(--muted)',
                  boxShadow: offerForm.letterMode === 'upload' ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
                }}>📎 Upload file</button>
              <button type="button"
                onClick={() => setOfferForm(f => ({ ...f, letterMode: 'link' }))}
                style={{ flex: 1, padding: '8px', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                  background: offerForm.letterMode === 'link' ? '#fff' : 'transparent',
                  color: offerForm.letterMode === 'link' ? 'var(--indigo)' : 'var(--muted)',
                  boxShadow: offerForm.letterMode === 'link' ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
                }}>🔗 Add link</button>
            </div>

            {offerForm.letterMode === 'upload' ? (
              <div>
                {offerForm.letterFile ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
                    background: 'var(--green-soft)', borderRadius: 10, border: '1px solid #b5e6cf' }}>
                    <span style={{ fontSize: 22 }}>📄</span>
                    <div style={{ flex: 1 }}>
                      <b style={{ fontSize: 13 }}>{offerForm.letterFileName}</b>
                      <div style={{ fontSize: 11, color: 'var(--green)' }}>Ready to send</div>
                    </div>
                    <button type="button" onClick={() => setOfferForm(f => ({ ...f, letterFile: null, letterFileName: '' }))}
                      style={{ background: 'none', border: 'none', color: 'var(--rose)', cursor: 'pointer', fontSize: 16 }}>×</button>
                  </div>
                ) : (
                  <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                    padding: '24px 16px', border: '2px dashed var(--line)', borderRadius: 12, cursor: 'pointer',
                    background: '#fbfbfe', transition: '.15s' }}
                    onMouseOver={e => e.currentTarget.style.borderColor = 'var(--indigo)'}
                    onMouseOut={e => e.currentTarget.style.borderColor = 'var(--line)'}>
                    <span style={{ fontSize: 28 }}>📎</span>
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                      Click to upload PDF, DOC, or image <span style={{ color: 'var(--rose)' }}>(max 800KB)</span>
                    </span>
                    <input type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" onChange={handleFileUpload}
                      style={{ display: 'none' }} />
                  </label>
                )}
              </div>
            ) : (
              <input value={offerForm.letterUrl}
                onChange={e => setOfferForm(f => ({ ...f, letterUrl: e.target.value }))}
                placeholder="https://drive.google.com/... or OneDrive link"
                style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--line)',
                  borderRadius: 10, fontSize: 14, fontFamily: 'inherit' }} />
            )}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <button className="btn btn-ghost" onClick={() => setOfferModal(null)}>Cancel</button>
            <button className="btn btn-pri" onClick={submitOffer}
              disabled={!offerForm.details.trim()}>📋 Send offer</button>
          </div>
        </Modal>
      )}

      {/* Edit offer modal */}
      {editOfferApp && (
        <Modal title={`Update offer for ${editOfferApp.studentName}`} onClose={() => setEditOfferApp(null)}>
          <div className="field">
            <label style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, display: 'block' }}>Offer details</label>
            <textarea value={offerForm.details}
              onChange={e => setOfferForm(f => ({ ...f, details: e.target.value }))}
              placeholder="Role, package breakdown, joining date, location, terms..."
              style={{ width: '100%', minHeight: 120, padding: '12px 14px', border: '1.5px solid var(--line)',
                borderRadius: 10, fontSize: 14, fontFamily: 'inherit', lineHeight: 1.6, resize: 'vertical' }} />
          </div>
          <div style={{ marginTop: 14 }}>
            <label style={{ fontWeight: 600, fontSize: 14, marginBottom: 10, display: 'block' }}>
              Offer letter <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(optional)</span>
            </label>
            <div style={{ display: 'flex', gap: 4, marginBottom: 12, background: '#f3f4fa', borderRadius: 10, padding: 3 }}>
              {['upload', 'link'].map(m => (
                <button key={m} type="button"
                  onClick={() => setOfferForm(f => ({ ...f, letterMode: m }))}
                  style={{ flex: 1, padding: '8px', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                    background: offerForm.letterMode === m ? '#fff' : 'transparent',
                    color: offerForm.letterMode === m ? 'var(--indigo)' : 'var(--muted)',
                    boxShadow: offerForm.letterMode === m ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
                  }}>{m === 'upload' ? '📎 Upload file' : '🔗 Add link'}</button>
              ))}
            </div>
            {offerForm.letterMode === 'upload' ? (
              offerForm.letterFile ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
                  background: 'var(--green-soft)', borderRadius: 10, border: '1px solid #b5e6cf' }}>
                  <span style={{ fontSize: 22 }}>📄</span>
                  <div style={{ flex: 1 }}><b style={{ fontSize: 13 }}>{offerForm.letterFileName}</b></div>
                  <button type="button" onClick={() => setOfferForm(f => ({ ...f, letterFile: null, letterFileName: '' }))}
                    style={{ background: 'none', border: 'none', color: 'var(--rose)', cursor: 'pointer', fontSize: 16 }}>×</button>
                </div>
              ) : (
                <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                  padding: '20px 16px', border: '2px dashed var(--line)', borderRadius: 12, cursor: 'pointer', background: '#fbfbfe' }}>
                  <span style={{ fontSize: 28 }}>📎</span>
                  <span style={{ fontSize: 13, color: 'var(--muted)' }}>Click to upload (max 800KB)</span>
                  <input type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" onChange={handleFileUpload} style={{ display: 'none' }} />
                </label>
              )
            ) : (
              <input value={offerForm.letterUrl}
                onChange={e => setOfferForm(f => ({ ...f, letterUrl: e.target.value }))}
                placeholder="https://drive.google.com/... or OneDrive link"
                style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--line)',
                  borderRadius: 10, fontSize: 14, fontFamily: 'inherit' }} />
            )}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <button className="btn btn-ghost" onClick={() => setEditOfferApp(null)}>Cancel</button>
            <button className="btn btn-pri" onClick={saveUpdatedOffer}
              disabled={!offerForm.details.trim()}>📋 Update offer</button>
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10, padding: '8px 10px',
            background: '#f8f9fc', borderRadius: 8 }}>
            Updating the offer will reset the student's response status to "pending" so they can review and re-accept the new terms.
          </div>
        </Modal>
      )}
    </>
  )
}
