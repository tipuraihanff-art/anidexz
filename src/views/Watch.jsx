import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useApp } from '../AppContext.jsx'
import { buildURL } from '../AppContext.jsx'
import { saveCW } from '../storage.js'
import { Spin } from '../components/Shared.jsx'

const BASE       = 'https://anidexz-api.vercel.app/aniwatch'
const HINDI_BASE = 'https://anime-world-india-api-jade.vercel.app'

// ── Module-level cache ──
// Map<animeId, { status, episodes, hindiId }>
const hindiCache = new Map()

/* ─────────────────────────────────────────────
   API helpers
───────────────────────────────────────────── */
async function fetchEpisodes(animeId) {
  const res = await fetch(`${BASE}/episodes/${animeId}`)
  if (!res.ok) throw new Error(`Failed to fetch episodes: ${res.status}`)
  return res.json()
}

/**
 * Try multiple ID strategies to find the anime on AnimeWorldIndia.
 *
 * AniWatch IDs look like "one-piece-100" or "solo-leveling-18562".
 * AWI uses plain slugs like "one-piece" or "solo-leveling".
 *
 * Strategy order:
 *   1. Raw aniwatch ID (unlikely but free to try)
 *   2. Strip trailing numeric suffix  "one-piece-100" → "one-piece"
 *   3. Search by anime title, grab first result's ID
 */
async function loadHindiData(animeId, animeName) {
  if (hindiCache.has(animeId)) return hindiCache.get(animeId)

  const stripped  = animeId.replace(/-\d+$/, '')        // "one-piece-100" → "one-piece"
  const candidates = [...new Set([animeId, stripped])]  // dedupe if no numeric suffix

  // Strategies 1 & 2 — direct slug attempts
  for (const candidate of candidates) {
    const result = await tryFetchHindiInfo(animeId, candidate)
    if (result) return result
  }

  // Strategy 3 — search by title and use the returned ID
  if (animeName) {
    const searchId = await searchHindiId(animeName)
    if (searchId) {
      const result = await tryFetchHindiInfo(animeId, searchId)
      if (result) return result
    }
  }

  // All strategies failed
  const fail = { status: 'unavailable', episodes: [], hindiId: null }
  hindiCache.set(animeId, fail)
  return fail
}

async function tryFetchHindiInfo(cacheKey, hindiId) {
  try {
    const res = await fetch(`${HINDI_BASE}/api/info/${hindiId}`)
    if (!res.ok) return null
    const data = await res.json()

    // API may return episodes in several shapes
    const eps =
      data?.episodesList ||
      data?.episodes     ||
      data?.data?.episodes ||
      data?.season?.episodes ||
      []

    const hasContent = Array.isArray(eps) ? eps.length > 0 : !!data?.title
    if (!hasContent) return null

    const result = {
      status: 'available',
      episodes: Array.isArray(eps) ? eps : [],
      hindiId,
    }
    hindiCache.set(cacheKey, result)
    return result
  } catch {
    return null
  }
}

async function searchHindiId(animeName) {
  try {
    const res = await fetch(
      `${HINDI_BASE}/api/search?q=${encodeURIComponent(animeName)}`
    )
    if (!res.ok) return null
    const data  = await res.json()
    const items = data?.data?.items || data?.items || []
    return items[0]?.id || null
  } catch {
    return null
  }
}

/**
 * Build the episode ID for /api/embed/.
 * AWI embed IDs look like "spy-x-family-3x1" (hindiSlug-SeasonxEpisode).
 * We check the episodesList from /api/info first, then fall back to "slug-1xN".
 */
function resolveHindiEpisodeId(hindiId, hindiEpisodes, epNum) {
  if (!hindiId) return null

  if (Array.isArray(hindiEpisodes) && hindiEpisodes.length) {
    const match = hindiEpisodes.find(e =>
      e.episodeNo === epNum ||
      e.episode   === epNum ||
      e.number    === epNum ||
      e.ep        === epNum ||
      Number(e.episodeNo) === epNum ||
      Number(e.episode)   === epNum
    )
    if (match?.id)        return match.id
    if (match?.episodeId) return match.episodeId
  }

  // Fallback: assume season 1
  return `${hindiId}-1x${epNum}`
}

async function fetchHindiEmbed(episodeId) {
  try {
    const res = await fetch(`${HINDI_BASE}/api/embed/${episodeId}`)
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

function pickEmbedUrl(data) {
  if (!data) return null
  const servers = data?.servers || data?.links || data?.sources || []
  if (Array.isArray(servers) && servers.length) {
    const play = servers.find(s =>
      s.name?.toLowerCase().includes('play') ||
      s.server?.toLowerCase().includes('play')
    )
    return play?.url || play?.link || servers[0]?.url || servers[0]?.link || null
  }
  return data?.url || data?.embed || null
}

function extractNumericEpId(rawEpisodeId) {
  if (!rawEpisodeId) return ''
  const str   = String(rawEpisodeId)
  const match = str.match(/ep=(\d+)/)
  if (match)             return match[1]
  if (/^\d+$/.test(str)) return str
  return str
}

function megaplayUrl(numericEpId, lang) {
  return `https://megaplay.buzz/stream/s-2/${numericEpId}/${lang}`
}

/* ─────────────────────────────────────────────
   Hindi Check Popup
───────────────────────────────────────────── */
function HindiPopup({ status, countdown, onDismiss }) {
  if (!status) return null

  const overlay = {
    position: 'fixed', inset: 0, zIndex: 9999,
    background: 'rgba(0,0,0,0.65)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }
  const modal = {
    background: 'var(--bg, #1a1a1a)',
    border: '1px solid var(--brd, #333)',
    borderRadius: '14px',
    padding: '2rem 2.5rem',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: '14px',
    minWidth: '270px', maxWidth: '320px',
    textAlign: 'center',
  }

  const circumference = 2 * Math.PI * 26  // ~163.4
  const offset = circumference * (1 - Math.max(0, countdown) / 15)

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onDismiss()}>
      <div style={modal}>

        {/* ── CHECKING ── */}
        {status === 'checking' && <>
          <div style={{ position: 'relative', width: 64, height: 64 }}>
            <svg width="64" height="64" viewBox="0 0 64 64"
              style={{ transform: 'rotate(-90deg)', display: 'block' }}>
              <circle cx="32" cy="32" r="26" fill="none"
                stroke="var(--dim, #444)" strokeWidth="5" />
              <circle cx="32" cy="32" r="26" fill="none"
                stroke="#ff6b00" strokeWidth="5"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1s linear' }} />
            </svg>
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '20px', fontWeight: 600, color: 'var(--fg, #fff)',
            }}>
              {Math.max(0, countdown)}
            </div>
          </div>

          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            border: '3px solid var(--dim, #444)', borderTopColor: '#ff6b00',
            animation: 'hspinner 0.8s linear infinite',
          }} />

          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--fg, #fff)' }}>
            Checking Hindi availability
          </div>
          <div style={{ fontSize: '13px', color: 'var(--dim, #aaa)', lineHeight: 1.5 }}>
            Searching for <strong style={{ color: 'var(--fg, #fff)' }}>हिंदी Dub</strong> across
            multiple sources…
          </div>
        </>}

        {/* ── AVAILABLE ── */}
        {status === 'available' && <>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'rgba(42,157,42,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="26" height="26" fill="none" stroke="#2a9d2a" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <span style={{
            fontSize: '10px', background: '#ff6b00', color: '#fff',
            borderRadius: '4px', padding: '2px 8px', fontWeight: 700, letterSpacing: '0.04em',
          }}>HI</span>
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#2a9d2a' }}>
            Hindi Dub available!
          </div>
          <div style={{ fontSize: '13px', color: 'var(--dim, #aaa)' }}>
            Loading Hindi stream for this episode…
          </div>
          <div style={{
            width: 24, height: 24, borderRadius: '50%',
            border: '3px solid var(--dim, #444)', borderTopColor: '#ff6b00',
            animation: 'hspinner 0.8s linear infinite',
          }} />
        </>}

        {/* ── UNAVAILABLE ── */}
        {status === 'unavailable' && <>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'rgba(150,150,150,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="26" height="26" fill="none" stroke="var(--dim, #888)" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--fg, #fff)' }}>
            Hindi Dub not available
          </div>
          <div style={{ fontSize: '13px', color: 'var(--dim, #aaa)', lineHeight: 1.5 }}>
            Couldn't find a Hindi dub for this anime. Switching back to Sub.
          </div>
          <button className="bp" onClick={onDismiss} style={{ marginTop: '4px' }}>
            Dismiss
          </button>
        </>}

      </div>
      <style>{`@keyframes hspinner { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Iframe Player
───────────────────────────────────────────── */
function IframePlayer({ numericEpId, lang, hindiSrc }) {
  const src = lang === 'hindi' && hindiSrc
    ? hindiSrc
    : megaplayUrl(numericEpId, lang === 'hindi' ? 'sub' : lang)

  if (!numericEpId && !hindiSrc) return <div className="pload"><Spin /></div>

  return (
    <iframe
      key={src}
      src={src}
      width="100%" height="100%"
      frameBorder="0" scrolling="no"
      allowFullScreen
      allow="autoplay; fullscreen; picture-in-picture"
      style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        border: 'none', background: '#000',
      }}
    />
  )
}

/* ─────────────────────────────────────────────
   Hindi Status Badge
───────────────────────────────────────────── */
function HindiBadge({ status }) {
  if (status === 'checking') return (
    <span style={{ fontSize: '10px', color: 'var(--dim)', marginLeft: '4px' }}>…</span>
  )
  if (status === 'available') return (
    <span style={{
      fontSize: '9px', background: '#ff6b00', color: '#fff',
      borderRadius: '3px', padding: '1px 4px', marginLeft: '4px',
      fontWeight: 700, letterSpacing: '0.03em',
    }}>HI</span>
  )
  if (status === 'unavailable') return (
    <span style={{
      fontSize: '9px', background: 'var(--dim)', color: '#fff',
      borderRadius: '3px', padding: '1px 4px', marginLeft: '4px',
      fontWeight: 700, opacity: 0.6,
    }}>—</span>
  )
  return null
}

/* ─────────────────────────────────────────────
   Main Watch Page
───────────────────────────────────────────── */
export default function Watch() {
  const { route, go, pbStart, pbDone, toast } = useApp()
  const { id, ep, lang: initLang } = route

  const [lang,          setLang]         = useState(initLang || 'sub')
  const [theatre,       setTheatre]      = useState(false)
  const [autoNext,      setAutoNext]     = useState(false)
  const [episodes,      setEpisodes]     = useState([])
  const [numericEpId,   setNumericEpId]  = useState(null)
  const [animeInfo,     setAnimeInfo]    = useState(null)
  const [loading,       setLoading]      = useState(true)
  const [error,         setError]        = useState(null)

  // Hindi state — hydrate from cache immediately if available
  const [hindiStatus,   setHindiStatus]   = useState(() => hindiCache.has(id) ? hindiCache.get(id).status   : 'idle')
  const [hindiEpisodes, setHindiEpisodes] = useState(() => hindiCache.has(id) ? hindiCache.get(id).episodes : [])
  const [hindiId,       setHindiId]       = useState(() => hindiCache.has(id) ? hindiCache.get(id).hindiId  : null)
  const [hindiSrc,      setHindiSrc]      = useState(null)
  const [hindiLoading,  setHindiLoading]  = useState(false)

  // Popup state
  const [hindiPopup,      setHindiPopup]      = useState(null)   // null | 'checking' | 'available' | 'unavailable'
  const [hindiCountdown,  setHindiCountdown]  = useState(15)

  const autoNextTimer       = useRef(null)
  const hindiCheckTimer     = useRef(null)
  const hindiCountdownTimer = useRef(null)
  const pwrapRef = useRef(null)
  const swipeX   = useRef(null)
  const swipeY   = useRef(null)

  // ── Main episode load ──
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

  // ── Silent background Hindi check after 15s ──
  useEffect(() => {
    if (!id) return

    if (hindiCache.has(id)) {
      const c = hindiCache.get(id)
      setHindiStatus(c.status)
      setHindiEpisodes(c.episodes)
      setHindiId(c.hindiId)
      return
    }

    setHindiStatus('idle')
    hindiCheckTimer.current = setTimeout(() => {
      if (hindiCache.has(id)) return  // already resolved via button click
      const name = animeInfo?.title || route.name || ''
      loadHindiData(id, name).then(result => {
        setHindiStatus(result.status)
        setHindiEpisodes(result.episodes)
        setHindiId(result.hindiId)
        // If popup is still open in checking state, resolve it
        setHindiPopup(prev => {
          if (prev !== 'checking') return prev
          if (result.status === 'available') {
            setLang('hindi')
            return 'available'
          }
          setTimeout(() => { setHindiPopup(null); setLang('sub') }, 2500)
          return 'unavailable'
        })
      })
    }, 15000)

    return () => {
      clearTimeout(hindiCheckTimer.current)
      clearInterval(hindiCountdownTimer.current)
    }
  }, [id])

  // ── Load Hindi embed when lang switches to hindi ──
  useEffect(() => {
    if (lang !== 'hindi') { setHindiSrc(null); return }
    if (hindiStatus !== 'available') return

    setHindiLoading(true)
    setHindiSrc(null)

    const epNum     = Number(ep)
    const episodeId = resolveHindiEpisodeId(hindiId, hindiEpisodes, epNum)

    if (!episodeId) {
      toast('Could not resolve Hindi episode ID')
      setLang('sub')
      setHindiLoading(false)
      setHindiPopup(null)
      return
    }

    fetchHindiEmbed(episodeId)
      .then(data => {
        const url = pickEmbedUrl(data)
        if (url) {
          setHindiSrc(url)
          toast('Hindi Dub loaded ✓')
          setHindiLoading(false)
          setHindiPopup(null)
          return
        }
        // Last resort: generic scraper
        const scrapeTarget = `${HINDI_BASE}/watch/${episodeId}`
        return fetch(`${HINDI_BASE}/api/scrape?url=${encodeURIComponent(scrapeTarget)}`)
          .then(r => r.json())
          .then(scraped => {
            const src = scraped?.embedUrl || scraped?.url || scraped?.iframe
            if (src) {
              setHindiSrc(src)
              toast('Hindi Dub loaded ✓')
            } else {
              toast('Hindi not available for this episode')
              setLang('sub')
            }
            setHindiPopup(null)
          })
          .catch(() => {
            toast('Hindi not available for this episode')
            setLang('sub')
            setHindiPopup(null)
          })
          .finally(() => setHindiLoading(false))
      })
      .catch(() => {
        toast('Failed to load Hindi dub')
        setLang('sub')
        setHindiLoading(false)
        setHindiPopup(null)
      })
  }, [lang, ep, hindiEpisodes, hindiStatus, hindiId])

  // ── Update numericEpId when ep changes ──
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

  // ── Sync URL ──
  useEffect(() => {
    if (!animeInfo) return
    const next = { view: 'watch', id, name: animeInfo.title, titleAlt: animeInfo.title, ep, lang }
    try { history.replaceState(next, '', buildURL(next)) } catch {}
  }, [lang, ep])

  // ── Auto-next ──
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

  // ── Keyboard shortcuts ──
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

  // ── Loading / error ──
  if (loading) return <Spin />

  if (error) return (
    <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--dim)' }}>
      <p style={{ color: 'var(--fg)', fontSize: '20px', marginBottom: '10px' }}>Failed to load</p>
      <p style={{ fontSize: '13px', marginBottom: '20px' }}>{error}</p>
      <button className="bp" onClick={() => go('home')}>Go Home</button>
    </div>
  )

  const { title } = animeInfo
  const maxEp  = episodes[episodes.length - 1]?.episodeNo || episodes.length
  const epNum  = Number(ep)
  const stitle = title.length > 22 ? title.slice(0, 22) + '...' : title
  const epNums = episodes.map(e => e.episodeNo)

  // ── Hindi button handler ──
  function handleLangChange(newLang) {
    if (newLang !== 'hindi') { setLang(newLang); return }

    if (hindiStatus === 'available') {
      setHindiPopup('available')
      setLang('hindi')
      return
    }

    if (hindiStatus === 'unavailable') {
      setHindiPopup('unavailable')
      setTimeout(() => setHindiPopup(null), 3000)
      return
    }

    // idle or checking — show popup, fire check immediately
    setHindiPopup('checking')
    setHindiCountdown(15)
    clearTimeout(hindiCheckTimer.current)
    clearInterval(hindiCountdownTimer.current)

    let c = 15
    hindiCountdownTimer.current = setInterval(() => {
      c--
      setHindiCountdown(c)
      if (c <= 0) clearInterval(hindiCountdownTimer.current)
    }, 1000)

    setHindiStatus('checking')
    const name = animeInfo?.title || route.name || ''
    loadHindiData(id, name).then(result => {
      clearInterval(hindiCountdownTimer.current)
      setHindiStatus(result.status)
      setHindiEpisodes(result.episodes)
      setHindiId(result.hindiId)

      if (result.status === 'available') {
        setHindiPopup('available')
        setLang('hindi')
      } else {
        setHindiPopup('unavailable')
        setTimeout(() => { setHindiPopup(null); setLang('sub') }, 3000)
      }
    })
  }

  function dismissHindiPopup() {
    setHindiPopup(null)
    clearInterval(hindiCountdownTimer.current)
    if (hindiPopup === 'checking' || hindiStatus === 'unavailable' || hindiPopup === 'unavailable') {
      setLang('sub')
    }
  }

  return (
    <>
      <HindiPopup
        status={hindiPopup}
        countdown={hindiCountdown}
        onDismiss={dismissHindiPopup}
      />

      <div className={'wlayout' + (theatre ? ' theatre' : '')} id="wlayout">
        <div style={{ minWidth: 0, overflow: 'hidden' }}>
          <div
            className="pwrap"
            id="pwrap"
            ref={pwrapRef}
            onTouchStart={e => {
              if (e.touches.length === 1) {
                swipeX.current = e.touches[0].clientX
                swipeY.current = e.touches[0].clientY
              }
            }}
            onTouchEnd={e => {
              if (swipeX.current === null) return
              const dx = e.changedTouches[0].clientX - swipeX.current
              const dy = e.changedTouches[0].clientY - swipeY.current
              if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
                if (dx < 0 && epNum < maxEp) {
                  go('watch', { id, name: title, titleAlt: title, ep: epNum + 1, lang })
                  toast('Next ep')
                } else if (dx > 0 && epNum > 1) {
                  go('watch', { id, name: title, titleAlt: title, ep: epNum - 1, lang })
                  toast('Prev ep')
                }
              }
              swipeX.current = null
              swipeY.current = null
            }}
          >
            {hindiLoading
              ? <div className="pload"><Spin /></div>
              : <IframePlayer numericEpId={numericEpId} lang={lang} hindiSrc={hindiSrc} />
            }
          </div>

          <div className="winfo">
            <div className="wt">{title}</div>
            <div className="wet">Episode {ep}</div>
            <div className="wnav">
              {epNum > 1 && (
                <button className="bs"
                  onClick={() => go('watch', { id, name: title, titleAlt: title, ep: epNum - 1, lang })}>
                  ◀ Prev
                </button>
              )}
              {epNum < maxEp && (
                <button className="bp"
                  onClick={() => go('watch', { id, name: title, titleAlt: title, ep: epNum + 1, lang })}>
                  Next ▶
                </button>
              )}
              <button
                className={'wctrl' + (theatre ? ' on' : '')}
                title="Theatre Mode (T)"
                onClick={() => setTheatre(v => !v)}
              >
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

              {/* Language Toggle */}
              <div className="ltog" style={{ marginLeft: 'auto' }}>
                <button
                  className={'lbtn' + (lang === 'sub' ? ' on' : '')}
                  onClick={() => handleLangChange('sub')}
                >SUB</button>
                <button
                  className={'lbtn' + (lang === 'dub' ? ' on' : '')}
                  onClick={() => handleLangChange('dub')}
                >DUB</button>
                <button
                  className={'lbtn' + (lang === 'hindi' ? ' on' : '')}
                  onClick={() => handleLangChange('hindi')}
                  title={
                    hindiStatus === 'available'   ? 'Hindi Dub available' :
                    hindiStatus === 'checking'    ? 'Checking Hindi availability…' :
                    hindiStatus === 'unavailable' ? 'Hindi Dub not available' :
                    'Click to check Hindi availability'
                  }
                  style={{
                    position: 'relative',
                    opacity: hindiStatus === 'unavailable' ? 0.45 : 1,
                    cursor: 'pointer',
                  }}
                >
                  हिंदी
                  <HindiBadge status={hindiStatus} />
                </button>
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
