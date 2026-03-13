import React, { useEffect, useState, useCallback } from 'react'
import { AppProvider, useApp, fromURL } from './AppContext.jsx'
import Header from './components/Header.jsx'
import { ToastContainer, ProgressBar, Loader } from './components/UI.jsx'

import Landing from './views/Landing.jsx'
import Home from './views/Home.jsx'
import ListView from './views/ListView.jsx'
import Search from './views/Search.jsx'
import Schedule from './views/Schedule.jsx'
import MyList from './views/MyList.jsx'
import Browse from './views/Browse.jsx'
import Detail from './views/Detail.jsx'
import Watch from './views/Watch.jsx'

import Domains from './views/Domains.jsx'

/* ── Context menu + devtools block (matches original) ── */
if (typeof document !== 'undefined') {
  document.addEventListener('contextmenu', e => e.preventDefault())
  document.onkeydown = e => {
    if (e.keyCode === 123 ||
      (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) ||
      (e.ctrlKey && e.keyCode === 85) ||
      (e.ctrlKey && e.keyCode === 83)) {
      e.preventDefault(); return false
    }
  }
}

/* ── PWA manifest ── */
function setupPWA() {
  try {
    const m = {
      name: 'anidexz', short_name: 'anidexz',
      start_url: location.origin + location.pathname,
      display: 'standalone', background_color: '#05050a', theme_color: '#05050a',
      description: 'Watch anime online',
      icons: [
        { src: 'https://placehold.co/192x192/7c3aed/fff?text=A', sizes: '192x192', type: 'image/png' },
        { src: 'https://placehold.co/512x512/7c3aed/fff?text=A', sizes: '512x512', type: 'image/png' }
      ]
    }
    const blob = new Blob([JSON.stringify(m)], { type: 'application/manifest+json' })
    const lnk = document.createElement('link')
    lnk.rel = 'manifest'; lnk.href = URL.createObjectURL(blob)
    document.head.appendChild(lnk)
  } catch {}
}
setupPWA()

/* ── Main router view ── */
function AppInner() {
  const { route, go, toast, pbStart, pbDone } = useApp()
  const [showBtt, setShowBtt] = useState(false)
  const view = route.view

  /* Update page title on route change (Detail/Watch set their own) */
  useEffect(() => {
    const titles = {
      landing:   'anidexz - Watch Anime Online',
      home:      'Home - anidexz',
      trending:  'Trending - anidexz',
      movies:    'Movies - anidexz',
      updated:   'Recently Updated - anidexz',
      schedule:  'Schedule - anidexz',
      mylist:    'My List - anidexz',
      browse:    'Browse - anidexz',
      search:    'Search - anidexz',
      community: 'Community - anidexz',
      domains:   'Domains - anidexz',
    }
    if (titles[view]) document.title = titles[view]
  }, [view])

  /* Back/forward navigation */
  useEffect(() => {
    function onPop(e) {
      const state = e.state || fromURL()
      // setRoute directly via popstate
      window.dispatchEvent(new CustomEvent('app-popstate', { detail: state }))
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  /* Scroll to top + BTT */
  useEffect(() => {
    function onScroll() { setShowBtt(window.scrollY > 500) }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  /* Random anime */
  const goRandom = useCallback(() => {
    toast('Finding random anime...')
    pbStart()
    const page = Math.floor(Math.random() * 50) + 1
    const idx = Math.floor(Math.random() * 24)
    import('./api.js').then(({ alQuery, Q_LIST }) =>
      alQuery(Q_LIST(), { page, perPage: 24, sort: ['POPULARITY_DESC'] })
        .then(d => {
          pbDone()
          const list = d?.Page?.media
          if (!list?.length) { toast('Nothing found'); return }
          const m = list[Math.min(idx, list.length - 1)]
          go('anime', { id: m.id, name: m.title?.english || m.title?.romaji, titleAlt: m.title?.romaji || m.title?.english })
        })
        .catch(() => { pbDone(); toast('Failed - try again') })
    )
  }, [go, toast, pbStart, pbDone])

  const isLanding = view === 'landing'

  function renderView() {
    switch (view) {
      case 'landing':   return <Landing />
      case 'home':      return <Home />
      case 'trending':  return <ListView type="trending" />
      case 'movies':    return <ListView type="movies" />
      case 'updated':   return <ListView type="updated" />
      case 'schedule':  return <Schedule />
      case 'mylist':    return <MyList />
      case 'browse':    return <Browse />
      case 'anime':     return <Detail />
      case 'watch':     return <Watch />
      case 'search':    return <Search />
      case 'domains':   return <Domains />
      default:          return <Home />
    }
  }

  return (
    <>
      <Loader />
      <ProgressBar />
      <ToastContainer />

      {!isLanding && <Header onRandom={goRandom} />}

      <div id="app" className={isLanding ? 'no-header' : ''}>
        {renderView()}
      </div>

      {!isLanding && (
        <footer>
          <div className="flogo"><b>ani</b>dexz</div>
          <p className="ftxt">© 2026 anidexz. All Rights Reserved.</p>
          <p className="ftxt" style={{ fontSize: '11px', color: '#333', marginTop: '4px' }}>We do not host any files. Content provided by third parties.</p>
        </footer>
      )}

      <button
        id="btt"
        aria-label="Back to top"
        style={{ display: showBtt ? 'flex' : 'none' }}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      >
        <svg fill="none" height="14" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" width="14">
          <path d="M18 15l-6-6-6 6" />
        </svg>
      </button>
    </>
  )
}

/* ── Popstate handler that updates context ── */
function PopstateHandler() {
  const { setRoute } = useApp()
  useEffect(() => {
    function handle(e) {
      setRoute(e.detail)
      window.scrollTo(0, 0)
    }
    window.addEventListener('app-popstate', handle)
    return () => window.removeEventListener('app-popstate', handle)
  }, [setRoute])
  return null
}

export default function App() {
  return (
    <AppProvider>
      <PopstateHandler />
      <AppInner />
    </AppProvider>
  )
}
