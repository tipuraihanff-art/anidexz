import React, { useState, useEffect } from 'react'
import { useApp } from '../AppContext.jsx'
import { isWL, toggleWL, addRV } from '../storage.js'
import { Spin, HeartSVG } from '../components/Shared.jsx'

const BASE = 'https://anidexz-api.vercel.app/aniwatch'

async function fetchDetail(id) {
  const res = await fetch(`${BASE}/anime/${id}`)
  if (!res.ok) throw new Error(`Failed to fetch anime: ${res.status}`)
  return res.json()
}

async function fetchEpisodes(id) {
  const res = await fetch(`${BASE}/episodes/${id}`)
  if (!res.ok) throw new Error(`Failed to fetch episodes: ${res.status}`)
  return res.json()
}

/* ── Episode Section ── */
function EpisodeSection({ animeId }) {
  const { go, route } = useApp()
  const [eps, setEps] = useState([])
  const [lang, setLang] = useState(route.lang || 'sub')
  const [loading, setLoading] = useState(true)
  const [chunkStart, setChunkStart] = useState(0)
  const CHUNK = 100

  useEffect(() => {
    fetchEpisodes(animeId)
      .then(d => { setEps(d.episodes || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [animeId])

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
            >
              EP {eps[start].episodeNo}–{eps[Math.min(end, eps.length) - 1].episodeNo}
            </button>
          ))}
        </div>
      )}
      <div className="epgrid">
        {currentChunk.map(ep => (
          <button
            key={ep.episodeNo}
            className={'epbtn' + (ep.filler ? ' filler' : '')}
            title={ep.name || ''}
            onClick={() => go('watch', { id: animeId, name: animeId, titleAlt: animeId, ep: ep.episodeNo, lang })}
          >
            {ep.episodeNo}
          </button>
        ))}
      </div>
      {!eps.length && <p style={{ color: 'var(--dim)', fontSize: '13px' }}>No episode data.</p>}
    </div>
  )
}

/* ── Main Detail ── */
export default function Detail() {
  const { route, go, pbStart, pbDone, toast } = useApp()
  const id = route.id
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('tab-eps')
  const [inWl, setInWl] = useState(false)

  useEffect(() => {
    if (!id) { go('home'); return }
    pbStart()
    setLoading(true)
    setError(null)
    fetchDetail(id)
      .then(d => {
        if (!d?.info) throw new Error('Anime not found')
        setData(d)
        setInWl(isWL(d.info.id))
        addRV(d.info.id, d.info.name, d.info.name, d.info.img)
        document.title = d.info.name + ' - anidexz'
        const ogT = document.getElementById('og-title'); if (ogT) ogT.content = d.info.name + ' - anidexz'
        const ogI = document.getElementById('og-img'); if (ogI) ogI.content = d.info.img
        setLoading(false)
        pbDone()
      })
      .catch(err => {
        console.error('Detail fetch error:', err)
        setError(err.message)
        setLoading(false)
        pbDone()
      })
  }, [id])

  if (loading) return <Spin />

  if (error || !data) return (
    <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--dim)' }}>
      <p style={{ color: 'var(--fg)', fontSize: '20px', marginBottom: '10px' }}>Failed to load</p>
      <p style={{ fontSize: '13px', marginBottom: '20px' }}>{error || 'Unknown error'}</p>
      <button className="bp" onClick={() => go('home')}>Go Home</button>
    </div>
  )

  const { info, moreInfo = {}, seasons = [], relatedAnimes = [], recommendedAnimes = [] } = data

  // ── Safe array helpers ──
  const genres   = Array.isArray(moreInfo['Genres'])    ? moreInfo['Genres']    : []
  const studios  = Array.isArray(moreInfo['Studios:'])  ? moreInfo['Studios:']  : []
  const producers = Array.isArray(moreInfo['Producers']) ? moreInfo['Producers'] : []
  const status   = moreInfo['Status:']    || ''
  const aired    = moreInfo['Aired:']     || ''
  const score    = moreInfo['MAL Score:'] || ''
  const syn      = (info.description || 'No synopsis.').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim()

  const tabs = [
    { id: 'tab-eps',  label: 'Episodes' },
    ...(relatedAnimes.length     ? [{ id: 'tab-rel',  label: 'Relations' }]   : []),
    ...(recommendedAnimes.length ? [{ id: 'tab-recs', label: 'Recommended' }] : []),
    ...(seasons.length           ? [{ id: 'tab-seas', label: 'Seasons' }]     : []),
  ]

  function handleWl() {
    const added = toggleWL({ id: info.id, title: info.name, titleAlt: info.name, poster: info.img, score, type: info.category })
    setInWl(added)
    toast(added ? 'Added to My List' : 'Removed from My List')
  }

  return (
    <>
      {/* Hero */}
      <div className="dhero">
        <div className="dhero-bg" style={{ backgroundImage: `url(${info.img})` }} />
        <div className="dhero-grad" />
        <div className="dhero-cnt">
          <img
            className="dposter" src={info.img} alt={info.name} loading="lazy"
            onError={e => { e.target.src = 'https://placehold.co/120x180/0d0d15/555577?text=N/A' }}
          />
          <div className="dinfo">
            <h1 className="dtitle">{info.name}</h1>
            {moreInfo['Japanese:'] && (
              <div className="dnative">{moreInfo['Japanese:']}</div>
            )}
            <div className="dmeta">
              {score && score !== 'N/A' && <span className="chip sc">★ {score}</span>}
              {info.episodes?.eps  && <span className="chip">{info.episodes.eps} eps</span>}
              {info.episodes?.sub  && <span className="chip">SUB {info.episodes.sub}</span>}
              {info.episodes?.dub  && <span className="chip">DUB {info.episodes.dub}</span>}
              {status               && <span className="chip">{status}</span>}
              {info.category        && <span className="chip">{info.category}</span>}
              {info.quality         && <span className="chip">{info.quality}</span>}
              {info.duration        && <span className="chip">{info.duration}</span>}
              {info.rating          && <span className="chip">{info.rating}</span>}
              {aired                && <span className="chip">{aired}</span>}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button className="bp" onClick={() => go('watch', { id: info.id, name: info.name, titleAlt: info.name, ep: 1, lang: route.lang })}>
                ▶ Watch Now
              </button>
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

        {/* Genres */}
        {genres.length > 0 && (
          <div className="genres">
            {genres.map(g => (
              <span key={g} className="gtag" onClick={() => go('search', { q: g })}>{g}</span>
            ))}
          </div>
        )}

        {/* Studios */}
        {studios.length > 0 && (
          <div style={{ marginBottom: '18px' }}>
            <div className="sec-hdr" style={{ marginBottom: '8px' }}>
              <h3 className="sec-title" style={{ fontSize: '15px' }}>Studios</h3>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap' }}>
              {studios.map(st => (
                <span key={st} className="studio-tag" onClick={() => go('search', { q: st })}>{st}</span>
              ))}
            </div>
          </div>
        )}

        {/* More Info */}
        <div style={{ marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '8px 24px' }}>
          {[
            ['Premiered', moreInfo['Premiered:']],
            ['Duration',  moreInfo['Duration:']],
            ['Synonyms',  moreInfo['Synonyms:']],
            ['Producers', producers.join(', ')],
          ].filter(([, v]) => v).map(([label, val]) => (
            <div key={label} style={{ fontSize: '12px', color: 'var(--dim)' }}>
              <span style={{ color: 'var(--fg)', fontWeight: 600 }}>{label}: </span>{val}
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="tab-bar">
          {tabs.map(t => (
            <button
              key={t.id}
              className={'tab-btn' + (activeTab === t.id ? ' on' : '')}
              onClick={() => setActiveTab(t.id)}
            >{t.label}</button>
          ))}
        </div>

        {/* Episodes */}
        <div className={'tab-panel' + (activeTab === 'tab-eps' ? ' on' : '')}>
          <EpisodeSection animeId={info.id} />
        </div>

        {/* Relations */}
        <div className={'tab-panel' + (activeTab === 'tab-rel' ? ' on' : '')}>
          {relatedAnimes.length ? (
            <div>
              <div style={{ marginBottom: '12px' }}><h3 className="ep-hdr-title">Related</h3></div>
              <div className="rel-grid">
                {relatedAnimes.map((item, i) => (
                  <div
                    key={i} className="rel-card"
                    onClick={() => go('anime', { id: item.id, name: item.name, titleAlt: item.name })}
                  >
                    <img
                      src={item.img} alt={item.name} loading="lazy"
                      onError={e => { e.target.src = 'https://placehold.co/36x50/0d0d15/555577?text=?' }}
                    />
                    <div className="rel-info">
                      <div className="rel-type">{item.category || ''}</div>
                      <div className="rel-title">{item.name}</div>
                      <div className="va-sub">
                        {item.episodes?.sub ? `SUB ${item.episodes.sub}` : ''}
                        {item.episodes?.dub ? ` · DUB ${item.episodes.dub}` : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : <p style={{ color: 'var(--dim)', fontSize: '13px', padding: '12px 0' }}>No related entries.</p>}
        </div>

        {/* Recommendations */}
        <div className={'tab-panel' + (activeTab === 'tab-recs' ? ' on' : '')}>
          {recommendedAnimes.length ? (
            <div>
              <div style={{ marginBottom: '12px' }}><h3 className="ep-hdr-title">You May Also Like</h3></div>
              <div className="hscroll-outer">
                <div className="hscroll">
                  {recommendedAnimes.map((item, i) => (
                    <div
                      key={i} className="hcard"
                      onClick={() => go('anime', { id: item.id, name: item.name, titleAlt: item.name })}
                    >
                      <img
                        src={item.img} alt={item.name} loading="lazy"
                        style={{ width: '108px', height: '152px', objectFit: 'cover' }}
                        onError={e => { e.target.src = 'https://placehold.co/108x152/0d0d15/555577?text=N/A' }}
                      />
                      <div className="hcard-info">
                        <div className="hcard-title">{item.name}</div>
                        <div className="hcard-sub">
                          {item.episodes?.sub ? `SUB ${item.episodes.sub}` : ''}
                          {item.episodes?.dub ? ` · DUB ${item.episodes.dub}` : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : <p style={{ color: 'var(--dim)', fontSize: '13px', padding: '12px 0' }}>No recommendations.</p>}
        </div>

        {/* Seasons */}
        <div className={'tab-panel' + (activeTab === 'tab-seas' ? ' on' : '')}>
          {seasons.length ? (
            <div>
              <div style={{ marginBottom: '12px' }}><h3 className="ep-hdr-title">Seasons</h3></div>
              <div className="rel-grid">
                {seasons.map((s, i) => (
                  <div
                    key={i} className={'rel-card' + (s.isCurrent ? ' current' : '')}
                    onClick={() => go('anime', { id: s.id, name: s.name, titleAlt: s.name })}
                  >
                    <img
                      src={s.img} alt={s.name} loading="lazy"
                      onError={e => { e.target.src = 'https://placehold.co/36x50/0d0d15/555577?text=?' }}
                    />
                    <div className="rel-info">
                      {s.isCurrent && <div className="rel-type" style={{ color: 'var(--acc)' }}>Current</div>}
                      <div className="rel-title">{s.name}</div>
                      <div className="va-sub">{s.seasonTitle || ''}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : <p style={{ color: 'var(--dim)', fontSize: '13px', padding: '12px 0' }}>No season data.</p>}
        </div>

      </div>
    </>
  )
}
