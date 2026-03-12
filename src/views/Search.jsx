import React, { useState, useEffect, useCallback } from 'react'
import { useApp } from '../AppContext.jsx'
import { alQuery, Q_LIST, buildVars } from '../api.js'
import { Card, Skels, Empty, Sentinel, GenreRow } from '../components/Shared.jsx'

export default function Search() {
  const { route, go, pbStart, pbDone, filter, setFilter } = useApp()
  const q = route.q || ''
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)

  const hasFilters = !!(filter.genre || filter.type || filter.status || filter.year || filter.score)

  useEffect(() => {
    if (!q && !hasFilters) { go('home'); return }
    pbStart()
    setLoading(true)
    setItems([])
    setPage(1)
    setHasMore(true)
    alQuery(Q_LIST(), buildVars({ q, page: 1 }, filter))
      .then(d => {
        setItems((d?.Page?.media) || [])
        setHasMore(d?.Page?.pageInfo?.hasNextPage ?? false)
        setLoading(false)
        pbDone()
      })
      .catch(e => { setError(e.message); setLoading(false); pbDone() })
  }, [q, filter])

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    const nextPage = page + 1
    alQuery(Q_LIST(), buildVars({ q, page: nextPage }, filter))
      .then(d => {
        setItems(prev => [...prev, ...(d?.Page?.media || [])])
        setHasMore(d?.Page?.pageInfo?.hasNextPage ?? false)
        setPage(nextPage)
        setLoadingMore(false)
      })
      .catch(() => setLoadingMore(false))
  }, [loadingMore, hasMore, page, q, filter])

  return (
    <>
      <div className="srh-hdr">
        <div className="srh-title">Results for <span>"{q || 'filtered'}"</span></div>
      </div>
      <div className="sec">
        <GenreRow
          active={filter.genre}
          onChange={g => setFilter(prev => ({ ...prev, genre: g }))}
        />
        {loading ? (
          <div className="grid"><Skels /></div>
        ) : error ? (
          <div className="grid"><Empty title="Search Failed" body={error} /></div>
        ) : !items.length ? (
          <div className="grid"><Empty title="No Results" body="Try a different name or adjust filters." /></div>
        ) : (
          <>
            <div className="grid">
              {items.map((m, i) => <Card key={m.id} m={m} delay={i < 24 ? i * 34 : 0} />)}
            </div>
            {hasMore && <Sentinel onVisible={loadMore} />}
          </>
        )}
      </div>
    </>
  )
}
