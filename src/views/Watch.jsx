import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useApp } from '../AppContext.jsx'
import { buildURL } from '../AppContext.jsx'
import { saveCW } from '../storage.js'
import { Spin } from '../components/Shared.jsx'

const BASE = 'https://anidexz-api.vercel.app/aniwatch'
const HINDI_BASE = 'https://anime-world-india-api-jade.vercel.app'

// ── Module-level cache — survives episode navigation, resets on full page reload ──
// Map<animeId, { status: 'available'|'unavailable', episodes: Array }>
const hindiCache = new Map()

/* ── API ── */
async function fetchEpisodes(animeId) {
  const res = await fetch(`${BASE}/episodes/${animeId}`)
  if (!res.ok) throw new Error(`Failed to fetch episodes: ${res.status}`)
  return res.json()
}

/**
 * ONE request to /api/info/{id} — gives us availability + all episode IDs.
 * Caches in `hindiCache` so switching episodes never re-fetches.
 */
async function loadHindiData(animeId) {
  if (hindiCache.has(animeId)) return hindiCache.get(animeId)

  try {
    const res = await fetch(`${HINDI_BASE}/api/info/${animeId}`)
    if (!res.ok) {
      const result = { status: 'unavailable', episodes: [] }
      hindiCache.set(animeId, result)
      return result
    }
    const data = await res.json()

    // Normalise — API may nest episodes differently
    const eps =
      data?.episodes ||
      data?.data?.episodes ||
      data?.season?.episodes ||
      []

    const hasContent = Array.isArray(eps) ? eps.length > 0 : !!data?.title

    const result = {
      status: hasContent ? 'available' : 'unavailable',
      episodes: Array.isArray(eps) ? eps : [],
    }
    hindiCache.set(animeId, result)
    return result
  } catch {
    const result = { status: 'unavailable', episodes: [] }
    hindiCache.set(animeId, result)
    return result
  }
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
      s.name?.toLowerCase().includes('play') || s.server?.toLowerCase().includes('play')
    )
    return play?.url || play?.link || servers[0]?.url || servers[0]?.link || null
  }
  return data?.url || data?.embed || null
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

/* ── Iframe Player ── */
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

/* ── Hindi Status Badge ── */
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

  // Hindi — hydrate from cache immediately if we already checked this anime
  const [hindiStatus, setHindiStatus] = useState(() =>
    hindiCache.has(id) ? hindiCache.get(id).status : 'idle'
  )
  const [hindiEpisodes, setHindiEpisodes] = useState(() =>
    hindiCache.has(id) ? hindiCache.get(id).episodes : []
  )
  const [hindiSrc, setHindiSrc] = useState(null)
  const [hindiLoading, setHindiLoading] = useState(false)

  const autoNextTimer = useRef(null)
  const hindiCheckTimer = useRef(null)
  const pwrapRef = useRef(null)
  const swipeX = useRef(null)
  const swipeY = useRef(null)

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

  // ── Hindi check: 15s delay, then ONE request, cached forever ──
  useEffect(() => {
    if (!id) return

    // Already cached — skip timer, apply immediately
    if (hindiCache.has(id)) {
      const cached = hindiCache.get(id)
      setHindiStatus(cached.status)
      setHindiEpisodes(cached.episodes)
      return
    }

    // Wait 15 seconds before hitting the Hindi API
    setHindiStatus('idle')
    hindiCheckTimer.current = setTimeout(() => {
      setHindiStatus('checking')
      loadHindiData(id).then(result => {
        setHindiStatus(result.status)
        setHindiEpisodes(result.episodes)
      })
    }, 15000)

    return () => clearTimeout(hindiCheckTimer.current)
  }, [id])

  // ── Load Hindi embed when switching to Hindi lang ──
  useEffect(() => {
    if (lang !== 'hindi') { setHindiSrc(null); return }
    if (hindiStatus !== 'available') return

    setHindiLoading(true)
    setHindiSrc(null)

    const epNum = Number(ep)
    const hindiEp = hindiEpisodes.find(e =>
      e.episodeNo === epNum ||
      e.episode  === epNum ||
      e.number   === epNum ||
      e.ep       === epNum ||
      Number(e.episodeNo) === epNum
    )

    const episodeId = hindiEp?.episodeId || hindiEp?.id || `${id}-episode-${epNum}`

    fetchHindiEmbed(episodeId)
      .then(data => {
        const url = pickEmbedUrl(data)
        if (url) {
          setHindiSrc(url)
          toast('Hindi Dub loaded ✓')
          setHindiLoading(false)
          return
        }
        // Last resort: generic scraper
        const scrapeTarget = `${HINDI_BASE}/watch/${episodeId}`
        return fetch(`${HINDI_BASE}/api/scrape?url=${encodeURIComponent(scrapeTarget)}`)
          .then(r => r.json())
          .then(scraped => {
            const src = scraped?.embedUrl || scraped?.url || scraped?.iframe
            if (src) { setHindiSrc(src); toast('Hindi Dub loaded ✓') }
            else { toast('Hindi not available for this episode'); setLang('sub') }
          })
          .catch(() => { toast('Hindi not available for this episode'); setLang('sub') })
          .finally(() => setHindiLoading(false))
      })
      .catch(() => {
        toast('Failed to load Hindi dub')
        setLang('sub')
        setHindiLoading(false)
      })
  }, [lang, ep, hindiEpisodes, hindiStatus])

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

  function handleLangChange(newLang) {
    if (newLang === 'hindi' && hindiStatus === 'unavailable') {
      toast('Hindi Dub not available for this anime')
      return
    }
    if (newLang === 'hindi' && (hindiStatus === 'idle' || hindiStatus === 'checking')) {
      toast('Still checking Hindi availability…')
      return
    }
    setLang(newLang)
  }

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

              {/* Language Toggle — SUB / DUB / हिंदी */}
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
                    'Hindi check starts 15s after page load'
                  }
                  style={{
                    position: 'relative',
                    opacity: hindiStatus === 'unavailable' ? 0.4 : 1,
                    cursor: hindiStatus === 'unavailable' ? 'not-allowed' : 'pointer',
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
