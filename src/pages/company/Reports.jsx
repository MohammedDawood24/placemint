import { useState, useMemo } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useCollection, where } from '../../hooks/useFirestore'
import { Icons, initials } from '../../components/Icons'
import { formatPackage, toLPA } from '../../utils/formatPackage'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'

const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: 6 }, (_, i) => `${currentYear - i}-${(currentYear - i + 1).toString().slice(2)}`)
const STAGES = ['Applied', 'Shortlisted', 'Aptitude', 'Technical', 'HR', 'Offer', 'Placed']

export default function CompanyReports() {
  const { userData } = useAuth()
  const { data: jobs } = useCollection('jobs',
    [where('companyId', '==', userData?.id || 'x')], [userData?.id])
  const { data: allApps } = useCollection('applications', [], [])

  const [year, setYear] = useState(YEARS[0])

  const jobIds = new Set(jobs.map(j => j.id))
  const jobMap = {}
  jobs.forEach(j => { jobMap[j.id] = j })

  const filtered = useMemo(() => {
    const [startY] = year.split('-').map(Number)
    const startDate = new Date(startY, 0, 1)
    const endDate = new Date(startY + 1, 0, 1)

    return allApps.filter(a => {
      if (!jobIds.has(a.jobId)) return false
      const ts = a.appliedAt?.seconds ? new Date(a.appliedAt.seconds * 1000) : null
      return ts && ts >= startDate && ts < endDate
    })
  }, [allApps, jobIds, year])

  const active = filtered.filter(a => a.status === 'active')
  const placed = filtered.filter(a => a.stage >= 6)
  const rejected = filtered.filter(a => a.status === 'rejected')
  const conversionRate = filtered.length > 0 ? ((placed.length / filtered.length) * 100).toFixed(1) : '0'

  // Per-job breakdown
  const jobStats = useMemo(() => {
    return jobs.map(j => {
      const jApps = filtered.filter(a => a.jobId === j.id)
      return {
        role: j.role, package: j.package, packageNumeric: j.packageNumeric,
        applicants: jApps.length,
        placed: jApps.filter(a => a.stage >= 6).length,
        rejected: jApps.filter(a => a.status === 'rejected').length,
      }
    }).filter(j => j.applicants > 0).sort((a, b) => b.placed - a.placed)
  }, [jobs, filtered])

  // Dept breakdown
  const deptStats = useMemo(() => {
    const map = {}
    filtered.forEach(a => {
      const d = a.department || 'Unknown'
      if (!map[d]) map[d] = { dept: d, total: 0, placed: 0 }
      map[d].total++
      if (a.stage >= 6) map[d].placed++
    })
    return Object.values(map).sort((a, b) => b.total - a.total)
  }, [filtered])

  // Pipeline
  const stageCounts = STAGES.map((_, i) => active.filter(a => a.stage === i).length)

  function handleExport() {
    const rows = placed.map(a => {
      const job = jobMap[a.jobId]
      return {
        Student: a.studentName, USN: a.studentUsn || '', Department: a.department || '',
        CGPA: a.cgpa ?? '', Role: job?.role || '', Package: formatPackage(job?.packageNumeric),
      }
    })
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Hired')
    XLSX.writeFile(wb, `Hiring_Report_${year}.xlsx`)
    toast.success(`Exported ${rows.length} records`)
  }

  return (
    <>
      <div className="card p" style={{ marginBottom: 16 }}>
        <div className="sec-head" style={{ marginBottom: 14 }}>
          <div>
            <h3>Hiring Reports</h3>
            <div className="sub">Your campus recruitment analytics</div>
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
          [Icons.users, '#4C5BD4', '#EEF0FF', filtered.length, 'Total applicants'],
          [Icons.check, '#15A86B', '#E2F6EE', placed.length, 'Students hired', `${conversionRate}% conversion`],
          [Icons.spark, '#E0A43B', '#FBF1DD', rejected.length, 'Rejected'],
          [Icons.brief, '#C2185B', '#FCE4EC', jobStats.length, 'Active postings'],
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
          <div className="sec-head"><h3>Pipeline overview</h3></div>
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

        {/* By department */}
        <div className="card p">
          <div className="sec-head"><h3>By department</h3></div>
          {deptStats.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No data</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {deptStats.map(d => {
                const max = Math.max(...deptStats.map(x => x.total), 1)
                return (
                  <div key={d.dept} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <b style={{ fontSize: 12, width: 50, textAlign: 'right' }}>{d.dept}</b>
                    <div style={{ flex: 1, height: 20, borderRadius: 6, background: '#eef0f5', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(d.total / max) * 100}%`,
                        background: 'var(--indigo)', borderRadius: 6 }} />
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--muted)', minWidth: 60 }}>
                      {d.total} ({d.placed} hired)
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Per-job breakdown */}
      <div className="card p" style={{ marginBottom: 16 }}>
        <div className="sec-head"><h3>Per-posting breakdown</h3></div>
        {jobStats.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No postings with applications</div>
        ) : (
          <table className="tbl">
            <thead><tr><th>Role</th><th>Package</th><th>Applicants</th><th>Hired</th><th>Rejected</th><th>Conversion</th></tr></thead>
            <tbody>
              {jobStats.map((j, i) => (
                <tr key={i}>
                  <td><b style={{ fontWeight: 600 }}>{j.role}</b></td>
                  <td>{formatPackage(j.packageNumeric)}</td>
                  <td className="mono">{j.applicants}</td>
                  <td className="mono" style={{ color: j.placed > 0 ? 'var(--green)' : 'var(--muted)' }}>{j.placed}</td>
                  <td className="mono" style={{ color: j.rejected > 0 ? 'var(--rose)' : 'var(--muted)' }}>{j.rejected}</td>
                  <td className="mono">{j.applicants > 0 ? ((j.placed / j.applicants) * 100).toFixed(0) + '%' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Hired students */}
      <div className="card p">
        <div className="sec-head">
          <h3>Students hired</h3>
          <div className="sub">{placed.length} student{placed.length !== 1 ? 's' : ''} in {year}</div>
        </div>
        {placed.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No hires for {year}</div>
        ) : (
          <table className="tbl">
            <thead><tr><th>Student</th><th>USN</th><th>Dept</th><th>CGPA</th><th>Role</th></tr></thead>
            <tbody>
              {placed.map(a => {
                const job = jobMap[a.jobId]
                return (
                  <tr key={a.id}>
                    <td><div className="cell-u"><div className="av-sm">{initials(a.studentName)}</div>
                      <b>{a.studentName}</b></div></td>
                    <td className="mono" style={{ fontSize: 12 }}>{a.studentUsn || '—'}</td>
                    <td>{a.department || '—'}</td>
                    <td className="mono">{a.cgpa ?? '—'}</td>
                    <td>{job?.role || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
