import React, { useState, useEffect, useRef } from 'react'
import { useApp } from '../AppContext.jsx'
import { alQuery, Q_LIST, buildVars, fetchLatestReleasedWithAniListIds, fetchRecentlyUpdatedViaJikan } from '../api.js'
import { alTitle, alTitleAlt, alImg } from '../helpers.js'
import { getCW, getRV } from '../storage.js'
import { Card, Section, HSection, Spin, Empty } from '../components/Shared.jsx'

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
          <button className="bp" onClick={() => go('watch', { id: m.id, name: title, titleAlt, ep: 1 })}>Watch Now</button>
          <button className="bs" onClick={() => go('anime', { id: m.id, name: title, titleAlt })}>Info</button>
        </div>
      </div>
    </div>
  )
}

function LatestEpCard({ card }) {
  const { go } = useApp()
  return (
    <div
      className="hcard"
      style={{ width: '130px', flexShrink: 0, cursor: card.alId ? 'pointer' : 'default' }}
      onClick={() => card.alId && go('watch', { id: card.alId, name: card.title, titleAlt: card.title, ep: card.epNum })}
    >
      <div className="ep-badge">EP {card.epNum}</div>
      <img
        src={card.img} alt={card.title} loading="lazy"
        style={{ width: '130px', height: '80px', objectFit: 'cover', display: 'block' }}
        onError={e => { e.target.src = 'https://placehold.co/130x80/0d0d15/555577?text=N/A' }}
      />
      <div className="hcard-info">
        <div className="hcard-title">{card.title}</div>
        <div className="hcard-sub">{card.epTitle}</div>
      </div>
    </div>
  )
}

function RankedCard({ m, rank }) {
  const { go } = useApp()
  const title = alTitle(m)
  const titleAlt = alTitleAlt(m)
  return (
    <div className="hcard" style={{ position: 'relative', cursor: 'pointer' }}
      onClick={() => go('anime', { id: m.id, name: title, titleAlt })}>
      <div style={{
        position: 'absolute', top: 0, left: 0,
        background: 'var(--accent, #7c3aed)',
        color: '#fff', fontWeight: 700,
        fontSize: rank <= 3 ? '18px' : '14px',
        width: '28px', height: '28px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: '0 0 6px 0', zIndex: 2
      }}>{rank}</div>
      <img src={alImg(m, 'large')} alt={title} loading="lazy"
        style={{ width: '108px', height: '152px', objectFit: 'cover' }}
        onError={e => { e.target.src = 'https://placehold.co/108x152/0d0d15/555577?text=N/A' }}
      />
      <div className="hcard-info">
        <div className="hcard-title">{title}</div>
        <div className="hcard-sub">{m.averageScore ? `⭐ ${m.averageScore / 10}/10` : m.format}</div>
      </div>
    </div>
  )
}

export default function Home() {
  const { go, pbStart, pbDone } = useApp()
  const [airingList,    setAiringList]    = useState([])
  const [movieList,     setMovieList]     = useState([])
  const [updatedList,   setUpdatedList]   = useState([])
  const [latestCards,   setLatestCards]   = useState([])
  const [top10List,     setTop10List]     = useState([])
  const [upcomingList,  setUpcomingList]  = useState([])
  const [completedList, setCompletedList] = useState([])
  const [seasonList,    setSeasonList]    = useState([])
  const [cw] = useState(() => getCW())
  const [rv] = useState(() => getRV())
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const getSeason = () => {
    const m = new Date().getMonth()
    if (m < 3) return 'WINTER'
    if (m < 6) return 'SPRING'
    if (m < 9) return 'SUMMER'
    return 'FALL'
  }

  useEffect(() => {
    pbStart()
    setLoading(true)
    Promise.all([
      alQuery(Q_LIST(), buildVars({ sort: 'TRENDING_DESC', status: 'RELEASING', page: 1 })),
      alQuery(Q_LIST(), buildVars({ sort: 'POPULARITY_DESC', format: 'MOVIE', page: 1 })),
      fetchLatestReleasedWithAniListIds(),
      fetchRecentlyUpdatedViaJikan(),
      alQuery(Q_LIST(), buildVars({ sort: 'SCORE_DESC', status: 'RELEASING', page: 1 })),
      alQuery(Q_LIST(), buildVars({ sort: 'POPULARITY_DESC', status: 'NOT_YET_RELEASED', page: 1 })),
      alQuery(Q_LIST(), buildVars({ sort: 'POPULARITY_DESC', status: 'FINISHED', page: 1 })),
      alQuery(Q_LIST(), buildVars({ sort: 'POPULARITY_DESC', season: getSeason(), seasonYear: new Date().getFullYear(), page: 1 })),
    ]).then(([airingD, moviesD, jikanLatest, jikanUpdated, top10D, upcomingD, completedD, seasonD]) => {
      setAiringList((airingD?.Page?.media) || [])
      setMovieList((moviesD?.Page?.media) || [])
      setLatestCards(jikanLatest || [])
      setUpdatedList(jikanUpdated || [])
      setTop10List((top10D?.Page?.media) || [])
      setUpcomingList((upcomingD?.Page?.media) || [])
      setCompletedList((completedD?.Page?.media) || [])
      setSeasonList((seasonD?.Page?.media) || [])
      setLoading(false)
      pbDone()
    }).catch(e => {
      setError(e.message)
      setLoading(false)
      pbDone()
    })
  }, [])

  if (loading) return <div id="app"><Spin /></div>
  if (error)   return <div id="app"><Empty title="Failed to Load" body={error} /></div>

  return (
    <div>
      {airingList.length > 0 && <Hero list={airingList.slice(0, 8)} />}

      {/* LATEST RELEASED - horizontal scroll */}
      {latestCards.length > 0 && (
        <Section title="Latest Released">
          <div className="hscroll-outer">
            <div className="hscroll">
              {latestCards.map((card, i) => (
                <LatestEpCard key={card.malId + '-' + card.epNum + '-' + i} card={card} />
              ))}
            </div>
          </div>
        </Section>
      )}

      {/* LATEST RELEASED EPISODES - grid section */}
      {latestCards.length > 0 && (
        <Section title="Latest Released Episodes" viewAll="updated">
          <div className="grid">
            {latestCards.slice(0, 18).map((card, i) => (
              <div
                key={card.malId + '-ep-' + i}
                className="hcard"
                style={{ cursor: card.alId ? 'pointer' : 'default' }}
                onClick={() => card.alId && go('watch', { id: card.alId, name: card.title, titleAlt: card.title, ep: card.epNum })}
              >
                <img
                  src={card.img} alt={card.title} loading="lazy"
                  style={{ width: '130px', height: '80px', objectFit: 'cover', display: 'block' }}
                  onError={e => { e.target.src = 'https://placehold.co/130x80/0d0d15/555577?text=N/A' }}
                />
                <div className="hcard-info">
                  <div className="hcard-title">{card.title}</div>
                  <div className="hcard-sub">EP {card.epNum} · {card.epTitle || 'Latest Episode'}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* TOP 10 TODAY */}
      {top10List.length > 0 && (
        <Section title="Top 10 Today">
          <div className="hscroll-outer">
            <div className="hscroll">
              {top10List.slice(0, 10).map((m, i) => (
                <RankedCard key={m.id} m={m} rank={i + 1} />
              ))}
            </div>
          </div>
        </Section>
      )}

      {/* RECENTLY UPDATED */}
      {updatedList.length > 0 && (
        <Section title="Recently Updated" viewAll="updated">
          <div className="grid">
            {updatedList.slice(0, 18).map((m, i) => <Card key={m.id} m={m} delay={i * 34} />)}
          </div>
        </Section>
      )}

      {/* TOP AIRING */}
      <Section title="Top Airing" viewAll="trending">
        <div className="grid">
          {airingList.slice(0, 18).map((m, i) => <Card key={m.id} m={m} delay={i * 34} />)}
        </div>
      </Section>

      {/* THIS SEASON */}
      {seasonList.length > 0 && (
        <Section title={`${getSeason().charAt(0) + getSeason().slice(1).toLowerCase()} ${new Date().getFullYear()}`} viewAll="season">
          <div className="grid">
            {seasonList.slice(0, 12).map((m, i) => <Card key={m.id} m={m} delay={i * 34} />)}
          </div>
        </Section>
      )}

      {/* POPULAR MOVIES */}
      {movieList.length > 0 && (
        <Section title="Popular Movies" viewAll="movies">
          <div className="grid">
            {movieList.slice(0, 12).map((m, i) => <Card key={m.id} m={m} delay={i * 34} />)}
          </div>
        </Section>
      )}

      {/* MOST ANTICIPATED */}
      {upcomingList.length > 0 && (
        <Section title="Most Anticipated" viewAll="upcoming">
          <div className="grid">
            {upcomingList.slice(0, 12).map((m, i) => <Card key={m.id} m={m} delay={i * 34} />)}
          </div>
        </Section>
      )}

      {/* COMPLETED SERIES */}
      {completedList.length > 0 && (
        <Section title="Completed Series" viewAll="completed">
          <div className="grid">
            {completedList.slice(0, 12).map((m, i) => <Card key={m.id} m={m} delay={i * 34} />)}
          </div>
        </Section>
      )}

      {/* CONTINUE WATCHING */}
      {cw.length > 0 && (
        <HSection title="Continue Watching">
          {cw.map(item => (
            <div key={item.id} className="hcard"
              onClick={() => go('watch', { id: item.id, name: item.title, titleAlt: item.titleAlt, ep: item.ep, lang: item.lang })}>
              <img src={item.poster} alt={item.title} loading="lazy"
                style={{ width: '108px', height: '152px', objectFit: 'cover' }}
                onError={e => { e.target.src = 'https://placehold.co/108x152/0d0d15/555577?text=N/A' }} />
              <div className="hcard-info">
                <div className="hcard-title">{item.title}</div>
                <div className="hcard-sub">EP {item.ep} {item.lang.toUpperCase()}</div>
              </div>
            </div>
          ))}
        </HSection>
      )}

      {/* RECENTLY VIEWED */}
      {rv.length > 0 && (
        <HSection title="Recently Viewed">
          {rv.map(item => (
            <div key={item.id} className="hcard"
              onClick={() => go('anime', { id: item.id, name: item.title, titleAlt: item.titleAlt || item.title })}>
              <img src={item.poster} alt={item.title} loading="lazy"
                style={{ width: '108px', height: '152px', objectFit: 'cover' }}
                onError={e => { e.target.src = 'https://placehold.co/108x152/0d0d15/555577?text=N/A' }} />
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
