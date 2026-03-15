import React, { useState, useEffect } from 'react'
import { useApp } from '../AppContext.jsx'
import { alQuery, Q_LIST, buildVars } from '../api.js'
import { Card, Section, Spin, Empty } from '../components/Shared.jsx'

export default function Completed() {
  const { pbStart, pbDone } = useApp()
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [hasNext, setHasNext] = useState(false)

  useEffect(() => {
    pbStart()
    setLoading(true)
    alQuery(Q_LIST(), buildVars({ sort: 'POPULARITY_DESC', status: 'FINISHED', page }))
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
      <Section title="Completed Series">
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
