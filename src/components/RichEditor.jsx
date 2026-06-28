import { useRef, useEffect } from 'react'

const TOOLBAR = [
  { cmd: 'bold', icon: 'B', style: { fontWeight: 700 } },
  { cmd: 'italic', icon: 'I', style: { fontStyle: 'italic' } },
  { cmd: 'underline', icon: 'U', style: { textDecoration: 'underline' } },
  { sep: true },
  { cmd: 'insertUnorderedList', icon: '• List' },
  { cmd: 'insertOrderedList', icon: '1. List' },
  { sep: true },
  { cmd: 'formatBlock', arg: 'H3', icon: 'H' },
  { cmd: 'formatBlock', arg: 'P', icon: '¶' },
]

export default function RichEditor({ value, onChange, placeholder }) {
  const editorRef = useRef(null)
  const isInternalChange = useRef(false)

  useEffect(() => {
    if (editorRef.current && !isInternalChange.current) {
      if (editorRef.current.innerHTML !== (value || '')) {
        editorRef.current.innerHTML = value || ''
      }
    }
    isInternalChange.current = false
  }, [value])

  function handleInput() {
    isInternalChange.current = true
    onChange(editorRef.current.innerHTML)
  }

  function exec(cmd, arg) {
    document.execCommand(cmd, false, arg || null)
    editorRef.current?.focus()
    handleInput()
  }

  return (
    <div style={{ border: '1.5px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '6px 8px',
        background: '#f8f9fc', borderBottom: '1px solid var(--line)', flexWrap: 'wrap' }}>
        {TOOLBAR.map((t, i) =>
          t.sep ? (
            <div key={i} style={{ width: 1, height: 20, background: 'var(--line)', margin: '0 4px' }} />
          ) : (
            <button key={t.cmd + (t.arg || '')} type="button"
              onClick={() => exec(t.cmd, t.arg)}
              style={{
                background: 'none', border: '1px solid transparent', borderRadius: 6,
                padding: '4px 8px', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit',
                color: 'var(--ink-2)', fontWeight: 500, minWidth: 28, textAlign: 'center',
                ...(t.style || {}),
              }}
              onMouseOver={e => e.currentTarget.style.background = '#e8eaf4'}
              onMouseOut={e => e.currentTarget.style.background = 'none'}>
              {t.icon}
            </button>
          )
        )}
      </div>
      <div ref={editorRef} contentEditable onInput={handleInput}
        data-placeholder={placeholder || 'Start typing...'}
        style={{ minHeight: 160, padding: '14px 16px', fontSize: 14, fontFamily: 'inherit',
          lineHeight: 1.7, outline: 'none', color: 'var(--ink)', background: '#fff',
          overflow: 'auto', maxHeight: 400 }} />
      <style>{`
        [contenteditable]:empty:before { content: attr(data-placeholder); color: var(--muted-2); pointer-events: none; }
        [contenteditable] h3 { font-size: 16px; font-weight: 600; margin: 12px 0 6px; }
        [contenteditable] p { margin: 0 0 8px; }
        [contenteditable] ul, [contenteditable] ol { margin: 4px 0 8px 20px; }
        [contenteditable] li { margin-bottom: 4px; }
      `}</style>
    </div>
  )
}
