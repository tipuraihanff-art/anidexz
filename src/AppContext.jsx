import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'

const AppCtx = createContext(null)

/* ── Slug helpers ── */
function toSlug(str) {
  if (!str) return ''
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

/* ── URL builders ── */
export function buildURL(s) {
  switch (s.view) {
    case 'landing':   return '/'
    case 'home':      return '/home'
    case 'trending':  return '/trending'
    case 'movies':    return '/movies'
    case 'updated':   return '/updated'
    case 'schedule':  return '/schedule'
    case 'mylist':    return '/my-list'
    case 'browse':    return '/browse'
    case 'community': return '/community'
    case 'domains':   return '/domains'
    case 'upcoming':  return '/upcoming'
    case 'completed': return '/completed'
    case 'season':    return '/season'
    case 'top10':     return '/top10'
    case 'search':    return s.q ? `/search?q=${encodeURIComponent(s.q)}` : '/search'
    case 'anime': {
      const slug = toSlug(s.name || s.titleAlt || '')
      return s.id ? `/anime/${s.id}${slug ? '/' + slug : ''}` : '/anime'
    }
    case 'watch': {
      const slug = toSlug(s.name || s.titleAlt || '')
      if (s.id && s.ep) {
        const langSuffix = s.lang && s.lang !== 'sub' ? `?lang=${s.lang}` : ''
        return `/watch/${s.id}${slug ? '/' + slug : ''}/ep/${s.ep}${langSuffix}`
      }
      return '/watch'
    }
    default: return '/'
  }
}

/* ── Parse URL → route state ── */
export function fromURL() {
  const st = history.state
  if (st && st.view) return st

  const { pathname, search } = location
  const params = new URLSearchParams(search)

  // /anime/:id/:slug?  (id can be string like "one-piece-100")
  const animeMatch = pathname.match(/^\/anime\/([^/]+)(?:\/([^/]+))?$/)
  if (animeMatch) {
    return {
      view: 'anime',
      id: animeMatch[1],
      name: animeMatch[2] ? animeMatch[2].replace(/-/g, ' ') : null,
      titleAlt: null,
      ep: null,
      lang: params.get('lang') || 'sub',
      q: ''
    }
  }

  // /watch/:id/:slug?/ep/:ep  (id can be string like "one-piece-100")
  const watchMatch = pathname.match(/^\/watch\/([^/]+)(?:\/([^/]+))?\/ep\/(\d+)$/)
  if (watchMatch) {
    return {
      view: 'watch',
      id: watchMatch[1],
      name: watchMatch[2] ? watchMatch[2].replace(/-/g, ' ') : null,
      titleAlt: null,
      ep: Number(watchMatch[3]),
      lang: params.get('lang') || 'sub',
      q: ''
    }
  }

  // /search?q=...
  if (pathname === '/search') {
    return { view: 'search', id: null, name: null, titleAlt: null, ep: null, lang: 'sub', q: params.get('q') || '' }
  }

  // Static paths
  const PATH_VIEW = {
    '/':           'landing',
    '/home':       'home',
    '/trending':   'trending',
    '/movies':     'movies',
    '/updated':    'updated',
    '/schedule':   'schedule',
    '/my-list':    'mylist',
    '/browse':     'browse',
    '/watch':      'watch',
    '/anime':      'anime',
    '/community':  'community',
    '/domains':    'domains',
    '/upcoming':   'upcoming',
    '/completed':  'completed',
    '/season':     'season',
    '/top10':      'top10',
  }
  const view = PATH_VIEW[pathname] || PATH_VIEW[pathname.replace(/\/$/, '')] || 'landing'
  return { view, id: null, name: null, titleAlt: null, ep: null, lang: 'sub', q: '' }
}

export function AppProvider({ children }) {
  const [route, setRoute] = useState(() => fromURL())
  const [filter, setFilter] = useState({ genre: '', type: '', status: '', year: '', score: '', order: 'SCORE_DESC' })
  const [toasts, setToasts] = useState([])
  const [pbarW, setPbarW] = useState(0)
  const [pbarDone, setPbarDone] = useState(false)
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('anz_theme') || 'dark' } catch { return 'dark' }
  })
  const pbarTimer = useRef(null)
  const toastId = useRef(0)

  useEffect(() => {
    if (theme === 'light') document.documentElement.classList.add('light')
    else document.documentElement.classList.remove('light')
    try { localStorage.setItem('anz_theme', theme) } catch {}
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme(t => t === 'dark' ? 'light' : 'dark')
  }, [])

  const pbStart = useCallback(() => {
    clearInterval(pbarTimer.current)
    setPbarDone(false)
    setPbarW(0)
    let w = 0
    pbarTimer.current = setInterval(() => {
      w += Math.random() * 15
      if (w > 82) w = 82
      setPbarW(w)
    }, 180)
  }, [])

  const pbDone = useCallback(() => {
    clearInterval(pbarTimer.current)
    setPbarW(100)
    setPbarDone(true)
    setTimeout(() => { setPbarW(0); setPbarDone(false) }, 480)
  }, [])

  const toast = useCallback((msg, dur = 2200) => {
    const id = ++toastId.current
    setToasts(prev => [...prev, { id, msg }])
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, out: true } : t))
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 380)
    }, dur)
  }, [])

  const go = useCallback((view, extra, noScroll) => {
    const next = { view, id: null, name: null, titleAlt: null, ep: null, lang: route.lang || 'sub', q: '', ...extra }
    setRoute(next)
    try { history.pushState(next, '', buildURL(next)) } catch {}
    if (!noScroll) window.scrollTo(0, 0)
  }, [route.lang])

  return (
    <AppCtx.Provider value={{ route, setRoute, go, filter, setFilter, toast, pbStart, pbDone, pbarW, pbarDone, toasts, theme, toggleTheme }}>
      {children}
    </AppCtx.Provider>
  )
}

export function useApp() { return useContext(AppCtx) }
