import { useState, useMemo } from 'react'
import { useCollection, where, orderBy, addDocument, updateDocument, deleteDocument } from '../../hooks/useFirestore'
import { Icons, initials } from '../../components/Icons'
import { useSite } from '../../contexts/SiteContext'
import toast from 'react-hot-toast'

const STATUS_OPTIONS = ['draft', 'open', 'closed', 'completed']
const STATUS_MAP = {
  draft: ['b-grey', 'Draft'], open: ['b-green', 'Open'],
  closed: ['b-gold', 'Closed'], completed: ['b-indigo', 'Completed'],
}

export default function AdminJobs() {
  const { branches } = useSite()
  const { data: jobs, loading } = useCollection('jobs', [orderBy('createdAt', 'desc')], [])
  const { data: applications } = useCollection('applications', [], [])
  const { data: companies } = useCollection('companies', [], [])

  const [view, setView] = useState('list') // list | create | edit | detail
  const [selectedId, setSelectedId] = useState(null)
  const [filterStatus, setFilterStatus] = useState('')
  const [search, setSearch] = useState('')

  const appCountMap = useMemo(() => {
    const m = {}
    applications.forEach(a => { m[a.jobId] = (m[a.jobId] || 0) + 1 })
    return m
  }, [applications])

  const filtered = useMemo(() => {
    return jobs.filter(j => {
      if (filterStatus && j.status !== filterStatus) return false
      if (search) {
        const q = search.toLowerCase()
        return (j.role || '').toLowerCase().includes(q) ||
          (j.companyName || '').toLowerCase().includes(q)
      }
      return true
    })
  }, [jobs, filterStatus, search])

  const selected = selectedId ? jobs.find(j => j.id === selectedId) : null

  if (view === 'create') {
    return <JobForm branches={branches} companies={companies}
      onBack={() => setView('list')}
      onSaved={() => { setView('list'); toast.success('Job posting created') }} />
  }
  if (view === 'edit' && selected) {
    return <JobForm job={selected} branches={branches} companies={companies}
      onBack={() => setView('detail')}
      onSaved={() => { setView('detail'); toast.success('Job posting updated') }} />
  }
  if (view === 'detail' && selected) {
    return <JobDetail job={selected} applications={applications}
      onBack={() => { setView('list'); setSelectedId(null) }}
      onEdit={() => setView('edit')}
      onDelete={async () => {
        if (!confirm(`Delete "${selected.role}" at ${selected.companyName}?`)) return
        try {
          await deleteDocument('jobs', selected.id)
          toast.success('Job deleted')
          setView('list'); setSelectedId(null)
        } catch (e) { toast.error('Delete failed: ' + e.message) }
      }} />
  }

  return (
    <>
      <div className="card p" style={{ marginBottom: 16 }}>
        <div className="sec-head" style={{ marginBottom: 14 }}>
          <div>
            <h3>Job Postings</h3>
            <div className="sub">{loading ? 'Loading…' : `${filtered.length} posting${filtered.length !== 1 ? 's' : ''}`}</div>
          </div>
          <button className="btn btn-pri" onClick={() => setView('create')}>{Icons.plus} Create posting</button>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8,
            background: '#fbfbfe', border: '1.5px solid var(--line)', borderRadius: 10, padding: '8px 12px' }}>
            {Icons.search}
            <input placeholder="Search by role or company..." value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ border: 'none', outline: 'none', fontFamily: 'inherit', fontSize: 13,
                width: '100%', color: 'var(--ink)', background: 'transparent' }} />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 10, border: '1.5px solid var(--line)',
              fontSize: 13, fontFamily: 'inherit', background: '#fbfbfe' }}>
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_MAP[s][1]}</option>)}
          </select>
        </div>
      </div>

      {filtered.length === 0 && !loading ? (
        <div className="card p" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)' }}>
          <div style={{ width: 54, height: 54, borderRadius: 14, background: 'var(--indigo-soft)',
            display: 'grid', placeItems: 'center', margin: '0 auto 14px', color: 'var(--indigo)' }}>{Icons.brief}</div>
          <b style={{ display: 'block', color: 'var(--ink)', fontSize: 15, marginBottom: 5 }}>No job postings</b>
          Create your first posting to start matching students with companies.
        </div>
      ) : (
        <div className="cards-row c3">
          {filtered.map(j => {
            const [badge, label] = STATUS_MAP[j.status] || ['b-grey', j.status]
            const appCount = appCountMap[j.id] || 0
            return (
              <div className="card job" key={j.id} style={{ cursor: 'pointer' }}
                onClick={() => { setSelectedId(j.id); setView('detail') }}>
                <div className="job-top">
                  <div className="job-logo" style={{ background: '#4C5BD4' }}>{(j.companyName || '?')[0]}</div>
                  <div style={{ flex: 1 }}>
                    <h4>{j.role || 'Untitled'}</h4>
                    <div className="co">{j.companyName || '—'}</div>
                  </div>
                  <span className={`badge ${badge}`}>{label}</span>
                </div>
                <div className="job-meta">
                  {j.package && <span className="chip">₹ {j.package}</span>}
                  {j.minPercentage && <span className="chip">Min {j.minPercentage}%</span>}
                  {j.minCgpa && <span className="chip">CGPA ≥ {j.minCgpa}</span>}
                </div>
                <div className="job-meta">
                  {(j.eligibleDepartments || []).length > 0
                    ? <span className="chip">{j.eligibleDepartments.join(' · ')}</span>
                    : <span className="chip">All branches</span>}
                </div>
                <div className="job-foot">
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {appCount} applicant{appCount !== 1 ? 's' : ''}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 'auto' }}>
                    {j.driveType || 'On-campus'}
                    {j.driveDate?.seconds && ` · ${new Date(j.driveDate.seconds * 1000).toLocaleDateString()}`}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

// ─── JOB DETAIL VIEW ───
function JobDetail({ job, applications, onBack, onEdit, onDelete }) {
  const j = job
  const [badge, label] = STATUS_MAP[j.status] || ['b-grey', j.status]
  const jobApps = applications.filter(a => a.jobId === j.id)
  const stageCounts = [0, 0, 0, 0, 0, 0, 0]
  jobApps.forEach(a => { if (a.stage >= 0 && a.stage < 7) stageCounts[a.stage]++ })
  const STAGES = ['Applied', 'Shortlisted', 'Aptitude', 'Technical', 'HR', 'Offer', 'Placed']

  async function updateStatus(newStatus) {
    try {
      await updateDocument('jobs', j.id, { status: newStatus })
      toast.success(`Status changed to ${newStatus}`)
    } catch (e) { toast.error('Failed: ' + e.message) }
  }

  async function updateAppStage(appId, newStage, studentName) {
    try {
      const updates = { stage: newStage }
      if (newStage === 6) updates.status = 'placed'
      await updateDocument('applications', appId, updates)
      // If placed, update student record
      if (newStage === 6) {
        const app = jobApps.find(a => a.id === appId)
        if (app) {
          await updateDocument('students', app.studentId, {
            placementStatus: 'placed', placedAt: j.companyName,
            package: j.packageNumeric || null,
          })
        }
      }
      toast.success(`${studentName} → ${STAGES[newStage]}`)
    } catch (e) { toast.error('Failed: ' + e.message) }
  }

  async function rejectApp(appId, studentName) {
    try {
      await updateDocument('applications', appId, { status: 'rejected' })
      toast.success(`${studentName} rejected`)
    } catch (e) { toast.error('Failed: ' + e.message) }
  }

  return (
    <>
      <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: 16 }}>← Back to postings</button>

      <div className="card p" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <div className="job-logo" style={{ background: '#4C5BD4', width: 56, height: 56, fontSize: 22 }}>
            {(j.companyName || '?')[0]}</div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif",
              margin: '0 0 2px' }}>{j.role}</h3>
            <div style={{ fontSize: 14, color: 'var(--muted)' }}>{j.companyName}</div>
          </div>
          <span className={`badge ${badge}`} style={{ fontSize: 13, padding: '5px 12px' }}>{label}</span>
          <button className="btn btn-pri" onClick={onEdit}>{Icons.gear} Edit</button>
          <button className="btn" onClick={onDelete}
            style={{ background: 'transparent', border: '1.5px solid var(--rose)', color: 'var(--rose)',
              padding: '9px 15px', borderRadius: 10, fontSize: 13.5, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit' }}>Delete</button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
          {j.package && <span className="chip">₹ {j.package}</span>}
          {j.minPercentage && <span className="chip">Min 10th/12th: {j.minPercentage}%</span>}
          {j.minCgpa && <span className="chip">Min CGPA: {j.minCgpa}</span>}
          <span className="chip">{j.driveType || 'On-campus'}</span>
          {j.driveDate?.seconds && <span className="chip">Drive: {new Date(j.driveDate.seconds * 1000).toLocaleDateString()}</span>}
          {j.deadline?.seconds && <span className="chip">Deadline: {new Date(j.deadline.seconds * 1000).toLocaleDateString()}</span>}
        </div>
        {(j.eligibleDepartments || []).length > 0 && (
          <div style={{ marginTop: 10, fontSize: 13, color: 'var(--muted)' }}>
            Eligible: <b style={{ color: 'var(--ink)' }}>{j.eligibleDepartments.join(', ')}</b>
          </div>
        )}
        {j.description && (
          <p style={{ marginTop: 12, fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.6 }}>{j.description}</p>
        )}

        {/* Status actions */}
        <div style={{ display: 'flex', gap: 8, marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
          {STATUS_OPTIONS.filter(s => s !== j.status).map(s => (
            <button key={s} className={`btn ${s === 'open' ? 'btn-pri' : 'btn-ghost'}`}
              onClick={() => updateStatus(s)} style={{ fontSize: 12, padding: '6px 14px' }}>
              Mark as {STATUS_MAP[s][1]}
            </button>
          ))}
        </div>
      </div>

      {/* Pipeline summary */}
      <div className="card p" style={{ marginBottom: 16 }}>
        <div className="sec-head"><h3>Pipeline</h3></div>
        <div style={{ display: 'flex', gap: 4 }}>
          {STAGES.map((s, i) => (
            <div key={s} style={{ flex: 1, textAlign: 'center', padding: '10px 4px',
              background: stageCounts[i] > 0 ? 'var(--indigo-soft)' : '#f8f9fc',
              borderRadius: 8 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: stageCounts[i] > 0 ? 'var(--indigo-d)' : 'var(--muted)' }}>
                {stageCounts[i]}</div>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{s}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Applicants */}
      <div className="card p">
        <div className="sec-head">
          <h3>Applicants</h3>
          <div className="sub">{jobApps.length} application{jobApps.length !== 1 ? 's' : ''}</div>
        </div>
        {jobApps.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--muted)', fontSize: 13 }}>
            No applications yet.
          </div>
        ) : (
          <table className="tbl">
            <thead><tr><th>Student</th><th>USN</th><th>Dept</th><th>CGPA</th><th>Stage</th><th></th></tr></thead>
            <tbody>
              {jobApps.filter(a => a.status !== 'rejected').map(a => (
                <tr key={a.id}>
                  <td><div className="cell-u"><div className="av-sm">{initials(a.studentName)}</div>
                    <b>{a.studentName}</b></div></td>
                  <td className="mono" style={{ fontSize: 12 }}>{a.studentUsn || '—'}</td>
                  <td>{a.department || '—'}</td>
                  <td className="mono">{a.cgpa ?? '—'}</td>
                  <td><span className={`badge ${a.stage >= 6 ? 'b-green' : 'b-indigo'}`}>
                    {STAGES[a.stage] || 'Applied'}</span></td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                      {a.stage < 6 && (
                        <button className="btn btn-pri" style={{ padding: '4px 10px', fontSize: 11 }}
                          onClick={() => updateAppStage(a.id, a.stage + 1, a.studentName)}>
                          → {STAGES[a.stage + 1]}
                        </button>
                      )}
                      {a.stage < 6 && (
                        <button className="btn" style={{ padding: '4px 10px', fontSize: 11, background: 'transparent',
                          border: '1px solid var(--rose)', color: 'var(--rose)', cursor: 'pointer',
                          borderRadius: 10, fontFamily: 'inherit', fontWeight: 600 }}
                          onClick={() => rejectApp(a.id, a.studentName)}>Reject</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {jobApps.filter(a => a.status === 'rejected').length > 0 && (
                <>
                  <tr><td colSpan="6" style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600,
                    background: '#fafafa' }}>Rejected</td></tr>
                  {jobApps.filter(a => a.status === 'rejected').map(a => (
                    <tr key={a.id} style={{ opacity: 0.5 }}>
                      <td><div className="cell-u"><div className="av-sm">{initials(a.studentName)}</div>
                        <b>{a.studentName}</b></div></td>
                      <td className="mono" style={{ fontSize: 12 }}>{a.studentUsn || '—'}</td>
                      <td>{a.department || '—'}</td>
                      <td className="mono">{a.cgpa ?? '—'}</td>
                      <td><span className="badge b-rose">Rejected</span></td>
                      <td></td>
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}

// ─── JOB CREATE / EDIT FORM ───
function JobForm({ job, branches, companies, onBack, onSaved }) {
  const isEdit = !!job
  const [form, setForm] = useState({
    companyName: job?.companyName || '',
    companyId: job?.companyId || '',
    role: job?.role || '',
    package: job?.package || '',
    packageNumeric: job?.packageNumeric || '',
    minPercentage: job?.minPercentage || '',
    minCgpa: job?.minCgpa || '',
    eligibleDepartments: job?.eligibleDepartments || [],
    driveType: job?.driveType || 'on-campus',
    driveDate: job?.driveDate?.seconds ? new Date(job.driveDate.seconds * 1000).toISOString().slice(0, 10) : '',
    deadline: job?.deadline?.seconds ? new Date(job.deadline.seconds * 1000).toISOString().slice(0, 10) : '',
    description: job?.description || '',
    status: job?.status || 'draft',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [allDepts, setAllDepts] = useState((job?.eligibleDepartments || []).length === 0)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function toggleDept(code) {
    setForm(f => {
      const deps = f.eligibleDepartments.includes(code)
        ? f.eligibleDepartments.filter(d => d !== code)
        : [...f.eligibleDepartments, code]
      return { ...f, eligibleDepartments: deps }
    })
  }

  async function handleSave(e) {
    e.preventDefault()
    setError('')
    if (!form.role) return setError('Role / title is required.')
    if (!form.companyName) return setError('Company name is required.')

    setBusy(true)
    try {
      const data = {
        companyName: form.companyName,
        companyId: form.companyId || null,
        role: form.role,
        package: form.package || null,
        packageNumeric: form.packageNumeric ? parseFloat(form.packageNumeric) : null,
        minPercentage: form.minPercentage ? parseFloat(form.minPercentage) : null,
        minCgpa: form.minCgpa ? parseFloat(form.minCgpa) : null,
        eligibleDepartments: allDepts ? [] : form.eligibleDepartments,
        driveType: form.driveType,
        driveDate: form.driveDate ? new Date(form.driveDate) : null,
        deadline: form.deadline ? new Date(form.deadline) : null,
        description: form.description,
        status: form.status,
      }

      if (isEdit) {
        await updateDocument('jobs', job.id, data)
      } else {
        await addDocument('jobs', data)
      }
      onSaved()
    } catch (err) {
      setError(err.message || 'Save failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: 16 }}>
        ← {isEdit ? 'Back to details' : 'Back to postings'}</button>

      <form onSubmit={handleSave}>
        <div className="card p" style={{ marginBottom: 16 }}>
          <div className="sec-head"><h3>{isEdit ? 'Edit job posting' : 'Create job posting'}</h3></div>
          {error && <div className="error-msg">{error}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
            <div className="field">
              <label>Company name *</label>
              {companies.length > 0 ? (
                <select value={form.companyName} onChange={e => {
                  const co = companies.find(c => c.name === e.target.value)
                  setForm(f => ({ ...f, companyName: e.target.value, companyId: co?.id || '' }))
                }}>
                  <option value="">Select company</option>
                  {companies.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  <option value="__custom">— Type a custom name —</option>
                </select>
              ) : (
                <input value={form.companyName} onChange={e => set('companyName', e.target.value)}
                  placeholder="e.g. Infosys" />
              )}
              {form.companyName === '__custom' && (
                <input value="" onChange={e => set('companyName', e.target.value)}
                  placeholder="Type company name" style={{ marginTop: 8 }} />
              )}
            </div>
            <div className="field">
              <label>Role / Title *</label>
              <input value={form.role} onChange={e => set('role', e.target.value)}
                placeholder="e.g. Systems Engineer" />
            </div>
            <div className="field">
              <label>Package (display text)</label>
              <input value={form.package} onChange={e => set('package', e.target.value)}
                placeholder="e.g. 6.5 LPA" />
            </div>
            <div className="field">
              <label>Package (numeric, for sorting)</label>
              <input type="number" value={form.packageNumeric} onChange={e => set('packageNumeric', e.target.value)}
                placeholder="e.g. 6.5" step="0.1" min="0" />
            </div>
          </div>
        </div>

        {/* Eligibility */}
        <div className="card p" style={{ marginBottom: 16 }}>
          <div className="sec-head"><h3>Eligibility criteria</h3></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
            <div className="field">
              <label>Minimum 10th / 12th marks (%)</label>
              <input type="number" value={form.minPercentage} onChange={e => set('minPercentage', e.target.value)}
                placeholder="e.g. 60" min="0" max="100" />
            </div>
            <div className="field">
              <label>Minimum CGPA</label>
              <input type="number" value={form.minCgpa} onChange={e => set('minCgpa', e.target.value)}
                placeholder="e.g. 7.0" min="0" max="10" step="0.1" />
            </div>
          </div>

          <div style={{ marginTop: 6 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500,
              color: 'var(--ink-2)', marginBottom: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={allDepts} onChange={e => setAllDepts(e.target.checked)}
                style={{ width: 16, height: 16 }} />
              All branches eligible
            </label>
            {!allDepts && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {branches.map(b => (
                  <label key={b.code} style={{ display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500,
                    background: form.eligibleDepartments.includes(b.code) ? 'var(--indigo-soft)' : '#f3f4fa',
                    color: form.eligibleDepartments.includes(b.code) ? 'var(--indigo-d)' : 'var(--ink-2)',
                    border: `1.5px solid ${form.eligibleDepartments.includes(b.code) ? 'var(--indigo)' : 'transparent'}`,
                  }}>
                    <input type="checkbox" checked={form.eligibleDepartments.includes(b.code)}
                      onChange={() => toggleDept(b.code)} style={{ display: 'none' }} />
                    {form.eligibleDepartments.includes(b.code) && Icons.check} {b.code}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Drive details */}
        <div className="card p" style={{ marginBottom: 16 }}>
          <div className="sec-head"><h3>Drive details</h3></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 20px' }}>
            <div className="field">
              <label>Drive type</label>
              <select value={form.driveType} onChange={e => set('driveType', e.target.value)}>
                <option value="on-campus">On-campus</option>
                <option value="virtual">Virtual</option>
                <option value="off-campus">Off-campus</option>
              </select>
            </div>
            <div className="field">
              <label>Drive date</label>
              <input type="date" value={form.driveDate} onChange={e => set('driveDate', e.target.value)} />
            </div>
            <div className="field">
              <label>Application deadline</label>
              <input type="date" value={form.deadline} onChange={e => set('deadline', e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label>Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Role details, requirements, process..."
              style={{ width: '100%', minHeight: 100, padding: '10px 14px', border: '1.5px solid var(--line)',
                borderRadius: 10, fontSize: 14, fontFamily: 'inherit', lineHeight: 1.6, resize: 'vertical' }} />
          </div>
          <div className="field" style={{ maxWidth: 200 }}>
            <label>Status</label>
            <select value={form.status} onChange={e => set('status', e.target.value)}>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_MAP[s][1]}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" className="btn btn-ghost" onClick={onBack}>Cancel</button>
          <button type="submit" className="btn btn-pri" disabled={busy}>
            {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Create posting'}
          </button>
        </div>
      </form>
    </>
  )
}
