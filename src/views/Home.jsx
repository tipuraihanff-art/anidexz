import React, { useState, useEffect, useRef } from 'react'
import { useApp } from '../AppContext.jsx'
import { getCW, getRV } from '../storage.js'
import { Card, Section, HSection, Spin, Empty } from '../components/Shared.jsx'

const BASE = 'https://anime-iota-one.vercel.app/aniwatch'

async function fetchHome() {
  const res = await fetch(BASE)
  if (!res.ok) throw new Error(`AniWatch home failed: ${res.status}`)
  return res.json()
}

/* ─── Hero ─────────────────────────────────────────────────── */
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
  const desc = (m.description || '').replace(/<[^>]+>/g, '').trim()

  return (
    <div className="hero">
      <div className="hero-bg" style={{ backgroundImage: `url(${m.img})` }} />
      <div className="hero-grad" />
      <div className="hero-cnt">
        <div className="hero-badge">Spotlight</div>
        <h1 className="hero-title">{m.name}</h1>
        <p className="hero-desc">{desc.length > 200 ? desc.slice(0, 200) + '...' : desc}</p>
        <div className="hero-btns">
          <button className="bp" onClick={() => go('watch', { id: m.id, name: m.name, titleAlt: m.name, ep: 1 })}>
            Watch Now
          </button>
          <button className="bs" onClick={() => go('anime', { id: m.id, name: m.name, titleAlt: m.name })}>
            Info
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Latest Episode Card (horizontal strip) ───────────────── */
function LatestEpCard({ item }) {
  const { go } = useApp()
  const eps = item.episodes || {}
  const epNum = eps.eps || eps.sub || 1

  return (
    <div
      className="hcard"
      style={{ width: '130px', flexShrink: 0, cursor: 'pointer' }}
      onClick={() => go('watch', { id: item.id, name: item.name, titleAlt: item.name, ep: epNum })}
    >
      <div className="ep-badge">EP {epNum}</div>
      <img
        src={item.img}
        alt={item.name}
        loading="lazy"
        style={{ width: '130px', height: '80px', objectFit: 'cover', display: 'block' }}
        onError={e => { e.target.src = 'https://placehold.co/130x80/0d0d15/555577?text=N/A' }}
      />
      <div className="hcard-info">
        <div className="hcard-title">{item.name}</div>
        <div className="hcard-sub">{item.duration || ''}</div>
      </div>
    </div>
  )
}

/* ─── Ranked Card ───────────────────────────────────────────── */
function RankedCard({ item, rank }) {
  const { go } = useApp()
  return (
    <div
      className="hcard"
      style={{ position: 'relative', cursor: 'pointer' }}
      onClick={() => go('anime', { id: item.id, name: item.name, titleAlt: item.name })}
    >
      <div style={{
        position: 'absolute', top: 0, left: 0,
        background: 'var(--accent, #7c3aed)',
        color: '#fff', fontWeight: 700,
        fontSize: rank <= 3 ? '18px' : '14px',
        width: '28px', height: '28px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: '0 0 6px 0', zIndex: 2,
      }}>{rank}</div>
      <img
        src={item.img}
        alt={item.name}
        loading="lazy"
        style={{ width: '108px', height: '152px', objectFit: 'cover' }}
        onError={e => { e.target.src = 'https://placehold.co/108x152/0d0d15/555577?text=N/A' }}
      />
      <div className="hcard-info">
        <div className="hcard-title">{item.name}</div>
        <div className="hcard-sub">{item.episodes ? `EP ${item.episodes.eps || '?'}` : ''}</div>
      </div>
    </div>
  )
}

/* ─── Generic AniWatch Card ─────────────────────────────────── */
function AWCard({ item, delay = 0 }) {
  const { go } = useApp()
  const eps = item.episodes || {}
  const sub = [
    eps.eps ? `EP ${eps.eps}` : null,
    item.duration || null,
    item.rated ? '18+' : null,
  ].filter(Boolean).join(' · ')

  return (
    <div
      className="hcard"
      style={{ cursor: 'pointer', animationDelay: `${delay}ms` }}
      onClick={() => go('anime', { id: item.id, name: item.name, titleAlt: item.name })}
    >
      <img
        src={item.img}
        alt={item.name}
        loading="lazy"
        style={{ width: '108px', height: '152px', objectFit: 'cover' }}
        onError={e => { e.target.src = 'https://placehold.co/108x152/0d0d15/555577?text=N/A' }}
      />
      <div className="hcard-info">
        <div className="hcard-title">{item.name}</div>
        {sub && <div className="hcard-sub">{sub}</div>}
      </div>
    </div>
  )
}

/* ─── Home ──────────────────────────────────────────────────── */
export default function Home() {
  const { go, pbStart, pbDone } = useApp()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [cw] = useState(() => getCW())
  const [rv] = useState(() => getRV())

  useEffect(() => {
    pbStart()
    fetchHome()
      .then(d => { setData(d); setLoading(false); pbDone() })
      .catch(e => { setError(e.message); setLoading(false); pbDone() })
  }, [])

  if (loading) return <div id="app"><Spin /></div>
  if (error)   return <div id="app"><Empty title="Failed to Load" body={error} /></div>

  const {
    spotLightAnimes    = [],
    trendingAnimes     = [],
    latestEpisodes     = [],
    top10Animes        = {},
    featuredAnimes     = {},
    topUpcomingAnimes  = [],
  } = data

  const top10Day        = top10Animes.day                        || []
  const topAiring       = featuredAnimes.topAiringAnimes         || []
  const mostPopular     = featuredAnimes.mostPopularAnimes       || []
  const mostFavorite    = featuredAnimes.mostFavoriteAnimes      || []
  const latestCompleted = featuredAnimes.latestCompletedAnimes   || []

  return (
    <div>
      {/* HERO — spotlight */}
      {spotLightAnimes.length > 0 && <Hero list={spotLightAnimes.slice(0, 8)} />}

      {/* LATEST EPISODES — horizontal strip */}
      {latestEpisodes.length > 0 && (
        <Section title="Latest Episodes">
          <div className="hscroll-outer">
            <div className="hscroll">
              {latestEpisodes.map((item, i) => (
                <LatestEpCard key={item.id + '-' + i} item={item} />
              ))}
            </div>
          </div>
        </Section>
      )}

      {/* LATEST EPISODES — grid */}
      {latestEpisodes.length > 0 && (
        <Section title="Latest Released Episodes" viewAll="updated">
          <div className="grid">
            {latestEpisodes.slice(0, 18).map((item, i) => (
              <div
                key={item.id + '-g-' + i}
                className="hcard"
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  const epNum = item.episodes?.eps || item.episodes?.sub || 1
                  go('watch', { id: item.id, name: item.name, titleAlt: item.name, ep: epNum })
                }}
              >
                <img
                  src={item.img}
                  alt={item.name}
                  loading="lazy"
                  style={{ width: '130px', height: '80px', objectFit: 'cover', display: 'block' }}
                  onError={e => { e.target.src = 'https://placehold.co/130x80/0d0d15/555577?text=N/A' }}
                />
                <div className="hcard-info">
                  <div className="hcard-title">{item.name}</div>
                  <div className="hcard-sub">
                    EP {item.episodes?.eps || item.episodes?.sub || '?'} · {item.duration || 'Latest Episode'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* TOP 10 TODAY */}
      {top10Day.length > 0 && (
        <Section title="Top 10 Today">
          <div className="hscroll-outer">
            <div className="hscroll">
              {top10Day.slice(0, 10).map((item, i) => (
                <RankedCard key={item.id} item={item} rank={i + 1} />
              ))}
            </div>
          </div>
        </Section>
      )}

      {/* TRENDING */}
      {trendingAnimes.length > 0 && (
        <Section title="Trending Now" viewAll="trending">
          <div className="hscroll-outer">
            <div className="hscroll">
              {trendingAnimes.map((item, i) => (
                <div
                  key={item.id}
                  className="hcard"
                  style={{ cursor: 'pointer', flexShrink: 0 }}
                  onClick={() => go('anime', { id: item.id, name: item.name, titleAlt: item.name })}
                >
                  <img
                    src={item.img}
                    alt={item.name}
                    loading="lazy"
                    style={{ width: '108px', height: '152px', objectFit: 'cover' }}
                    onError={e => { e.target.src = 'https://placehold.co/108x152/0d0d15/555577?text=N/A' }}
                  />
                  <div className="hcard-info">
                    <div className="hcard-title">{item.name}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>
      )}

      {/* TOP AIRING */}
      {topAiring.length > 0 && (
        <Section title="Top Airing" viewAll="top-airing">
          <div className="grid">
            {topAiring.slice(0, 18).map((item, i) => (
              <AWCard key={item.id} item={item} delay={i * 34} />
            ))}
          </div>
        </Section>
      )}

      {/* MOST POPULAR */}
      {mostPopular.length > 0 && (
        <Section title="Most Popular" viewAll="most-popular">
          <div className="grid">
            {mostPopular.slice(0, 12).map((item, i) => (
              <AWCard key={item.id} item={item} delay={i * 34} />
            ))}
          </div>
        </Section>
      )}

      {/* MOST FAVOURITE */}
      {mostFavorite.length > 0 && (
        <Section title="Most Favourite" viewAll="most-favourite">
          <div className="grid">
            {mostFavorite.slice(0, 12).map((item, i) => (
              <AWCard key={item.id} item={item} delay={i * 34} />
            ))}
          </div>
        </Section>
      )}

      {/* TOP UPCOMING */}
      {topUpcomingAnimes.length > 0 && (
        <Section title="Most Anticipated" viewAll="upcoming">
          <div className="grid">
            {topUpcomingAnimes.slice(0, 12).map((item, i) => (
              <AWCard key={item.id} item={item} delay={i * 34} />
            ))}
          </div>
        </Section>
      )}

      {/* COMPLETED SERIES */}
      {latestCompleted.length > 0 && (
        <Section title="Completed Series" viewAll="completed">
          <div className="grid">
            {latestCompleted.slice(0, 12).map((item, i) => (
              <AWCard key={item.id} item={item} delay={i * 34} />
            ))}
          </div>
        </Section>
      )}

      {/* CONTINUE WATCHING */}
      {cw.length > 0 && (
        <HSection title="Continue Watching">
          {cw.map(item => (
            <div
              key={item.id}
              className="hcard"
              onClick={() => go('watch', { id: item.id, name: item.title, titleAlt: item.titleAlt, ep: item.ep, lang: item.lang })}
            >
              <img
                src={item.poster}
                alt={item.title}
                loading="lazy"
                style={{ width: '108px', height: '152px', objectFit: 'cover' }}
                onError={e => { e.target.src = 'https://placehold.co/108x152/0d0d15/555577?text=N/A' }}
              />
              <div className="hcard-info">
                <div className="hcard-title">{item.title}</div>
                <div className="hcard-sub">EP {item.ep} {item.lang?.toUpperCase()}</div>
              </div>
            </div>
          ))}
        </HSection>
      )}

      {/* RECENTLY VIEWED */}
      {rv.length > 0 && (
        <HSection title="Recently Viewed">
          {rv.map(item => (
            <div
              key={item.id}
              className="hcard"
              onClick={() => go('anime', { id: item.id, name: item.title, titleAlt: item.titleAlt || item.title })}
            >
              <img
                src={item.poster}
                alt={item.title}
                loading="lazy"
                style={{ width: '108px', height: '152px', objectFit: 'cover' }}
                onError={e => { e.target.src = 'https://placehold.co/108x152/0d0d15/555577?text=N/A' }}
              />
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
