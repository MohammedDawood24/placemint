import { useCollection, where, updateDocument } from '../../hooks/useFirestore'
import { useAuth } from '../../contexts/AuthContext'
import { Icons, initials } from '../../components/Icons'
import toast from 'react-hot-toast'

export default function HodApprovals() {
  const { userData } = useAuth()
  const dept = userData?.department || ''
  const isHod = userData?.role === 'hod' || userData?.role === 'admin'

  // Fetch unapproved students in this department
  const { data: pending, loading } = useCollection('users',
    dept
      ? [where('role', '==', 'student'), where('department', '==', dept), where('approved', '==', false)]
      : [where('role', '==', 'student'), where('approved', '==', false)],
    [dept]
  )

  async function handleApprove(userId) {
    try {
      await updateDocument('users', userId, { approved: true })
      toast.success('Student approved')
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
              <tr><th>Student</th><th>Email</th><th>Department</th><th></th></tr>
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
                  <td style={{ color: 'var(--muted)' }}>{u.email}</td>
                  <td>{u.department || '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    {isHod ? (
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost" onClick={() => handleDecline(u.id)}>Decline</button>
                        <button className="btn btn-pri" onClick={() => handleApprove(u.id)}>{Icons.check} Approve</button>
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
