import React from 'react'

const DOMAINS = [
  { url: 'https://anidexz.mywire.org',   host: 'anidexz.mywire.org',   status: 'Production', badge: 'Valid Configuration' },
  { url: 'https://anidexz.ooguy.com',    host: 'anidexz.ooguy.com',    status: 'Production', badge: 'Valid Configuration' },
  { url: 'https://anidexz.giize.com',    host: 'anidexz.giize.com',    status: 'Production', badge: 'Valid Configuration' },
  { url: 'https://anidexz.kozow.com',    host: 'anidexz.kozow.com',    status: 'Production', badge: 'Valid Configuration' },
  { url: 'https://anidexz.vercel.app',   host: 'anidexz.vercel.app',   status: 'Production', badge: 'Valid Configuration' },
]

export default function Domains() {
  return (
    <div className="sec" style={{ paddingTop: '28px', maxWidth: '780px', margin: '0 auto' }}>
      <div className="sec-hdr" style={{ marginBottom: '20px' }}>
        <h2 className="sec-title">Active Domains</h2>
        <span style={{ fontSize: '11px', color: 'var(--dim)' }}>{DOMAINS.length} domains</span>
      </div>

      <p style={{ fontSize: '13px', color: 'var(--dim)', marginBottom: '22px', lineHeight: '1.7' }}>
        anidexz is available on multiple domains. All links below are official and point to the same site.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {DOMAINS.map((d, i) => (
          <a
            key={i}
            href={d.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: 'none' }}
          >
            <div style={{
              background: 'var(--sur2)',
              border: '1px solid var(--bdr)',
              borderRadius: '12px',
              padding: '16px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              transition: 'border-color .2s, box-shadow .2s',
              cursor: 'pointer',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--acc)'; e.currentTarget.style.boxShadow = '0 4px 18px rgba(124,58,237,.18)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--bdr)'; e.currentTarget.style.boxShadow = 'none' }}
            >
              {/* Green dot */}
              <div style={{
                width: '10px', height: '10px', borderRadius: '50%',
                background: '#22c55e',
                boxShadow: '0 0 6px rgba(34,197,94,.6)',
                flexShrink: 0,
              }} />

              {/* Domain info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: "'Rajdhani', sans-serif",
                  fontSize: '17px', fontWeight: '700',
                  color: 'var(--txt)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {d.host}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--dim)', marginTop: '3px' }}>
                  {d.badge}
                </div>
              </div>

              {/* Production badge */}
              <span style={{
                background: 'rgba(34,197,94,.12)',
                border: '1px solid rgba(34,197,94,.28)',
                color: '#22c55e',
                borderRadius: '20px',
                padding: '3px 12px',
                fontSize: '10px',
                fontWeight: '800',
                letterSpacing: '.6px',
                textTransform: 'uppercase',
                flexShrink: 0,
              }}>{d.status}</span>

              {/* Arrow */}
              <svg width="14" height="14" fill="none" stroke="var(--dim)" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
            </div>
          </a>
        ))}
      </div>

      <div style={{
        marginTop: '28px',
        background: 'rgba(124,58,237,.06)',
        border: '1px solid rgba(124,58,237,.18)',
        borderRadius: '10px',
        padding: '14px 18px',
        fontSize: '12px',
        color: 'var(--dim)',
        lineHeight: '1.7',
      }}>
        💡 All domains serve the same content. Bookmark multiple links in case one is temporarily unavailable.
      </div>
    </div>
  )
}
