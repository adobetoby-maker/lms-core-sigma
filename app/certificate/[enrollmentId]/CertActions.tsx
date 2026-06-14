'use client'

export function CertActions() {
  return (
    <div style={{ position: 'fixed', top: 24, right: 24, display: 'flex', gap: 12, zIndex: 100 }}>
      <button
        onClick={() => window.history.back()}
        style={{ padding: '10px 20px', borderRadius: 8, fontFamily: 'system-ui', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: 'rgba(255,255,255,0.1)', color: '#fff' }}
      >
        ← Back
      </button>
      <button
        onClick={() => window.print()}
        style={{ padding: '10px 20px', borderRadius: 8, fontFamily: 'system-ui', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: '#4f46e5', color: '#fff' }}
      >
        Download PDF
      </button>
    </div>
  )
}
