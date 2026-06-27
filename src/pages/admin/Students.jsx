import { useCollection, where, orderBy } from '../../hooks/useFirestore'
import { Icons, initials } from '../../components/Icons'

const STATUS_MAP = {
  placed: ['b-green', 'Placed'],
  interview: ['b-indigo', 'In interview'],
  shortlisted: ['b-gold', 'Shortlisted'],
  applied: ['b-indigo', 'Applied'],
  eligible: ['b-grey', 'Eligible'],
  blocked: ['b-rose', 'Blocked'],
}

export default function AdminStudents() {
  const { data: students, loading } = useCollection('students', [orderBy('updatedAt', 'desc')], [])
  const { data: users } = useCollection('users', [where('role', '==', 'student')], [])

  // Merge user displayName into student record
  const userMap = {}
  users.forEach(u => { userMap[u.id] = u })

  const merged = students.map(s => ({
    ...s,
    displayName: userMap[s.id]?.displayName || '—',
    email: userMap[s.id]?.email || '',
  }))

  return (
    <div className="card p">
      <div className="sec-head">
        <div>
          <h3>All students</h3>
          <div className="sub">{loading ? 'Loading…' : `${merged.length} students in the system`}</div>
        </div>
        <div style={{ display: 'flex', gap: 9 }}>
          <button className="btn btn-ghost">{Icons.dl} Export Excel</button>
          <button className="btn btn-pri">{Icons.plus} Add student</button>
        </div>
      </div>

      {merged.length === 0 && !loading ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)' }}>
          <div style={{ width: 54, height: 54, borderRadius: 14, background: 'var(--indigo-soft)',
            display: 'grid', placeItems: 'center', margin: '0 auto 14px', color: 'var(--indigo)' }}>{Icons.cap}</div>
          <b style={{ display: 'block', color: 'var(--ink)', fontSize: 15, marginBottom: 5 }}>No students yet</b>
          Students will appear here after they register and get approved.
        </div>
      ) : (
        <table className="tbl">
          <thead>
            <tr>
              <th>Student</th>
              <th>Dept</th>
              <th>Sem</th>
              <th>CGPA</th>
              <th>10th / 12th</th>
              <th>Status</th>
              <th>Package</th>
            </tr>
          </thead>
          <tbody>
            {merged.map(s => {
              const [badge, label] = STATUS_MAP[s.placementStatus] || ['b-grey', s.placementStatus || '—']
              return (
                <tr key={s.id}>
                  <td>
                    <div className="cell-u">
                      <div className="av-sm">{initials(s.displayName)}</div>
                      <div>
                        <b>{s.displayName}</b>
                        <span className="mono">{s.usn || '—'}</span>
                      </div>
                    </div>
                  </td>
                  <td>{s.department || '—'}</td>
                  <td>{s.semester || '—'}</td>
                  <td><b className="mono">{s.cgpa ?? '—'}</b></td>
                  <td className="mono" style={{ color: 'var(--muted)' }}>
                    {s.tenthMarks ?? '—'}% · {s.twelfthMarks ?? '—'}%
                  </td>
                  <td><span className={`badge ${badge}`}>{label}</span></td>
                  <td className="mono">{s.package ? `₹${s.package}L` : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
