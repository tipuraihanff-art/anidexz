import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useApp } from '../AppContext.jsx'
import { buildURL } from '../AppContext.jsx'
import { Card, Skels, Empty, Sentinel } from '../components/Shared.jsx'

const API_BASE = 'https://anidexz-api.vercel.app/aniwatch'

export default function Search() {
  const { route, go, pbStart, pbDone, filter, setFilter } = useApp()
  const [searchQuery, setSearchQuery] = useState(route.q || '')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  const hasFilters = !!(filter.genre || filter.type || filter.status || filter.year || filter.score)

  // Auto-focus input on mount
  useEffect(() => { inputRef.current?.focus() }, [])

  // Update URL when search query changes
  useEffect(() => {
    const url = buildURL({ view: 'search', q: searchQuery.trim() })
    try { 
      history.replaceState({ view: 'search', q: searchQuery.trim() }, '', url) 
    } catch {}
  }, [searchQuery])

  // Perform search
  const performSearch = useCallback(async (resetPage = true) => {
    const query = searchQuery.trim()
    
    if (!query && !hasFilters) {
      setItems([])
      setHasMore(false)
      return
    }

    const currentPage = resetPage ? 1 : page
    if (resetPage) {
      setLoading(true)
      setItems([])
      setPage(1)
    } else {
      setLoadingMore(true)
    }
    
    setError(null)
    pbStart()

    try {
      const encodedQuery = encodeURIComponent(query)
      const url = `${API_BASE}/search?keyword=${encodedQuery}&page=${currentPage}`
      
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      const transformedAnimes = (data.animes || []).map(anime => ({
        id: anime.id,
        title: {
          romaji: anime.name,
          english: anime.name,
          native: anime.name
        },
        coverImage: {
          large: anime.img,
          medium: anime.img
        },
        format: anime.duration?.includes('m') ? 'TV' : 'Movie',
        episodes: anime.episodes?.eps || anime.episodes?.sub || 0,
        status: anime.episodes?.eps ? 'FINISHED' : 'RELEASING',
        averageScore: anime.rated ? 75 : 0,
        description: anime.duration || ''
      }))

      setItems(prev => resetPage ? transformedAnimes : [...prev, ...transformedAnimes])
      setHasMore(data.hasNextPage || false)
      
      if (resetPage) {
        setPage(2)
      } else {
        setPage(prev => prev + 1)
      }
      
    } catch (err) {
      console.error('Search error:', err)
      setError(err.message || 'Failed to fetch search results')
    } finally {
      if (resetPage) {
        setLoading(false)
      } else {
        setLoadingMore(false)
      }
      pbDone()
    }
  }, [searchQuery, filter, page, hasFilters, pbStart, pbDone])

  const handleSearch = () => {
    if (searchQuery.trim() || hasFilters) {
      performSearch(true)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSearch()
    }
  }

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return
    performSearch(false)
  }, [loadingMore, hasMore, performSearch])

  // Handle filter changes
  useEffect(() => {
    if (searchQuery.trim() || hasFilters) {
      performSearch(true)
    }
  }, [filter])

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
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              autoComplete="off"
              spellCheck="false"
            />
            {searchQuery && (
              <button className="srh-clear" onClick={() => setSearchQuery('')} title="Clear">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
            <button 
              className="srh-search-btn"
              onClick={handleSearch}
              disabled={loading}
              style={{
                background: 'transparent',
                border: 'none',
                borderRadius: '0 8px 8px 0',
                padding: '0 16px',
                marginLeft: 'auto',
                cursor: loading ? 'not-allowed' : 'pointer',
                color: 'var(--dim)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                transition: 'all 0.2s',
                opacity: loading ? 0.6 : 1
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.color = 'var(--fg)'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--dim)'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </button>
          </div>
          
          {(searchQuery.trim() || hasFilters) && (
            <div className="srh-live-label">
              Results for "{searchQuery.trim() || 'All'}"
              {hasFilters && <span style={{ fontSize: '12px', marginLeft: '8px' }}>with filters</span>}
            </div>
          )}
        </div>
      </div>

      <div className="sec">
        {!searchQuery.trim() && !hasFilters ? (
          <div className="grid">
            <Empty 
              title="Start Searching" 
              body="Enter an anime name and click Search to find your favorite shows." 
            />
          </div>
        ) : loading ? (
          <div className="grid"><Skels /></div>
        ) : error ? (
          <div className="grid">
            <Empty 
              title="Search Failed" 
              body={
                <div>
                  <p style={{ color: '#ff6b6b' }}>{error}</p>
                  <button 
                    onClick={handleSearch}
                    style={{
                      marginTop: '16px',
                      padding: '8px 24px',
                      background: 'var(--accent, #ff6b00)',
                      border: 'none',
                      borderRadius: '6px',
                      color: 'white',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    Try Again
                  </button>
                </div>
              } 
            />
          </div>
        ) : !items.length ? (
          <div className="grid">
            <Empty 
              title="No Results Found" 
              body={`Couldn't find any anime matching "${searchQuery.trim()}". Try a different name.`} 
            />
          </div>
        ) : (
          <>
            <div className="grid">
              {items.map((m, i) => (
                <Card 
                  key={m.id} 
                  m={m} 
                  delay={i < 24 ? i * 34 : 0}
                  onClick={() => {
                    const cleanId = m.id.split('?')[0]
                    go('watch', { 
                      id: cleanId, 
                      name: m.title.romaji, 
                      titleAlt: m.title.romaji, 
                      ep: 1, 
                      lang: 'sub' 
                    })
                  }}
                />
              ))}
            </div>
            {hasMore && !loading && (
              <>
                <Sentinel onVisible={loadMore} />
                {loadingMore && (
                  <div style={{ textAlign: 'center', padding: '20px' }}>
                    <div className="spinner" />
                  </div>
                )}
              </>
            )}
            {!hasMore && items.length > 0 && (
              <div style={{ 
                textAlign: 'center', 
                padding: '20px', 
                color: 'var(--dim)',
                fontSize: '13px'
              }}>
                End of results
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
