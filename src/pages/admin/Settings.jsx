import { useState, useEffect } from 'react'
import { useDocument, updateDocument } from '../../hooks/useFirestore'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '../../config/firebase'
import { Icons } from '../../components/Icons'
import toast from 'react-hot-toast'

const TABS = [
  { k: 'owner', label: 'Owner info', ic: Icons.build },
  { k: 'branches', label: 'Branches', ic: Icons.cap },
  { k: 'privacy', label: 'Privacy policy', ic: Icons.lock },
  { k: 'terms', label: 'Terms & conditions', ic: Icons.check },
  { k: 'faqs', label: 'Manage FAQs', ic: Icons.spark },
]

export default function Settings() {
  const { data: settings, loading } = useDocument('settings', 'site')
  const [tab, setTab] = useState('owner')

  if (loading) {
    return <div className="loading-screen" style={{ minHeight: 200 }}><div className="spinner" /></div>
  }

  return (
    <>
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
        {TABS.map(t => (
          <button key={t.k}
            className={`btn ${tab === t.k ? 'btn-pri' : 'btn-ghost'}`}
            onClick={() => setTab(t.k)}
            style={{ fontSize: 13 }}>
            {t.ic} {t.label}
          </button>
        ))}
      </div>

      {tab === 'owner' && <OwnerInfo settings={settings} />}
      {tab === 'branches' && <BranchManager settings={settings} />}
      {tab === 'privacy' && <TextEditor field="privacyPolicy" label="Privacy Policy" settings={settings} />}
      {tab === 'terms' && <TextEditor field="termsAndConditions" label="Terms & Conditions" settings={settings} />}
      {tab === 'faqs' && <FaqManager settings={settings} />}
    </>
  )
}

// ─── Ensure settings doc exists ───
async function saveSetting(data) {
  await setDoc(doc(db, 'settings', 'site'), data, { merge: true })
}

// ─── OWNER INFO ───
function OwnerInfo({ settings }) {
  const info = settings?.ownerInfo || {}
  const [form, setForm] = useState({
    name: info.name || '',
    email: info.email || '',
    phone: info.phone || '',
    address: info.address || '',
    website: info.website || '',
    collegeName: info.collegeName || '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (settings?.ownerInfo) {
      const i = settings.ownerInfo
      setForm({
        name: i.name || '', email: i.email || '', phone: i.phone || '',
        address: i.address || '', website: i.website || '', collegeName: i.collegeName || '',
      })
    }
  }, [settings])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSave() {
    setSaving(true)
    try {
      await saveSetting({ ownerInfo: form })
      toast.success('Owner information saved')
    } catch (e) {
      toast.error('Save failed: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card p" style={{ maxWidth: 640 }}>
      <div className="sec-head">
        <div>
          <h3>Owner / Placement Cell Information</h3>
          <div className="sub">This information appears in the footer and contact sections</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
        <div className="field">
          <label>College / Institution name</label>
          <input value={form.collegeName} onChange={e => set('collegeName', e.target.value)}
            placeholder="e.g. SIT Shivamogga" />
        </div>
        <div className="field">
          <label>Placement cell name</label>
          <input value={form.name} onChange={e => set('name', e.target.value)}
            placeholder="e.g. Placement Cell" />
        </div>
        <div className="field">
          <label>Email</label>
          <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
            placeholder="placement@college.edu" />
        </div>
        <div className="field">
          <label>Phone</label>
          <input value={form.phone} onChange={e => set('phone', e.target.value)}
            placeholder="+91 88843 62160" />
        </div>
        <div className="field">
          <label>Website</label>
          <input value={form.website} onChange={e => set('website', e.target.value)}
            placeholder="https://college.edu" />
        </div>
        <div className="field">
          <label>Address</label>
          <input value={form.address} onChange={e => set('address', e.target.value)}
            placeholder="N.T Road, Shivamogga - 577201" />
        </div>
      </div>

      <button className="btn btn-pri" onClick={handleSave} disabled={saving} style={{ marginTop: 8 }}>
        {saving ? 'Saving…' : 'Save information'}
      </button>
    </div>
  )
}

// ─── TEXT EDITOR (Privacy Policy / Terms) ───
function TextEditor({ field, label, settings }) {
  const [text, setText] = useState(settings?.[field] || '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setText(settings?.[field] || '')
  }, [settings, field])

  async function handleSave() {
    setSaving(true)
    try {
      await saveSetting({ [field]: text })
      toast.success(`${label} saved`)
    } catch (e) {
      toast.error('Save failed: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0

  return (
    <div className="card p" style={{ maxWidth: 720 }}>
      <div className="sec-head">
        <div>
          <h3>{label}</h3>
          <div className="sub">Visible to all users on the platform</div>
        </div>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{wordCount} words</span>
      </div>

      <textarea value={text} onChange={e => setText(e.target.value)}
        placeholder={`Enter your ${label.toLowerCase()} here…`}
        style={{
          width: '100%', minHeight: 300, padding: '16px', border: '1.5px solid var(--line)',
          borderRadius: 10, fontSize: 14, fontFamily: 'inherit', lineHeight: 1.7,
          background: '#fbfbfe', resize: 'vertical',
        }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
        <button className="btn btn-pri" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : `Save ${label.toLowerCase()}`}
        </button>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>
          Supports plain text. Formatting options coming soon.
        </span>
      </div>
    </div>
  )
}

// ─── FAQ MANAGER ───
function FaqManager({ settings }) {
  const [faqs, setFaqs] = useState(settings?.faqs || [])
  const [editIdx, setEditIdx] = useState(null) // index being edited, or 'new'
  const [editForm, setEditForm] = useState({ question: '', answer: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setFaqs(settings?.faqs || [])
  }, [settings])

  function startAdd() {
    setEditForm({ question: '', answer: '' })
    setEditIdx('new')
  }

  function startEdit(idx) {
    setEditForm({ ...faqs[idx] })
    setEditIdx(idx)
  }

  function cancelEdit() {
    setEditIdx(null)
    setEditForm({ question: '', answer: '' })
  }

  async function handleSave() {
    if (!editForm.question.trim() || !editForm.answer.trim()) {
      return toast.error('Both question and answer are required')
    }
    setSaving(true)
    try {
      const updated = [...faqs]
      if (editIdx === 'new') {
        updated.push({ question: editForm.question.trim(), answer: editForm.answer.trim() })
      } else {
        updated[editIdx] = { question: editForm.question.trim(), answer: editForm.answer.trim() }
      }
      await saveSetting({ faqs: updated })
      setFaqs(updated)
      setEditIdx(null)
      setEditForm({ question: '', answer: '' })
      toast.success(editIdx === 'new' ? 'FAQ added' : 'FAQ updated')
    } catch (e) {
      toast.error('Save failed: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(idx) {
    if (!confirm('Delete this FAQ?')) return
    try {
      const updated = faqs.filter((_, i) => i !== idx)
      await saveSetting({ faqs: updated })
      setFaqs(updated)
      toast.success('FAQ deleted')
    } catch (e) {
      toast.error('Delete failed: ' + e.message)
    }
  }

  async function handleReorder(idx, dir) {
    const updated = [...faqs]
    const target = idx + dir
    if (target < 0 || target >= updated.length) return
    ;[updated[idx], updated[target]] = [updated[target], updated[idx]]
    try {
      await saveSetting({ faqs: updated })
      setFaqs(updated)
    } catch (e) {
      toast.error('Reorder failed')
    }
  }

  return (
    <div className="card p">
      <div className="sec-head">
        <div>
          <h3>Frequently Asked Questions</h3>
          <div className="sub">{faqs.length} FAQ{faqs.length !== 1 ? 's' : ''} · visible in the student portal</div>
        </div>
        <button className="btn btn-pri" onClick={startAdd}>{Icons.plus} Add FAQ</button>
      </div>

      {/* Add/Edit form */}
      {editIdx !== null && (
        <div style={{ background: 'var(--indigo-soft)', borderRadius: 12, padding: 18, marginBottom: 16,
          border: '1px solid #cfd5ff' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
            {editIdx === 'new' ? 'Add new FAQ' : `Editing FAQ #${editIdx + 1}`}
          </div>
          <div className="field">
            <label>Question</label>
            <input value={editForm.question}
              onChange={e => setEditForm(f => ({ ...f, question: e.target.value }))}
              placeholder="e.g. How do I register for a placement drive?" />
          </div>
          <div className="field">
            <label>Answer</label>
            <textarea value={editForm.answer}
              onChange={e => setEditForm(f => ({ ...f, answer: e.target.value }))}
              placeholder="Write the answer here…"
              style={{ width: '100%', minHeight: 80, padding: '10px 14px', border: '1.5px solid var(--line)',
                borderRadius: 10, fontSize: 14, fontFamily: 'inherit', lineHeight: 1.6,
                background: '#fff', resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" onClick={cancelEdit}>Cancel</button>
            <button className="btn btn-pri" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : editIdx === 'new' ? 'Add FAQ' : 'Save changes'}
            </button>
          </div>
        </div>
      )}

      {/* FAQ list */}
      {faqs.length === 0 && editIdx === null ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)' }}>
          <div style={{ width: 54, height: 54, borderRadius: 14, background: 'var(--indigo-soft)',
            display: 'grid', placeItems: 'center', margin: '0 auto 14px', color: 'var(--indigo)' }}>{Icons.spark}</div>
          <b style={{ display: 'block', color: 'var(--ink)', fontSize: 15, marginBottom: 5 }}>No FAQs yet</b>
          Add your first FAQ to help students find answers quickly.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {faqs.map((faq, idx) => (
            <div key={idx} style={{
              padding: '14px 16px', borderRadius: 11, border: '1px solid var(--line)',
              background: editIdx === idx ? 'var(--indigo-soft)' : '#fafbff',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600,
                  background: '#eef0f5', borderRadius: 6, padding: '2px 8px', marginTop: 1,
                  flex: '0 0 auto' }}>#{idx + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b style={{ fontSize: 14, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                    {faq.question}
                  </b>
                  <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.55, margin: 0,
                    whiteSpace: 'pre-wrap' }}>{faq.answer}</p>
                </div>
                <div style={{ display: 'flex', gap: 4, flex: '0 0 auto' }}>
                  <button onClick={() => handleReorder(idx, -1)} disabled={idx === 0}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)',
                      padding: '2px 4px', fontSize: 14, opacity: idx === 0 ? 0.3 : 1 }}>↑</button>
                  <button onClick={() => handleReorder(idx, 1)} disabled={idx === faqs.length - 1}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)',
                      padding: '2px 4px', fontSize: 14, opacity: idx === faqs.length - 1 ? 0.3 : 1 }}>↓</button>
                  <button className="btn btn-ghost" onClick={() => startEdit(idx)}
                    style={{ padding: '3px 8px', fontSize: 11 }}>Edit</button>
                  <button className="btn" onClick={() => handleDelete(idx)}
                    style={{ padding: '3px 8px', fontSize: 11, background: 'transparent',
                      border: '1px solid var(--line)', color: 'var(--rose)', cursor: 'pointer' }}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── BRANCH MANAGER ───
function BranchManager({ settings }) {
  const [branches, setBranches] = useState(settings?.branches || [])
  const [editIdx, setEditIdx] = useState(null)
  const [editForm, setEditForm] = useState({ code: '', name: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setBranches(settings?.branches || [])
  }, [settings])

  function startAdd() {
    setEditForm({ code: '', name: '' })
    setEditIdx('new')
  }

  function startEdit(idx) {
    setEditForm({ ...branches[idx] })
    setEditIdx(idx)
  }

  function cancelEdit() {
    setEditIdx(null)
    setEditForm({ code: '', name: '' })
  }

  async function handleSave() {
    const code = editForm.code.trim().toUpperCase()
    const name = editForm.name.trim()
    if (!code) return toast.error('Branch code is required')
    if (!name) return toast.error('Branch name is required')

    // Check duplicate code
    const isDup = branches.some((b, i) => b.code === code && i !== editIdx)
    if (isDup) return toast.error(`Branch code "${code}" already exists`)

    setSaving(true)
    try {
      const updated = [...branches]
      if (editIdx === 'new') {
        updated.push({ code, name })
      } else {
        updated[editIdx] = { code, name }
      }
      await saveSetting({ branches: updated })
      setBranches(updated)
      setEditIdx(null)
      setEditForm({ code: '', name: '' })
      toast.success(editIdx === 'new' ? 'Branch added' : 'Branch updated')
    } catch (e) {
      toast.error('Save failed: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(idx) {
    if (!confirm(`Delete branch "${branches[idx].code} — ${branches[idx].name}"?`)) return
    try {
      const updated = branches.filter((_, i) => i !== idx)
      await saveSetting({ branches: updated })
      setBranches(updated)
      toast.success('Branch deleted')
    } catch (e) {
      toast.error('Delete failed: ' + e.message)
    }
  }

  async function handleReorder(idx, dir) {
    const updated = [...branches]
    const target = idx + dir
    if (target < 0 || target >= updated.length) return
    ;[updated[idx], updated[target]] = [updated[target], updated[idx]]
    try {
      await saveSetting({ branches: updated })
      setBranches(updated)
    } catch (e) {
      toast.error('Reorder failed')
    }
  }

  return (
    <div className="card p">
      <div className="sec-head">
        <div>
          <h3>Branches / Departments</h3>
          <div className="sub">{branches.length} branch{branches.length !== 1 ? 'es' : ''} configured · used across all forms and filters</div>
        </div>
        <button className="btn btn-pri" onClick={startAdd}>{Icons.plus} Add branch</button>
      </div>

      {/* Add/Edit form */}
      {editIdx !== null && (
        <div style={{ background: 'var(--indigo-soft)', borderRadius: 12, padding: 18, marginBottom: 16,
          border: '1px solid #cfd5ff' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
            {editIdx === 'new' ? 'Add new branch' : `Editing ${branches[editIdx]?.code}`}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 14 }}>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Code</label>
              <input value={editForm.code}
                onChange={e => setEditForm(f => ({ ...f, code: e.target.value }))}
                placeholder="e.g. CSE" style={{ textTransform: 'uppercase' }} />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Full name</label>
              <input value={editForm.name}
                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Computer Science & Engineering" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn btn-ghost" onClick={cancelEdit}>Cancel</button>
            <button className="btn btn-pri" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : editIdx === 'new' ? 'Add branch' : 'Save changes'}
            </button>
          </div>
        </div>
      )}

      {/* Branch list */}
      {branches.length === 0 && editIdx === null ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)' }}>
          <div style={{ width: 54, height: 54, borderRadius: 14, background: 'var(--indigo-soft)',
            display: 'grid', placeItems: 'center', margin: '0 auto 14px', color: 'var(--indigo)' }}>{Icons.cap}</div>
          <b style={{ display: 'block', color: 'var(--ink)', fontSize: 15, marginBottom: 5 }}>No branches configured</b>
          Add your college's branches to use them in student registration, filters, and job postings.
        </div>
      ) : (
        <table className="tbl">
          <thead>
            <tr><th style={{ width: 50 }}>#</th><th style={{ width: 100 }}>Code</th><th>Full name</th><th style={{ width: 140 }}></th></tr>
          </thead>
          <tbody>
            {branches.map((b, idx) => (
              <tr key={idx}>
                <td style={{ color: 'var(--muted)' }}>{idx + 1}</td>
                <td><b className="mono" style={{ fontSize: 13, fontWeight: 700 }}>{b.code}</b></td>
                <td>{b.name}</td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                    <button onClick={() => handleReorder(idx, -1)} disabled={idx === 0}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)',
                        padding: '2px 4px', fontSize: 14, opacity: idx === 0 ? 0.3 : 1 }}>↑</button>
                    <button onClick={() => handleReorder(idx, 1)} disabled={idx === branches.length - 1}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)',
                        padding: '2px 4px', fontSize: 14, opacity: idx === branches.length - 1 ? 0.3 : 1 }}>↓</button>
                    <button className="btn btn-ghost" onClick={() => startEdit(idx)}
                      style={{ padding: '3px 8px', fontSize: 11 }}>Edit</button>
                    <button className="btn" onClick={() => handleDelete(idx)}
                      style={{ padding: '3px 8px', fontSize: 11, background: 'transparent',
                        border: '1px solid var(--line)', color: 'var(--rose)', cursor: 'pointer' }}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
