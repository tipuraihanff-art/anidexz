import { useState, useEffect, useRef } from 'react';
import { alQuery, Q_DETAIL, alTitle, alTitleAlt, alImg, scoreDisp, fmtFormat, fmtNum, isWL, toggleWL, addRV, loadEpisodes } from '../utils/api';
import { Spinner, EmptyState } from './UI';

function CountdownTimer({ airingAt, episode }) {
  const [time, setTime] = useState('');
  useEffect(() => {
    const target = airingAt * 1000;
    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) { setTime('Airing now'); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTime(`${String(d).padStart(2,'0')}d ${String(h).padStart(2,'0')}h ${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [airingAt]);

  return (
    <div className="countdown-box">
      <div className="countdown-icon">
        <svg width="16" height="16" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      </div>
      <div>
        <div className="countdown-label">Next Episode</div>
        <div className="countdown-ep">Episode {episode}</div>
        <div style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: 22, fontWeight: 700, color: 'var(--acc2)' }}>{time}</div>
      </div>
    </div>
  );
}

const CHUNK = 100;
function EpisodePanel({ malId, alId, lang, onWatch, currentEp }) {
  const [eps, setEps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chunkStart, setChunkStart] = useState(0);

  useEffect(() => {
    setLoading(true);
    loadEpisodes(malId).then(list => { setEps(list); setLoading(false); });
  }, [malId]);

  if (loading) return <Spinner />;
  if (!eps.length) return <p style={{ color: 'var(--dim)', fontSize: 13 }}>No episode data.</p>;

  const chunk = eps.slice(chunkStart, chunkStart + CHUNK);
  const totalChunks = Math.ceil(eps.length / CHUNK);

  return (
    <>
      {eps.length > CHUNK && (
        <div className="ep-range-bar">
          {Array.from({ length: totalChunks }).map((_, ci) => {
            const from = eps[ci * CHUNK], to = eps[Math.min((ci + 1) * CHUNK, eps.length) - 1];
            return (
              <button
                key={ci}
                className={`ep-range-btn${chunkStart === ci * CHUNK ? ' active' : ''}`}
                onClick={() => setChunkStart(ci * CHUNK)}
              >
                EP {from}-{to}
              </button>
            );
          })}
        </div>
      )}
      <div className="epgrid">
        {chunk.map(n => (
          <button
            key={n}
            className={`epbtn${n === currentEp ? ' active' : ''}`}
            onClick={() => onWatch(n)}
          >{n}</button>
        ))}
      </div>
    </>
  );
}

export default function DetailPage({ id, onNavigate, onToast, pbStart, pbDone, lang }) {
  const [media, setMedia] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [wl, setWl] = useState(false);
  const [activeTab, setActiveTab] = useState('eps');
  const [synExpanded, setSynExpanded] = useState(false);

  useEffect(() => {
    if (!id) { onNavigate('home'); return; }
    setLoading(true);
    pbStart();
    alQuery(Q_DETAIL(), { id })
      .then(d => {
        const m = d?.Media;
        if (!m) throw new Error('Not found');
        setMedia(m);
        setWl(isWL(m.id));
        addRV(m.id, alTitle(m), alTitleAlt(m), alImg(m, 'extraLarge'));
        // Update OG meta
        const title = alTitle(m);
        const el = id => document.getElementById(id);
        if (el('og-title')) el('og-title').content = title + ' - anidexz';
        if (el('tw-title')) el('tw-title').content = title + ' - anidexz';
        setLoading(false);
        pbDone();
      })
      .catch(e => { setError(e.message); setLoading(false); pbDone(); });
  }, [id]);

  if (loading) return <Spinner />;
  if (error || !media) return <EmptyState title="Not Found" body={error || 'Anime not found.'} />;

  const m = media;
  const title = alTitle(m);
  const titleAlt = alTitleAlt(m);
  const poster = alImg(m, 'extraLarge');
  const banner = m.bannerImage || poster;
  const score = scoreDisp(m);
  const genres = m.genres || [];
  const studios = m.studios?.nodes || [];
  const chars = m.characters?.edges || [];
  const staff = m.staff?.edges || [];
  const relations = m.relations?.edges || [];
  const recs = m.recommendations?.nodes || [];
  const trailer = m.trailer;
  const tags = (m.tags || []).filter(t => !t.isMediaSpoiler && t.rank >= 70).slice(0, 8);
  const syn = (m.description || 'No synopsis.').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/\[Written[^\]]*\]/g, '').trim();
  const statusMap = { FINISHED: 'Completed', RELEASING: 'Airing', NOT_YET_RELEASED: 'Upcoming', CANCELLED: 'Cancelled', HIATUS: 'Hiatus' };

  function handleWL() {
    const added = toggleWL({ id: m.id, title, titleAlt, poster: alImg(m), score, type: fmtFormat(m.format) });
    setWl(added);
    onToast?.(added ? '✓ Added to My List' : 'Removed from My List');
  }

  const tabs = [
    { id: 'eps', label: 'Episodes' },
    { id: 'chars', label: 'Characters' },
    { id: 'staff', label: 'Staff' },
    { id: 'rel', label: 'Relations' },
    ...(trailer?.id ? [{ id: 'trailer', label: 'Trailer' }] : []),
    ...(recs.length ? [{ id: 'recs', label: 'Recommended' }] : []),
  ];

  const tSrc = trailer?.id
    ? (trailer.site === 'youtube' ? `https://www.youtube.com/embed/${trailer.id}?autoplay=0&rel=0`
      : trailer.site === 'dailymotion' ? `https://www.dailymotion.com/embed/video/${trailer.id}` : '')
    : '';

  return (
    <>
      {/* Detail Hero */}
      <div className="dhero">
        <div className="dhero-bg" style={{ backgroundImage: `url(${banner})` }} />
        <div className="dhero-grad" />
        <div className="dhero-cnt">
          <div className="dposter"><img src={poster} alt={title} onError={e => { e.target.src = 'https://placehold.co/200x300/0d0d15/555577?text=N/A'; }} /></div>
          <div className="dinfo">
            <h1 className="dtitle">{title}</h1>
            {titleAlt && titleAlt !== title && <div className="dalt">{titleAlt}</div>}
            <div className="dtags">
              {genres.slice(0, 6).map(g => <span key={g} className="dtag" onClick={() => onNavigate('search', { q: g })}>{g}</span>)}
              {tags.map(t => <span key={t.name} className="dtag" style={{ opacity: 0.6 }}>{t.name}</span>)}
            </div>
            <div className="dbtns">
              <button className="bp" onClick={() => onNavigate('watch', { id: m.id, name: title, titleAlt, ep: 1, lang })}>▶ Watch Now</button>
              <button className={`bs${wl ? '' : ''}`} onClick={handleWL} style={wl ? { borderColor: 'var(--pink)', color: '#ec4899' } : {}}>
                {wl ? '♥ In My List' : '♡ Add to List'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="dbody">
        {/* Stats */}
        <div className="stats-grid">
          {score && score !== 'N/A' && <div className="stat-box"><div className="stat-val">{score}</div><div className="stat-lbl">Score</div></div>}
          {m.popularity && <div className="stat-box"><div className="stat-val">{fmtNum(m.popularity)}</div><div className="stat-lbl">Popularity</div></div>}
          {m.favourites && <div className="stat-box"><div className="stat-val">{fmtNum(m.favourites)}</div><div className="stat-lbl">Favourites</div></div>}
          {m.episodes && <div className="stat-box"><div className="stat-val">{m.episodes}</div><div className="stat-lbl">Episodes</div></div>}
          {m.format && <div className="stat-box"><div className="stat-val">{fmtFormat(m.format)}</div><div className="stat-lbl">Format</div></div>}
          {m.status && <div className="stat-box"><div className="stat-val" style={{ fontSize: 14 }}>{statusMap[m.status] || m.status}</div><div className="stat-lbl">Status</div></div>}
        </div>

        {/* Countdown */}
        {m.nextAiringEpisode && (
          <CountdownTimer airingAt={m.nextAiringEpisode.airingAt} episode={m.nextAiringEpisode.episode} />
        )}

        {/* Synopsis */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 13, color: '#aaa', lineHeight: 1.75 }}>
            {synExpanded || syn.length <= 300 ? syn : syn.slice(0, 300) + '...'}
          </p>
          {syn.length > 300 && (
            <button className="sec-all" style={{ marginTop: 6 }} onClick={() => setSynExpanded(p => !p)}>
              {synExpanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>

        {/* Studios */}
        {studios.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            {studios.map(s => (
              <span key={s.id} className="studio-tag" onClick={() => onNavigate('search', { q: s.name })}>{s.name}</span>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        {tabs.map(t => (
          <button key={t.id} className={`tab-btn${activeTab === t.id ? ' on' : ''}`} onClick={() => setActiveTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {/* Episodes */}
      {activeTab === 'eps' && (
        <div className="tab-panel on">
          <div className="ep-hdr">
            <h3 className="ep-hdr-title">Episodes</h3>
            <div className="ltog">
              <button className={`lbtn${lang === 'sub' ? ' on' : ''}`} onClick={() => onNavigate('watch', { id: m.id, name: title, titleAlt, ep: 1, lang: 'sub' })}>SUB</button>
              <button className={`lbtn${lang === 'dub' ? ' on' : ''}`} onClick={() => onNavigate('watch', { id: m.id, name: title, titleAlt, ep: 1, lang: 'dub' })}>DUB</button>
            </div>
          </div>
          <EpisodePanel
            malId={m.idMal} alId={m.id} lang={lang}
            onWatch={ep => onNavigate('watch', { id: m.id, name: title, titleAlt, ep, lang })}
            currentEp={null}
          />
        </div>
      )}

      {/* Characters */}
      {activeTab === 'chars' && (
        <div className="tab-panel on">
          <h3 className="ep-hdr-title" style={{ marginBottom: 12 }}>Characters &amp; Voice Actors</h3>
          <div className="va-row">
            {chars.length === 0 ? <p style={{ color: 'var(--dim)', fontSize: 13 }}>No character data.</p> : chars.map((edge, i) => {
              const ch = edge.node;
              const va = edge.voiceActors?.[0];
              return (
                <div key={i} className="va-item">
                  <img src={ch.image?.large || ch.image?.medium || 'https://placehold.co/44x44/0d0d15/555577?text=?'} alt={ch.name.full} loading="lazy" onError={e => { e.target.src = 'https://placehold.co/44x44/0d0d15/555577?text=?'; }} />
                  <div className="va-info">
                    <div className="va-name">{ch.name.full}</div>
                    {ch.name.native && <div className="va-sub">{ch.name.native}</div>}
                  </div>
                  <div className="va-role">{edge.role || ''}</div>
                  {va && <>
                    <img src={va.image?.large || va.image?.medium || 'https://placehold.co/44x44/0d0d15/555577?text=?'} alt={va.name.full} loading="lazy" style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: '50%', flexShrink: 0, border: '1px solid var(--bdr)' }} onError={e => { e.target.src = 'https://placehold.co/44x44/0d0d15/555577?text=?'; }} />
                    <div className="va-info" style={{ textAlign: 'right' }}>
                      <div className="va-name">{va.name.full}</div>
                      <div className="va-sub">JP Voice</div>
                    </div>
                  </>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Staff */}
      {activeTab === 'staff' && (
        <div className="tab-panel on">
          <h3 className="ep-hdr-title" style={{ marginBottom: 12 }}>Staff</h3>
          <div className="va-row">
            {staff.length === 0 ? <p style={{ color: 'var(--dim)', fontSize: 13 }}>No staff data.</p> : staff.map((edge, i) => {
              const st = edge.node;
              return (
                <div key={i} className="va-item">
                  <img src={st.image?.large || st.image?.medium || 'https://placehold.co/44x44/0d0d15/555577?text=?'} alt={st.name.full} loading="lazy" onError={e => { e.target.src = 'https://placehold.co/44x44/0d0d15/555577?text=?'; }} />
                  <div className="va-info"><div className="va-name">{st.name.full}</div></div>
                  <div className="va-role">{edge.role || ''}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Relations */}
      {activeTab === 'rel' && (
        <div className="tab-panel on">
          <h3 className="ep-hdr-title" style={{ marginBottom: 12 }}>Related</h3>
          <div className="rel-grid">
            {relations.length === 0 ? <p style={{ color: 'var(--dim)', fontSize: 13 }}>No related entries.</p> :
              relations.filter(e => e.node?.type === 'ANIME').map((edge, i) => {
                const rn = edge.node;
                const rTitle = rn.title?.english || rn.title?.romaji || 'Unknown';
                return (
                  <div key={i} className="rel-card" onClick={() => onNavigate('anime', { id: rn.id, name: rTitle, titleAlt: rn.title?.romaji || rTitle })}>
                    <img src={rn.coverImage?.medium || 'https://placehold.co/36x50/0d0d15/555577?text=?'} alt={rTitle} loading="lazy" onError={e => { e.target.src = 'https://placehold.co/36x50/0d0d15/555577?text=?'; }} />
                    <div className="rel-info">
                      <div className="rel-type">{edge.relationType || ''}</div>
                      <div className="rel-title">{rTitle}</div>
                      <div className="va-sub">{fmtFormat(rn.format || '')}</div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Trailer */}
      {activeTab === 'trailer' && tSrc && (
        <div className="tab-panel on">
          <h3 className="ep-hdr-title" style={{ marginBottom: 12 }}>Trailer</h3>
          <div className="trailer-wrap">
            <iframe src={tSrc} allowFullScreen allow="autoplay; encrypted-media" loading="lazy" title="Trailer" />
          </div>
        </div>
      )}

      {/* Recommended */}
      {activeTab === 'recs' && (
        <div className="tab-panel on">
          <h3 className="ep-hdr-title" style={{ marginBottom: 12 }}>You May Also Like</h3>
          <div className="hscroll-outer">
            <div className="hscroll">
              {recs.map((r, i) => {
                const rm = r.mediaRecommendation;
                if (!rm) return null;
                const rt = rm.title?.english || rm.title?.romaji || 'Unknown';
                return (
                  <div key={i} className="hcard" onClick={() => onNavigate('anime', { id: rm.id, name: rt, titleAlt: rm.title?.romaji || rt })}>
                    <img src={rm.coverImage?.large || rm.coverImage?.medium || 'https://placehold.co/108x152/0d0d15/555577?text=N/A'} alt={rt} loading="lazy" onError={e => { e.target.src = 'https://placehold.co/108x152/0d0d15/555577?text=N/A'; }} />
                    <div className="hcard-info">
                      <div className="hcard-title">{rt}</div>
                      <div className="hcard-sub">{rm.averageScore ? `★ ${rm.averageScore}` : ''}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
