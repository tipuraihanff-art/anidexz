import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useApp } from '../AppContext.jsx'
import { buildURL } from '../AppContext.jsx'
import { Card, Skels, Empty, Sentinel, GenreRow } from '../components/Shared.jsx'

const API_BASE = 'https://api-anime-rouge.vercel.app/aniwatch'

export default function Search() {
  const { route, go, pbStart, pbDone, filter, setFilter } = useApp()
  const [searchQuery, setSearchQuery] = useState(route.q || '')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [totalPages, setTotalPages] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const [genres, setGenres] = useState([])
  const inputRef = useRef(null)
  const searchButtonRef = useRef(null)

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

  // Perform search (only when search button is clicked or Enter is pressed)
  const performSearch = useCallback(async (resetPage = true) => {
    const query = searchQuery.trim()
    
    // Don't search if no query and no filters
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
      // Build URL with query parameters
      let url = `${API_BASE}/search?keyword=${encodeURIComponent(query)}&page=${currentPage}`
      
      // Add filters if they exist (your API might support these)
      // Note: Adjust filter parameters based on what your API actually supports
      const filterParams = []
      if (filter.genre) filterParams.push(`genre=${encodeURIComponent(filter.genre)}`)
      if (filter.type) filterParams.push(`type=${filter.type}`)
      if (filter.status) filterParams.push(`status=${filter.status}`)
      if (filter.year) filterParams.push(`year=${filter.year}`)
      
      if (filterParams.length) {
        url += `&${filterParams.join('&')}`
      }

      const res = await fetch(url)
      if (!res.ok) throw new Error(`Search failed: ${res.status}`)
      
      const data = await res.json()
      
      // Transform API response to match Card component expectations
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
        format: anime.duration ? 'TV' : 'Unknown',
        episodes: anime.episodes?.eps || 0,
        status: 'FINISHED', // You might want to extract this from your API
        averageScore: anime.rated ? 75 : 0,
        description: anime.duration || ''
      }))

      setItems(prev => resetPage ? transformedAnimes : [...prev, ...transformedAnimes])
      setHasMore(data.hasNextPage || false)
      setTotalPages(data.totalPages || 0)
      
      // Store genres if available
      if (data.genres && resetPage) {
        setGenres(data.genres)
      }
      
      if (resetPage) {
        setPage(2) // Next page will be 2
      } else {
        setPage(prev => prev + 1)
      }
      
    } catch (err) {
      console.error('Search error:', err)
      setError(err.message)
    } finally {
      if (resetPage) {
        setLoading(false)
      } else {
        setLoadingMore(false)
      }
      pbDone()
    }
  }, [searchQuery, filter, page, hasFilters, pbStart, pbDone])

  // Handle search button click
  const handleSearch = () => {
    if (searchQuery.trim() || hasFilters) {
      performSearch(true)
    }
  }

  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSearch()
    }
  }

  // Load more items for pagination
  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return
    performSearch(false)
  }, [loadingMore, hasMore, performSearch])

  // Handle filter changes - reset search when filters change
  useEffect(() => {
    if (searchQuery.trim() || hasFilters) {
      performSearch(true)
    }
  }, [filter]) // Re-run when filters change

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
              ref={searchButtonRef}
              className="srh-search-btn"
              onClick={handleSearch}
              disabled={loading}
              style={{
                background: 'var(--accent, #ff6b00)',
                border: 'none',
                borderRadius: '0 8px 8px 0',
                padding: '0 16px',
                marginLeft: 'auto',
                cursor: 'pointer',
                color: 'white',
                fontWeight: 'bold',
                height: '100%'
              }}
            >
              {loading ? '...' : 'Search'}
            </button>
          </div>
          
          {(searchQuery.trim() || hasFilters) && (
            <div className="srh-live-label">
              Results for <span>"{searchQuery.trim() || 'All'}"</span>
              {hasFilters && <span style={{ fontSize: '12px', marginLeft: '8px' }}>with filters</span>}
            </div>
          )}
        </div>
      </div>

      <div className="sec">
        <GenreRow
          active={filter.genre}
          onChange={g => setFilter(prev => ({ ...prev, genre: g }))}
          customGenres={genres.length > 0 ? genres : undefined}
        />
        
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
            <Empty title="Search Failed" body={error} />
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
                  onClick={() => go('watch', { id: m.id, name: m.title.romaji, titleAlt: m.title.romaji, ep: 1, lang: 'sub' })}
                />
              ))}
            </div>
            {hasMore && !loading && <Sentinel onVisible={loadMore} />}
            {loadingMore && (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <div className="spinner" />
              </div>
            )}
          </>
        )}
      </div>
      
      <style jsx>{`
        .srh-search-btn {
          transition: opacity 0.2s;
        }
        .srh-search-btn:hover {
          opacity: 0.9;
        }
        .srh-search-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </>
  )
}
