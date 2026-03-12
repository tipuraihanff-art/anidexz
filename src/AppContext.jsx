import React, { createContext, useContext, useState, useCallback, useRef } from 'react'

const AppCtx = createContext(null)

export function AppProvider({ children }) {
  const [route, setRoute] = useState(() => fromURL())
  const [filter, setFilter] = useState({ genre: '', type: '', status: '', year: '', score: '', order: 'SCORE_DESC' })
  const [toasts, setToasts] = useState([])
  const [pbarW, setPbarW] = useState(0)
  const [pbarDone, setPbarDone] = useState(false)
  const pbarTimer = useRef(null)
  const toastId = useRef(0)

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
    <AppCtx.Provider value={{ route, setRoute, go, filter, setFilter, toast, pbStart, pbDone, pbarW, pbarDone, toasts }}>
      {children}
    </AppCtx.Provider>
  )
}

export function useApp() { return useContext(AppCtx) }

// Pretty path shown in address bar per view (purely cosmetic, state lives in history.state)
const VIEW_PATH = {
  landing:   '/',
  home:      '/',
  trending:  '/trending',
  movies:    '/movies',
  updated:   '/updated',
  schedule:  '/schedule',
  mylist:    '/my-list',
  browse:    '/browse',
  anime:     '/anime',
  watch:     '/watch',
  search:    '/search',
  community: '/community',
  domains:   '/domains',
}
const PATH_VIEW = Object.fromEntries(Object.entries(VIEW_PATH).map(([v, p]) => [p, v]))

export function buildURL(s) {
  // Show pretty path - full state is stored in history.state, never in the URL
  return VIEW_PATH[s.view] || '/'
}

export function fromURL() {
  // Prefer history.state (set by pushState on every navigation - survives refresh via Vercel rewrite)
  const st = history.state
  if (st && st.view) return st
  // Fallback: derive view from pathname (handles bookmarked pretty URLs)
  const view = PATH_VIEW[location.pathname] || PATH_VIEW[location.pathname.replace(/\/$/, '')] || 'landing'
  return { view, id: null, name: null, titleAlt: null, ep: null, lang: 'sub', q: '' }
}
