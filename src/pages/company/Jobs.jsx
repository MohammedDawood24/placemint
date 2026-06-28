import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useCollection, where, orderBy, addDocument, updateDocument } from '../../hooks/useFirestore'
import { useSite } from '../../contexts/SiteContext'
import { Icons } from '../../components/Icons'
import RichEditor from '../../components/RichEditor'
import toast from 'react-hot-toast'

const STATUS_MAP = {
  draft: ['b-grey', 'Draft'], open: ['b-green', 'Open'],
  closed: ['b-gold', 'Closed'], completed: ['b-indigo', 'Completed'],
}

export default function CompanyJobs() {
  const { userData } = useAuth()
  const { branches } = useSite()
  const { data: jobs, loading } = useCollection('jobs',
    [where('companyId', '==', userData?.id || 'x'), orderBy('createdAt', 'desc')],
    [userData?.id])

  const [showForm, setShowForm] = useState(false)
  const [editJob, setEditJob] = useState(null)

  if (showForm || editJob) {
    return <CompanyJobForm
      job={editJob} companyName={userData?.displayName || ''}
      companyId={userData?.id} branches={branches}
      onBack={() => { setShowForm(false); setEditJob(null) }}
      onSaved={() => { setShowForm(false); setEditJob(null) }} />
  }

  return (
    <>
      <div className="sec-head" style={{ marginBottom: 16 }}>
        <div>
          <h3>My Job Postings</h3>
          <div className="sub">{loading ? 'Loading…' : `${jobs.length} posting${jobs.length !== 1 ? 's' : ''}`}</div>
        </div>
        <button className="btn btn-pri" onClick={() => setShowForm(true)}>{Icons.plus} Create posting</button>
      </div>

      {jobs.length === 0 && !loading ? (
        <div className="card p" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)' }}>
          <div style={{ width: 54, height: 54, borderRadius: 14, background: 'var(--indigo-soft)',
            display: 'grid', placeItems: 'center', margin: '0 auto 14px', color: 'var(--indigo)' }}>{Icons.brief}</div>
          <b style={{ display: 'block', color: 'var(--ink)', fontSize: 15, marginBottom: 5 }}>No postings yet</b>
          Create your first job posting to start receiving applications.
        </div>
      ) : (
        <div className="cards-row c3">
          {jobs.map(j => {
            const [badge, label] = STATUS_MAP[j.status] || ['b-grey', j.status]
            return (
              <div className="card p" key={j.id}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontSize: 15.5, fontWeight: 600, margin: 0 }}>{j.role}</h4>
                    <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>
                      {j.package || '—'} · {j.driveType || 'On-campus'}
                    </div>
                  </div>
                  <span className={`badge ${badge}`}>{label}</span>
                </div>
                {(j.eligibleDepartments || []).length > 0 && (
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
                    {j.eligibleDepartments.join(', ')}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-ghost" onClick={() => setEditJob(j)}
                    style={{ flex: 1, justifyContent: 'center', fontSize: 12 }}>{Icons.gear} Edit</button>
                  {j.status === 'draft' && (
                    <button className="btn btn-pri" style={{ flex: 1, justifyContent: 'center', fontSize: 12 }}
                      onClick={async () => {
                        await updateDocument('jobs', j.id, { status: 'open' }); toast.success('Published!')
                      }}>Publish</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

function CompanyJobForm({ job, companyName, companyId, branches, onBack, onSaved }) {
  const isEdit = !!job
  const [form, setForm] = useState({
    role: job?.role || '', package: job?.package || '',
    packageNumeric: job?.packageNumeric || '',
    min10th: job?.min10th || job?.minPercentage || '',
    min12th: job?.min12th || job?.minPercentage || '',
    minCgpa: job?.minCgpa || '',
    eligibleDepartments: job?.eligibleDepartments || [],
    driveType: job?.driveType || 'on-campus',
    driveDate: job?.driveDate?.seconds ? new Date(job.driveDate.seconds * 1000).toISOString().slice(0, 10) : '',
    deadline: job?.deadline?.seconds ? new Date(job.deadline.seconds * 1000).toISOString().slice(0, 10) : '',
    description: job?.description || '', status: job?.status || 'draft',
  })
  const [busy, setBusy] = useState(false)
  const [allDepts, setAllDepts] = useState((job?.eligibleDepartments || []).length === 0)
  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }
  function toggleDept(code) {
    setForm(f => ({
      ...f, eligibleDepartments: f.eligibleDepartments.includes(code)
        ? f.eligibleDepartments.filter(d => d !== code)
        : [...f.eligibleDepartments, code]
    }))
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.role) return toast.error('Role is required')
    setBusy(true)
    try {
      const data = {
        companyName, companyId, role: form.role,
        package: form.package || null,
        packageNumeric: form.packageNumeric ? parseFloat(form.packageNumeric) : null,
        min10th: form.min10th ? parseFloat(form.min10th) : null,
        min12th: form.min12th ? parseFloat(form.min12th) : null,
        minCgpa: form.minCgpa ? parseFloat(form.minCgpa) : null,
        eligibleDepartments: allDepts ? [] : form.eligibleDepartments,
        driveType: form.driveType,
        driveDate: form.driveDate ? new Date(form.driveDate) : null,
        deadline: form.deadline ? new Date(form.deadline) : null,
        description: form.description, status: form.status,
      }
      if (isEdit) await updateDocument('jobs', job.id, data)
      else await addDocument('jobs', data)
      toast.success(isEdit ? 'Updated' : 'Created')
      onSaved()
    } catch (e) { toast.error(e.message) }
    finally { setBusy(false) }
  }

  return (
    <>
      <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: 16 }}>← Back</button>
      <form onSubmit={handleSave}>
        <div className="card p" style={{ marginBottom: 16 }}>
          <div className="sec-head"><h3>{isEdit ? 'Edit posting' : 'Create posting'}</h3></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
            <div className="field"><label>Role *</label>
              <input value={form.role} onChange={e => set('role', e.target.value)} placeholder="Systems Engineer" /></div>
            <div className="field"><label>Package</label>
              <input value={form.package} onChange={e => set('package', e.target.value)} placeholder="6.5 LPA" /></div>
            <div className="field"><label>Min 10th %</label>
              <input type="number" value={form.min10th} onChange={e => set('min10th', e.target.value)} placeholder="60" /></div>
            <div className="field"><label>Min 12th %</label>
              <input type="number" value={form.min12th} onChange={e => set('min12th', e.target.value)} placeholder="60" /></div>
            <div className="field"><label>Min CGPA</label>
              <input type="number" value={form.minCgpa} onChange={e => set('minCgpa', e.target.value)} placeholder="7.0" step="0.1" /></div>
            <div className="field"><label>Drive type</label>
              <select value={form.driveType} onChange={e => set('driveType', e.target.value)}>
                <option value="on-campus">On-campus</option><option value="virtual">Virtual</option>
              </select></div>
            <div className="field"><label>Drive date</label>
              <input type="date" value={form.driveDate} onChange={e => set('driveDate', e.target.value)} /></div>
          </div>
          <div className="field"><label>Description</label>
            <RichEditor value={form.description} onChange={v => set('description', v)}
              placeholder="Role details, requirements..." /></div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, marginBottom: 10, cursor: 'pointer' }}>
            <input type="checkbox" checked={allDepts} onChange={e => setAllDepts(e.target.checked)} style={{ width: 16, height: 16 }} />
            All branches eligible</label>
          {!allDepts && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {branches.map(b => (
                <label key={b.code} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px',
                  borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 500,
                  background: form.eligibleDepartments.includes(b.code) ? 'var(--indigo-soft)' : '#f3f4fa',
                  border: `1.5px solid ${form.eligibleDepartments.includes(b.code) ? 'var(--indigo)' : 'transparent'}` }}>
                  <input type="checkbox" checked={form.eligibleDepartments.includes(b.code)}
                    onChange={() => toggleDept(b.code)} style={{ display: 'none' }} />
                  {b.code}</label>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="btn btn-ghost" onClick={onBack}>Cancel</button>
            <button type="submit" className="btn btn-pri" disabled={busy}>
              {busy ? 'Saving…' : isEdit ? 'Save' : 'Create'}</button>
          </div>
        </div>
      </form>
    </>
  )
}
