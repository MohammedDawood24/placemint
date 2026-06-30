import { useState, useMemo } from 'react'
import { useCollection } from '../../hooks/useFirestore'
import { Icons, initials } from '../../components/Icons'
import { useSite } from '../../contexts/SiteContext'
import { formatPackage, toLPA } from '../../utils/formatPackage'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'

const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: 6 }, (_, i) => `${currentYear - i}-${(currentYear - i + 1).toString().slice(2)}`)

export default function AdminReports() {
  const { branches } = useSite()
  const { data: students } = useCollection('students', [], [])
  const { data: users } = useCollection('users', [], [])
  const { data: jobs } = useCollection('jobs', [], [])
  const { data: applications } = useCollection('applications', [], [])

  const [year, setYear] = useState(YEARS[0])
  const [dept, setDept] = useState('')

  const userMap = {}
  users.forEach(u => { userMap[u.id] = u })

  // Filter by year (based on application/placement date) + department
  const filtered = useMemo(() => {
    const [startY] = year.split('-').map(Number)
    const startDate = new Date(startY, 0, 1)
    const endDate = new Date(startY + 1, 0, 1)

    const yearApps = applications.filter(a => {
      const ts = a.appliedAt?.seconds ? new Date(a.appliedAt.seconds * 1000) : null
      return ts && ts >= startDate && ts < endDate
    })

    const placedStudentIds = new Set(
      yearApps.filter(a => a.stage >= 6).map(a => a.studentId)
    )

    let yearStudents = students.filter(s => {
      if (dept && (s.department || '').toUpperCase() !== dept.toUpperCase()) return false
      return true
    })

    const placedStudents = yearStudents.filter(s => placedStudentIds.has(s.id))

    return { yearApps, yearStudents, placedStudents, placedStudentIds }
  }, [students, applications, year, dept])

  const { yearApps, yearStudents, placedStudents, placedStudentIds } = filtered

  // Stats
  const packages = placedStudents.map(s => toLPA(s.package)).filter(p => p > 0)
  const highestPkg = packages.length > 0 ? Math.max(...packages) : 0
  const avgPkg = packages.length > 0 ? (packages.reduce((a, b) => a + b, 0) / packages.length).toFixed(1) : 0
  const lowestPkg = packages.length > 0 ? Math.min(...packages) : 0
  const medianPkg = packages.length > 0 ? packages.sort((a, b) => a - b)[Math.floor(packages.length / 2)] : 0

  // Dept breakdown
  const deptStats = useMemo(() => {
    const branchList = dept ? branches.filter(b => b.code.toUpperCase() === dept.toUpperCase()) : branches
    return branchList.map(b => {
      const dStudents = yearStudents.filter(s => (s.department || '').toUpperCase() === b.code.toUpperCase())
      const dPlaced = dStudents.filter(s => placedStudentIds.has(s.id))
      const dPkgs = dPlaced.map(s => toLPA(s.package)).filter(p => p > 0)
      return {
        code: b.code, name: b.name,
        total: dStudents.length, placed: dPlaced.length,
        rate: dStudents.length > 0 ? ((dPlaced.length / dStudents.length) * 100).toFixed(1) : '0',
        highest: dPkgs.length > 0 ? Math.max(...dPkgs) : 0,
        avg: dPkgs.length > 0 ? (dPkgs.reduce((a, b) => a + b, 0) / dPkgs.length).toFixed(1) : 0,
      }
    }).sort((a, b) => b.placed - a.placed)
  }, [yearStudents, placedStudentIds, branches, dept])

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

  // Package distribution
  const pkgRanges = useMemo(() => {
    const ranges = [
      { label: '< 3 LPA', min: 0, max: 3, count: 0 },
      { label: '3-5 LPA', min: 3, max: 5, count: 0 },
      { label: '5-8 LPA', min: 5, max: 8, count: 0 },
      { label: '8-12 LPA', min: 8, max: 12, count: 0 },
      { label: '12-20 LPA', min: 12, max: 20, count: 0 },
      { label: '20+ LPA', min: 20, max: Infinity, count: 0 },
    ]
    packages.forEach(p => {
      const r = ranges.find(r => p >= r.min && p < r.max)
      if (r) r.count++
    })
    return ranges
  }, [packages])
  const maxPkgCount = Math.max(...pkgRanges.map(r => r.count), 1)

  // Export
  function handleExport() {
    const rows = placedStudents.map(s => ({
      Name: userMap[s.id]?.displayName || '—',
      USN: s.usn || '', Department: s.department || '',
      CGPA: s.cgpa ?? '', '10th': s.tenthMarks ?? '', '12th': s.twelfthMarks ?? '',
      'Placed At': s.placedAt || '', 'Package (LPA)': toLPA(s.package) || '',
      Email: userMap[s.id]?.email || '', Phone: userMap[s.id]?.phone || '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Placements')
    XLSX.writeFile(wb, `Placement_Report_${year}${dept ? '_' + dept : ''}.xlsx`)
    toast.success(`Exported ${rows.length} records`)
  }

  const placementRate = yearStudents.length > 0
    ? ((placedStudents.length / yearStudents.length) * 100).toFixed(1) : '0'

  return (
    <>
      {/* Filters */}
      <div className="card p" style={{ marginBottom: 16 }}>
        <div className="sec-head" style={{ marginBottom: 14 }}>
          <div>
            <h3>Placement Reports</h3>
            <div className="sub">Year-wise analytics with department breakdown</div>
          </div>
          <button className="btn btn-pri" onClick={handleExport}>{Icons.dl} Export Excel</button>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <select value={year} onChange={e => setYear(e.target.value)}
            style={{ padding: '8px 14px', borderRadius: 10, border: '1.5px solid var(--line)',
              fontSize: 13, fontFamily: 'inherit', fontWeight: 600 }}>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={dept} onChange={e => setDept(e.target.value)}
            style={{ padding: '8px 14px', borderRadius: 10, border: '1.5px solid var(--line)',
              fontSize: 13, fontFamily: 'inherit' }}>
            <option value="">All departments</option>
            {branches.map(b => <option key={b.code} value={b.code}>{b.code} — {b.name}</option>)}
          </select>
        </div>
      </div>

      {/* Key metrics */}
      <div className="cards-row c4" style={{ marginBottom: 16 }}>
        {[
          [Icons.cap, '#4C5BD4', '#EEF0FF', placedStudents.length, 'Students placed', `${placementRate}% rate`],
          [Icons.spark, '#15A86B', '#E2F6EE', highestPkg > 0 ? `₹${highestPkg}L` : '—', 'Highest package', lowestPkg > 0 ? `Lowest ₹${lowestPkg}L` : null],
          [Icons.chart, '#E0A43B', '#FBF1DD', avgPkg > 0 ? `₹${avgPkg}L` : '—', 'Average package', medianPkg > 0 ? `Median ₹${medianPkg}L` : null],
          [Icons.build, '#C2185B', '#FCE4EC', companyStats.length, 'Companies hired', `${yearApps.length} applications`],
        ].map(([ic, color, soft, v, l, trend], i) => (
          <div className="card stat" key={i}>
            <div className="ic" style={{ background: soft, color }}>{ic}</div>
            <div className="v">{v}</div>
            <div className="l">{l}</div>
            {trend && <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', marginTop: 5 }}>{trend}</div>}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Department table */}
        <div className="card p">
          <div className="sec-head"><h3>Department-wise placements</h3></div>
          {deptStats.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No data</div>
          ) : (
            <table className="tbl">
              <thead><tr><th>Department</th><th>Students</th><th>Placed</th><th>Rate</th><th>Highest</th><th>Avg</th></tr></thead>
              <tbody>
                {deptStats.map(d => (
                  <tr key={d.code}>
                    <td><b style={{ fontWeight: 600 }}>{d.code}</b>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{d.name}</div></td>
                    <td className="mono">{d.total}</td>
                    <td className="mono" style={{ color: d.placed > 0 ? 'var(--green)' : 'var(--muted)' }}>{d.placed}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 50, height: 6, borderRadius: 6, background: '#eef0f5', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${d.rate}%`, borderRadius: 6,
                            background: parseFloat(d.rate) > 50 ? 'var(--green)' : parseFloat(d.rate) > 25 ? 'var(--gold)' : 'var(--rose)' }} />
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{d.rate}%</span>
                      </div>
                    </td>
                    <td className="mono">{d.highest > 0 ? `₹${d.highest}L` : '—'}</td>
                    <td className="mono">{d.avg > 0 ? `₹${d.avg}L` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Package distribution */}
        <div className="card p">
          <div className="sec-head"><h3>Package distribution</h3></div>
          {packages.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No placement data</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pkgRanges.map(r => (
                <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, color: 'var(--muted)', width: 70, textAlign: 'right' }}>{r.label}</span>
                  <div style={{ flex: 1, height: 24, borderRadius: 6, background: '#eef0f5', overflow: 'hidden', position: 'relative' }}>
                    <div style={{ height: '100%', width: `${(r.count / maxPkgCount) * 100}%`,
                      background: 'linear-gradient(90deg, var(--indigo), #6a78e0)', borderRadius: 6,
                      minWidth: r.count > 0 ? 24 : 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                      paddingRight: 8 }}>
                      {r.count > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{r.count}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Top companies */}
        <div className="card p">
          <div className="sec-head"><h3>Top recruiting companies</h3></div>
          {companyStats.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No placements</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {companyStats.slice(0, 8).map((c, i) => (
                <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', background: i === 0 ? 'var(--gold-soft)' : '#fafbff',
                  borderRadius: 8, border: '1px solid var(--line)' }}>
                  <span style={{ width: 24, height: 24, borderRadius: 6,
                    background: i === 0 ? 'var(--gold)' : '#4C5BD4', display: 'grid', placeItems: 'center',
                    fontWeight: 700, color: '#fff', fontSize: 11 }}>{i + 1}</span>
                  <div style={{ flex: 1 }}>
                    <b style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</b>
                    {c.pkg > 0 && <div style={{ fontSize: 11, color: 'var(--muted)' }}>₹{c.pkg} LPA</div>}
                  </div>
                  <span className="badge b-green" style={{ fontSize: 11 }}>{c.placed} placed</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Placed students list */}
        <div className="card p">
          <div className="sec-head">
            <h3>Placed students</h3>
            <div className="sub">{placedStudents.length} student{placedStudents.length !== 1 ? 's' : ''}</div>
          </div>
          {placedStudents.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No placements for this period</div>
          ) : (
            <div style={{ maxHeight: 350, overflowY: 'auto' }}>
              <table className="tbl">
                <thead><tr><th>Student</th><th>Dept</th><th>Company</th><th>Package</th></tr></thead>
                <tbody>
                  {placedStudents.map(s => (
                    <tr key={s.id}>
                      <td><div className="cell-u"><div className="av-sm">{initials(userMap[s.id]?.displayName || '?')}</div>
                        <b>{userMap[s.id]?.displayName || '—'}</b></div></td>
                      <td>{s.department || '—'}</td>
                      <td>{s.placedAt || '—'}</td>
                      <td className="mono">{formatPackage(s.package)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
