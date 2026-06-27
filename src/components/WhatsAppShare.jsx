import { useState } from 'react'
import { Icons } from './Icons'

/**
 * Formats phone number for WhatsApp API (removes spaces, dashes, leading 0)
 * Expects Indian numbers: +91XXXXXXXXXX or 91XXXXXXXXXX or 0XXXXXXXXXX
 */
function formatPhone(phone) {
  if (!phone) return ''
  let cleaned = phone.replace(/[\s\-()]/g, '')
  // Remove leading +
  cleaned = cleaned.replace(/^\+/, '')
  // If starts with 0, replace with 91
  if (cleaned.startsWith('0')) cleaned = '91' + cleaned.slice(1)
  // If no country code (10 digits), prepend 91
  if (cleaned.length === 10) cleaned = '91' + cleaned
  return cleaned
}

function buildMessage({ name, email, password, role, portalUrl }) {
  return `Hello ${name},

Your *PlaceMint* account has been created.

*Login details:*
🔗 Portal: ${portalUrl}
📧 Email: ${email}
🔑 Password: ${password}

Please change your password after your first login.

— Placement Cell`
}

/**
 * Shows login credentials with WhatsApp send + copy options.
 * 
 * Props:
 *   name, email, password, phone, role
 *   onDone — called when user clicks "Done"
 */
export default function WhatsAppShare({ name, email, password, phone, role, onDone }) {
  const [copied, setCopied] = useState(false)

  const portalUrl = role === 'company' ? 'placemint.com/company'
    : role === 'hod' || role === 'coordinator' ? 'placemint.com/department'
    : 'placemint.com'

  const message = buildMessage({ name, email, password, role, portalUrl })
  const waPhone = formatPhone(phone)
  const waUrl = waPhone
    ? `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`

  function handleCopy() {
    navigator.clipboard.writeText(
      `Login details for ${name}:\nEmail: ${email}\nPassword: ${password}\nPortal: ${portalUrl}`
    ).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="card p" style={{ maxWidth: 520 }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--green-soft)',
          color: 'var(--green)', display: 'grid', placeItems: 'center', margin: '0 auto 14px',
          fontSize: 24 }}>{Icons.check}</div>
        <h3 style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif",
          margin: '0 0 4px' }}>Account created</h3>
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
          Send the login details to {name} via WhatsApp
        </p>
      </div>

      {/* Credentials card */}
      <div style={{ background: 'var(--bg)', borderRadius: 12, padding: '16px 20px',
        border: '1px solid var(--line)', marginBottom: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '10px 0', fontSize: 13.5 }}>
          <span style={{ color: 'var(--muted)', fontWeight: 500 }}>Name</span>
          <span style={{ fontWeight: 600 }}>{name}</span>
          <span style={{ color: 'var(--muted)', fontWeight: 500 }}>Email</span>
          <span className="mono">{email}</span>
          <span style={{ color: 'var(--muted)', fontWeight: 500 }}>Password</span>
          <span className="mono" style={{ color: 'var(--rose)' }}>{password}</span>
          <span style={{ color: 'var(--muted)', fontWeight: 500 }}>Portal</span>
          <span className="mono">{portalUrl}</span>
          {phone && <>
            <span style={{ color: 'var(--muted)', fontWeight: 500 }}>Phone</span>
            <span className="mono">{phone}</span>
          </>}
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <a href={waUrl} target="_blank" rel="noreferrer"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            padding: '13px 16px', borderRadius: 11, background: '#25D366', color: '#fff',
            fontWeight: 600, fontSize: 14.5, fontFamily: "'Space Grotesk', sans-serif",
            textDecoration: 'none', transition: '.15s', cursor: 'pointer' }}
          onMouseOver={e => e.currentTarget.style.background = '#20bd5a'}
          onMouseOut={e => e.currentTarget.style.background = '#25D366'}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Send via WhatsApp
        </a>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={handleCopy} style={{ flex: 1, justifyContent: 'center' }}>
            {copied ? <>{Icons.check} Copied!</> : <>{Icons.dl} Copy credentials</>}
          </button>
          <button className="btn btn-pri" onClick={onDone} style={{ flex: 1, justifyContent: 'center' }}>
            Done
          </button>
        </div>
      </div>

      {!phone && (
        <p style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', marginTop: 12 }}>
          No phone number — WhatsApp will open without a recipient. You can paste the number manually.
        </p>
      )}
    </div>
  )
}
