import React, { useState, useEffect } from 'react'
import { useApp } from '../AppContext.jsx'
import { alQuery, Q_LIST, buildVars } from '../api.js'
import { Card, Section, Spin, Empty } from '../components/Shared.jsx'

const getSeason = () => {
  const m = new Date().getMonth()
  if (m < 3) return 'WINTER'
  if (m < 6) return 'SPRING'
  if (m < 9) return 'SUMMER'
  return 'FALL'
}

export default function Season() {
  const { pbStart, pbDone } = useApp()
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [hasNext, setHasNext] = useState(false)
  const season = getSeason()
  const year = new Date().getFullYear()

  useEffect(() => {
    pbStart()
    setLoading(true)
    alQuery(Q_LIST(), buildVars({ sort: 'POPULARITY_DESC', season, seasonYear: year, page }))
      .then(d => {
        setList(prev => page === 1 ? (d?.Page?.media || []) : [...prev, ...(d?.Page?.media || [])])
        setHasNext(d?.Page?.pageInfo?.hasNextPage || false)
        setLoading(false)
        pbDone()
      })
      .catch(e => { setError(e.message); setLoading(false); pbDone() })
  }, [page])

  if (loading && page === 1) return <div id="app"><Spin /></div>
  if (error) return <div id="app"><Empty title="Failed to Load" body={error} /></div>

  return (
    <div>
      <Section title={`${season.charAt(0) + season.slice(1).toLowerCase()} ${year}`}>
        <div className="grid">
          {list.map((m, i) => <Card key={m.id} m={m} delay={i * 34} />)}
        </div>
        {hasNext && (
          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <button className="bs" onClick={() => setPage(p => p + 1)} disabled={loading}>
              {loading ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
      </Section>
    </div>
  )
}
