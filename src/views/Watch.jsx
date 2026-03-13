import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useApp } from '../AppContext.jsx'
import { buildURL } from '../AppContext.jsx'
import { alQuery, Q_DETAIL, loadEpisodes, resolveEpId, _c } from '../api.js'
import { alTitle, alTitleAlt, alImg } from '../helpers.js'
import { saveCW } from '../storage.js'
import { Spin } from '../components/Shared.jsx'

/* ── Player component ── */
function Player({ name, titleAlt, ep, lang, onLoadStart }) {
  const [state, setState] = useState('loading') // loading | playing | error
  const [src, setSrc] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    setState('loading')
    setSrc('')
    resolveEpId(name, titleAlt, ep)
      .then(epId => {
        setSrc(`${_c}/${epId}/${lang}`)
        setState('playing')
      })
      .catch(err => {
        const isDub = lang === 'dub'
        setErrorMsg(isDub
          ? 'The dub for this episode may not be available yet. Try switching to SUB.'
          : 'This episode could not be loaded. Please try again.')
        setState('error')
      })
  }, [name, titleAlt, ep, lang])

  if (state === 'loading') return (
    <div className="pload"><Spin /></div>
  )

  if (state === 'error') return (
    <div className="perror">
      <svg width="36" height="36" fill="none" stroke="var(--acc2)" strokeWidth="1.5" viewBox="0 0 24 24" style={{ marginBottom: '4px' }}>
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r=".6" fill="var(--acc2)"/>
      </svg>
      <h4>Could not load episode</h4>
      <p>{errorMsg}</p>
      <button className="bp" onClick={() => setState('loading')} style={{ fontSize: '12px', padding: '8px 18px', marginTop: '4px' }}>Retry</button>
    </div>
  )

  return (
    <iframe
      src={src}
      allowFullScreen
      allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
      title={`Episode ${ep}`}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none', display: 'block' }}
    />
  )
}

export default function Watch() {
  const { route, go, pbStart, pbDone, toast } = useApp()
  const { id, ep, lang: initLang } = route
  const [lang, setLang] = useState(initLang || 'sub')
  const [theatre, setTheatre] = useState(false)
  const [autoNext, setAutoNext] = useState(false)
  const [meta, setMeta] = useState(null) // { title, titleAlt, poster, eps }
  const [loading, setLoading] = useState(true)
  const autoNextTimer = useRef(null)
  const pwrapRef = useRef(null)
  const swipeX = useRef(null)
  const swipeY = useRef(null)

  useEffect(() => {
    if (!id || !ep) { go('home'); return }
    pbStart()
    setLoading(true)
    alQuery(Q_DETAIL(), { id })
      .then(d => {
        const m = d?.Media
        if (!m) throw new Error('Not found')
        const title = alTitle(m)
        const titleAlt = alTitleAlt(m)
        const poster = alImg(m)
        return loadEpisodes(m.idMal).then(eps => {
          setMeta({ title, titleAlt, poster, eps })
          saveCW(id, ep, lang, title, titleAlt, poster)
          document.title = `${title} - Episode ${ep} - anidexz`
          setLoading(false)
          pbDone()
        })
      })
      .catch(() => { setLoading(false); pbDone() })
  }, [id])

  // Sync lang changes to URL without pushing a new history entry
  useEffect(() => {
    if (!meta) return
    const next = { view: 'watch', id, name: meta.title, titleAlt: meta.titleAlt, ep, lang }
    try { history.replaceState(next, '', buildURL(next)) } catch {}
  }, [lang, ep])

  // Save continue watching when ep/lang changes
  useEffect(() => {
    if (meta) {
      saveCW(id, ep, lang, meta.title, meta.titleAlt, meta.poster)
      document.title = `${meta.title} - Episode ${ep} - anidexz`
    }
  }, [ep, lang, meta])

  // Auto-next timer
  function startAutoNext(maxEp) {
    clearInterval(autoNextTimer.current)
    if (!autoNext || ep >= maxEp) return
    let count = 5
    autoNextTimer.current = setInterval(() => {
      count--
      toast(`Next episode in ${count}s`)
      if (count <= 0) {
        clearInterval(autoNextTimer.current)
        go('watch', { id, name: meta.title, titleAlt: meta.titleAlt, ep: ep + 1, lang })
      }
    }, 1000)
  }

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return
      if (!meta) return
      const maxEp = meta.eps.length
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          if (ep > 1) go('watch', { id, name: meta.title, titleAlt: meta.titleAlt, ep: ep - 1, lang })
          break
        case 'ArrowRight':
          e.preventDefault()
          if (ep < maxEp) go('watch', { id, name: meta.title, titleAlt: meta.titleAlt, ep: ep + 1, lang })
          break
        case 'f': case 'F':
          e.preventDefault()
          if (pwrapRef.current) {
            if (document.fullscreenElement) document.exitFullscreen()
            else pwrapRef.current.requestFullscreen?.()
          }
          break
        case 't': case 'T':
          e.preventDefault()
          setTheatre(v => !v)
          break
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [meta, ep, lang, id])

  if (loading || !meta) return <Spin />

  const { title, titleAlt, poster, eps } = meta
  const maxEp = eps.length
  const stitle = title.length > 22 ? title.slice(0, 22) + '...' : title
  const CHUNK = 100

  return (
    <>
      <div className={'wlayout' + (theatre ? ' theatre' : '')} id="wlayout">
        {/* Player column */}
        <div style={{ minWidth: 0, overflow: 'hidden' }}>
          <div
            className="pwrap"
            id="pwrap"
            ref={pwrapRef}
            onTouchStart={e => { if (e.touches.length === 1) { swipeX.current = e.touches[0].clientX; swipeY.current = e.touches[0].clientY } }}
            onTouchEnd={e => {
              if (swipeX.current === null) return
              const dx = e.changedTouches[0].clientX - swipeX.current
              const dy = e.changedTouches[0].clientY - swipeY.current
              if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
                if (dx < 0 && ep < maxEp) { go('watch', { id, name: title, titleAlt, ep: ep + 1, lang }); toast('Next ep') }
                else if (dx > 0 && ep > 1) { go('watch', { id, name: title, titleAlt, ep: ep - 1, lang }); toast('Prev ep') }
              }
              swipeX.current = null; swipeY.current = null
            }}
          >
            <Player name={title} titleAlt={titleAlt} ep={ep} lang={lang} />
          </div>

          <div className="winfo">
            <div className="wt">{title}</div>
            <div className="wet">Episode {ep}</div>
            <div className="wnav">
              {ep > 1 && <button className="bs" onClick={() => go('watch', { id, name: title, titleAlt, ep: ep - 1, lang })}>◀ Prev</button>}
              {maxEp > 0 && ep < maxEp && <button className="bp" onClick={() => go('watch', { id, name: title, titleAlt, ep: ep + 1, lang })}>Next ▶</button>}
              <button
                className={'wctrl' + (theatre ? ' on' : '')}
                id="theatre-btn"
                title={theatre ? 'Exit Theatre (T)' : 'Theatre Mode (T)'}
                onClick={() => setTheatre(v => !v)}
              >
                <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
                </svg> Theatre
              </button>
              <button
                className={'wctrl' + (autoNext ? ' on' : '')}
                onClick={() => {
                  const next = !autoNext
                  setAutoNext(next)
                  toast(next ? 'Auto-Next: ON' : 'Auto-Next: OFF')
                  if (next) startAutoNext(maxEp)
                  else clearInterval(autoNextTimer.current)
                }}
              >
                <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <polygon points="5 3 19 12 5 21 5 3"/><line x1="19" x2="19" y1="3" y2="21"/>
                </svg> Auto-Next
              </button>
              <div className="ltog" style={{ marginLeft: 'auto' }}>
                <button className={'lbtn' + (lang === 'sub' ? ' on' : '')} onClick={() => setLang('sub')}>SUB</button>
                <button className={'lbtn' + (lang === 'dub' ? ' on' : '')} onClick={() => setLang('dub')}>DUB</button>
              </div>
            </div>
            <div className="kb-hint">
              <span><kbd className="kb-key">Left</kbd> Prev ep</span>
              <span><kbd className="kb-key">Right</kbd> Next ep</span>
              <span><kbd className="kb-key">F</kbd> Fullscreen</span>
              <span><kbd className="kb-key">T</kbd> Theatre</span>
            </div>
          </div>
        </div>

        {/* Sidebar episode list */}
        <div className="sbar">
          <div className="sbar-title">
            <img src={poster} style={{ width: '26px', height: '26px', objectFit: 'cover', borderRadius: '4px', flexShrink: 0 }} loading="lazy" alt="" />
            {stitle}
          </div>
          <div className="eplist" id="eplist">
            {eps.map(n => (
              <div
                key={n}
                className={'epli' + (n === ep ? ' on' : '')}
                onClick={() => go('watch', { id, name: title, titleAlt, ep: n, lang })}
                ref={n === ep ? el => el?.scrollIntoView({ block: 'center' }) : null}
              >
                <div className="epnum">{n}</div>
                <span className="epitxt">Episode {n}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile episode grid */}
      <div className="mob-ep-wrap">
        <div className="mob-ep-title">Episodes</div>
        <div className="epgrid">
          {eps.map(n => (
            <button
              key={n}
              className={'epbtn' + (n === ep ? ' on' : '')}
              onClick={() => go('watch', { id, name: title, titleAlt, ep: n, lang })}
            >{n}</button>
          ))}
        </div>
      </div>
    </>
  )
}
