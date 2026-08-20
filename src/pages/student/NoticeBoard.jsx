import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useDocument, useCollection, where } from '../../hooks/useFirestore'
import Modal from '../../components/Modal'

export default function StudentNoticeBoard() {
  const { userData } = useAuth()
  const { data: student } = useDocument('students', userData?.id)
  const dept = student?.department || userData?.department || ''
  const { data: notices, loading } = useCollection('notices',
    [where('department', '==', dept || 'x')], [dept])
  const [viewNotice, setViewNotice] = useState(null)

  const now = new Date()
  const active = notices.filter(n => !n.expiresAt ||
    (n.expiresAt?.seconds ? n.expiresAt.seconds * 1000 > now.getTime() : new Date(n.expiresAt) > now))
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))

  return (
    <>
      <div className="sec-head" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>📌</span>
          <div>
            <h3>Virtual Notice Board</h3>
            <div className="sub">{dept} department · {active.length} active notice{active.length !== 1 ? 's' : ''}</div>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--muted)' }}>Loading notices…</div>
      ) : active.length === 0 ? (
        <div className="card p" style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--muted)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📌</div>
          <b style={{ display: 'block', color: 'var(--ink)', fontSize: 16, marginBottom: 6 }}>No active notices</b>
          <p style={{ margin: 0, fontSize: 13 }}>Check back later for announcements from your department.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {active.map(n => {
            const eventDate = n.eventDate?.seconds ? new Date(n.eventDate.seconds * 1000) : n.eventDate ? new Date(n.eventDate) : null
            const expiresAt = n.expiresAt?.seconds ? new Date(n.expiresAt.seconds * 1000) : n.expiresAt ? new Date(n.expiresAt) : null
            const createdAt = n.createdAt?.seconds ? new Date(n.createdAt.seconds * 1000) : null
            return (
              <div className="card" key={n.id} style={{ overflow: 'hidden', cursor: 'pointer', transition: '.15s' }}
                onClick={() => setViewNotice(n)}
                onMouseOver={e => e.currentTarget.style.borderColor = 'var(--indigo)'}
                onMouseOut={e => e.currentTarget.style.borderColor = 'var(--line)'}>
                <div style={{ padding: '18px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                    {eventDate ? (
                      <div style={{ width: 52, height: 52, borderRadius: 12, background: 'var(--indigo-soft)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        flex: '0 0 auto' }}>
                        <b style={{ fontSize: 20, fontWeight: 700, color: 'var(--indigo-d)', lineHeight: 1 }}>
                          {eventDate.getDate()}</b>
                        <span style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600 }}>
                          {eventDate.toLocaleDateString('en', { month: 'short' })}</span>
                      </div>
                    ) : (
                      <div style={{ width: 52, height: 52, borderRadius: 12, background: 'var(--indigo-soft)',
                        display: 'grid', placeItems: 'center', fontSize: 24, flex: '0 0 auto' }}>📌</div>
                    )}
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 6px', color: 'var(--ink)' }}>{n.title}</h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, fontSize: 12 }}>
                        {eventDate && (
                          <span className="chip" style={{ fontSize: 11 }}>
                            📅 {eventDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            {n.eventTime && ` · ⏰ ${n.eventTime}`}
                          </span>
                        )}
                        {expiresAt && (
                          <span className="chip" style={{ fontSize: 11, background: 'var(--gold-soft)' }}>
                            Valid till {expiresAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                        <span className="chip" style={{ fontSize: 11 }}>👤 {n.createdByName || dept}</span>
                        {createdAt && (
                          <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                            Posted {createdAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                      </div>
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--indigo)', fontWeight: 600, whiteSpace: 'nowrap' }}>View →</span>
                  </div>
                  {n.description && (
                    <div style={{ marginTop: 12, fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.6,
                      maxHeight: 66, overflow: 'hidden' }}
                      dangerouslySetInnerHTML={{ __html: n.description }} />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Notice detail modal */}
      {viewNotice && (
        <Modal title={viewNotice.title} onClose={() => setViewNotice(null)}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {(() => {
              const d = viewNotice.eventDate?.seconds ? new Date(viewNotice.eventDate.seconds * 1000) : viewNotice.eventDate ? new Date(viewNotice.eventDate) : null
              return d && (
                <span className="chip" style={{ padding: '6px 12px' }}>
                  📅 {d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  {viewNotice.eventTime && ` · ⏰ ${viewNotice.eventTime}`}
                </span>
              )
            })()}
            <span className="chip" style={{ padding: '6px 12px' }}>📋 {dept} Department</span>
            <span className="chip" style={{ padding: '6px 12px' }}>👤 {viewNotice.createdByName || '—'}</span>
            {(() => {
              const exp = viewNotice.expiresAt?.seconds ? new Date(viewNotice.expiresAt.seconds * 1000) : null
              return exp && (
                <span className="chip" style={{ padding: '6px 12px', background: 'var(--gold-soft)' }}>
                  Valid till {exp.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              )
            })()}
          </div>
          {viewNotice.description ? (
            <div style={{ fontSize: 14.5, lineHeight: 1.8, color: 'var(--ink-2)' }}
              dangerouslySetInnerHTML={{ __html: viewNotice.description }} />
          ) : (
            <p style={{ color: 'var(--muted)', fontSize: 14 }}>No additional details provided.</p>
          )}
        </Modal>
      )}
    </>
  )
}
