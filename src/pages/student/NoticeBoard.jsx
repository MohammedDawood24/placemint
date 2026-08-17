import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useCollection, where, orderBy } from '../../hooks/useFirestore'
import Modal from '../../components/Modal'

export default function StudentNoticeBoard() {
  const { userData } = useAuth()
  const dept = userData?.department || ''
  const { data: notices, loading } = useCollection('notices',
    [where('department', '==', dept), orderBy('createdAt', 'desc')], [dept])
  const [viewNotice, setViewNotice] = useState(null)

  const now = new Date()
  const active = notices.filter(n => !n.expiresAt ||
    (n.expiresAt?.seconds ? n.expiresAt.seconds * 1000 > now.getTime() : new Date(n.expiresAt) > now))

  return (
    <>
      <div className="sec-head" style={{ marginBottom: 16 }}>
        <div>
          <h3>Notice Board</h3>
          <div className="sub">{dept} department · {active.length} active notice{active.length !== 1 ? 's' : ''}</div>
        </div>
      </div>

      {loading ? (
        <div className="loading-screen" style={{ minHeight: 200 }}><div className="spinner" /></div>
      ) : active.length === 0 ? (
        <div className="card p" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>📌</div>
          <b style={{ display: 'block', color: 'var(--ink)', fontSize: 15, marginBottom: 5 }}>No active notices</b>
          Check back later for announcements from your department.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {active.map(n => {
            const eventDate = n.eventDate?.seconds ? new Date(n.eventDate.seconds * 1000) : n.eventDate ? new Date(n.eventDate) : null
            return (
              <div className="card" key={n.id} style={{ overflow: 'hidden', cursor: 'pointer' }}
                onClick={() => setViewNotice(n)}>
                <div style={{ padding: '18px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 11, background: 'var(--indigo-soft)',
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
                        <span style={{ fontSize: 11 }}>By {n.createdByName || dept}</span>
                      </div>
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--indigo)' }}>View →</span>
                  </div>
                  {n.description && (
                    <div style={{ marginTop: 10, fontSize: 13, color: 'var(--muted)', lineHeight: 1.5,
                      maxHeight: 44, overflow: 'hidden' }}
                      dangerouslySetInnerHTML={{ __html: n.description }} />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {viewNotice && (
        <Modal title={viewNotice.title} onClose={() => setViewNotice(null)}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            {(() => {
              const d = viewNotice.eventDate?.seconds ? new Date(viewNotice.eventDate.seconds * 1000) : viewNotice.eventDate ? new Date(viewNotice.eventDate) : null
              return d && (
                <span className="chip">📅 {d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  {viewNotice.eventTime && ` · ${viewNotice.eventTime}`}</span>
              )
            })()}
            <span className="chip">📋 {dept} Department</span>
            <span className="chip">👤 {viewNotice.createdByName || '—'}</span>
          </div>
          {viewNotice.description && (
            <div style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--ink-2)' }}
              dangerouslySetInnerHTML={{ __html: viewNotice.description }} />
          )}
        </Modal>
      )}
    </>
  )
}
