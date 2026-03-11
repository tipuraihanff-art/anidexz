import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useApp } from '../AppContext.jsx'
import { alQuery, Q_LIST, buildVars, fetchJikanRecentEpisodes, fetchRecentlyUpdatedViaJikan } from '../api.js'
import { alTitle, alTitleAlt, alImg, fmtFormat } from '../helpers.js'
import { getCW, getRV } from '../storage.js'
import { Card, Section, HSection, Spin, Empty, Sentinel, Skels } from '../components/Shared.jsx'

/* ── Hero ── */
function Hero({ list }) {
  const { go } = useApp()
  const [idx, setIdx] = useState(0)
  const tickRef = useRef(null)

  useEffect(() => {
    if (!list.length) return
    clearInterval(tickRef.current)
    tickRef.current = setInterval(() => setIdx(i => (i + 1) % list.length), 6000)
    return () => clearInterval(tickRef.current)
  }, [list])

  if (!list.length) return null
  const m = list[idx]
  const title = alTitle(m)
  const titleAlt = alTitleAlt(m)
  const desc = (m.description || '').replace(/<[^>]+>/g, '').replace(/\[Written[^\]]*\]/g, '').trim()
  const bg = m.bannerImage || alImg(m, 'extraLarge')

  return (
    <div className="hero">
      <div className="hero-bg" style={{ backgroundImage: `url(${bg})` }} />
      <div className="hero-grad" />
      <div className="hero-cnt">
        <div className="hero-badge">Spotlight</div>
        <h1 className="hero-title">{title}</h1>
        <p className="hero-desc">{desc.length > 200 ? desc.slice(0, 200) + '...' : desc}</p>
        <div className="hero-btns">
          <button className="bp" onClick={() => go('watch', { id: m.id, name: title, titleAlt, ep: 1 })}>▶ Watch Now</button>
          <button className="bs" onClick={() => go('anime', { id: m.id, name: title, titleAlt })}>Info</button>
        </div>
      </div>
    </div>
  )
}

/* ── Recent episode card (horizontal) ── */
function RecentEpCard({ item }) {
  const { go } = useApp()
  if (!item?.entry) return null
  const entry = item.entry
  const eps = (item.episodes || []).filter(e => !e.premium).slice(0, 2)
  return eps.map(ep => {
    const epNum = ep.mal_id || '?'
    const img = (ep.images?.jpg?.image_url) || (entry.images?.jpg?.image_url) || ''
    const animeTitle = entry.title || 'Unknown'
    return (
      <div
        key={`${entry.mal_id}-${epNum}`}
        className="hcard"
        style={{ width: '130px', flexShrink: 0 }}
        onClick={() => go('watch', { id: entry.mal_id, name: animeTitle, titleAlt: animeTitle, ep: +epNum })}
      >
        <div className="ep-badge">EP {epNum}</div>
        <img
          src={img} alt={animeTitle} loading="lazy"
          style={{ width: '130px', height: '80px', objectFit: 'cover', display: 'block' }}
          onError={e => { e.target.src = 'https://placehold.co/130x80/0d0d15/555577?text=N/A' }}
        />
        <div className="hcard-info">
          <div className="hcard-title">{animeTitle}</div>
          <div className="hcard-sub" style={{ whiteSpace: 'normal', lineHeight: '1.3' }}>{ep.title || `Episode ${epNum}`}</div>
        </div>
      </div>
    )
  })
}

/* ── Anime card from Jikan data ── */
function JikanAnimeCard({ m, delay }) {
  return <Card m={m} delay={delay} />
}

export default function Home() {
  const { go, pbStart, pbDone, route } = useApp()
  const [airingList, setAiringList] = useState([])
  const [movieList, setMovieList] = useState([])
  const [updatedList, setUpdatedList] = useState([])  // Jikan-sourced recently updated
  const [recentEps, setRecentEps] = useState([])
  const [cw] = useState(() => getCW())
  const [rv] = useState(() => getRV())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    pbStart()
    setLoading(true)
    Promise.all([
      // Airing for hero + top airing section
      alQuery(Q_LIST(), buildVars({ sort: 'TRENDING_DESC', status: 'RELEASING', page: 1 })),
      // Movies
      alQuery(Q_LIST(), buildVars({ sort: 'POPULARITY_DESC', format: 'MOVIE', page: 1 })),
      // Jikan recent episodes for Latest Episodes horizontal section
      fetchJikanRecentEpisodes(),
      // Recently Updated via Jikan (fetch Jikan data, map to AniList)
      fetchRecentlyUpdatedViaJikan(),
    ]).then(([airingD, moviesD, jikanEps, jikanUpdated]) => {
      setAiringList((airingD?.Page?.media) || [])
      setMovieList((moviesD?.Page?.media) || [])
      setRecentEps((jikanEps?.data) || [])
      setUpdatedList(jikanUpdated || [])
      setLoading(false)
      pbDone()
    }).catch(e => {
      setError(e.message)
      setLoading(false)
      pbDone()
    })
  }, [])

  if (loading) return <div id="app"><Spin /></div>
  if (error) return (
    <div id="app">
      <Empty title="Failed to Load" body={`${error}<br><a href="#" onclick="location.reload()">Retry</a>`} />
    </div>
  )

  return (
    <div>
      {/* Hero */}
      {airingList.length > 0 && <Hero list={airingList.slice(0, 8)} />}

      {/* Latest Released Episodes */}
      {recentEps.length > 0 && (
        <Section title="Latest Episodes">
          <div className="hscroll-outer">
            <div className="hscroll">
              {recentEps.map((item, i) => <RecentEpCard key={i} item={item} />)}
            </div>
          </div>
        </Section>
      )}

      {/* Recently Updated (Jikan-sourced, AniList cards) */}
      {updatedList.length > 0 && (
        <Section title="Recently Updated" viewAll="updated">
          <div className="grid">
            {updatedList.slice(0, 18).map((m, i) => <Card key={m.id} m={m} delay={i * 34} />)}
          </div>
        </Section>
      )}

      {/* Top Airing */}
      <Section title="Top Airing" viewAll="trending">
        <div className="grid">
          {airingList.slice(0, 18).map((m, i) => <Card key={m.id} m={m} delay={i * 34} />)}
        </div>
      </Section>

      {/* Popular Movies */}
      {movieList.length > 0 && (
        <Section title="Popular Movies" viewAll="movies">
          <div className="grid">
            {movieList.slice(0, 12).map((m, i) => <Card key={m.id} m={m} delay={i * 34} />)}
          </div>
        </Section>
      )}

      {/* Continue Watching */}
      {cw.length > 0 && (
        <HSection title="Continue Watching">
          {cw.map(item => (
            <div
              key={item.id}
              className="hcard"
              onClick={() => go('watch', { id: item.id, name: item.title, titleAlt: item.titleAlt, ep: item.ep, lang: item.lang })}
            >
              <img src={item.poster} alt={item.title} loading="lazy" style={{ width: '108px', height: '152px', objectFit: 'cover' }} onError={e => { e.target.src = 'https://placehold.co/108x152/0d0d15/555577?text=N/A' }} />
              <div className="hcard-info">
                <div className="hcard-title">{item.title}</div>
                <div className="hcard-sub">EP {item.ep} • {item.lang.toUpperCase()}</div>
              </div>
            </div>
          ))}
        </HSection>
      )}

      {/* Recently Viewed */}
      {rv.length > 0 && (
        <HSection title="Recently Viewed">
          {rv.map(item => (
            <div
              key={item.id}
              className="hcard"
              onClick={() => go('anime', { id: item.id, name: item.title, titleAlt: item.titleAlt || item.title })}
            >
              <img src={item.poster} alt={item.title} loading="lazy" style={{ width: '108px', height: '152px', objectFit: 'cover' }} onError={e => { e.target.src = 'https://placehold.co/108x152/0d0d15/555577?text=N/A' }} />
              <div className="hcard-info">
                <div className="hcard-title">{item.title}</div>
              </div>
            </div>
          ))}
        </HSection>
      )}
    </div>
  )
}
