import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useApp } from '../AppContext.jsx'
import { buildURL } from '../AppContext.jsx'
import { saveCW } from '../storage.js'
import { Spin } from '../components/Shared.jsx'

const BASE = 'https://anidexz-api.vercel.app/aniwatch'

/* ── API ── */
async function fetchEpisodes(animeId) {
  const res = await fetch(`${BASE}/episodes/${animeId}`)
  if (!res.ok) throw new Error(`Failed to fetch episodes: ${res.status}`)
  return res.json()
}

// Extract just the numeric ep ID from episodeId string
// "one-piece-100?ep=84802" → "84802"
function extractNumericEpId(rawEpisodeId) {
  if (!rawEpisodeId) return ''
  const str = String(rawEpisodeId)
  const match = str.match(/ep=(\d+)/)
  if (match) return match[1]
  if (/^\d+$/.test(str)) return str
  return str
}

// Build megaplay iframe URL
// https://megaplay.buzz/stream/s-2/{numeric-ep-id}/{language}
function megaplayUrl(numericEpId, lang) {
  return `https://megaplay.buzz/stream/s-2/${numericEpId}/${lang}`
}

/* ── Iframe Player ── */
function IframePlayer({ numericEpId, lang }) {
  const src = megaplayUrl(numericEpId, lang)

  if (!numericEpId) return <div className="pload"><Spin /></div>

  return (
    <iframe
      key={src} // remount on src change
      src={src}
      width="100%"
      height="100%"
      frameBorder="0"
      scrolling="no"
      allowFullScreen
      allow="autoplay; fullscreen; picture-in-picture"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none', background: '#000' }}
    />
  )
}

/* ── Main Watch page ── */
export default function Watch() {
  const { route, go, pbStart, pbDone, toast } = useApp()
  const { id, ep, lang: initLang } = route
  const [lang, setLang] = useState(initLang || 'sub')
  const [theatre, setTheatre] = useState(false)
  const [autoNext, setAutoNext] = useState(false)
  const [episodes, setEpisodes] = useState([])
  const [numericEpId, setNumericEpId] = useState(null)
  const [animeInfo, setAnimeInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const autoNextTimer = useRef(null)
  const pwrapRef = useRef(null)
  const swipeX = useRef(null)
  const swipeY = useRef(null)

  // Load episode list on mount
  useEffect(() => {
    if (!id || !ep) { go('home'); return }
    pbStart()
    setLoading(true)
    setError(null)

    fetchEpisodes(id)
      .then(data => {
        const eps = data?.episodes || []
        if (!eps.length) throw new Error('No episodes found')
        setEpisodes(eps)

        const epObj = eps.find(e => e.episodeNo === Number(ep))
        if (!epObj) throw new Error(`Episode ${ep} not found`)

        setNumericEpId(extractNumericEpId(epObj.episodeId))

        const title = route.name || id
        setAnimeInfo({ title, poster: '' })
        saveCW(id, Number(ep), lang, title, title, '')
        document.title = `${title} - Episode ${ep} - anidexz`
        setLoading(false)
        pbDone()
      })
      .catch(err => {
        console.error('Watch load error:', err)
        setError(err.message)
        setLoading(false)
        pbDone()
      })
  }, [id])

  // Update numericEpId when ep changes
  useEffect(() => {
    if (!episodes.length) return
    const epObj = episodes.find(e => e.episodeNo === Number(ep))
    if (!epObj) return
    setNumericEpId(extractNumericEpId(epObj.episodeId))
    if (animeInfo) {
      saveCW(id, Number(ep), lang, animeInfo.title, animeInfo.title, '')
      document.title = `${animeInfo.title} - Episode ${ep} - anidexz`
    }
  }, [ep, episodes])

  // Sync URL
  useEffect(() => {
    if (!animeInfo) return
    const next = { view: 'watch', id, name: animeInfo.title, titleAlt: animeInfo.title, ep, lang }
    try { history.replaceState(next, '', buildURL(next)) } catch {}
  }, [lang, ep])

  // Auto-next
  const startAutoNext = useCallback((maxEp) => {
    clearInterval(autoNextTimer.current)
    if (!autoNext || Number(ep) >= maxEp) return
    let count = 5
    autoNextTimer.current = setInterval(() => {
      count--
      toast(`Next episode in ${count}s`)
      if (count <= 0) {
        clearInterval(autoNextTimer.current)
        go('watch', { id, name: animeInfo?.title, titleAlt: animeInfo?.title, ep: Number(ep) + 1, lang })
      }
    }, 1000)
  }, [autoNext, ep, id, lang, animeInfo, go, toast])

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (!episodes.length) return
      const maxEp = episodes[episodes.length - 1].episodeNo
      const epNum = Number(ep)
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          if (epNum > 1) go('watch', { id, name: animeInfo?.title, titleAlt: animeInfo?.title, ep: epNum - 1, lang })
          break
        case 'ArrowRight':
          e.preventDefault()
          if (epNum < maxEp) go('watch', { id, name: animeInfo?.title, titleAlt: animeInfo?.title, ep: epNum + 1, lang })
          break
        case 't': case 'T':
          e.preventDefault()
          setTheatre(v => !v)
          break
        default: break
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [episodes, ep, lang, id, animeInfo])

  if (loading) return <Spin />

  if (error) return (
    <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--dim)' }}>
      <p style={{ color: 'var(--fg)', fontSize: '20px', marginBottom: '10px' }}>Failed to load</p>
      <p style={{ fontSize: '13px', marginBottom: '20px' }}>{error}</p>
      <button className="bp" onClick={() => go('home')}>Go Home</button>
    </div>
  )

  const { title } = animeInfo
  const maxEp = episodes[episodes.length - 1]?.episodeNo || episodes.length
  const epNum = Number(ep)
  const stitle = title.length > 22 ? title.slice(0, 22) + '...' : title
  const epNums = episodes.map(e => e.episodeNo)

  return (
    <>
      <div className={'wlayout' + (theatre ? ' theatre' : '')} id="wlayout">
        <div style={{ minWidth: 0, overflow: 'hidden' }}>
          <div
            className="pwrap"
            id="pwrap"
            ref={pwrapRef}
            onTouchStart={e => {
              if (e.touches.length === 1) { swipeX.current = e.touches[0].clientX; swipeY.current = e.touches[0].clientY }
            }}
            onTouchEnd={e => {
              if (swipeX.current === null) return
              const dx = e.changedTouches[0].clientX - swipeX.current
              const dy = e.changedTouches[0].clientY - swipeY.current
              if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
                if (dx < 0 && epNum < maxEp) { go('watch', { id, name: title, titleAlt: title, ep: epNum + 1, lang }); toast('Next ep') }
                else if (dx > 0 && epNum > 1) { go('watch', { id, name: title, titleAlt: title, ep: epNum - 1, lang }); toast('Prev ep') }
              }
              swipeX.current = null; swipeY.current = null
            }}
          >
            <IframePlayer numericEpId={numericEpId} lang={lang} />
          </div>

          <div className="winfo">
            <div className="wt">{title}</div>
            <div className="wet">Episode {ep}</div>
            <div className="wnav">
              {epNum > 1 && (
                <button className="bs" onClick={() => go('watch', { id, name: title, titleAlt: title, ep: epNum - 1, lang })}>◀ Prev</button>
              )}
              {epNum < maxEp && (
                <button className="bp" onClick={() => go('watch', { id, name: title, titleAlt: title, ep: epNum + 1, lang })}>Next ▶</button>
              )}
              <button className={'wctrl' + (theatre ? ' on' : '')} title="Theatre Mode (T)" onClick={() => setTheatre(v => !v)}>
                <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
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
                  <polygon points="5 3 19 12 5 21 5 3" /><line x1="19" x2="19" y1="3" y2="21" />
                </svg> Auto-Next
              </button>
              <div className="ltog" style={{ marginLeft: 'auto' }}>
                <button className={'lbtn' + (lang === 'sub' ? ' on' : '')} onClick={() => setLang('sub')}>SUB</button>
                <button className={'lbtn' + (lang === 'dub' ? ' on' : '')} onClick={() => setLang('dub')}>DUB</button>
              </div>
            </div>
            <div className="kb-hint">
              <span><kbd className="kb-key">←</kbd> Prev ep</span>
              <span><kbd className="kb-key">→</kbd> Next ep</span>
              <span><kbd className="kb-key">T</kbd> Theatre</span>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="sbar">
          <div className="sbar-title">{stitle}</div>
          <div className="eplist" id="eplist">
            {epNums.map(n => (
              <div
                key={n}
                className={'epli' + (n === epNum ? ' on' : '')}
                onClick={() => go('watch', { id, name: title, titleAlt: title, ep: n, lang })}
                ref={n === epNum ? el => el?.scrollIntoView({ block: 'center' }) : null}
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
          {epNums.map(n => (
            <button
              key={n}
              className={'epbtn' + (n === epNum ? ' on' : '')}
              onClick={() => go('watch', { id, name: title, titleAlt: title, ep: n, lang })}
            >{n}</button>
          ))}
        </div>
      </div>
    </>
  )
}
