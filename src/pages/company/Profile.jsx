import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useDocument, updateDocument } from '../../hooks/useFirestore'
import { Icons } from '../../components/Icons'
import toast from 'react-hot-toast'

export default function CompanyProfile() {
  const { userData } = useAuth()
  const { data: company, loading } = useDocument('companies', userData?.id)

  const [form, setForm] = useState({
    name: '', industry: '', website: '', hrContact: '', about: '', phone: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (company) {
      setForm({
        name: company.name || '', industry: company.industry || '',
        website: company.website || '', hrContact: company.hrContact || '',
        about: company.about || '', phone: userData?.phone || '',
      })
    }
  }, [company]) // eslint-disable-line

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSave() {
    if (!form.name) return toast.error('Company name is required.')
    setSaving(true)
    try {
      await updateDocument('companies', userData.id, {
        name: form.name, industry: form.industry, website: form.website,
        hrContact: form.hrContact, about: form.about,
      })
      await updateDocument('users', userData.id, {
        displayName: form.name, phone: form.phone,
      })
      toast.success('Profile updated')
    } catch (e) {
      toast.error('Save failed: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="loading-screen" style={{ minHeight: 200 }}><div className="spinner" /></div>
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr .8fr', gap: 16 }}>
      <div className="card p">
        <div className="sec-head">
          <div>
            <h3>Company Profile</h3>
            <div className="sub">This information is visible to students on every job posting</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
          <div className="field">
            <label>Company name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Your company name" />
          </div>
          <div className="field">
            <label>Industry</label>
            <input value={form.industry} onChange={e => set('industry', e.target.value)} placeholder="e.g. IT Services" />
          </div>
          <div className="field">
            <label>HR contact email</label>
            <input value={form.hrContact} onChange={e => set('hrContact', e.target.value)} placeholder="campus.hr@company.com" />
          </div>
          <div className="field">
            <label>Phone</label>
            <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 98765 43210" />
          </div>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label>Website</label>
            <input value={form.website} onChange={e => set('website', e.target.value)} placeholder="company.com" />
          </div>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label>About</label>
            <textarea value={form.about} onChange={e => set('about', e.target.value)}
              placeholder="Brief description of your company, culture, and what you look for in campus hires..."
              style={{ width: '100%', minHeight: 120, padding: '12px 14px', border: '1.5px solid var(--line)',
                borderRadius: 10, fontSize: 14, fontFamily: 'inherit', lineHeight: 1.6, resize: 'vertical' }} />
          </div>
        </div>

        <button className="btn btn-pri" onClick={handleSave} disabled={saving} style={{ marginTop: 6 }}>
          {saving ? 'Saving…' : 'Save profile'}
        </button>
      </div>

      {/* Preview card */}
      <div>
        <div className="card p">
          <div className="sec-head"><h3>Preview</h3></div>
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ width: 64, height: 64, borderRadius: 16,
              background: company?.logo || '#4C5BD4', display: 'grid', placeItems: 'center',
              fontWeight: 700, color: '#fff', fontSize: 26, margin: '0 auto 12px' }}>
              {(form.name || '?')[0]}
            </div>
            <b style={{ fontSize: 18, fontWeight: 700, display: 'block' }}>{form.name || 'Company Name'}</b>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{form.industry || 'Industry'}</div>
            {form.website && (
              <a href={form.website.startsWith('http') ? form.website : 'https://' + form.website}
                target="_blank" rel="noreferrer"
                style={{ fontSize: 13, color: 'var(--indigo)', display: 'block', marginTop: 6 }}>{form.website}</a>
            )}
          </div>
          {form.about && (
            <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6, borderTop: '1px solid var(--line)',
              paddingTop: 14, marginTop: 8 }}>{form.about}</p>
          )}
        </div>

        <div className="card p" style={{ marginTop: 12 }}>
          <div className="sec-head"><h3>Account</h3></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0',
            borderBottom: '1px solid var(--line)', fontSize: 13 }}>
            <span style={{ color: 'var(--muted)' }}>Login email</span>
            <span style={{ fontWeight: 500 }}>{userData?.email || '—'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', fontSize: 13 }}>
            <span style={{ color: 'var(--muted)' }}>Status</span>
            {userData?.approved ? <span className="badge b-green">{Icons.check} Active</span>
              : <span className="badge b-gold">Pending approval</span>}
          </div>
        </div>
      </div>
    </div>
  )
}
