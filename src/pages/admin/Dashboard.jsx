import { useState, useEffect } from 'react'
import { collection, query, where, getCountFromServer } from 'firebase/firestore'
import { db } from '../../config/firebase'
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

export default function AdminDashboard() {
  const [stats, setStats] = useState({ students: 0, placed: 0, companies: 0, jobs: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const [stuSnap, placedSnap, compSnap, jobSnap] = await Promise.all([
          getCountFromServer(query(collection(db, 'users'), where('role', '==', 'student'))),
          getCountFromServer(query(collection(db, 'students'), where('placementStatus', '==', 'placed'))),
          getCountFromServer(collection(db, 'companies')),
          getCountFromServer(query(collection(db, 'jobs'), where('status', '==', 'open'))),
        ])
        setStats({
          students: stuSnap.data().count,
          placed: placedSnap.data().count,
          companies: compSnap.data().count,
          jobs: jobSnap.data().count,
        })
      } catch (err) {
        console.error('Stats fetch error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  const placementRate = stats.students > 0
    ? ((stats.placed / stats.students) * 100).toFixed(1) + '% rate'
    : '—'

  return (
    <>
      <div className="cards-row c4">
        <Stat ic={Icons.cap} color="#4C5BD4" soft="#EEF0FF"
          v={loading ? '…' : stats.students.toLocaleString()} l="Registered students" />
        <Stat ic={Icons.check} color="#15A86B" soft="#E2F6EE"
          v={loading ? '…' : stats.placed.toLocaleString()} l="Students placed"
          trend={placementRate} dir="up" />
        <Stat ic={Icons.build} color="#E0A43B" soft="#FBF1DD"
          v={loading ? '…' : stats.companies.toLocaleString()} l="Companies" />
        <Stat ic={Icons.brief} color="#C2185B" soft="#FCE4EC"
          v={loading ? '…' : stats.jobs.toLocaleString()} l="Open job postings" />
      </div>

      <div className="card p">
        <div className="sec-head">
          <div>
            <h3>Getting started</h3>
            <div className="sub">Follow these steps to set up your placement portal</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            ['Add departments & HODs', 'Create HOD accounts from Authentication → Add user, then add their role in Firestore', 'b-indigo'],
            ['Add companies', 'Companies can self-register or you can create their accounts', 'b-gold'],
            ['Create a job posting', 'Set eligibility criteria and students are auto-filtered', 'b-green'],
          ].map(([title, desc, badge]) => (
            <div key={title} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: 14,
              background: '#fafbff', borderRadius: 11, border: '1px solid var(--line)'
            }}>
              <span className={`badge ${badge}`}>•</span>
              <div>
                <b style={{ fontSize: 13.5, fontWeight: 600 }}>{title}</b>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
