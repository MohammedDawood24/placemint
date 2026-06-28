import { useState, useEffect, useMemo } from 'react'
import { collection, query, where, getCountFromServer } from 'firebase/firestore'
import { db } from '../../config/firebase'
import { useCollection, orderBy } from '../../hooks/useFirestore'
import { Icons, initials } from '../../components/Icons'
import { useSite } from '../../contexts/SiteContext'

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
  const { branches, siteName } = useSite()
  const { data: allUsers } = useCollection('users', [], [])
  const { data: students } = useCollection('students', [], [])
  const { data: companies } = useCollection('companies', [], [])
  const { data: jobs } = useCollection('jobs', [], [])
  const { data: applications } = useCollection('applications', [], [])

  // ─── Stats ───
  const totalStudents = allUsers.filter(u => u.role === 'student').length
  const approvedStudents = allUsers.filter(u => u.role === 'student' && (u.approved === true || u.approved === 'true')).length
  const pendingApprovals = allUsers.filter(u => u.role === 'student' && u.approved === false).length
  const placedStudents = students.filter(s => s.placementStatus === 'placed')
  const placementRate = approvedStudents > 0 ? ((placedStudents.length / approvedStudents) * 100).toFixed(1) : '0'
  const openJobs = jobs.filter(j => j.status === 'open').length
  const activeApps = applications.filter(a => a.status === 'active').length
  const totalHods = allUsers.filter(u => u.role === 'hod').length
  const totalCoords = allUsers.filter(u => u.role === 'coordinator').length

  // Highest package
  const packages = placedStudents.map(s => s.package).filter(p => p != null)
  const highestPkg = packages.length > 0 ? Math.max(...packages) : 0
  const avgPkg = packages.length > 0 ? (packages.reduce((a, b) => a + b, 0) / packages.length).toFixed(1) : 0

  // ─── Department breakdown ───
  const deptStats = useMemo(() => {
    return branches.map(b => {
      const deptStudents = students.filter(s =>
        (s.department || '').trim().toUpperCase() === b.code.toUpperCase())
      const placed = deptStudents.filter(s => s.placementStatus === 'placed')
      const pkgs = placed.map(s => s.package).filter(p => p != null)
      return {
        code: b.code, name: b.name,
        total: deptStudents.length, placed: placed.length,
        rate: deptStudents.length > 0 ? ((placed.length / deptStudents.length) * 100).toFixed(0) : '0',
        highest: pkgs.length > 0 ? Math.max(...pkgs) : 0,
      }
    }).sort((a, b) => b.placed - a.placed)
  }, [branches, students])

  // ─── Top companies ───
  const topCompanies = useMemo(() => {
    const map = {}
    applications.filter(a => a.stage >= 6).forEach(a => {
      const job = jobs.find(j => j.id === a.jobId)
      const name = job?.companyName || 'Unknown'
      if (!map[name]) map[name] = { name, placed: 0, pkg: job?.packageNumeric || 0 }
      map[name].placed++
    })
    return Object.values(map).sort((a, b) => b.placed - a.placed).slice(0, 5)
  }, [applications, jobs])

  // ─── Recent applications ───
  const recentApps = useMemo(() => {
    return [...applications]
      .sort((a, b) => (b.appliedAt?.seconds || 0) - (a.appliedAt?.seconds || 0))
      .slice(0, 8)
  }, [applications])

  // ─── Pending actions ───
  const pendingSemReviews = useMemo(() => {
    let count = 0
    students.forEach(s => {
      const sems = s.semesters || {}
      Object.values(sems).forEach(sem => {
        if (sem.verified === 'pending' || sem.verified === false) count++
      })
    })
    return count
  }, [students])

  const pendingMarksReview = students.filter(s =>
    (s.tenthVerified === 'pending') || (s.twelfthVerified === 'pending')
  ).length

  const STAGES = ['Applied', 'Shortlisted', 'Aptitude', 'Technical', 'HR', 'Offer', 'Placed']

  return (
    <>
      {/* Welcome */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif",
          margin: '0 0 4px' }}>Welcome back</h2>
        <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0 }}>
          Here's what's happening across {siteName || 'your placement portal'} today.
        </p>
      </div>

      {/* Key stats */}
      <div className="cards-row c4">
        <Stat ic={Icons.cap} color="#4C5BD4" soft="#EEF0FF"
          v={approvedStudents.toLocaleString()} l="Registered students"
          trend={pendingApprovals > 0 ? `${pendingApprovals} pending` : null} dir="up" />
        <Stat ic={Icons.check} color="#15A86B" soft="#E2F6EE"
          v={placedStudents.length.toLocaleString()} l="Students placed"
          trend={`${placementRate}% rate`} dir="up" />
        <Stat ic={Icons.build} color="#E0A43B" soft="#FBF1DD"
          v={companies.length.toLocaleString()} l="Companies"
          trend={`${openJobs} open drives`} dir="up" />
        <Stat ic={Icons.spark} color="#C2185B" soft="#FCE4EC"
          v={highestPkg > 0 ? `₹${highestPkg}L` : '—'} l="Highest package"
          trend={avgPkg > 0 ? `Avg ₹${avgPkg}L` : null} dir="up" />
      </div>

      {/* Pending actions */}
      {(pendingApprovals > 0 || pendingSemReviews > 0 || pendingMarksReview > 0) && (
        <div className="card p" style={{ marginBottom: 16 }}>
          <div className="sec-head"><h3>Pending actions</h3></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pendingApprovals > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                background: '#fffbf0', borderRadius: 10, border: '1px solid #f0dcae' }}>
                <span className="badge b-gold" style={{ fontSize: 16, padding: '4px 10px' }}>{pendingApprovals}</span>
                <div style={{ flex: 1 }}>
                  <b style={{ fontSize: 13.5, fontWeight: 600 }}>Student registrations awaiting approval</b>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>Go to Coordinators → Department to approve</div>
                </div>
              </div>
            )}
            {pendingMarksReview > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                background: '#f0f3ff', borderRadius: 10, border: '1px solid #cfd5ff' }}>
                <span className="badge b-indigo" style={{ fontSize: 16, padding: '4px 10px' }}>{pendingMarksReview}</span>
                <div style={{ flex: 1 }}>
                  <b style={{ fontSize: 13.5, fontWeight: 600 }}>10th/12th marks pending review</b>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>Open student details to approve/reject</div>
                </div>
              </div>
            )}
            {pendingSemReviews > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                background: '#f0f3ff', borderRadius: 10, border: '1px solid #cfd5ff' }}>
                <span className="badge b-indigo" style={{ fontSize: 16, padding: '4px 10px' }}>{pendingSemReviews}</span>
                <div style={{ flex: 1 }}>
                  <b style={{ fontSize: 13.5, fontWeight: 600 }}>Semester records pending review</b>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>Open student details → semester table</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Department-wise placements */}
        <div className="card p">
          <div className="sec-head">
            <div>
              <h3>Placements by department</h3>
              <div className="sub">Current year · {branches.length} branches</div>
            </div>
          </div>
          {deptStats.length === 0 ? (
            <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              Configure branches in Site Settings first.
            </div>
          ) : (
            <table className="tbl">
              <thead><tr><th>Department</th><th>Students</th><th>Placed</th><th>Rate</th><th>Highest</th></tr></thead>
              <tbody>
                {deptStats.map(d => (
                  <tr key={d.code}>
                    <td><b style={{ fontWeight: 600 }}>{d.code}</b></td>
                    <td className="mono">{d.total}</td>
                    <td className="mono" style={{ color: d.placed > 0 ? 'var(--green)' : 'var(--muted)' }}>{d.placed}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 50, height: 6, borderRadius: 6, background: '#eef0f5', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${d.rate}%`, borderRadius: 6,
                            background: parseInt(d.rate) > 50 ? 'var(--green)' : 'var(--gold)' }} />
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{d.rate}%</span>
                      </div>
                    </td>
                    <td className="mono">{d.highest > 0 ? `₹${d.highest}L` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Top recruiting companies */}
        <div className="card p">
          <div className="sec-head">
            <h3>Top recruiters</h3>
            <div className="sub">{topCompanies.length > 0 ? 'By students placed' : ''}</div>
          </div>
          {topCompanies.length === 0 ? (
            <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              No placements recorded yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {topCompanies.map((c, i) => (
                <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', background: i === 0 ? 'var(--gold-soft)' : '#fafbff',
                  borderRadius: 10, border: '1px solid var(--line)' }}>
                  <span style={{ width: 26, height: 26, borderRadius: 8,
                    background: i === 0 ? 'var(--gold)' : '#4C5BD4',
                    display: 'grid', placeItems: 'center', fontWeight: 700,
                    color: '#fff', fontSize: 12, flex: '0 0 auto' }}>{i + 1}</span>
                  <div style={{ flex: 1 }}>
                    <b style={{ fontSize: 13.5, fontWeight: 600 }}>{c.name}</b>
                    {c.pkg > 0 && <div style={{ fontSize: 11, color: 'var(--muted)' }}>₹{c.pkg} LPA</div>}
                  </div>
                  <span className="badge b-green" style={{ fontSize: 12 }}>{c.placed} placed</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Application pipeline overview */}
        <div className="card p">
          <div className="sec-head">
            <h3>Application pipeline</h3>
            <div className="sub">{activeApps} active across all drives</div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {STAGES.map((s, i) => {
              const count = applications.filter(a => a.stage === i && a.status === 'active').length
              return (
                <div key={s} style={{ flex: 1, textAlign: 'center', padding: '12px 4px',
                  background: count > 0 ? 'var(--indigo-soft)' : '#f8f9fc', borderRadius: 8 }}>
                  <div style={{ fontSize: 20, fontWeight: 700,
                    color: count > 0 ? 'var(--indigo-d)' : 'var(--muted)' }}>{count}</div>
                  <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 2 }}>{s}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent applications */}
        <div className="card p">
          <div className="sec-head">
            <h3>Recent applications</h3>
            <div className="sub">Latest activity</div>
          </div>
          {recentApps.length === 0 ? (
            <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              No applications yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {recentApps.map(a => {
                const job = jobs.find(j => j.id === a.jobId) || {}
                return (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 10px', borderRadius: 8, fontSize: 13 }}>
                    <div className="av-sm" style={{ width: 28, height: 28, fontSize: 10 }}>
                      {initials(a.studentName)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <b style={{ fontWeight: 600 }}>{a.studentName}</b>
                      <span style={{ color: 'var(--muted)', fontSize: 11 }}> → {job.companyName || '?'}</span>
                    </div>
                    <span className={`badge ${a.stage >= 6 ? 'b-green' : 'b-indigo'}`} style={{ fontSize: 10 }}>
                      {STAGES[a.stage] || 'Applied'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* System overview */}
      <div className="card p" style={{ marginTop: 16 }}>
        <div className="sec-head"><h3>System overview</h3></div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {[
            ['Total students', totalStudents, Icons.cap],
            ['Approved', approvedStudents, Icons.check],
            ['HODs', totalHods, Icons.users],
            ['Coordinators', totalCoords, Icons.users],
            ['Companies', companies.length, Icons.build],
            ['Job postings', jobs.length, Icons.brief],
            ['Open drives', openJobs, Icons.spark],
            ['Applications', applications.length, Icons.check],
            ['Branches', branches.length, Icons.grid],
          ].map(([l, v, ic]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
              background: '#f8f9fc', borderRadius: 8, fontSize: 13 }}>
              <span style={{ color: 'var(--muted)' }}>{ic}</span>
              <b style={{ fontWeight: 600 }}>{v}</b>
              <span style={{ color: 'var(--muted)' }}>{l}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
