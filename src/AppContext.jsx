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

  /* Progress bar */
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

  /* Toast */
  const toast = useCallback((msg, dur = 2200) => {
    const id = ++toastId.current
    setToasts(prev => [...prev, { id, msg }])
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, out: true } : t))
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 380)
    }, dur)
  }, [])

  /* Router */
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

/* URL helpers */
export function buildURL(s) {
  const p = new URLSearchParams()
  if (s.view && s.view !== 'landing' && s.view !== 'home') p.set('v', s.view)
  if (s.id) p.set('id', s.id)
  if (s.ep) p.set('ep', s.ep)
  if (s.lang && s.lang !== 'sub') p.set('l', s.lang)
  if (s.q) p.set('q', s.q)
  const qs = p.toString()
  return location.pathname + (qs ? '?' + qs : '')
}

export function fromURL() {
  const p = new URLSearchParams(location.search)
  return {
    view: p.get('v') || 'home',
    id: p.get('id') ? +p.get('id') : null,
    name: p.get('n') || null,
    titleAlt: p.get('na') || null,
    ep: p.get('ep') ? +p.get('ep') : null,
    lang: p.get('l') || 'sub',
    q: p.get('q') || ''
  }
}
