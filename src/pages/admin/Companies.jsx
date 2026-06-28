import { useState, useMemo } from 'react'
import { useCollection, orderBy, updateDocument, deleteDocument } from '../../hooks/useFirestore'
import { Icons, initials } from '../../components/Icons'
import { useSite } from '../../contexts/SiteContext'
import WhatsAppShare from '../../components/WhatsAppShare'
import { createUserWithEmailAndPassword, signOut, getAuth } from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { initializeApp } from 'firebase/app'
import { db } from '../../config/firebase'
import { checkDuplicateUser } from '../../utils/checkDuplicate'
import toast from 'react-hot-toast'

let secondaryAuth = null
function getSecondaryAuth() {
  if (!secondaryAuth) {
    const config = JSON.parse(JSON.stringify(db.app.options))
    const secondaryApp = initializeApp(config, 'company-creator-' + Date.now())
    secondaryAuth = getAuth(secondaryApp)
  }
  return secondaryAuth
}

export default function AdminCompanies() {
  const { data: allUsers } = useCollection('users', [], [])
  const { data: companies, loading } = useCollection('companies', [orderBy('createdAt', 'desc')], [])
  const { data: jobs } = useCollection('jobs', [], [])
  const { data: applications } = useCollection('applications', [], [])

  const [view, setView] = useState('list')
  const [selectedId, setSelectedId] = useState(null)
  const [search, setSearch] = useState('')

  // Merge company + user data
  const userMap = {}
  allUsers.forEach(u => { if (u.role === 'company') userMap[u.id] = u })

  const merged = companies.map(c => ({
    ...c,
    email: userMap[c.userId]?.email || c.hrContact || '',
    phone: userMap[c.userId]?.phone || '',
    approved: userMap[c.userId]?.approved,
    jobCount: jobs.filter(j => j.companyId === c.id).length,
    placedCount: applications.filter(a => {
      const job = jobs.find(j => j.id === a.jobId)
      return job?.companyId === c.id && a.stage >= 6
    }).length,
  }))

  const filtered = useMemo(() => {
    if (!search) return merged
    const q = search.toLowerCase()
    return merged.filter(c =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.industry || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q)
    )
  }, [merged, search])

  const selected = selectedId ? merged.find(c => c.id === selectedId) : null

  if (view === 'create') {
    return <CompanyForm onBack={() => setView('list')}
      onCreated={data => setView('created-' + JSON.stringify(data))} />
  }
  if (view.startsWith('created-')) {
    const data = JSON.parse(view.replace('created-', ''))
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
        <WhatsAppShare name={data.name} email={data.email} password={data.password}
          phone={data.phone} role="company" onDone={() => setView('list')} />
      </div>
    )
  }
  if (view === 'detail' && selected) {
    return <CompanyDetail company={selected} jobs={jobs} applications={applications}
      onBack={() => { setView('list'); setSelectedId(null) }}
      onEdit={() => setView('edit')}
      onDelete={async () => {
        if (!confirm(`Delete ${selected.name}? This removes the company profile.`)) return
        try {
          await deleteDocument('companies', selected.id)
          if (selected.userId) await deleteDocument('users', selected.userId)
          toast.success('Company deleted')
          setView('list'); setSelectedId(null)
        } catch (e) { toast.error('Failed: ' + e.message) }
      }} />
  }
  if (view === 'edit' && selected) {
    return <CompanyEditForm company={selected}
      onBack={() => setView('detail')}
      onSaved={() => { setView('detail'); toast.success('Company updated') }} />
  }

  return (
    <>
      <div className="card p" style={{ marginBottom: 16 }}>
        <div className="sec-head" style={{ marginBottom: 14 }}>
          <div>
            <h3>Manage Companies</h3>
            <div className="sub">{loading ? 'Loading…' : `${filtered.length} compan${filtered.length !== 1 ? 'ies' : 'y'} registered`}</div>
          </div>
          <button className="btn btn-pri" onClick={() => setView('create')}>{Icons.plus} Add company</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8,
          background: '#fbfbfe', border: '1.5px solid var(--line)', borderRadius: 10, padding: '8px 12px' }}>
          {Icons.search}
          <input placeholder="Search by name, industry, email..." value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ border: 'none', outline: 'none', fontFamily: 'inherit', fontSize: 13,
              width: '100%', color: 'var(--ink)', background: 'transparent' }} />
        </div>
      </div>

      {filtered.length === 0 && !loading ? (
        <div className="card p" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)' }}>
          <div style={{ width: 54, height: 54, borderRadius: 14, background: 'var(--indigo-soft)',
            display: 'grid', placeItems: 'center', margin: '0 auto 14px', color: 'var(--indigo)' }}>{Icons.build}</div>
          <b style={{ display: 'block', color: 'var(--ink)', fontSize: 15, marginBottom: 5 }}>No companies yet</b>
          Add your first company to start creating placement drives.
        </div>
      ) : (
        <div className="cards-row c3">
          {filtered.map(c => (
            <div className="card" key={c.id} style={{ cursor: 'pointer', transition: '.15s', overflow: 'hidden' }}
              onClick={() => { setSelectedId(c.id); setView('detail') }}
              onMouseOver={e => e.currentTarget.style.borderColor = 'var(--indigo)'}
              onMouseOut={e => e.currentTarget.style.borderColor = ''}>
              <div style={{ padding: '16px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 11, background: c.logo || '#4C5BD4',
                    display: 'grid', placeItems: 'center', fontWeight: 700, color: '#fff', fontSize: 18,
                    flex: '0 0 auto' }}>{(c.name || '?')[0]}</div>
                  <div style={{ flex: 1 }}>
                    <b style={{ fontSize: 15, fontWeight: 600, display: 'block' }}>{c.name}</b>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>{c.industry || '—'}</span>
                  </div>
                  {c.approved === true || c.approved === 'true'
                    ? <span className="badge b-green" style={{ fontSize: 10 }}>{Icons.check} Active</span>
                    : <span className="badge b-gold" style={{ fontSize: 10 }}>Pending</span>}
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
                  <span style={{ color: 'var(--muted)' }}>
                    <b style={{ color: 'var(--ink)', fontWeight: 600 }}>{c.jobCount}</b> posting{c.jobCount !== 1 ? 's' : ''}
                  </span>
                  <span style={{ color: 'var(--muted)' }}>
                    <b style={{ color: 'var(--ink)', fontWeight: 600 }}>{c.placedCount}</b> placed
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

// ─── COMPANY DETAIL ───
function CompanyDetail({ company, jobs, applications, onBack, onEdit, onDelete }) {
  const c = company
  const companyJobs = jobs.filter(j => j.companyId === c.id)
  const companyApps = applications.filter(a => companyJobs.some(j => j.id === a.jobId))
  const placedApps = companyApps.filter(a => a.stage >= 6)

  async function toggleApproval() {
    const userId = c.userId
    if (!userId) return toast.error('No user account linked')
    const newVal = !(c.approved === true || c.approved === 'true')
    try {
      await updateDocument('users', userId, { approved: newVal })
      toast.success(newVal ? 'Company approved' : 'Company suspended')
    } catch (e) { toast.error('Failed: ' + e.message) }
  }

  return (
    <>
      <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: 16 }}>← Back to companies</button>

      {/* Header */}
      <div className="card p" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: c.logo || '#4C5BD4',
            display: 'grid', placeItems: 'center', fontWeight: 700, color: '#fff', fontSize: 26,
            flex: '0 0 auto' }}>{(c.name || '?')[0]}</div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif",
              margin: '0 0 2px' }}>{c.name}</h3>
            <div style={{ fontSize: 14, color: 'var(--muted)' }}>{c.industry || '—'}</div>
            {c.website && <a href={c.website.startsWith('http') ? c.website : 'https://' + c.website}
              target="_blank" rel="noreferrer" style={{ fontSize: 13, color: 'var(--indigo)' }}>{c.website}</a>}
          </div>
          <button className="btn btn-pri" onClick={onEdit}>{Icons.gear} Edit</button>
          <button className="btn" onClick={onDelete}
            style={{ background: 'transparent', border: '1.5px solid var(--rose)', color: 'var(--rose)',
              padding: '9px 15px', borderRadius: 10, fontSize: 13.5, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit' }}>Delete</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Info */}
        <div className="card p">
          <div className="sec-head"><h3>Company details</h3></div>
          {[['HR contact', c.hrContact], ['Email', c.email], ['Phone', c.phone],
            ['Industry', c.industry], ['Website', c.website],
          ].map(([l, v]) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0',
              borderBottom: '1px solid var(--line)', fontSize: 13 }}>
              <span style={{ color: 'var(--muted)' }}>{l}</span>
              <span style={{ fontWeight: 500 }}>{v || '—'}</span>
            </div>
          ))}
          {c.about && <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6, marginTop: 12 }}>{c.about}</p>}
        </div>

        {/* Stats + approval */}
        <div className="card p">
          <div className="sec-head"><h3>Status &amp; stats</h3></div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            {[['Job postings', c.jobCount], ['Applications', companyApps.length], ['Students placed', placedApps.length]].map(([l, v]) => (
              <div key={l} style={{ flex: 1, textAlign: 'center', padding: '12px 8px',
                background: '#f8f9fc', borderRadius: 10 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)' }}>{v}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
            background: '#fafbff', borderRadius: 10, border: '1px solid var(--line)' }}>
            <span style={{ fontSize: 13, flex: 1 }}>
              Account status: {c.approved === true || c.approved === 'true'
                ? <span className="badge b-green">{Icons.check} Active</span>
                : <span className="badge b-gold">Pending</span>}
            </span>
            <button className={`btn ${c.approved === true || c.approved === 'true' ? 'btn-ghost' : 'btn-pri'}`}
              onClick={toggleApproval} style={{ fontSize: 12, padding: '5px 12px' }}>
              {c.approved === true || c.approved === 'true' ? 'Suspend' : 'Approve'}
            </button>
          </div>
        </div>
      </div>

      {/* Job postings by this company */}
      <div className="card p">
        <div className="sec-head">
          <h3>Job postings</h3>
          <div className="sub">{companyJobs.length} posting{companyJobs.length !== 1 ? 's' : ''}</div>
        </div>
        {companyJobs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--muted)', fontSize: 13 }}>
            No job postings from this company yet.
          </div>
        ) : (
          <table className="tbl">
            <thead><tr><th>Role</th><th>Package</th><th>Status</th><th>Applicants</th><th>Placed</th></tr></thead>
            <tbody>
              {companyJobs.map(j => {
                const jApps = companyApps.filter(a => a.jobId === j.id)
                const jPlaced = jApps.filter(a => a.stage >= 6)
                return (
                  <tr key={j.id}>
                    <td><b style={{ fontWeight: 600 }}>{j.role}</b></td>
                    <td>{j.package || '—'}</td>
                    <td><span className={`badge ${j.status === 'open' ? 'b-green' : j.status === 'closed' ? 'b-gold' : 'b-grey'}`}>
                      {j.status || 'Draft'}</span></td>
                    <td className="mono">{jApps.length}</td>
                    <td className="mono">{jPlaced.length}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}

// ─── CREATE COMPANY ───
function CompanyForm({ onBack, onCreated }) {
  const [form, setForm] = useState({
    name: '', industry: '', website: '', hrContact: '', about: '',
    email: '', phone: '', password: 'Company@123', logo: '#4C5BD4',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  const COLORS = ['#4C5BD4', '#15A86B', '#E0A43B', '#E5575B', '#1565C0', '#7B1FA2', '#C2185B', '#0F4C81', '#00897B', '#F57C00']

  async function handleSave(e) {
    e.preventDefault()
    setError('')
    if (!form.name) return setError('Company name is required.')
    if (!form.email) return setError('Email is required.')

    setBusy(true)
    try {
      const dupError = await checkDuplicateUser(form.email, form.phone)
      if (dupError) { setError(dupError); setBusy(false); return }

      const secAuth = getSecondaryAuth()
      const cred = await createUserWithEmailAndPassword(secAuth, form.email, form.password)
      await signOut(secAuth)

      await setDoc(doc(db, 'users', cred.user.uid), {
        email: form.email, role: 'company', displayName: form.name,
        phone: form.phone, approved: true, createdAt: serverTimestamp(),
      })

      await setDoc(doc(db, 'companies', cred.user.uid), {
        name: form.name, industry: form.industry, website: form.website,
        logo: form.logo, hrContact: form.hrContact || form.email,
        about: form.about, userId: cred.user.uid,
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      })

      onCreated({ name: form.name, email: form.email, password: form.password, phone: form.phone })
    } catch (err) {
      setError(err.message?.includes('email-already-in-use') ? 'Email already registered.' : (err.message || 'Failed'))
    } finally { setBusy(false) }
  }

  return (
    <>
      <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: 16 }}>← Back to companies</button>
      <form onSubmit={handleSave}>
        <div className="card p" style={{ marginBottom: 16 }}>
          <div className="sec-head"><h3>Add new company</h3></div>
          {error && <div className="error-msg">{error}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
            <div className="field"><label>Company name *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Infosys" /></div>
            <div className="field"><label>Industry</label>
              <input value={form.industry} onChange={e => set('industry', e.target.value)} placeholder="e.g. IT Services" /></div>
            <div className="field"><label>Login email *</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="hr@company.com" /></div>
            <div className="field"><label>Phone</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 98765 43210" /></div>
            <div className="field"><label>HR contact email</label>
              <input value={form.hrContact} onChange={e => set('hrContact', e.target.value)} placeholder="campus.hr@company.com" /></div>
            <div className="field"><label>Website</label>
              <input value={form.website} onChange={e => set('website', e.target.value)} placeholder="company.com" /></div>
            <div className="field"><label>Default password</label>
              <input value={form.password} onChange={e => set('password', e.target.value)} /></div>
            <div className="field"><label>Brand color</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {COLORS.map(c => (
                  <button type="button" key={c} onClick={() => set('logo', c)}
                    style={{ width: 30, height: 30, borderRadius: 8, background: c, border: form.logo === c ? '3px solid var(--ink)' : '3px solid transparent',
                      cursor: 'pointer' }} />
                ))}
              </div>
            </div>
          </div>
          <div className="field"><label>About</label>
            <textarea value={form.about} onChange={e => set('about', e.target.value)}
              placeholder="Brief description of the company..."
              style={{ width: '100%', minHeight: 80, padding: '10px 14px', border: '1.5px solid var(--line)',
                borderRadius: 10, fontSize: 14, fontFamily: 'inherit', resize: 'vertical' }} /></div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="btn btn-ghost" onClick={onBack}>Cancel</button>
            <button type="submit" className="btn btn-pri" disabled={busy}>
              {busy ? 'Creating…' : 'Create company'}</button>
          </div>
        </div>
      </form>
    </>
  )
}

// ─── EDIT COMPANY ───
function CompanyEditForm({ company, onBack, onSaved }) {
  const [form, setForm] = useState({
    name: company.name || '', industry: company.industry || '',
    website: company.website || '', hrContact: company.hrContact || '',
    about: company.about || '', logo: company.logo || '#4C5BD4',
  })
  const [busy, setBusy] = useState(false)
  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }
  const COLORS = ['#4C5BD4', '#15A86B', '#E0A43B', '#E5575B', '#1565C0', '#7B1FA2', '#C2185B', '#0F4C81', '#00897B', '#F57C00']

  async function handleSave(e) {
    e.preventDefault()
    if (!form.name) return toast.error('Company name is required.')
    setBusy(true)
    try {
      await updateDocument('companies', company.id, {
        name: form.name, industry: form.industry, website: form.website,
        hrContact: form.hrContact, about: form.about, logo: form.logo,
      })
      if (company.userId) {
        await updateDocument('users', company.userId, { displayName: form.name })
      }
      onSaved()
    } catch (e) { toast.error(e.message) }
    finally { setBusy(false) }
  }

  return (
    <>
      <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: 16 }}>← Back to details</button>
      <form onSubmit={handleSave}>
        <div className="card p">
          <div className="sec-head"><h3>Edit company</h3></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
            <div className="field"><label>Company name *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} /></div>
            <div className="field"><label>Industry</label>
              <input value={form.industry} onChange={e => set('industry', e.target.value)} /></div>
            <div className="field"><label>HR contact</label>
              <input value={form.hrContact} onChange={e => set('hrContact', e.target.value)} /></div>
            <div className="field"><label>Website</label>
              <input value={form.website} onChange={e => set('website', e.target.value)} /></div>
          </div>
          <div className="field"><label>Brand color</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {COLORS.map(c => (
                <button type="button" key={c} onClick={() => set('logo', c)}
                  style={{ width: 30, height: 30, borderRadius: 8, background: c,
                    border: form.logo === c ? '3px solid var(--ink)' : '3px solid transparent', cursor: 'pointer' }} />
              ))}
            </div></div>
          <div className="field"><label>About</label>
            <textarea value={form.about} onChange={e => set('about', e.target.value)}
              style={{ width: '100%', minHeight: 80, padding: '10px 14px', border: '1.5px solid var(--line)',
                borderRadius: 10, fontSize: 14, fontFamily: 'inherit', resize: 'vertical' }} /></div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="btn btn-ghost" onClick={onBack}>Cancel</button>
            <button type="submit" className="btn btn-pri" disabled={busy}>
              {busy ? 'Saving…' : 'Save changes'}</button>
          </div>
        </div>
      </form>
    </>
  )
}
