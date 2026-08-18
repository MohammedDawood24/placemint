import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useCollection, where, addDocument, updateDocument, deleteDocument } from '../../hooks/useFirestore'
import { Icons } from '../../components/Icons'
import RichEditor from '../../components/RichEditor'
import toast from 'react-hot-toast'

export default function NoticeBoard() {
  const { userData } = useAuth()
  const dept = userData?.department || ''
  const { data: notices, loading } = useCollection('notices',
    [where('department', '==', dept)], [dept])

  const [view, setView] = useState('list') // list | create | edit
  const [editNotice, setEditNotice] = useState(null)

  const now = new Date()
  const active = notices.filter(n => !n.expiresAt || (n.expiresAt.seconds ? new Date(n.expiresAt.seconds * 1000) > now : new Date(n.expiresAt) > now))
  const expired = notices.filter(n => n.expiresAt && (n.expiresAt.seconds ? new Date(n.expiresAt.seconds * 1000) <= now : new Date(n.expiresAt) <= now))

  if (view === 'create' || (view === 'edit' && editNotice)) {
    return <NoticeForm notice={editNotice} dept={dept} userName={userData?.displayName}
      onBack={() => { setView('list'); setEditNotice(null) }}
      onSaved={() => { setView('list'); setEditNotice(null); toast.success(editNotice ? 'Notice updated' : 'Notice published') }} />
  }

  return (
    <>
      <div className="card p" style={{ marginBottom: 16 }}>
        <div className="sec-head">
          <div>
            <h3>Virtual Notice Board — {dept}</h3>
            <div className="sub">{loading ? 'Loading…' : `${active.length} active · ${expired.length} expired`}</div>
          </div>
          <button className="btn btn-pri" onClick={() => { setView('create'); setEditNotice(null) }}>
            {Icons.plus} Add notice
          </button>
        </div>
      </div>

      {active.length === 0 && !loading ? (
        <div className="card p" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📌</div>
          <b style={{ display: 'block', color: 'var(--ink)', fontSize: 15, marginBottom: 5 }}>No active notices</b>
          Post a notice to inform students about events, deadlines, or announcements.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {active.map(n => (
            <NoticeCard key={n.id} notice={n} onEdit={() => { setEditNotice(n); setView('edit') }}
              onDelete={async () => {
                if (!confirm(`Delete "${n.title}"?`)) return
                await deleteDocument('notices', n.id); toast.success('Deleted')
              }} />
          ))}
        </div>
      )}

      {expired.length > 0 && (
        <>
          <div className="sec-head" style={{ marginTop: 24 }}>
            <h3 style={{ color: 'var(--muted)' }}>Expired ({expired.length})</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {expired.map(n => (
              <NoticeCard key={n.id} notice={n} expired onEdit={() => { setEditNotice(n); setView('edit') }}
                onDelete={async () => {
                  if (!confirm(`Delete "${n.title}"?`)) return
                  await deleteDocument('notices', n.id); toast.success('Deleted')
                }} />
            ))}
          </div>
        </>
      )}
    </>
  )
}

export function NoticeCard({ notice: n, expired, onEdit, onDelete }) {
  const eventDate = n.eventDate?.seconds ? new Date(n.eventDate.seconds * 1000) : n.eventDate ? new Date(n.eventDate) : null
  const expiresAt = n.expiresAt?.seconds ? new Date(n.expiresAt.seconds * 1000) : n.expiresAt ? new Date(n.expiresAt) : null

  return (
    <div className="card" style={{ overflow: 'hidden', opacity: expired ? 0.5 : 1 }}>
      <div style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 11,
            background: expired ? '#eee' : 'var(--indigo-soft)',
            display: 'grid', placeItems: 'center', fontSize: 20, flex: '0 0 auto' }}>📌</div>
          <div style={{ flex: 1 }}>
            <h4 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px' }}>{n.title}</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 12, color: 'var(--muted)' }}>
              {eventDate && (
                <span className="chip" style={{ fontSize: 11 }}>
                  📅 {eventDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {n.eventTime && ` · ${n.eventTime}`}
                </span>
              )}
              {expiresAt && (
                <span className="chip" style={{ fontSize: 11, background: expired ? 'var(--rose-soft)' : 'var(--gold-soft)' }}>
                  {expired ? '⏰ Expired' : `Valid till ${expiresAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                </span>
              )}
              <span style={{ fontSize: 11 }}>By {n.createdByName || '—'}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-ghost" onClick={onEdit} style={{ padding: '4px 10px', fontSize: 11 }}>Edit</button>
            <button onClick={onDelete} style={{ background: 'none', border: 'none', color: 'var(--rose)',
              cursor: 'pointer', fontSize: 16, padding: '2px 6px' }}>×</button>
          </div>
        </div>
        {n.description && (
          <div style={{ marginTop: 12, fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.6 }}
            dangerouslySetInnerHTML={{ __html: n.description }} />
        )}
      </div>
    </div>
  )
}

function NoticeForm({ notice, dept, userName, onBack, onSaved }) {
  const isEdit = !!notice
  const [form, setForm] = useState({
    title: notice?.title || '',
    description: notice?.description || '',
    eventDate: notice?.eventDate?.seconds
      ? new Date(notice.eventDate.seconds * 1000).toISOString().slice(0, 10) : notice?.eventDate || '',
    eventTime: notice?.eventTime || '',
    expiresAt: notice?.expiresAt?.seconds
      ? new Date(notice.expiresAt.seconds * 1000).toISOString().slice(0, 10) : notice?.expiresAt || '',
  })
  const [busy, setBusy] = useState(false)
  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.title.trim()) return toast.error('Title is required')
    setBusy(true)
    try {
      const data = {
        title: form.title.trim(),
        description: form.description,
        department: dept,
        eventDate: form.eventDate ? new Date(form.eventDate) : null,
        eventTime: form.eventTime || null,
        expiresAt: form.expiresAt ? new Date(form.expiresAt + 'T23:59:59') : null,
        createdByName: userName || '',
      }
      if (isEdit) {
        await updateDocument('notices', notice.id, data)
      } else {
        await addDocument('notices', { ...data, createdBy: '', active: true })
      }
      onSaved()
    } catch (e) { toast.error(e.message) }
    finally { setBusy(false) }
  }

  return (
    <>
      <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: 16 }}>← Back to notice board</button>
      <form onSubmit={handleSave}>
        <div className="card p" style={{ maxWidth: 680 }}>
          <div className="sec-head"><h3>{isEdit ? 'Edit notice' : 'Post a new notice'}</h3></div>

          <div className="field">
            <label>Title *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="e.g. Placement orientation session" />
          </div>

          <div className="field">
            <label>Description</label>
            <RichEditor value={form.description} onChange={v => set('description', v)}
              placeholder="Details about the notice, event, or announcement..." />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 16px' }}>
            <div className="field">
              <label>Event date <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(optional)</span></label>
              <input type="date" value={form.eventDate} onChange={e => set('eventDate', e.target.value)} />
            </div>
            <div className="field">
              <label>Event time <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(optional)</span></label>
              <input type="time" value={form.eventTime} onChange={e => set('eventTime', e.target.value)} />
            </div>
            <div className="field">
              <label>Show on board until</label>
              <input type="date" value={form.expiresAt} onChange={e => set('expiresAt', e.target.value)} />
            </div>
          </div>

          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14, padding: '8px 10px',
            background: '#f8f9fc', borderRadius: 8 }}>
            If no expiry date is set, the notice will stay on the board until manually removed.
            Students in <b>{dept}</b> will see this on their dashboard.
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="btn btn-ghost" onClick={onBack}>Cancel</button>
            <button type="submit" className="btn btn-pri" disabled={busy}>
              {busy ? 'Saving…' : isEdit ? 'Update notice' : '📌 Publish notice'}
            </button>
          </div>
        </div>
      </form>
    </>
  )
}
