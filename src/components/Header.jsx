import React, { useState, useRef, useEffect } from 'react'
import { useApp } from '../AppContext.jsx'

export default function Header({ onSearch, onRandom }) {
  const { route, go, filter, setFilter } = useApp()
  const [q, setQ] = useState(route.q || '')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [aspOpen, setAspOpen] = useState(false)
  const [aspType, setAspType] = useState('')
  const [aspStatus, setAspStatus] = useState('')
  const [aspYear, setAspYear] = useState('')
  const [aspScore, setAspScore] = useState('')
  const [aspOrder, setAspOrder] = useState('SCORE_DESC')
  const aspRef = useRef(null)

  const view = route.view

  useEffect(() => {
    function handleClick(e) {
      if (aspOpen && aspRef.current && !aspRef.current.contains(e.target)) {
        setAspOpen(false)
      }
      if (drawerOpen) setDrawerOpen(false)
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [aspOpen, drawerOpen])

  function doSearch() {
    const trimmed = q.trim()
    if (!trimmed && !hasFilters()) return
    go('search', { q: trimmed })
  }

  function hasFilters() {
    return !!(filter.genre || filter.type || filter.status || filter.year || filter.score)
  }

  function applyFilters() {
    setFilter({ type: aspType, status: aspStatus, year: aspYear, score: aspScore, order: aspOrder || 'SCORE_DESC', genre: filter.genre })
    setAspOpen(false)
    if (view === 'search') go('search', { q: route.q || '' })
    else if (view === 'trending' || view === 'movies') go(view)
    else go('search', { q: '' })
  }

  function resetFilters() {
    setFilter({ genre: '', type: '', status: '', year: '', score: '', order: 'SCORE_DESC' })
    setAspType(''); setAspStatus(''); setAspYear(''); setAspScore(''); setAspOrder('SCORE_DESC')
    setAspOpen(false)
  }

  const navItems = [
    { v: 'home', label: 'Home' },
    { v: 'trending', label: 'Trending' },
    { v: 'movies', label: 'Movies' },
    { v: 'schedule', label: 'Schedule' },
    { v: 'browse', label: 'Browse' },
    { v: 'mylist', label: '♥ My List' },
    { v: 'community', label: 'Community' },
    { v: 'domains', label: 'Domains' },
  ]

  const years = []
  const cy = new Date().getFullYear()
  for (let y = cy; y >= 2000; y--) years.push(y)

  return (
    <>
      {/* Advanced search panel */}
      <div id="asearch-panel" ref={aspRef} className={aspOpen ? 'open' : ''} onClick={e => e.stopPropagation()}>
        <div className="asp-row">
          <div className="asp-group">
            <span className="asp-label">Format</span>
            <select className="asp-sel" value={aspType} onChange={e => setAspType(e.target.value)}>
              <option value="">Any Format</option>
              <option value="TV">TV Series</option>
              <option value="MOVIE">Movie</option>
              <option value="OVA">OVA</option>
              <option value="ONA">ONA</option>
              <option value="SPECIAL">Special</option>
              <option value="MUSIC">Music</option>
            </select>
          </div>
          <div className="asp-group">
            <span className="asp-label">Status</span>
            <select className="asp-sel" value={aspStatus} onChange={e => setAspStatus(e.target.value)}>
              <option value="">Any Status</option>
              <option value="RELEASING">Airing</option>
              <option value="FINISHED">Completed</option>
              <option value="NOT_YET_RELEASED">Upcoming</option>
            </select>
          </div>
          <div className="asp-group">
            <span className="asp-label">Year</span>
            <select className="asp-sel" value={aspYear} onChange={e => setAspYear(e.target.value)}>
              <option value="">Any Year</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="asp-group">
            <span className="asp-label">Min Score</span>
            <select className="asp-sel" value={aspScore} onChange={e => setAspScore(e.target.value)}>
              <option value="">Any Score</option>
              <option value="90">90+</option>
              <option value="80">80+</option>
              <option value="70">70+</option>
              <option value="60">60+</option>
            </select>
          </div>
          <div className="asp-group">
            <span className="asp-label">Sort By</span>
            <select className="asp-sel" value={aspOrder} onChange={e => setAspOrder(e.target.value)}>
              <option value="SCORE_DESC">Score</option>
              <option value="POPULARITY_DESC">Popularity</option>
              <option value="START_DATE_DESC">Newest</option>
              <option value="TRENDING_DESC">Trending</option>
              <option value="FAVOURITES_DESC">Favourites</option>
            </select>
          </div>
        </div>
        <div className="asp-btns">
          <button className="bp" onClick={applyFilters} style={{ fontSize: '12px', padding: '8px 18px' }}>Apply Filters</button>
          <button className="bs" onClick={resetFilters} style={{ fontSize: '12px', padding: '8px 16px' }}>Reset</button>
        </div>
      </div>

      <header id="hdr">
        <div className="logo" onClick={() => go('home')}><b>ani</b>dexz</div>
        <nav className="hnav">
          {navItems.map(n => (
            <button key={n.v} className={'hn' + (view === n.v ? ' on' : '')} onClick={() => go(n.v)}>{n.label}</button>
          ))}
        </nav>
        <button id="rand-btn" onClick={onRandom} title="Random Anime">
          <svg fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13">
            <polyline points="16 3 21 3 21 8" /><line x1="4" x2="21" y1="20" y2="3" />
            <polyline points="21 16 21 21 16 21" /><line x1="15" x2="21" y1="15" y2="21" />
          </svg>
          Random
        </button>
        <div className="sw">
          <input
            id="si" type="search" placeholder="Search anime..."
            value={q} onChange={e => setQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doSearch()}
            autoComplete="off"
          />
          <button
            id="asearch-btn"
            className={aspOpen ? 'on' : ''}
            title="Advanced Filters"
            onClick={e => { e.stopPropagation(); setAspOpen(v => !v) }}
          >
            <svg fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14">
              <line x1="4" x2="20" y1="6" y2="6" /><line x1="8" x2="16" y1="12" y2="12" />
              <line x1="11" x2="13" y1="18" y2="18" />
            </svg>
          </button>
          <button id="sb" onClick={doSearch}>
            <svg fill="none" height="15" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" width="15">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
          </button>
        </div>
        <button id="mob-btn" onClick={e => { e.stopPropagation(); setDrawerOpen(v => !v) }}>
          <svg fill="none" height="20" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="20">
            <line x1="3" x2="21" y1="6" y2="6" /><line x1="3" x2="21" y1="12" y2="12" />
            <line x1="3" x2="21" y1="18" y2="18" />
          </svg>
        </button>
      </header>

      {/* Mobile drawer */}
      <div id="mob-drawer" className={drawerOpen ? 'open' : ''} onClick={e => e.stopPropagation()}>
        {navItems.map(n => (
          <button key={n.v} className={'hn' + (view === n.v ? ' on' : '')} onClick={() => { go(n.v); setDrawerOpen(false) }}>{n.label}</button>
        ))}
        <button className="hn" id="mob-rand-btn" onClick={() => { setDrawerOpen(false); onRandom() }}>■ Random Anime</button>
      </div>
    </>
  )
}
