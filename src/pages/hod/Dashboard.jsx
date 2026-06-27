import { useState, useEffect } from 'react'
import { collection, query, where, getCountFromServer } from 'firebase/firestore'
import { db } from '../../config/firebase'
import { useAuth } from '../../contexts/AuthContext'
import { Icons } from '../../components/Icons'

function Stat({ ic, color, soft, v, l, trend, dir }) {
  return (
    <div className="card stat">
      <div className="ic" style={{ background: soft, color }}>{ic}</div>
      <div className="v">{v}</div>
      <div className="l">{l}</div>
      {trend && <div className={`trend ${dir}`}>{Icons.arrUp}{trend}</div>}
    </div>
  )
}

export default function HodDashboard() {
  const { userData } = useAuth()
  const dept = userData?.department || ''
  const [stats, setStats] = useState({ students: 0, placed: 0, pending: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!dept) { setLoading(false); return }
    async function fetch() {
      try {
        const [stuSnap, placedSnap, pendSnap] = await Promise.all([
          getCountFromServer(query(collection(db, 'students'), where('department', '==', dept))),
          getCountFromServer(query(collection(db, 'students'), where('department', '==', dept), where('placementStatus', '==', 'placed'))),
          getCountFromServer(query(collection(db, 'users'), where('role', '==', 'student'), where('department', '==', dept), where('approved', '==', false))),
        ])
        setStats({
          students: stuSnap.data().count,
          placed: placedSnap.data().count,
          pending: pendSnap.data().count,
        })
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    fetch()
  }, [dept])

  const rate = stats.students > 0 ? ((stats.placed / stats.students) * 100).toFixed(1) + '%' : '—'

  return (
    <>
      <div className="cards-row c4">
        <Stat ic={Icons.cap} color="#4C5BD4" soft="#EEF0FF"
          v={loading ? '…' : stats.students.toString()} l={`${dept} students`} />
        <Stat ic={Icons.check} color="#15A86B" soft="#E2F6EE"
          v={loading ? '…' : stats.placed.toString()} l="Placed this year" trend={`${rate} rate`} dir="up" />
        <Stat ic={Icons.users} color="#E0A43B" soft="#FBF1DD"
          v={loading ? '…' : stats.pending.toString()} l="Pending approvals" />
        <Stat ic={Icons.cal} color="#C2185B" soft="#FCE4EC" v="—" l="Activities held" />
      </div>

      {stats.pending > 0 && (
        <div className="notice">
          <span className="ic">{Icons.check}</span>
          <div>
            <b>{stats.pending} student{stats.pending > 1 ? 's' : ''} awaiting approval</b>
            <p>Go to the Approvals tab to review and approve new registrations.</p>
          </div>
        </div>
      )}
    </>
  )
}
