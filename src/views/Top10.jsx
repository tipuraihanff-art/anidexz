import React, { useState, useEffect } from 'react'
import { useApp } from '../AppContext.jsx'
import { alQuery, Q_LIST, buildVars } from '../api.js'
import { alTitle, alTitleAlt, alImg } from '../helpers.js'
import { Section, Spin, Empty } from '../components/Shared.jsx'

export default function Top10() {
  const { go, pbStart, pbDone } = useApp()
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    pbStart()
    setLoading(true)
    alQuery(Q_LIST(), buildVars({ sort: 'SCORE_DESC', status: 'RELEASING', page: 1 }))
      .then(d => {
        setList(d?.Page?.media || [])
        setLoading(false)
        pbDone()
      })
      .catch(e => { setError(e.message); setLoading(false); pbDone() })
  }, [])

  if (loading) return <div id="app"><Spin /></div>
  if (error) return <div id="app"><Empty title="Failed to Load" body={error} /></div>

  return (
    <div>
      <Section title="Top 10 Today">
        <div className="grid">
          {list.slice(0, 10).map((m, i) => {
            const title = alTitle(m)
            const titleAlt = alTitleAlt(m)
            return (
              <div
                key={m.id}
                className="hcard"
                style={{ position: 'relative', cursor: 'pointer' }}
                onClick={() => go('anime', { id: m.id, name: title, titleAlt })}
              >
                <div style={{
                  position: 'absolute', top: 0, left: 0,
                  background: 'var(--accent, #7c3aed)',
                  color: '#fff', fontWeight: 700,
                  fontSize: i < 3 ? '18px' : '14px',
                  width: '28px', height: '28px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: '0 0 6px 0', zIndex: 2
                }}>{i + 1}</div>
                <img
                  src={alImg(m, 'large')} alt={title} loading="lazy"
                  style={{ width: '108px', height: '152px', objectFit: 'cover' }}
                  onError={e => { e.target.src = 'https://placehold.co/108x152/0d0d15/555577?text=N/A' }}
                />
                <div className="hcard-info">
                  <div className="hcard-title">{title}</div>
                  <div className="hcard-sub">{m.averageScore ? `⭐ ${m.averageScore / 10}/10` : m.format}</div>
                </div>
              </div>
            )
          })}
        </div>
      </Section>
    </div>
  )
}
