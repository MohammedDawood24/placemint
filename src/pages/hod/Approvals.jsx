import { useState } from 'react'
import { useCollection, where, updateDocument } from '../../hooks/useFirestore'
import { useAuth } from '../../contexts/AuthContext'
import { Icons, initials } from '../../components/Icons'
import toast from 'react-hot-toast'

function formatPhone(phone) {
  if (!phone) return ''
  let cleaned = phone.replace(/[\s\-()]/g, '').replace(/^\+/, '')
  if (cleaned.startsWith('0')) cleaned = '91' + cleaned.slice(1)
  if (cleaned.length === 10) cleaned = '91' + cleaned
  return cleaned
}

export default function HodApprovals() {
  const { userData } = useAuth()
  const dept = userData?.department || ''
  const isHod = userData?.role === 'hod' || userData?.role === 'admin'

  const [approved, setApproved] = useState(null) // { name, email, phone } for WhatsApp

  const { data: pending, loading } = useCollection('users',
    dept
      ? [where('role', '==', 'student'), where('department', '==', dept), where('approved', '==', false)]
      : [where('role', '==', 'student'), where('approved', '==', false)],
    [dept]
  )

  async function handleApprove(user) {
    try {
      await updateDocument('users', user.id, { approved: true })
      toast.success(`${user.displayName || 'Student'} approved`)
      setApproved({ name: user.displayName, email: user.email, phone: user.phone })
    } catch (e) {
      toast.error('Failed to approve: ' + e.message)
    }
  }

  async function handleDecline(userId) {
    try {
      await updateDocument('users', userId, { approved: false, role: 'declined' })
      toast.success('Student declined')
    } catch (e) {
      toast.error('Failed to decline: ' + e.message)
    }
  }

  // WhatsApp approval notification
  if (approved) {
    const msg = `Hello ${approved.name},

Your *PlaceMint* account has been approved! 🎉

You can now sign in and start applying for placement drives.

🔗 Portal: placemint.com
📧 Email: ${approved.email}

If you've forgotten your password, use the reset option on the login page.

— Placement Cell`

    const waPhone = formatPhone(approved.phone)
    const waUrl = waPhone
      ? `https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`

    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
        <div className="card p" style={{ maxWidth: 480 }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--green-soft)',
              color: 'var(--green)', display: 'grid', placeItems: 'center', margin: '0 auto 14px',
              fontSize: 24 }}>{Icons.check}</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif",
              margin: '0 0 4px' }}>{approved.name} approved</h3>
            <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
              Notify them via WhatsApp that they can now sign in
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <a href={waUrl} target="_blank" rel="noreferrer"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                padding: '13px 16px', borderRadius: 11, background: '#25D366', color: '#fff',
                fontWeight: 600, fontSize: 14.5, fontFamily: "'Space Grotesk', sans-serif",
                textDecoration: 'none', cursor: 'pointer' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Notify via WhatsApp
            </a>
            <button className="btn btn-ghost" onClick={() => setApproved(null)}
              style={{ justifyContent: 'center' }}>
              Skip, back to approvals
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {!isHod && (
        <div className="notice" style={{ background: 'var(--indigo-soft)', borderColor: '#cfd5ff' }}>
          <span className="ic" style={{ color: 'var(--indigo)' }}>{Icons.users}</span>
          <div>
            <b style={{ color: 'var(--ink)' }}>Coordinator view</b>
            <p style={{ color: 'var(--indigo-d)' }}>
              You can see pending registrations but only HODs can approve. Flag any issues with your chairperson.
            </p>
          </div>
        </div>
      )}

      <div className="card p">
        <div className="sec-head">
          <div>
            <h3>Pending registrations</h3>
            <div className="sub">
              {loading ? 'Loading…' : `${pending.length} student${pending.length !== 1 ? 's' : ''} awaiting approval`}
            </div>
          </div>
        </div>

        {pending.length === 0 && !loading ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)' }}>
            <div style={{ width: 54, height: 54, borderRadius: 14, background: 'var(--green-soft)',
              display: 'grid', placeItems: 'center', margin: '0 auto 14px', color: 'var(--green)' }}>{Icons.check}</div>
            <b style={{ display: 'block', color: 'var(--ink)', fontSize: 15, marginBottom: 5 }}>All caught up</b>
            No pending registrations right now.
          </div>
        ) : (
          <table className="tbl">
            <thead>
              <tr><th>Student</th><th>Email</th><th>Phone</th><th>Department</th><th></th></tr>
            </thead>
            <tbody>
              {pending.map(u => (
                <tr key={u.id}>
                  <td>
                    <div className="cell-u">
                      <div className="av-sm">{initials(u.displayName)}</div>
                      <b>{u.displayName || '—'}</b>
                    </div>
                  </td>
                  <td style={{ color: 'var(--muted)', fontSize: 13 }}>{u.email}</td>
                  <td style={{ color: 'var(--muted)', fontSize: 13 }}>{u.phone || '—'}</td>
                  <td>{u.department || '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    {isHod ? (
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost" onClick={() => handleDecline(u.id)}>Decline</button>
                        <button className="btn btn-pri" onClick={() => handleApprove(u)}>{Icons.check} Approve</button>
                      </div>
                    ) : (
                      <span className="badge b-gold">Needs HOD</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
