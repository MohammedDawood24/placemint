import { useState, useEffect } from 'react'
import { collection, query, where, getCountFromServer } from 'firebase/firestore'
import { db } from '../../config/firebase'
import { Icons } from '../../components/Icons'

function Stat({ ic, color, soft, v, l }) {
  return (
    <div className="card stat">
      <div className="ic" style={{ background: soft, color }}>{ic}</div>
      <div className="v">{v}</div>
      <div className="l">{l}</div>
    </div>
  )
}

export default function AdminReports() {
  const [stats, setStats] = useState({ placed: 0, companies: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      try {
        const [p, c] = await Promise.all([
          getCountFromServer(query(collection(db, 'students'), where('placementStatus', '==', 'placed'))),
          getCountFromServer(collection(db, 'companies')),
        ])
        setStats({ placed: p.data().count, companies: c.data().count })
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    fetch()
  }, [])

  return (
    <div className="card p">
      <div className="sec-head">
        <div>
          <h3>Placement reports</h3>
          <div className="sub">Current year · filter past years coming soon</div>
        </div>
        <div style={{ display: 'flex', gap: 9 }}>
          <button className="btn btn-ghost">{Icons.cal} 2024–25</button>
          <button className="btn btn-pri">{Icons.dl} Download Excel</button>
        </div>
      </div>
      <div className="cards-row c3" style={{ marginBottom: 0 }}>
        <Stat ic={Icons.cap} color="#4C5BD4" soft="#EEF0FF"
          v={loading ? '…' : stats.placed.toString()} l="Total placements" />
        <Stat ic={Icons.spark} color="#E0A43B" soft="#FBF1DD" v="—" l="Average package" />
        <Stat ic={Icons.build} color="#15A86B" soft="#E2F6EE"
          v={loading ? '…' : stats.companies.toString()} l="Recruiters" />
      </div>
    </div>
  )
}
