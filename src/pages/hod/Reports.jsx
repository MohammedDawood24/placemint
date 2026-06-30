import { useState, useMemo } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useCollection } from '../../hooks/useFirestore'
import { Icons, initials } from '../../components/Icons'
import { formatPackage, toLPA } from '../../utils/formatPackage'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'

const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: 6 }, (_, i) => `${currentYear - i}-${(currentYear - i + 1).toString().slice(2)}`)
const STAGES = ['Applied', 'Shortlisted', 'Aptitude', 'Technical', 'HR', 'Offer', 'Placed']

export default function HodReports() {
  const { userData } = useAuth()
  const dept = userData?.department || ''
  const { data: students } = useCollection('students', [], [])
  const { data: users } = useCollection('users', [], [])
  const { data: jobs } = useCollection('jobs', [], [])
  const { data: applications } = useCollection('applications', [], [])

  const [year, setYear] = useState(YEARS[0])

  const userMap = {}
  users.forEach(u => { userMap[u.id] = u })

  const filtered = useMemo(() => {
    const [startY] = year.split('-').map(Number)
    const startDate = new Date(startY, 0, 1)
    const endDate = new Date(startY + 1, 0, 1)

    const deptStudents = students.filter(s =>
      (s.department || '').toUpperCase() === dept.toUpperCase())

    const yearApps = applications.filter(a => {
      const ts = a.appliedAt?.seconds ? new Date(a.appliedAt.seconds * 1000) : null
      if (!ts || ts < startDate || ts >= endDate) return false
      return (a.department || '').toUpperCase() === dept.toUpperCase()
    })

    const placedIds = new Set(yearApps.filter(a => a.stage >= 6).map(a => a.studentId))
    const placed = deptStudents.filter(s => placedIds.has(s.id))

    return { deptStudents, yearApps, placed, placedIds }
  }, [students, applications, year, dept])

  const { deptStudents, yearApps, placed } = filtered
  const packages = placed.map(s => toLPA(s.package)).filter(p => p > 0)
  const highestPkg = packages.length > 0 ? Math.max(...packages) : 0
  const avgPkg = packages.length > 0 ? (packages.reduce((a, b) => a + b, 0) / packages.length).toFixed(1) : 0
  const rate = deptStudents.length > 0 ? ((placed.length / deptStudents.length) * 100).toFixed(1) : '0'

  // Company breakdown
  const companyStats = useMemo(() => {
    const map = {}
    yearApps.filter(a => a.stage >= 6).forEach(a => {
      const job = jobs.find(j => j.id === a.jobId)
      const name = job?.companyName || 'Unknown'
      if (!map[name]) map[name] = { name, placed: 0, pkg: toLPA(job?.packageNumeric) }
      map[name].placed++
    })
    return Object.values(map).sort((a, b) => b.placed - a.placed)
  }, [yearApps, jobs])

  // Pipeline
  const stageCounts = STAGES.map((_, i) => yearApps.filter(a => a.stage === i && a.status === 'active').length)

  function handleExport() {
    const rows = placed.map(s => ({
      Name: userMap[s.id]?.displayName || '—', USN: s.usn || '',
      CGPA: s.cgpa ?? '', 'Placed At': s.placedAt || '',
      'Package (LPA)': toLPA(s.package) || '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, dept)
    XLSX.writeFile(wb, `${dept}_Placements_${year}.xlsx`)
    toast.success(`Exported ${rows.length} records`)
  }

  return (
    <>
      <div className="card p" style={{ marginBottom: 16 }}>
        <div className="sec-head" style={{ marginBottom: 14 }}>
          <div>
            <h3>{dept} Placement Report</h3>
            <div className="sub">Department-specific analytics</div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <select value={year} onChange={e => setYear(e.target.value)}
              style={{ padding: '8px 14px', borderRadius: 10, border: '1.5px solid var(--line)',
                fontSize: 13, fontFamily: 'inherit', fontWeight: 600 }}>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button className="btn btn-pri" onClick={handleExport}>{Icons.dl} Export</button>
          </div>
        </div>
      </div>

      <div className="cards-row c4" style={{ marginBottom: 16 }}>
        {[
          [Icons.cap, '#4C5BD4', '#EEF0FF', deptStudents.length, `${dept} students`],
          [Icons.check, '#15A86B', '#E2F6EE', placed.length, 'Placed', `${rate}% rate`],
          [Icons.spark, '#E0A43B', '#FBF1DD', highestPkg > 0 ? `₹${highestPkg}L` : '—', 'Highest package'],
          [Icons.chart, '#C2185B', '#FCE4EC', avgPkg > 0 ? `₹${avgPkg}L` : '—', 'Average package'],
        ].map(([ic, color, soft, v, l, trend], i) => (
          <div className="card stat" key={i}>
            <div className="ic" style={{ background: soft, color }}>{ic}</div>
            <div className="v">{v}</div>
            <div className="l">{l}</div>
            {trend && <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', marginTop: 5 }}>{trend}</div>}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Pipeline */}
        <div className="card p">
          <div className="sec-head"><h3>Application pipeline</h3></div>
          <div style={{ display: 'flex', gap: 4 }}>
            {STAGES.map((s, i) => (
              <div key={s} style={{ flex: 1, textAlign: 'center', padding: '12px 4px',
                background: stageCounts[i] > 0 ? 'var(--indigo-soft)' : '#f8f9fc', borderRadius: 8 }}>
                <div style={{ fontSize: 20, fontWeight: 700,
                  color: stageCounts[i] > 0 ? 'var(--indigo-d)' : 'var(--muted)' }}>{stageCounts[i]}</div>
                <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 2 }}>{s}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Companies */}
        <div className="card p">
          <div className="sec-head"><h3>Companies that hired</h3></div>
          {companyStats.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No placements</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {companyStats.map((c, i) => (
                <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', background: i === 0 ? 'var(--gold-soft)' : '#fafbff',
                  borderRadius: 8, border: '1px solid var(--line)' }}>
                  <span style={{ width: 22, height: 22, borderRadius: 6,
                    background: i === 0 ? 'var(--gold)' : '#4C5BD4', display: 'grid', placeItems: 'center',
                    fontWeight: 700, color: '#fff', fontSize: 10 }}>{i + 1}</span>
                  <b style={{ fontSize: 13, flex: 1 }}>{c.name}</b>
                  <span className="badge b-green" style={{ fontSize: 10 }}>{c.placed}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Placed students */}
      <div className="card p">
        <div className="sec-head">
          <h3>Placed students</h3>
          <div className="sub">{placed.length} student{placed.length !== 1 ? 's' : ''}</div>
        </div>
        {placed.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No placements for {year}</div>
        ) : (
          <table className="tbl">
            <thead><tr><th>Student</th><th>USN</th><th>CGPA</th><th>Company</th><th>Package</th></tr></thead>
            <tbody>
              {placed.map(s => (
                <tr key={s.id}>
                  <td><div className="cell-u"><div className="av-sm">{initials(userMap[s.id]?.displayName || '?')}</div>
                    <b>{userMap[s.id]?.displayName || '—'}</b></div></td>
                  <td className="mono" style={{ fontSize: 12 }}>{s.usn || '—'}</td>
                  <td className="mono">{s.cgpa ?? '—'}</td>
                  <td>{s.placedAt || '—'}</td>
                  <td className="mono">{formatPackage(s.package)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
