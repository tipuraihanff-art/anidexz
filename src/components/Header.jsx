import React, { useState, useRef, useEffect } from 'react'
import { useApp } from '../AppContext.jsx'

const API_BASE = 'https://anidexz-api.vercel.app/aniwatch'

export default function Header() {
  const { route, go } = useApp()
  const [q, setQ] = useState(route.q || '')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isLight, setIsLight] = useState(() => {
    try { return localStorage.getItem('anz_theme') === 'light' } catch { return false }
  })
  const [randomLoading, setRandomLoading] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('light', isLight)
    try { localStorage.setItem('anz_theme', isLight ? 'light' : 'dark') } catch {}
  }, [isLight])

  const view = route.view

  function doSearch() {
    const trimmed = q.trim()
    if (!trimmed) return
    go('search', { q: trimmed })
  }

  function handleKeyPress(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      doSearch()
    }
  }

  async function handleRandom() {
    if (randomLoading) return
    
    setRandomLoading(true)
    
    try {
      const endpoints = [
        `${API_BASE}/most-popular?page=1`,
        `${API_BASE}/top-airing?page=1`,
        `${API_BASE}/az-list?page=${Math.floor(Math.random() * 100) + 1}`
      ]
      
      const randomEndpoint = endpoints[Math.floor(Math.random() * endpoints.length)]
      const response = await fetch(randomEndpoint)
      
      if (!response.ok) throw new Error('Failed to fetch random anime')
      
      const data = await response.json()
      
      let animeList = []
      if (data.animes) {
        animeList = data.animes
      } else if (data.mostPopularAnimes) {
        animeList = data.mostPopularAnimes
      } else if (Array.isArray(data)) {
        animeList = data
      }
      
      if (animeList.length === 0) {
        throw new Error('No anime found')
      }
      
      const randomAnime = animeList[Math.floor(Math.random() * animeList.length)]
      
      if (randomAnime && randomAnime.id) {
        const cleanId = randomAnime.id.split('?')[0]
        
        go('watch', {
          id: cleanId,
          name: randomAnime.name || randomAnime.title,
          titleAlt: randomAnime.name || randomAnime.title,
          ep: 1,
          lang: 'sub'
        })
      } else {
        throw new Error('Invalid anime data')
      }
      
    } catch (err) {
      console.error('Random anime error:', err)
      try {
        const randomQueries = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z']
        const randomQuery = randomQueries[Math.floor(Math.random() * randomQueries.length)]
        const searchResponse = await fetch(`${API_BASE}/search?keyword=${randomQuery}&page=1`)
        const searchData = await searchResponse.json()
        
        if (searchData.animes && searchData.animes.length > 0) {
          const randomAnime = searchData.animes[Math.floor(Math.random() * searchData.animes.length)]
          const cleanId = randomAnime.id.split('?')[0]
          
          go('watch', {
            id: cleanId,
            name: randomAnime.name,
            titleAlt: randomAnime.name,
            ep: 1,
            lang: 'sub'
          })
        } else {
          go('home')
        }
      } catch (fallbackErr) {
        console.error('Fallback random failed:', fallbackErr)
        go('home')
      }
    } finally {
      setRandomLoading(false)
    }
  }

  // Close drawer on outside click
  useEffect(() => {
    function handleClick(e) {
      if (drawerOpen) setDrawerOpen(false)
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [drawerOpen])

  const navItems = [
    { v: 'home', label: 'Home' },
    { v: 'trending', label: 'Trending' },
    { v: 'movies', label: 'Movies' },
    { v: 'schedule', label: 'Schedule' },
    { v: 'browse', label: 'Browse' },
    { v: 'mylist', label: 'My List' },
    { v: 'domains', label: 'Domains' },
  ]

  return (
    <>
      <header id="hdr">
        <div className="logo" onClick={() => go('home')}><b>ani</b>dexz</div>
        <nav className="hnav">
          {navItems.map(n => (
            <button key={n.v} className={'hn' + (view === n.v ? ' on' : '')} onClick={() => go(n.v)}>{n.label}</button>
          ))}
        </nav>
        <button 
          id="rand-btn" 
          onClick={handleRandom} 
          title="Random Anime"
          disabled={randomLoading}
          style={{ opacity: randomLoading ? 0.6 : 1, cursor: randomLoading ? 'wait' : 'pointer' }}
        >
          <svg fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13">
            <polyline points="16 3 21 3 21 8" /><line x1="4" x2="21" y1="20" y2="3" />
            <polyline points="21 16 21 21 16 21" /><line x1="15" x2="21" y1="15" y2="21" />
          </svg>
          {randomLoading ? '...' : 'Random'}
        </button>
        
        {/* Search input without filters */}
        <div className="sw" style={{ position: 'relative', overflow: 'visible' }} onClick={e => e.stopPropagation()}>
          <input
            id="si" 
            type="search" 
            placeholder="Search anime..."
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyPress={handleKeyPress}
            autoComplete="off"
          />
          <button id="sb" onClick={doSearch}>
            <svg fill="none" height="15" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" width="15">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
          </button>
        </div>

        <button id="theme-btn" onClick={() => setIsLight(v => !v)} title={isLight ? 'Switch to Dark' : 'Switch to Light'}>
          {isLight ? (
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          ) : (
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          )}
        </button>

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
        <button 
          className="hn" 
          id="mob-rand-btn" 
          onClick={() => { setDrawerOpen(false); handleRandom() }}
          disabled={randomLoading}
        >
          {randomLoading ? 'Loading...' : 'Random Anime'}
        </button>
      </div>
    </>
  )
}
