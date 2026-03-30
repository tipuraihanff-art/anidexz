import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useApp } from '../AppContext.jsx'
import { buildURL } from '../AppContext.jsx'
import { saveCW } from '../storage.js'
import { Spin } from '../components/Shared.jsx'

const BASE = 'https://anidexz-api.vercel.app/aniwatch'

/* ── API helpers ── */
async function fetchEpisodes(animeId) {
  const res = await fetch(`${BASE}/episodes/${animeId}`)
  if (!res.ok) throw new Error(`Failed to fetch episodes: ${res.status}`)
  return res.json()
}

async function fetchServers(animeId, rawEpisodeId) {
  // rawEpisodeId from API looks like "one-piece-100?ep=84802"
  // servers endpoint needs: ?id=one-piece-100?ep=84802
  const numericEpId = extractNumericEpId(rawEpisodeId)
  const combinedId = `${animeId}?ep=${numericEpId}`
  const res = await fetch(`${BASE}/servers?id=${encodeURIComponent(combinedId)}`)
  if (!res.ok) throw new Error(`Failed to fetch servers: ${res.status}`)
  return res.json()
}

async function fetchSources(animeId, rawEpisodeId, server, lang) {
  // episode-srcs endpoint needs: ?id=one-piece-100?ep=84802&server=vidstreaming&category=sub
  const numericEpId = extractNumericEpId(rawEpisodeId)
  const combinedId = `${animeId}?ep=${numericEpId}`
  const url = `${BASE}/episode-srcs?id=${encodeURIComponent(combinedId)}&server=${encodeURIComponent(server)}&category=${encodeURIComponent(lang)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch sources: ${res.status}`)
  return res.json()
}

// Extract numeric ep ID from full episodeId string
// "one-piece-100?ep=84802" → "84802"
// "84802" → "84802"
function extractNumericEpId(rawEpisodeId) {
  if (!rawEpisodeId) return ''
  const str = String(rawEpisodeId)
  const match = str.match(/ep=(\d+)/)
  if (match) return match[1]
  if (/^\d+$/.test(str)) return str
  return str
}

/* ── HLS Video Player ── */
function HLSPlayer({ src, poster, subtitles = [] }) {
  const videoRef = useRef(null)
  const hlsRef = useRef(null)

  useEffect(() => {
    if (!src || !videoRef.current) return
    const video = videoRef.current

    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }

    const initHls = () => {
      const Hls = window.Hls
      if (Hls && Hls.isSupported()) {
        const hls = new Hls({ enableWorker: false })
        hlsRef.current = hls
        hls.loadSource(src)
        hls.attachMedia(video)
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(() => {})
        })
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = src
        video.play().catch(() => {})
      } else {
        video.src = src
        video.play().catch(() => {})
      }
    }

    if (src.includes('.m3u8')) {
      if (window.Hls) {
        initHls()
      } else {
        const existing = document.getElementById('hls-script')
        if (existing) {
          existing.addEventListener('load', initHls, { once: true })
        } else {
          const s = document.createElement('script')
          s.id = 'hls-script'
          s.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest/dist/hls.min.js'
          s.onload = initHls
          document.head.appendChild(s)
        }
      }
    } else {
      video.src = src
      video.play().catch(() => {})
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [src])

  return (
    <video
      ref={videoRef}
      poster={poster}
      controls
      crossOrigin="anonymous"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', background: '#000', display: 'block' }}
    >
      {subtitles.filter(s => s.lang && s.url).map((s, i) => (
        <track key={i} kind="subtitles" src={s.url} label={s.lang} default={s.lang === 'English' && i === 0} />
      ))}
    </video>
  )
}

/* ── Player: server list + source loading ── */
function Player({ animeId, rawEpisodeId, lang, poster }) {
  const [state, setState] = useState('loading')
  const [src, setSrc] = useState('')
  const [subtitles, setSubtitles] = useState([])
  const [errorMsg, setErrorMsg] = useState('')
  const [subServers, setSubServers] = useState([])
  const [dubServers, setDubServers] = useState([])
  const [activeServer, setActiveServer] = useState('')
  const [loadingServer, setLoadingServer] = useState(false)

  useEffect(() => {
    if (!rawEpisodeId) return
    setState('loading')
    setSrc('')
    setSubtitles([])
    setSubServers([])
    setDubServers([])
    setActiveServer('')
    setErrorMsg('')

    fetchServers(animeId, rawEpisodeId)
      .then(data => {
        const sub = Array.isArray(data?.sub) ? data.sub : []
        const dub = Array.isArray(data?.dub) ? data.dub : []
        setSubServers(sub)
        setDubServers(dub)

        if (!sub.length && !dub.length) throw new Error('No servers available for this episode')

        const preferred = (lang === 'dub' ? dub : sub)[0] || sub[0] || dub[0]
        if (!preferred) throw new Error('No servers available')

        const preferredLang = (lang === 'dub' && dub.length > 0) ? 'dub' : 'sub'
        setActiveServer(preferred.serverName)
        return doLoadSource(preferred.serverName, preferredLang, sub, dub)
      })
      .catch(err => {
        console.error('fetchServers error:', err)
        setErrorMsg(err.message || 'Could not load servers.')
        setState('error')
      })
  }, [animeId, rawEpisodeId, lang])

  function doLoadSource(serverName, category, sub, dub) {
    setLoadingServer(true)
    setState('loading')

    const dubList = dub || dubServers
    const subList = sub || subServers
    const dubNames = dubList.map(s => s.serverName)
    const subNames = subList.map(s => s.serverName)
    let resolvedLang = category
    if (category === 'dub' && !dubNames.includes(serverName) && subNames.includes(serverName)) {
      resolvedLang = 'sub'
    }

    return fetchSources(animeId, rawEpisodeId, serverName, resolvedLang)
      .then(data => {
        const sources = Array.isArray(data?.sources) ? data.sources : []
        if (!sources.length) throw new Error('No stream sources returned')
        const best = sources.find(s => s.isM3U8) || sources[0]
        if (!best?.url) throw new Error('No valid stream URL found')
        setSrc(best.url)
        setSubtitles(Array.isArray(data?.subtitles) ? data.subtitles : [])
        setState('playing')
        setLoadingServer(false)
      })
      .catch(err => {
        console.error('fetchSources error:', err)
        setErrorMsg(err.message || 'This server failed. Try another server.')
        setState('error')
        setLoadingServer(false)
      })
  }

  function switchServer(serverName, type) {
    if (serverName === activeServer && state === 'playing') return
    setActiveServer(serverName)
    setSrc('')
    setSubtitles([])
    doLoadSource(serverName, type === 'DUB' ? 'dub' : 'sub')
  }

  const allServers = [
    ...subServers.map(s => ({ name: s.serverName, type: 'SUB' })),
    ...dubServers
      .filter(d => !subServers.find(s => s.serverName === d.serverName))
      .map(s => ({ name: s.serverName, type: 'DUB' })),
  ]

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'relative', flex: 1 }}>
        {state === 'loading' && <div className="pload"><Spin /></div>}
        {state === 'error' && (
          <div className="perror">
            <svg width="36" height="36" fill="none" stroke="var(--acc2)" strokeWidth="1.5" viewBox="0 0 24 24" style={{ marginBottom: '8px' }}>
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><circle cx="12" cy="16" r=".6" fill="var(--acc2)" />
            </svg>
            <h4 style={{ marginBottom: '6px' }}>Could not load episode</h4>
            <p style={{ fontSize: '13px', color: 'var(--dim)', marginBottom: '12px' }}>{errorMsg}</p>
            {allServers.length > 1 && (
              <p style={{ fontSize: '12px', color: 'var(--dim)', marginBottom: '10px' }}>Try a different server below ↓</p>
            )}
            <button className="bp" onClick={() => doLoadSource(activeServer, lang)} style={{ fontSize: '12px', padding: '8px 18px' }}>
              Retry
            </button>
          </div>
        )}
        {state === 'playing' && src && <HLSPlayer src={src} poster={poster} subtitles={subtitles} />}
      </div>

      {allServers.length > 0 && (
        <div className="server-bar">
          <span className="server-label">Server:</span>
          <div className="server-btns">
            {allServers.map(s => (
              <button
                key={s.name}
                className={'server-btn' + (activeServer === s.name ? ' on' : '')}
                onClick={() => switchServer(s.name, s.type)}
                disabled={loadingServer}
                title={`${s.name} (${s.type})`}
              >
                {s.name}
                <span className="server-type-badge">{s.type}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
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
  // Store full raw episodeId from API e.g. "one-piece-100?ep=84802"
  const [rawEpisodeId, setRawEpisodeId] = useState(null)
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

        // Keep full raw episodeId e.g. "one-piece-100?ep=84802"
        setRawEpisodeId(epObj.episodeId)

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

  // Update rawEpisodeId when ep changes
  useEffect(() => {
    if (!episodes.length) return
    const epObj = episodes.find(e => e.episodeNo === Number(ep))
    if (!epObj) return
    setRawEpisodeId(epObj.episodeId)
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

  const { title, poster } = animeInfo
  const maxEp = episodes[episodes.length - 1]?.episodeNo || episodes.length
  const epNum = Number(ep)
  const stitle = title.length > 22 ? title.slice(0, 22) + '...' : title
  const epNums = episodes.map(e => e.episodeNo)

  return (
    <>
      <div className={'wlayout' + (theatre ? ' theatre' : '')} id="wlayout">
        {/* Player column */}
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
            {rawEpisodeId
              ? <Player animeId={id} rawEpisodeId={rawEpisodeId} lang={lang} poster={poster} />
              : <div className="pload"><Spin /></div>
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
          <div className="sbar-title">
            {poster && <img src={poster} style={{ width: '26px', height: '26px', objectFit: 'cover', borderRadius: '4px', flexShrink: 0 }} loading="lazy" alt="" />}
            {stitle}
          </div>
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
