import { useEffect } from 'react'

export default function Modal({ title, children, onClose }) {
  useEffect(() => {
    const handler = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'rgba(14,22,51,.45)', backdropFilter: 'blur(4px)',
      padding: 24,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 16, width: '100%', maxWidth: 640, maxHeight: '80vh',
        display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(14,22,51,.18)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px', borderBottom: '1px solid var(--line)',
        }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", margin: 0 }}>
            {title}
          </h3>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: 22, cursor: 'pointer',
            color: 'var(--muted)', padding: '0 4px', lineHeight: 1,
          }}>×</button>
        </div>
        <div style={{
          padding: '24px', overflowY: 'auto', fontSize: 14, lineHeight: 1.75, color: 'var(--ink-2)',
          whiteSpace: 'pre-wrap',
        }}>
          {children}
        </div>
      </div>
    </div>
  )
}
