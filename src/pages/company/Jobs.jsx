import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useCollection, where, orderBy, addDocument, updateDocument } from '../../hooks/useFirestore'
import { useSite } from '../../contexts/SiteContext'
import { Icons } from '../../components/Icons'
import { formatPackage } from '../../utils/formatPackage'
import RichEditor from '../../components/RichEditor'
import CompanyJobDetail from '../../components/CompanyJobDetail'
import toast from 'react-hot-toast'

export default function CompanyJobs() {
  const { userData } = useAuth()
  const { branches } = useSite()
  const { data: jobs, loading } = useCollection('jobs',
    [where('companyId', '==', userData?.id || 'x'), orderBy('createdAt', 'desc')],
    [userData?.id])
  const { data: apps } = useCollection('applications', [], [])

  const [view, setView] = useState('list') // list | detail | create | edit
  const [selectedId, setSelectedId] = useState(null)
  const selected = selectedId ? jobs.find(j => j.id === selectedId) : null

  // App counts per job
  const appCounts = {}
  apps.forEach(a => { appCounts[a.jobId] = (appCounts[a.jobId] || 0) + 1 })

  if (view === 'detail' && selected) {
    return <CompanyJobDetail job={selected}
      onBack={() => { setView('list'); setSelectedId(null) }}
      onEdit={() => setView('edit')} />
  }

  if ((view === 'create' || view === 'edit') && (view === 'create' || selected)) {
    return <CompanyJobForm
      job={view === 'edit' ? selected : null}
      companyName={userData?.displayName || ''} companyId={userData?.id}
      branches={branches}
      onBack={() => setView(view === 'edit' && selected ? 'detail' : 'list')}
      onSaved={() => {
        toast.success(view === 'edit' ? 'Updated' : 'Created')
        setView(view === 'edit' && selected ? 'detail' : 'list')
      }} />
  }

  return (
    <>
      <div className="sec-head" style={{ marginBottom: 16 }}>
        <div>
          <h3>My Job Postings</h3>
          <div className="sub">{loading ? 'Loading…' : `${jobs.length} posting${jobs.length !== 1 ? 's' : ''}`}</div>
        </div>
        <button className="btn btn-pri" onClick={() => { setView('create'); setSelectedId(null) }}>
          {Icons.plus} Create posting
        </button>
      </div>

      {jobs.length === 0 && !loading ? (
        <div className="card p" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)' }}>
          <div style={{ width: 54, height: 54, borderRadius: 14, background: 'var(--indigo-soft)',
            display: 'grid', placeItems: 'center', margin: '0 auto 14px', color: 'var(--indigo)' }}>{Icons.brief}</div>
          <b style={{ display: 'block', color: 'var(--ink)', fontSize: 15, marginBottom: 5 }}>No postings yet</b>
          Create your first job posting to start receiving applications.
        </div>
      ) : (
        <div className="cards-row c2">
          {jobs.map(j => {
            const count = appCounts[j.id] || 0
            return (
              <div className="card" key={j.id} style={{ overflow: 'hidden' }}>
                <div style={{ padding: '18px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 2px' }}>{j.role}</h4>
                      <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                        {j.package ? formatPackage(j.packageNumeric || j.package) : '—'} · {j.driveType || 'On-campus'}
                        {j.driveDate?.seconds && ` · ${new Date(j.driveDate.seconds * 1000).toLocaleDateString()}`}
                      </div>
                    </div>
                    <span className={`badge ${j.status === 'open' ? 'b-green' : j.status === 'closed' ? 'b-gold' : 'b-grey'}`}>
                      {j.status || 'Draft'}</span>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                    {j.min10th && <span className="chip" style={{ fontSize: 11 }}>10th ≥ {j.min10th}%</span>}
                    {j.min12th && <span className="chip" style={{ fontSize: 11 }}>12th ≥ {j.min12th}%</span>}
                    {j.minCgpa && <span className="chip" style={{ fontSize: 11 }}>CGPA ≥ {j.minCgpa}</span>}
                    {(j.eligibleDepartments || []).length > 0 && (
                      <span className="chip" style={{ fontSize: 11 }}>{j.eligibleDepartments.join(', ')}</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--muted)' }}>
                    {Icons.users} <b style={{ color: 'var(--ink)' }}>{count}</b> applicant{count !== 1 ? 's' : ''}
                  </div>
                </div>

                <div style={{ display: 'flex', borderTop: '1px solid var(--line)' }}>
                  <button onClick={() => { setSelectedId(j.id); setView('detail') }}
                    style={{ flex: 1, padding: '11px', background: 'none', border: 'none', borderRight: '1px solid var(--line)',
                      cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--indigo)',
                      fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    {Icons.eye} View &amp; manage
                  </button>
                  <button onClick={() => { setSelectedId(j.id); setView('edit') }}
                    style={{ flex: 1, padding: '11px', background: 'none', border: 'none',
                      cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--muted)',
                      fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    {Icons.gear} Edit
                  </button>
                  {j.status === 'draft' && (
                    <button onClick={async () => {
                        await updateDocument('jobs', j.id, { status: 'open' }); toast.success('Published!')
                      }}
                      style={{ flex: 1, padding: '11px', background: 'none', border: 'none',
                        borderLeft: '1px solid var(--line)', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                        color: 'var(--green)', fontFamily: 'inherit', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', gap: 6 }}>
                      {Icons.check} Publish
                    </button>
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

// ─── JOB FORM ───
function CompanyJobForm({ job, companyName, companyId, branches, onBack, onSaved }) {
  const isEdit = !!job
  const [form, setForm] = useState({
    role: job?.role || '', package: job?.package || '',
    packageNumeric: job?.packageNumeric || '',
    min10th: job?.min10th || '', min12th: job?.min12th || '',
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
        ? f.eligibleDepartments.filter(d => d !== code) : [...f.eligibleDepartments, code]
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
            <div className="field"><label>Package (display)</label>
              <input value={form.package} onChange={e => set('package', e.target.value)} placeholder="6.5 LPA" /></div>
            <div className="field"><label>Package (numeric LPA)</label>
              <input type="number" value={form.packageNumeric} onChange={e => set('packageNumeric', e.target.value)}
                placeholder="6.5" step="0.1" /></div>
            <div className="field"><label>Drive type</label>
              <select value={form.driveType} onChange={e => set('driveType', e.target.value)}>
                <option value="on-campus">On-campus</option><option value="virtual">Virtual</option>
                <option value="off-campus">Off-campus</option>
              </select></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 20px' }}>
            <div className="field"><label>Min 10th %</label>
              <input type="number" value={form.min10th} onChange={e => set('min10th', e.target.value)} placeholder="60" /></div>
            <div className="field"><label>Min 12th %</label>
              <input type="number" value={form.min12th} onChange={e => set('min12th', e.target.value)} placeholder="60" /></div>
            <div className="field"><label>Min CGPA</label>
              <input type="number" value={form.minCgpa} onChange={e => set('minCgpa', e.target.value)} placeholder="7.0" step="0.1" /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
            <div className="field"><label>Drive date</label>
              <input type="date" value={form.driveDate} onChange={e => set('driveDate', e.target.value)} /></div>
            <div className="field"><label>Deadline</label>
              <input type="date" value={form.deadline} onChange={e => set('deadline', e.target.value)} /></div>
          </div>
          <div className="field"><label>Description</label>
            <RichEditor value={form.description} onChange={v => set('description', v)}
              placeholder="Role details, requirements..." /></div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500,
            marginBottom: 10, cursor: 'pointer' }}>
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
                    onChange={() => toggleDept(b.code)} style={{ display: 'none' }} />{b.code}</label>
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
