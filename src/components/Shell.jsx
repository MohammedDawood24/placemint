import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ROLE_THEME } from '../config/roles'
import { useSite } from '../contexts/SiteContext'
import { Icons, initials } from './Icons'

/* Dashboard screens per role */
import AdminDashboard from '../pages/admin/Dashboard'
import AdminStudents from '../pages/admin/Students'
import AdminJobs from '../pages/admin/Jobs'
import AdminReports from '../pages/admin/Reports'
import AdminSettings from '../pages/admin/Settings'
import AdminCoordinators from '../pages/admin/Coordinators'

import HodDashboard from '../pages/hod/Dashboard'
import HodApprovals from '../pages/hod/Approvals'

import CompanyDashboard from '../pages/company/Dashboard'
import CompanyJobs from '../pages/company/Jobs'
import CompanyPipeline from '../pages/company/Pipeline'

import StudentDashboard from '../pages/student/Dashboard'
import StudentJobs from '../pages/student/Jobs'
import StudentApplications from '../pages/student/Applications'
import StudentProfile from '../pages/student/Profile'

/* Stub for screens not yet built */
function Coming({ label }) {
  return (
    <div className="card p">
      <div style={{ textAlign: 'center', padding: '46px 20px', color: 'var(--muted)' }}>
        <div style={{ width: 54, height: 54, borderRadius: 14, background: 'var(--indigo-soft)',
          display: 'grid', placeItems: 'center', margin: '0 auto 14px', color: 'var(--indigo)' }}>{Icons.spark}</div>
        <b style={{ display: 'block', color: 'var(--ink)', fontSize: 15, marginBottom: 5 }}>{label}</b>
        This screen is mapped. We'll build it out in the next increment.
      </div>
    </div>
  )
}

/* Navigation structure per role */
const NAV = {
  admin: [
    { g: 'Overview', items: [{ k: 'dash', label: 'Dashboard', ic: Icons.grid }] },
    { g: 'Manage', items: [
      { k: 'users', label: 'Students', ic: Icons.cap },
      { k: 'coords', label: 'Coordinators', ic: Icons.users },
      { k: 'companies', label: 'Companies', ic: Icons.build },
      { k: 'jobs', label: 'Job postings', ic: Icons.brief },
    ]},
    { g: 'Insights', items: [
      { k: 'reports', label: 'Reports', ic: Icons.chart },
      { k: 'donations', label: 'Donations', ic: Icons.gift },
      { k: 'settings', label: 'Site settings', ic: Icons.gear },
    ]},
  ],
  hod: [
    { g: 'Overview', items: [{ k: 'dash', label: 'Dashboard', ic: Icons.grid }] },
    { g: 'Department', items: [
      { k: 'approvals', label: 'Approvals', ic: Icons.check },
      { k: 'students', label: 'Students', ic: Icons.cap },
      { k: 'activities', label: 'Activities', ic: Icons.cal },
      { k: 'reports', label: 'Reports', ic: Icons.chart },
    ]},
  ],
  coordinator: [
    { g: 'Overview', items: [{ k: 'dash', label: 'Dashboard', ic: Icons.grid }] },
    { g: 'Department', items: [
      { k: 'approvals', label: 'Pending list', ic: Icons.check },
      { k: 'students', label: 'Students', ic: Icons.cap },
      { k: 'activities', label: 'Activities', ic: Icons.cal },
    ]},
  ],
  company: [
    { g: 'Overview', items: [{ k: 'dash', label: 'Dashboard', ic: Icons.grid }] },
    { g: 'Recruiting', items: [
      { k: 'jobs', label: 'My job postings', ic: Icons.brief },
      { k: 'pipeline', label: 'Candidate status', ic: Icons.users },
      { k: 'profile', label: 'Company profile', ic: Icons.build },
    ]},
  ],
  student: [
    { g: 'Overview', items: [{ k: 'dash', label: 'Dashboard', ic: Icons.grid }] },
    { g: 'Placements', items: [
      { k: 'jobs', label: 'Open drives', ic: Icons.brief },
      { k: 'applications', label: 'My applications', ic: Icons.check },
      { k: 'profile', label: 'My profile', ic: Icons.cap },
    ]},
  ],
}

/* Screen router — maps role+key to component */
const SCREENS = {
  admin: {
    dash: AdminDashboard,
    users: AdminStudents,
    jobs: AdminJobs,
    reports: AdminReports,
    coords: AdminCoordinators,
    companies: () => <Coming label="Manage companies" />,
    donations: () => <Coming label="Donations" />,
    settings: AdminSettings,
  },
  hod: {
    dash: HodDashboard,
    approvals: HodApprovals,
    students: AdminStudents,
    activities: () => <Coming label="Activities" />,
    reports: AdminReports,
  },
  coordinator: {
    dash: HodDashboard,
    approvals: HodApprovals,
    students: AdminStudents,
    activities: () => <Coming label="Activities" />,
  },
  company: {
    dash: CompanyDashboard,
    jobs: CompanyJobs,
    pipeline: CompanyPipeline,
    profile: () => <Coming label="Company profile" />,
  },
  student: {
    dash: StudentDashboard,
    jobs: StudentJobs,
    applications: StudentApplications,
    profile: StudentProfile,
  },
}

export default function Shell() {
  const { userData, logout } = useAuth()
  const navigate = useNavigate()
  const role = userData?.role || 'student'
  const theme = ROLE_THEME[role] || ROLE_THEME.student
  const nav = NAV[role] || NAV.student
  const screens = SCREENS[role] || SCREENS.student
  const site = useSite()

  const [view, setView] = useState('dash')
  const Screen = screens[view] || (() => <Coming label="This section" />)

  let title = 'Dashboard'
  nav.forEach(g => g.items.forEach(it => { if (it.k === view) title = it.label }))

  const roleName = role === 'hod' ? 'HOD / Coordinator'
    : role === 'coordinator' ? 'Coordinator'
    : role.charAt(0).toUpperCase() + role.slice(1)

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  return (
    <div className="shell">
      <aside className="side">
        <div className="side-brand">
          <div className="brand-mark" style={{
            width: 36, height: 36, borderRadius: 10, fontSize: 15,
            background: `linear-gradient(145deg, ${theme.accent}, ${theme.accentDark})`
          }}>{ (site.siteName || 'P')[0] }</div>
          <div>
            <div className="bn">{site.siteName}</div>
            <div className="bs">{site.cellName}</div>
          </div>
        </div>

        {nav.map(group => (
          <div key={group.g}>
            <div className="nav-group">{group.g}</div>
            {group.items.map(it => (
              <button
                key={it.k}
                className={`nav-item ${view === it.k ? 'active' : ''}`}
                onClick={() => setView(it.k)}
              >
                {it.ic}{it.label}
                {it.badge && <span className="badge-n">{it.badge}</span>}
              </button>
            ))}
          </div>
        ))}

        <div className="side-foot">
          <div className="usercard">
            <div className="av" style={{
              background: `linear-gradient(145deg, ${theme.accent}, ${theme.accentDark})`
            }}>{initials(userData?.displayName || 'U')}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <b>{userData?.displayName || 'User'}</b>
              <span>{roleName}{userData?.department ? ` · ${userData.department}` : ''}</span>
            </div>
          </div>
          <button className="nav-item" onClick={handleLogout} style={{ marginTop: 4 }}>
            {Icons.out}Sign out
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div>
            <div className="crumb">{roleName} panel</div>
            <h1>{title}</h1>
          </div>
          <div className="search">{Icons.search}<input placeholder="Search students, companies…" /></div>
          <button className="icon-btn">{Icons.bell}<span className="dot" /></button>
        </header>
        <div className="content">
          <Screen />
        </div>
      </div>
    </div>
  )
}
