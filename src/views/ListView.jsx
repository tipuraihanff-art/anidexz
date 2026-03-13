import React, { useState, useEffect, useCallback } from 'react'
import { useApp } from '../AppContext.jsx'
import { alQuery, Q_LIST, buildVars } from '../api.js'
import { Card, Skels, Empty, Sentinel } from '../components/Shared.jsx'

export default function ListView({ type }) {
  const { pbStart, pbDone, filter } = useApp()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)

  const label = type === 'movies' ? 'Top Anime Movies'
    : type === 'updated' ? 'Recently Updated'
    : 'Trending Anime'

  function getOpts(p) {
    if (type === 'movies') return { format: 'MOVIE', sort: 'POPULARITY_DESC', page: p }
    if (type === 'updated') return { sort: 'UPDATED_AT_DESC', status: 'RELEASING', page: p }
    return { sort: 'TRENDING_DESC', page: p }
  }

  useEffect(() => {
    pbStart()
    setLoading(true)
    setItems([])
    setPage(1)
    setHasMore(true)
    alQuery(Q_LIST(), buildVars(getOpts(1), filter))
      .then(d => {
        setItems((d?.Page?.media) || [])
        setHasMore(d?.Page?.pageInfo?.hasNextPage ?? false)
        setLoading(false)
        pbDone()
      })
      .catch(e => { setError(e.message); setLoading(false); pbDone() })
  }, [type, filter])

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    const nextPage = page + 1
    alQuery(Q_LIST(), buildVars(getOpts(nextPage), filter))
      .then(d => {
        const newItems = (d?.Page?.media) || []
        setItems(prev => [...prev, ...newItems])
        setHasMore(d?.Page?.pageInfo?.hasNextPage ?? false)
        setPage(nextPage)
        setLoadingMore(false)
      })
      .catch(() => setLoadingMore(false))
  }, [loadingMore, hasMore, page, type, filter])

  return (
    <div className="sec" style={{ paddingTop: '22px' }}>
      <div className="sec-hdr"><h2 className="sec-title">{label}</h2></div>
      {loading ? (
        <div className="grid"><Skels /></div>
      ) : error ? (
        <div className="grid"><Empty title="Something Went Wrong" body={error} /></div>
      ) : !items.length ? (
        <div className="grid"><Empty title="Nothing Found" body="Try different filters or browse another genre." /></div>
      ) : (
        <>
          <div className="grid">
            {items.map((m, i) => <Card key={m.id} m={m} delay={i < 24 ? i * 34 : 0} />)}
          </div>
          {hasMore && <Sentinel onVisible={loadMore} />}
        </>
      )}
    </div>
  )
}
