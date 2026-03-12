import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useApp } from '../AppContext.jsx'
import { alQuery, Q_LIST, buildVars } from '../api.js'
import { Card, Skels, Empty, Sentinel, GenreRow } from '../components/Shared.jsx'

function useDebouncedValue(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export default function Search() {
  const { route, go, pbStart, pbDone, filter, setFilter } = useApp()
  const [inputQ, setInputQ] = useState(route.q || '')
  const debouncedQ = useDebouncedValue(inputQ, 350)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  const hasFilters = !!(filter.genre || filter.type || filter.status || filter.year || filter.score)
  const activeQ = debouncedQ.trim()

  // Auto-focus input on mount
  useEffect(() => { inputRef.current?.focus() }, [])

  // Fire search whenever debounced query or filters change
  useEffect(() => {
    if (!activeQ && !hasFilters) { setItems([]); return }
    pbStart()
    setLoading(true)
    setError(null)
    setItems([])
    setPage(1)
    setHasMore(true)
    alQuery(Q_LIST(), buildVars({ q: activeQ, page: 1 }, filter))
      .then(d => {
        setItems((d?.Page?.media) || [])
        setHasMore(d?.Page?.pageInfo?.hasNextPage ?? false)
        setLoading(false)
        pbDone()
      })
      .catch(e => { setError(e.message); setLoading(false); pbDone() })
  }, [activeQ, filter])

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    const nextPage = page + 1
    alQuery(Q_LIST(), buildVars({ q: activeQ, page: nextPage }, filter))
      .then(d => {
        setItems(prev => [...prev, ...(d?.Page?.media || [])])
        setHasMore(d?.Page?.pageInfo?.hasNextPage ?? false)
        setPage(nextPage)
        setLoadingMore(false)
      })
      .catch(() => setLoadingMore(false))
  }, [loadingMore, hasMore, page, activeQ, filter])

  return (
    <>
      <div className="srh-hdr">
        <div className="srh-livebar">
          <div className="srh-liveinput-wrap">
            <svg className="srh-icon" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              ref={inputRef}
              className="srh-liveinput"
              type="search"
              placeholder="Search anime..."
              value={inputQ}
              onChange={e => setInputQ(e.target.value)}
              autoComplete="off"
              spellCheck="false"
            />
            {inputQ && (
              <button className="srh-clear" onClick={() => setInputQ('')} title="Clear">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
            {loading && <div className="srh-spinner"/>}
          </div>
          {activeQ && (
            <div className="srh-live-label">
              Results for <span>"{activeQ}"</span>
            </div>
          )}
        </div>
      </div>

      <div className="sec">
        <GenreRow
          active={filter.genre}
          onChange={g => setFilter(prev => ({ ...prev, genre: g }))}
        />
        {!activeQ && !hasFilters ? (
          <div className="grid">
            <Empty title="Start typing to search" body="Results will appear live as you type." />
          </div>
        ) : loading ? (
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
