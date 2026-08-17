import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useCollection, where, orderBy, updateDocument } from '../hooks/useFirestore'
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
import AdminCompanies from '../pages/admin/Companies'

import HodDashboard from '../pages/hod/Dashboard'
import HodApprovals from '../pages/hod/Approvals'
import HodReports from '../pages/hod/Reports'

import CompanyDashboard from '../pages/company/Dashboard'
import CompanyJobs from '../pages/company/Jobs'
import CompanyPipeline from '../pages/company/Pipeline'
import CompanyProfile from '../pages/company/Profile'
import CompanyReports from '../pages/company/Reports'

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
      { k: 'reports', label: 'Reports', ic: Icons.chart },
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
    companies: AdminCompanies,
    donations: () => <Coming label="Donations" />,
    settings: AdminSettings,
  },
  hod: {
    dash: HodDashboard,
    approvals: HodApprovals,
    students: AdminStudents,
    activities: () => <Coming label="Activities" />,
    reports: HodReports,
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
    reports: CompanyReports,
    profile: CompanyProfile,
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
  const [mobileMenu, setMobileMenu] = useState(false)
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

  function handleNav(k) {
    setView(k)
    setMobileMenu(false)
  }

  return (
    <div className="shell">
      {/* Mobile overlay */}
      {mobileMenu && <div className="side-overlay" onClick={() => setMobileMenu(false)} />}

      <aside className={`side ${mobileMenu ? 'side-open' : ''}`}>
        <div className="side-brand">
          <div className="brand-mark" style={{
            width: 36, height: 36, borderRadius: 10, fontSize: 15,
            background: `linear-gradient(145deg, ${theme.accent}, ${theme.accentDark})`
          }}>{ (site.siteName || 'P')[0] }</div>
          <div>
            <div className="bn">{site.siteName}</div>
            <div className="bs">{site.cellName}</div>
          </div>
          <button className="side-close" onClick={() => setMobileMenu(false)}>×</button>
        </div>

        {nav.map(group => (
          <div key={group.g}>
            <div className="nav-group">{group.g}</div>
            {group.items.map(it => (
              <button
                key={it.k}
                className={`nav-item ${view === it.k ? 'active' : ''}`}
                onClick={() => handleNav(it.k)}
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
          <button className="menu-btn" onClick={() => setMobileMenu(true)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <div>
            <div className="crumb">{roleName} panel</div>
            <h1>{title}</h1>
          </div>
          <div className="search">{Icons.search}<input placeholder="Search students, companies…" /></div>
          <NotificationBell userEmail={userData?.email} role={role} />
        </header>
        <div className="content">
          <Screen onNavigate={handleNav} />
        </div>
      </div>
    </div>
  )
}

// ─── NOTIFICATION BELL ───
function NotificationBell({ userEmail, role }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Fetch notifications for this user's email
  const { data: allNotifs } = useCollection('emailQueue',
    [orderBy('createdAt', 'desc')], [])

  // Filter: show notifications addressed to this user, or admin sees all admin-category ones
  const notifications = allNotifs.filter(n => {
    if (n.to === userEmail) return true
    if (role === 'admin' && (n.category || '').startsWith('admin_')) return true
    return false
  }).slice(0, 30)

  const unreadCount = notifications.filter(n => !n.readBy?.includes(userEmail)).length

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  async function markRead(notif) {
    const readBy = notif.readBy || []
    if (!readBy.includes(userEmail)) {
      await updateDocument('emailQueue', notif.id, { readBy: [...readBy, userEmail] })
    }
  }

  async function markAllRead() {
    const unread = notifications.filter(n => !n.readBy?.includes(userEmail))
    for (const n of unread) {
      await updateDocument('emailQueue', n.id, { readBy: [...(n.readBy || []), userEmail] })
    }
  }

  function timeAgo(ts) {
    if (!ts) return ''
    const s = ts.seconds ? ts.seconds * 1000 : ts
    const diff = Date.now() - s
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return `${Math.floor(diff / 86400000)}d ago`
  }

  // Extract clean subject (remove prefix)
  function cleanSubject(subj) {
    return (subj || '').replace(/^\[.*?\]\s*/, '')
  }

  // Category to icon
  const catIcons = {
    user_registered: '👤', user_approved: '✓', new_job_student: '📋',
    stage_update: '🔄', offer_received: '🎉', profile_review: '📝', placed: '🎓',
    company_new_applicant: '👤', company_offer_accepted: '✓', company_admin_approved: '✓', company_created: '🏢',
    dept_coordinator_assigned: '📋', dept_new_job: '📋', dept_student_placed: '🎓',
    admin_new_applicant: '👤', admin_offer_sent: '📋', admin_student_placed: '🎓',
    admin_new_job: '📋', admin_pending: '⚡', admin_weekly_digest: '📊',
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="icon-btn" onClick={() => setOpen(!open)}
        style={{ position: 'relative' }}>
        {Icons.bell}
        {unreadCount > 0 && (
          <span style={{ position: 'absolute', top: 2, right: 2, width: 18, height: 18,
            borderRadius: '50%', background: 'var(--rose)', color: '#fff', fontSize: 10,
            fontWeight: 700, display: 'grid', placeItems: 'center', border: '2px solid #fff' }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 8,
          width: 380, maxHeight: '70vh', background: '#fff', borderRadius: 14,
          boxShadow: '0 12px 40px rgba(14,22,51,.15)', border: '1px solid var(--line)',
          overflow: 'hidden', zIndex: 999 }}>
          {/* Header */}
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Notifications</h4>
            {unreadCount > 0 && (
              <button onClick={markAllRead}
                style={{ background: 'none', border: 'none', color: 'var(--indigo)', cursor: 'pointer',
                  fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>Mark all read</button>
            )}
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto', maxHeight: 'calc(70vh - 52px)' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🔔</div>
                No notifications yet
              </div>
            ) : (
              notifications.map(n => {
                const isRead = n.readBy?.includes(userEmail)
                return (
                  <div key={n.id}
                    onClick={() => { markRead(n) }}
                    style={{ padding: '12px 18px', borderBottom: '1px solid #f3f4f6',
                      cursor: 'pointer', transition: '.1s',
                      background: isRead ? '#fff' : '#f0f3ff' }}
                    onMouseOver={e => e.currentTarget.style.background = '#f8f9fc'}
                    onMouseOut={e => e.currentTarget.style.background = isRead ? '#fff' : '#f0f3ff'}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 18, flex: '0 0 auto', marginTop: 1 }}>
                        {catIcons[n.category] || '🔔'}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: isRead ? 500 : 700,
                          color: 'var(--ink)', lineHeight: 1.4 }}>
                          {cleanSubject(n.subject)}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                          <span style={{ fontSize: 11, color: 'var(--muted)' }}>{timeAgo(n.createdAt)}</span>
                          {n.status === 'sent' && (
                            <span style={{ fontSize: 10, color: 'var(--green)' }}>✓ emailed</span>
                          )}
                          {!isRead && (
                            <span style={{ width: 7, height: 7, borderRadius: '50%',
                              background: 'var(--indigo)', marginLeft: 'auto', flex: '0 0 auto' }} />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
