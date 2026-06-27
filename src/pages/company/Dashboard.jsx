import { useState, useEffect } from 'react'
import { collection, query, where, getCountFromServer } from 'firebase/firestore'
import { db } from '../../config/firebase'
import { useAuth } from '../../contexts/AuthContext'
import { useCollection } from '../../hooks/useFirestore'
import { Icons } from '../../components/Icons'

export default function CompanyDashboard() {
  const { userData } = useAuth()
  const { data: jobs } = useCollection('jobs',
    [where('companyId', '==', userData?.id || 'x')], [userData?.id])

  const openJobs = jobs.filter(j => j.status === 'open')

  return (
    <>
      <div className="cards-row c4">
        <div className="card stat">
          <div className="ic" style={{ background: '#EEF0FF', color: '#4C5BD4' }}>{Icons.brief}</div>
          <div className="v">{openJobs.length}</div>
          <div className="l">Active postings</div>
        </div>
        <div className="card stat">
          <div className="ic" style={{ background: '#FBF1DD', color: '#E0A43B' }}>{Icons.users}</div>
          <div className="v">—</div>
          <div className="l">Total applicants</div>
        </div>
        <div className="card stat">
          <div className="ic" style={{ background: '#E2F6EE', color: '#15A86B' }}>{Icons.check}</div>
          <div className="v">—</div>
          <div className="l">Shortlisted</div>
        </div>
        <div className="card stat">
          <div className="ic" style={{ background: '#FCE4EC', color: '#C2185B' }}>{Icons.cap}</div>
          <div className="v">—</div>
          <div className="l">Offers made</div>
        </div>
      </div>

      <div className="card p">
        <div className="sec-head">
          <div>
            <h3>Welcome, {userData?.displayName || 'Recruiter'}</h3>
            <div className="sub">Create job postings and manage your campus hiring pipeline</div>
          </div>
        </div>
        {openJobs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--muted)' }}>
            <b style={{ display: 'block', color: 'var(--ink)', fontSize: 15, marginBottom: 5 }}>No active postings</b>
            Go to "My job postings" to create your first campus drive.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {openJobs.map(j => (
              <div key={j.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: 14,
                background: '#fafbff', borderRadius: 11, border: '1px solid var(--line)'
              }}>
                <div className="job-logo" style={{ background: '#4C5BD4', width: 38, height: 38 }}>
                  {(j.role || '?')[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <b style={{ fontSize: 14, fontWeight: 600 }}>{j.role}</b>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>₹ {j.package}</div>
                </div>
                <span className="badge b-green">Open</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
