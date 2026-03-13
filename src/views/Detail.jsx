import React, { useState, useEffect, useRef } from 'react'
import { useApp } from '../AppContext.jsx'
import { alQuery, Q_DETAIL, loadEpisodes } from '../api.js'
import { alTitle, alTitleAlt, alImg, scoreDisp, fmtFormat, fmtNum } from '../helpers.js'
import { isWL, toggleWL, addRV } from '../storage.js'
import { Spin, HeartSVG } from '../components/Shared.jsx'
import { useApp as useAppHook } from '../AppContext.jsx'

const STATUS_MAP = { FINISHED: 'Completed', RELEASING: 'Airing', NOT_YET_RELEASED: 'Upcoming', CANCELLED: 'Cancelled', HIATUS: 'Hiatus' }

/* ── Countdown ── */
function Countdown({ nep }) {
  const [time, setTime] = useState({})
  useEffect(() => {
    function tick() {
      const diff = nep.airingAt * 1000 - Date.now()
      if (diff <= 0) { setTime({ d: '00', h: '00', m: '00', s: '00' }); return }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const mn = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setTime({ d: String(d).padStart(2,'0'), h: String(h).padStart(2,'0'), m: String(mn).padStart(2,'0'), s: String(s).padStart(2,'0') })
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [nep])

  return (
    <div className="countdown-box">
      <div className="countdown-icon">
        <svg width="16" height="16" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="countdown-label">Next Episode</div>
        <div className="countdown-ep">Episode {nep.episode} airing in</div>
        <div className="countdown-timer">
          <div className="cd-unit"><span className="cd-val">{time.d}</span><div className="cd-lbl">Days</div></div>
          <div className="cd-sep">:</div>
          <div className="cd-unit"><span className="cd-val">{time.h}</span><div className="cd-lbl">Hours</div></div>
          <div className="cd-sep">:</div>
          <div className="cd-unit"><span className="cd-val">{time.m}</span><div className="cd-lbl">Mins</div></div>
          <div className="cd-sep">:</div>
          <div className="cd-unit"><span className="cd-val">{time.s}</span><div className="cd-lbl">Secs</div></div>
        </div>
      </div>
    </div>
  )
}

/* ── Episode section ── */
function EpisodeSection({ malId, alId, animeId, name, titleAlt }) {
  const { go, route } = useApp()
  const [eps, setEps] = useState([])
  const [lang, setLang] = useState(route.lang || 'sub')
  const [loading, setLoading] = useState(true)
  const [chunkStart, setChunkStart] = useState(0)
  const CHUNK = 100

  useEffect(() => {
    loadEpisodes(malId).then(list => { setEps(list); setLoading(false) })
  }, [malId])

  if (loading) return <Spin />

  const chunks = []
  for (let i = 0; i < eps.length; i += CHUNK) chunks.push([i, Math.min(i + CHUNK, eps.length)])
  const currentChunk = eps.slice(chunkStart, chunkStart + CHUNK)

  return (
    <div>
      <div className="ep-hdr">
        <h3 className="ep-hdr-title">Episodes</h3>
        <div className="ltog">
          <button className={'lbtn' + (lang === 'sub' ? ' on' : '')} onClick={() => setLang('sub')}>SUB</button>
          <button className={'lbtn' + (lang === 'dub' ? ' on' : '')} onClick={() => setLang('dub')}>DUB</button>
        </div>
      </div>
      {eps.length > CHUNK && (
        <div className="ep-range-bar">
          {chunks.map(([start, end]) => (
            <button
              key={start}
              className={'ep-range-btn' + (chunkStart === start ? ' active' : '')}
              onClick={() => setChunkStart(start)}
            >EP {eps[start]}-{eps[Math.min(end, eps.length) - 1]}</button>
          ))}
        </div>
      )}
      <div className="epgrid">
        {currentChunk.map(n => (
          <button
            key={n}
            className="epbtn"
            onClick={() => go('watch', { id: animeId, name, titleAlt, ep: n, lang })}
          >{n}</button>
        ))}
      </div>
      {!eps.length && <p style={{ color: 'var(--dim)', fontSize: '13px' }}>No episode data.</p>}
    </div>
  )
}

export default function Detail() {
  const { route, go, pbStart, pbDone, toast } = useApp()
  const id = route.id
  const [m, setM] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('tab-eps')
  const [inWl, setInWl] = useState(false)

  useEffect(() => {
    if (!id) { go('home'); return }
    pbStart()
    setLoading(true)
    alQuery(Q_DETAIL(), { id })
      .then(d => {
        const media = d?.Media
        if (!media) throw new Error('Not found')
        setM(media)
        setInWl(isWL(media.id))
        const title = alTitle(media)
        const titleAlt = alTitleAlt(media)
        addRV(id, title, titleAlt, alImg(media, 'extraLarge'))
        // Update OG meta
        document.title = title + ' - anidexz'
        const ogT = document.getElementById('og-title'); if (ogT) ogT.content = title + ' - anidexz'
        const ogI = document.getElementById('og-img'); if (ogI) ogI.content = alImg(media, 'extraLarge')
        setLoading(false)
        pbDone()
      })
      .catch(() => { setLoading(false); pbDone() })
  }, [id])

  if (loading || !m) return <Spin />

  const title = alTitle(m)
  const titleAlt = alTitleAlt(m)
  const poster = alImg(m, 'extraLarge')
  const banner = m.bannerImage || poster
  const score = scoreDisp(m)
  const statusDisp = STATUS_MAP[m.status] || m.status || ''
  const syn = (m.description || 'No synopsis.').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/\[Written[^\]]*\]/g, '').trim()
  const genres = m.genres || []
  const studios = m.studios?.nodes || []
  const chars = m.characters?.edges || []
  const staff = m.staff?.edges || []
  const relations = m.relations?.edges || []
  const recs = m.recommendations?.nodes || []
  const trailer = m.trailer
  const tags = (m.tags || []).filter(t => !t.isMediaSpoiler && t.rank >= 70).slice(0, 8)

  const tabs = [
    { id: 'tab-eps', label: 'Episodes' },
    { id: 'tab-chars', label: 'Characters' },
    { id: 'tab-staff', label: 'Staff' },
    { id: 'tab-rel', label: 'Relations' },
    ...(trailer?.id ? [{ id: 'tab-trailer', label: 'Trailer' }] : []),
    ...(recs.length ? [{ id: 'tab-recs', label: 'Recommended' }] : []),
  ]

  function handleWl() {
    const added = toggleWL({ id: m.id, title, titleAlt, poster, score, type: fmtFormat(m.format) })
    setInWl(added)
    toast(added ? 'Added to My List' : 'Removed from My List')
  }

  return (
    <>
      {/* Hero */}
      <div className="dhero">
        <div className="dhero-bg" style={{ backgroundImage: `url(${banner})` }} />
        <div className="dhero-grad" />
        <div className="dhero-cnt">
          <img className="dposter" src={poster} alt={title} loading="lazy" onError={e => { e.target.src = 'https://placehold.co/120x180/0d0d15/555577?text=N/A' }} />
          <div className="dinfo">
            <h1 className="dtitle">{title}</h1>
            {m.title.native && <div className="dnative">{m.title.native}</div>}
            {titleAlt && titleAlt !== title && <div className="dnative" style={{ fontSize: '12px', color: 'var(--dim)', marginBottom: '8px' }}>{titleAlt}</div>}
            <div className="dmeta">
              {score && score !== 'N/A' && <span className="chip sc">★ {score}</span>}
              {m.episodes && <span className="chip">{m.episodes} eps</span>}
              {statusDisp && <span className="chip">{statusDisp}</span>}
              {m.seasonYear && <span className="chip">{m.seasonYear}</span>}
              {m.format && <span className="chip">{fmtFormat(m.format)}</span>}
              {m.duration && <span className="chip">{m.duration} min</span>}
              {m.source && <span className="chip">{m.source.replace(/_/g, ' ')}</span>}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button className="bp" onClick={() => go('watch', { id: m.id, name: title, titleAlt, ep: 1, lang: route.lang })}>▶ Watch Now</button>
              <button className="bs" onClick={handleWl} style={{ gap: '5px' }}>
                <HeartSVG on={inWl} /> {inWl ? 'In My List' : 'My List'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="dbody">
        <p className="dsynopsis">{syn}</p>

        {/* Stats */}
        <div className="stats-grid">
          {score && score !== 'N/A' && <div className="stat-box"><div className="stat-val">{score}</div><div className="stat-lbl">Score</div></div>}
          {m.popularity && <div className="stat-box"><div className="stat-val">{fmtNum(m.popularity)}</div><div className="stat-lbl">Popularity</div></div>}
          {m.favourites && <div className="stat-box"><div className="stat-val">{fmtNum(m.favourites)}</div><div className="stat-lbl">Favourites</div></div>}
          {m.trending && <div className="stat-box"><div className="stat-val">{m.trending}</div><div className="stat-lbl">Trending</div></div>}
        </div>

        {/* Genres */}
        {genres.length > 0 && (
          <div className="genres">
            {genres.map(g => <span key={g} className="gtag" onClick={() => go('search', { q: g })}>{g}</span>)}
          </div>
        )}

        {/* Studios */}
        {studios.length > 0 && (
          <div style={{ marginBottom: '18px' }}>
            <div className="sec-hdr" style={{ marginBottom: '8px' }}><h3 className="sec-title" style={{ fontSize: '15px' }}>Studios</h3></div>
            <div style={{ display: 'flex', flexWrap: 'wrap' }}>
              {studios.map(st => <span key={st.id} className="studio-tag" onClick={() => go('search', { q: st.name })}>{st.name}</span>)}
            </div>
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div className="sec-hdr" style={{ marginBottom: '8px' }}><h3 className="sec-title" style={{ fontSize: '15px' }}>Tags</h3></div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              {tags.map(t => (
                <span key={t.name} style={{ background: 'var(--glass)', border: '1px solid var(--bdr)', borderRadius: '14px', padding: '3px 10px', fontSize: '10px', fontWeight: '700', color: 'var(--dim)' }}>
                  {t.name}<span style={{ color: 'var(--acc2)', marginLeft: '4px' }}>{t.rank}%</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Countdown */}
        {m.nextAiringEpisode?.airingAt && <Countdown nep={m.nextAiringEpisode} />}

        {/* Tabs */}
        <div className="tab-bar">
          {tabs.map(t => (
            <button key={t.id} className={'tab-btn' + (activeTab === t.id ? ' on' : '')} onClick={() => setActiveTab(t.id)}>{t.label}</button>
          ))}
        </div>

        {/* Episodes */}
        <div className={'tab-panel' + (activeTab === 'tab-eps' ? ' on' : '')}>
          <EpisodeSection malId={m.idMal} alId={id} animeId={m.id} name={title} titleAlt={titleAlt} />
        </div>

        {/* Characters */}
        <div className={'tab-panel' + (activeTab === 'tab-chars' ? ' on' : '')}>
          {chars.length ? (
            <div>
              <div style={{ marginBottom: '12px' }}><h3 className="ep-hdr-title">Characters &amp; Voice Actors</h3></div>
              <div className="va-row">
                {chars.map((edge, i) => {
                  const ch = edge.node
                  const va = edge.voiceActors?.[0]
                  return (
                    <div key={i} className="va-item">
                      <img src={ch.image?.large || ch.image?.medium || ''} alt={ch.name.full} onError={e => { e.target.src = 'https://placehold.co/44x44/0d0d15/555577?text=?' }} loading="lazy" />
                      <div className="va-info">
                        <div className="va-name">{ch.name.full}</div>
                        {ch.name.native && <div className="va-sub">{ch.name.native}</div>}
                      </div>
                      <div className="va-role">{edge.role || ''}</div>
                      {va && <>
                        <img src={va.image?.large || va.image?.medium || ''} alt={va.name.full} onError={e => { e.target.src = 'https://placehold.co/44x44/0d0d15/555577?text=?' }} loading="lazy" style={{ width: '44px', height: '44px', objectFit: 'cover', borderRadius: '50%', flexShrink: 0, border: '1px solid var(--bdr)' }} />
                        <div className="va-info" style={{ textAlign: 'right' }}>
                          <div className="va-name">{va.name.full}</div>
                          <div className="va-sub">JP Voice</div>
                        </div>
                      </>}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : <p style={{ color: 'var(--dim)', fontSize: '13px', padding: '12px 0' }}>No character data available.</p>}
        </div>

        {/* Staff */}
        <div className={'tab-panel' + (activeTab === 'tab-staff' ? ' on' : '')}>
          {staff.length ? (
            <div>
              <div style={{ marginBottom: '12px' }}><h3 className="ep-hdr-title">Staff</h3></div>
              <div className="va-row">
                {staff.map((edge, i) => (
                  <div key={i} className="va-item">
                    <img src={edge.node.image?.large || edge.node.image?.medium || ''} alt={edge.node.name.full} onError={e => { e.target.src = 'https://placehold.co/44x44/0d0d15/555577?text=?' }} loading="lazy" />
                    <div className="va-info"><div className="va-name">{edge.node.name.full}</div></div>
                    <div className="va-role">{edge.role || ''}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : <p style={{ color: 'var(--dim)', fontSize: '13px', padding: '12px 0' }}>No staff data available.</p>}
        </div>

        {/* Relations */}
        <div className={'tab-panel' + (activeTab === 'tab-rel' ? ' on' : '')}>
          {relations.filter(e => e.node?.type === 'ANIME').length ? (
            <div>
              <div style={{ marginBottom: '12px' }}><h3 className="ep-hdr-title">Related</h3></div>
              <div className="rel-grid">
                {relations.filter(e => e.node?.type === 'ANIME').map((edge, i) => {
                  const rn = edge.node
                  const rTitle = rn.title?.english || rn.title?.romaji || ''
                  return (
                    <div key={i} className="rel-card" onClick={() => go('anime', { id: rn.id, name: rTitle, titleAlt: rn.title?.romaji || rTitle })}>
                      <img src={rn.coverImage?.medium || ''} alt={rTitle} onError={e => { e.target.src = 'https://placehold.co/36x50/0d0d15/555577?text=?' }} loading="lazy" />
                      <div className="rel-info">
                        <div className="rel-type">{edge.relationType || ''}</div>
                        <div className="rel-title">{rTitle}</div>
                        <div className="va-sub">{fmtFormat(rn.format || '')}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : <p style={{ color: 'var(--dim)', fontSize: '13px', padding: '12px 0' }}>No related entries.</p>}
        </div>

        {/* Trailer */}
        {trailer?.id && (
          <div className={'tab-panel' + (activeTab === 'tab-trailer' ? ' on' : '')}>
            <div style={{ marginBottom: '12px' }}><h3 className="ep-hdr-title">Trailer</h3></div>
            {(trailer.site === 'youtube' || trailer.site === 'dailymotion') ? (
              <div className="trailer-wrap">
                <iframe
                  src={trailer.site === 'youtube'
                    ? `https://www.youtube.com/embed/${trailer.id}?autoplay=0&rel=0`
                    : `https://www.dailymotion.com/embed/video/${trailer.id}`}
                  allowFullScreen
                  allow="autoplay; encrypted-media"
                  loading="lazy"
                  title="Trailer"
                />
              </div>
            ) : <p style={{ color: 'var(--dim)', fontSize: '13px', padding: '12px 0' }}>Trailer not available.</p>}
          </div>
        )}

        {/* Recommendations */}
        {recs.length > 0 && (
          <div className={'tab-panel' + (activeTab === 'tab-recs' ? ' on' : '')}>
            <div style={{ marginBottom: '12px' }}><h3 className="ep-hdr-title">You May Also Like</h3></div>
            <div className="hscroll-outer">
              <div className="hscroll">
                {recs.map((r, i) => {
                  const rm = r.mediaRecommendation
                  if (!rm) return null
                  const rt = rm.title?.english || rm.title?.romaji || ''
                  return (
                    <div key={i} className="hcard" onClick={() => go('anime', { id: rm.id, name: rt, titleAlt: rm.title?.romaji || rt })}>
                      <img src={rm.coverImage?.large || rm.coverImage?.medium || ''} alt={rt} loading="lazy" style={{ width: '108px', height: '152px', objectFit: 'cover' }} onError={e => { e.target.src = 'https://placehold.co/108x152/0d0d15/555577?text=N/A' }} />
                      <div className="hcard-info">
                        <div className="hcard-title">{rt}</div>
                        <div className="hcard-sub">{rm.averageScore ? `★ ${rm.averageScore}` : ''}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
