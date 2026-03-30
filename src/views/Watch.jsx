import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useApp } from '../AppContext.jsx'
import { buildURL } from '../AppContext.jsx'
import { saveCW } from '../storage.js'
import { Spin } from '../components/Shared.jsx'

const BASE       = 'https://anidexz-api.vercel.app/aniwatch'
const HINDI_BASE = 'https://anime-world-india-api-jade.vercel.app'

// Module-level cache
const hindiCache = new Map()

async function fetchEpisodes(animeId) {
  const res = await fetch(`${BASE}/episodes/${animeId}`)
  if (!res.ok) throw new Error(`Failed to fetch episodes: ${res.status}`)
  return res.json()
}

async function loadHindiData(animeId, animeName) {
  if (hindiCache.has(animeId)) return hindiCache.get(animeId)

  const stripped = animeId.replace(/-\d+$/, '')
  const candidates = [...new Set([animeId, stripped])]

  for (const candidate of candidates) {
    const result = await tryFetchHindiInfo(animeId, candidate)
    if (result) return result
  }

  if (animeName) {
    const searchId = await searchHindiId(animeName)
    if (searchId) {
      const result = await tryFetchHindiInfo(animeId, searchId)
      if (result) return result
    }
  }

  const fail = { status: 'unavailable', episodes: [], hindiId: null }
  hindiCache.set(animeId, fail)
  return fail
}

async function tryFetchHindiInfo(cacheKey, hindiId) {
  try {
    const url = `${HINDI_BASE}/api/info/${hindiId}`
    const res = await fetch(url)
    if (!res.ok) return null

    const response = await res.json()
    const data = response.data || response
    const episodes = data?.episodesList || []
    const hasHindi = data?.languages?.includes('Hindi')

    if (episodes.length === 0 && !hasHindi) return null

    const result = {
      status: 'available',
      episodes: episodes,
      hindiId: hindiId,
    }
    hindiCache.set(cacheKey, result)
    return result
  } catch (e) {
    return null
  }
}

async function searchHindiId(animeName) {
  try {
    const url = `${HINDI_BASE}/api/search?q=${encodeURIComponent(animeName)}`
    const res = await fetch(url)
    if (!res.ok) return null

    const data = await res.json()
    const items = data?.data?.items || data?.items || []
    return items[0]?.id || null
  } catch (e) {
    return null
  }
}

function resolveHindiEpisodeId(hindiId, hindiEpisodes, epNum) {
  if (!hindiId) return null

  if (Array.isArray(hindiEpisodes) && hindiEpisodes.length) {
    const match = hindiEpisodes.find(e => {
      const episodeNum = parseInt(e.episode)
      return episodeNum === epNum
    })
    
    if (match) {
      return match.id
    }
  }
  
  let season = 1
  if (epNum > 184) season = 5
  else if (epNum > 135) season = 4
  else if (epNum > 106) season = 3
  else if (epNum > 52) season = 2
  
  return `${hindiId}-${season}x${epNum}`
}

async function fetchHindiEmbed(episodeId) {
  try {
    const url = `${HINDI_BASE}/api/embed/${episodeId}`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    return data
  } catch (e) {
    return null
  }
}

function pickEmbedUrl(data) {
  if (!data) return null
  
  const servers = data?.servers || data?.links || data?.sources || []
  if (Array.isArray(servers) && servers.length) {
    for (const server of servers) {
      const url = server?.url || server?.link || server?.embedUrl
      if (url) return url
    }
  }
  
  return data?.url || data?.embed || data?.embedUrl || null
}

function extractNumericEpId(rawEpisodeId) {
  if (!rawEpisodeId) return ''
  const str = String(rawEpisodeId)
  const match = str.match(/ep=(\d+)/)
  if (match) return match[1]
  if (/^\d+$/.test(str)) return str
  return str
}

function megaplayUrl(numericEpId, lang) {
  return `https://megaplay.buzz/stream/s-2/${numericEpId}/${lang}`
}

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

  const circumference = 2 * Math.PI * 26
  const offset = circumference * (1 - Math.max(0, countdown) / 15)

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onDismiss()}>
      <div style={modal}>
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
            Searching for Hindi Dub across multiple sources...
          </div>
        </>}

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
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#2a9d2a' }}>Hindi Dub available!</div>
          <div style={{ fontSize: '13px', color: 'var(--dim, #aaa)' }}>
            Loading Hindi stream for this episode...
          </div>
          <div style={{
            width: 24, height: 24, borderRadius: '50%',
            border: '3px solid var(--dim, #444)', borderTopColor: '#ff6b00',
            animation: 'hspinner 0.8s linear infinite',
          }} />
        </>}

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
          <button className="bp" onClick={onDismiss} style={{ marginTop: '4px' }}>Dismiss</button>
        </>}
      </div>
      <style>{`@keyframes hspinner { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function IframePlayer({ numericEpId, lang, hindiSrc }) {
  const src = lang === 'hindi' && hindiSrc
    ? hindiSrc
    : megaplayUrl(numericEpId, lang === 'hindi' ? 'sub' : lang)

  if (!numericEpId && !hindiSrc) return <div className="pload"><Spin /></div>

  return (
    <iframe
      key={src}
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

function HindiBadge({ status }) {
  if (status === 'checking') return (
    <span style={{ fontSize: '10px', color: 'var(--dim)', marginLeft: '4px' }}>...</span>
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

  const [hindiStatus, setHindiStatus] = useState(() => hindiCache.has(id) ? hindiCache.get(id).status : 'idle')
  const [hindiEpisodes, setHindiEpisodes] = useState(() => hindiCache.has(id) ? hindiCache.get(id).episodes : [])
  const [hindiId, setHindiId] = useState(() => hindiCache.has(id) ? hindiCache.get(id).hindiId : null)
  const [hindiSrc, setHindiSrc] = useState(null)
  const [hindiLoading, setHindiLoading] = useState(false)

  const [hindiPopup, setHindiPopup] = useState(null)
  const [hindiCountdown, setHindiCountdown] = useState(15)

  const autoNextTimer = useRef(null)
  const hindiCheckTimer = useRef(null)
  const hindiCountdownTimer = useRef(null)
  const hindiLoadTimeout = useRef(null)
  const pwrapRef = useRef(null)
  const swipeX = useRef(null)
  const swipeY = useRef(null)

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
  }, [id, ep])

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
      if (hindiCache.has(id)) return
      const name = animeInfo?.title || route.name || ''
      loadHindiData(id, name).then(result => {
        setHindiStatus(result.status)
        setHindiEpisodes(result.episodes)
        setHindiId(result.hindiId)
      })
    }, 15000)

    return () => {
      clearTimeout(hindiCheckTimer.current)
      clearInterval(hindiCountdownTimer.current)
    }
  }, [id, animeInfo?.title, route.name])

  useEffect(() => {
    if (lang !== 'hindi') {
      setHindiSrc(null)
      setHindiLoading(false)
      if (hindiLoadTimeout.current) clearTimeout(hindiLoadTimeout.current)
      return
    }
    
    if (hindiStatus !== 'available') {
      if (hindiStatus === 'unavailable') {
        toast('Hindi dub not available for this anime')
        setLang('sub')
      }
      return
    }

    setHindiLoading(true)
    setHindiSrc(null)
    
    if (hindiLoadTimeout.current) clearTimeout(hindiLoadTimeout.current)
    hindiLoadTimeout.current = setTimeout(() => {
      if (hindiLoading) {
        toast('Hindi stream not available for this episode')
        setLang('sub')
        setHindiLoading(false)
        setHindiPopup(null)
      }
    }, 10000)

    const epNum = Number(ep)
    const episodeId = resolveHindiEpisodeId(hindiId, hindiEpisodes, epNum)

    if (!episodeId) {
      toast('Could not resolve Hindi episode ID')
      setLang('sub')
      setHindiLoading(false)
      setHindiPopup(null)
      if (hindiLoadTimeout.current) clearTimeout(hindiLoadTimeout.current)
      return
    }

    fetchHindiEmbed(episodeId)
      .then(data => {
        if (hindiLoadTimeout.current) clearTimeout(hindiLoadTimeout.current)
        
        if (!data) {
          throw new Error('No data from embed API')
        }
        
        const url = pickEmbedUrl(data)
        if (url) {
          setHindiSrc(url)
          toast('Hindi Dub loaded')
          setHindiLoading(false)
          setHindiPopup(null)
        } else {
          throw new Error('No valid embed URL found')
        }
      })
      .catch((err) => {
        console.error('Failed to load Hindi dub:', err)
        if (hindiLoadTimeout.current) clearTimeout(hindiLoadTimeout.current)
        toast('Hindi dub not available for this episode')
        setLang('sub')
        setHindiLoading(false)
        setHindiPopup(null)
      })
  }, [lang, ep, hindiEpisodes, hindiStatus, hindiId, toast, hindiLoading])

  useEffect(() => {
    if (!episodes.length) return
    const epObj = episodes.find(e => e.episodeNo === Number(ep))
    if (!epObj) return
    setNumericEpId(extractNumericEpId(epObj.episodeId))
    if (animeInfo) {
      saveCW(id, Number(ep), lang, animeInfo.title, animeInfo.title, '')
      document.title = `${animeInfo.title} - Episode ${ep} - anidexz`
    }
  }, [ep, episodes, id, lang, animeInfo])

  useEffect(() => {
    if (!animeInfo) return
    const next = { view: 'watch', id, name: animeInfo.title, titleAlt: animeInfo.title, ep, lang }
    try { history.replaceState(next, '', buildURL(next)) } catch {}
  }, [lang, ep, id, animeInfo])

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
  }, [episodes, ep, lang, id, animeInfo, go])

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

  function handleLangChange(newLang) {
    if (newLang !== 'hindi') {
      setLang(newLang)
      return
    }

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
        setTimeout(() => {
          setHindiPopup(null)
          if (lang === 'hindi') setLang('sub')
        }, 3000)
      }
    })
  }

  function dismissHindiPopup() {
    setHindiPopup(null)
    clearInterval(hindiCountdownTimer.current)
    if (hindiPopup === 'checking' || hindiStatus === 'unavailable' || hindiPopup === 'unavailable') {
      if (lang === 'hindi') setLang('sub')
    }
  }

  return (
    <>
      <HindiPopup status={hindiPopup} countdown={hindiCountdown} onDismiss={dismissHindiPopup} />

      <div className={'wlayout' + (theatre ? ' theatre' : '')} id="wlayout">
        <div style={{ minWidth: 0, overflow: 'hidden' }}>
          <div
            className="pwrap" id="pwrap" ref={pwrapRef}
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
                if (dx < 0 && epNum < maxEp) { go('watch', { id, name: title, titleAlt: title, ep: epNum + 1, lang }); toast('Next ep') }
                else if (dx > 0 && epNum > 1) { go('watch', { id, name: title, titleAlt: title, ep: epNum - 1, lang }); toast('Prev ep') }
              }
              swipeX.current = null; swipeY.current = null
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
                <button className={'lbtn' + (lang === 'sub' ? ' on' : '')} onClick={() => handleLangChange('sub')}>SUB</button>
                <button className={'lbtn' + (lang === 'dub' ? ' on' : '')} onClick={() => handleLangChange('dub')}>DUB</button>
                <button
                  className={'lbtn' + (lang === 'hindi' ? ' on' : '')}
                  onClick={() => handleLangChange('hindi')}
                  title={
                    hindiStatus === 'available' ? 'Hindi Dub available' :
                    hindiStatus === 'checking' ? 'Checking Hindi availability...' :
                    hindiStatus === 'unavailable' ? 'Hindi Dub not available' :
                    'Click to check Hindi availability'
                  }
                  style={{ position: 'relative', opacity: hindiStatus === 'unavailable' ? 0.45 : 1, cursor: 'pointer' }}
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
