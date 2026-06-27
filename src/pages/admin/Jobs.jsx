import { useCollection, orderBy } from '../../hooks/useFirestore'
import { Icons } from '../../components/Icons'

export default function AdminJobs() {
  const { data: jobs, loading } = useCollection('jobs', [orderBy('createdAt', 'desc')], [])

  return (
    <>
      <div className="sec-head">
        <div>
          <h3>Job postings</h3>
          <div className="sub">{loading ? 'Loading…' : `${jobs.length} postings`}</div>
        </div>
        <button className="btn btn-pri">{Icons.plus} Create posting</button>
      </div>

      {jobs.length === 0 && !loading ? (
        <div className="card p" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)' }}>
          <div style={{ width: 54, height: 54, borderRadius: 14, background: 'var(--indigo-soft)',
            display: 'grid', placeItems: 'center', margin: '0 auto 14px', color: 'var(--indigo)' }}>{Icons.brief}</div>
          <b style={{ display: 'block', color: 'var(--ink)', fontSize: 15, marginBottom: 5 }}>No job postings yet</b>
          Create your first posting to start matching students with companies.
        </div>
      ) : (
        <div className="cards-row c3">
          {jobs.map(j => (
            <div className="card job" key={j.id}>
              <div className="job-top">
                <div className="job-logo" style={{ background: '#4C5BD4' }}>{(j.companyName || '?')[0]}</div>
                <div style={{ flex: 1 }}>
                  <h4>{j.role || 'Untitled role'}</h4>
                  <div className="co">{j.companyName || '—'}</div>
                </div>
                <span className={`badge ${j.status === 'open' ? 'b-green' : 'b-grey'}`}>
                  {j.status === 'open' ? 'Open' : j.status || 'Draft'}
                </span>
              </div>
              <div className="job-meta">
                {j.package && <span className="chip">₹ {j.package}</span>}
                {j.minPercentage && <span className="chip">Min {j.minPercentage}%</span>}
                {j.eligibleDepartments?.length > 0 && (
                  <span className="chip">{j.eligibleDepartments.join(' · ')}</span>
                )}
              </div>
              <div className="job-foot">
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                  {j.driveType || 'On-campus'}
                  {j.driveDate && ` · ${new Date(j.driveDate.seconds * 1000).toLocaleDateString()}`}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
