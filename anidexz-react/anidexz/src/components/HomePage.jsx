import { useState, useEffect } from 'react';
import { alQuery, Q_LIST, alTitle, alTitleAlt, alImg, getCW, lsGet } from '../utils/api';
import Hero from './Hero';
import AnimeCard from './AnimeCard';
import { Spinner, EmptyState, CardSkeleton } from './UI';

function Section({ title, viewAll, children, onViewAll }) {
  return (
    <div className="sec">
      <div className="sec-hdr">
        <h2 className="sec-title">{title}</h2>
        {viewAll && <button className="sec-all" onClick={onViewAll}>View All</button>}
      </div>
      {children}
    </div>
  );
}

function HCard({ item, onClick }) {
  return (
    <div className="hcard" onClick={onClick} style={{ width: item.wide ? 130 : 108 }}>
      {item.ep && <span className="ep-badge" style={{ position: 'absolute', top: 5, left: 5 }}>EP {item.ep}</span>}
      <img
        src={item.poster || 'https://placehold.co/108x152/0d0d15/555577?text=N/A'}
        alt={item.title}
        loading="lazy"
        style={item.wide ? { width: 130, height: 80, objectFit: 'cover', display: 'block' } : { width: 108, height: 152, objectFit: 'cover', display: 'block' }}
        onError={e => { e.target.src = `https://placehold.co/${item.wide ? '130x80' : '108x152'}/0d0d15/555577?text=N/A`; }}
      />
      <div className="hcard-info">
        <div className="hcard-title">{item.title}</div>
        <div className="hcard-sub">{item.sub}</div>
      </div>
    </div>
  );
}

function HSection({ title, items, onClickItem }) {
  if (!items.length) return null;
  return (
    <div className="sec">
      <div className="sec-hdr"><h2 className="sec-title">{title}</h2></div>
      <div className="hscroll-outer">
        <div className="hscroll">
          {items.map((it, i) => (
            <div key={i} style={{ position: 'relative' }}>
              <HCard item={it} onClick={() => onClickItem(it)} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function HomePage({ onNavigate, onToast, pbStart, pbDone, lang }) {
  const [loading, setLoading] = useState(true);
  const [airing, setAiring] = useState([]);
  const [movies, setMovies] = useState([]);
  const [updated, setUpdated] = useState([]);
  const [recent, setRecent] = useState([]);
  const [error, setError] = useState(null);

  const cw = getCW();
  const rv = lsGet('anz_rv') || [];

  useEffect(() => {
    pbStart();
    setLoading(true);
    let ai = [], mv = [], up = [], rc = [];
    alQuery(Q_LIST(), { page: 1, perPage: 18, sort: ['TRENDING_DESC'], status: 'RELEASING' })
      .then(d => { ai = d?.Page?.media || []; return alQuery(Q_LIST(), { page: 1, perPage: 12, sort: ['POPULARITY_DESC'], format: 'MOVIE' }); })
      .then(d => { mv = d?.Page?.media || []; return alQuery(Q_LIST(), { page: 1, perPage: 18, sort: ['UPDATED_AT_DESC'], status: 'RELEASING' }); })
      .then(d => { up = d?.Page?.media || []; return fetch('https://api.jikan.moe/v4/watch/episodes/recent').then(r => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] })); })
      .then(d => {
        rc = d?.data || [];
        setAiring(ai); setMovies(mv); setUpdated(up); setRecent(rc);
        setLoading(false);
        pbDone();
      })
      .catch(e => { setError(e.message); setLoading(false); pbDone(); });
  }, []);

  if (loading) return <div className="sec" style={{ paddingTop: 22 }}><Spinner /></div>;
  if (error) return <EmptyState title="Failed to Load" body={error} />;

  // Build recent episode cards
  const recentCards = [];
  recent.forEach(item => {
    if (!item?.entry) return;
    let shown = 0;
    (item.episodes || []).forEach(ep => {
      if (shown >= 2 || ep.premium) return;
      shown++;
      recentCards.push({
        id: item.entry.mal_id,
        title: item.entry.title || 'Unknown',
        sub: ep.title || `Episode ${ep.mal_id}`,
        poster: ep.images?.jpg?.image_url || item.entry.images?.jpg?.image_url || '',
        ep: ep.mal_id,
        wide: true,
        _ep: ep.mal_id,
        _lang: lang,
      });
    });
  });

  return (
    <>
      <Hero list={airing.slice(0, 8)} onNavigate={onNavigate} />
      {recentCards.length > 0 && (
        <HSection
          title="Latest Episodes"
          items={recentCards}
          onClickItem={it => onNavigate('watch', { id: it.id, name: it.title, titleAlt: it.title, ep: it._ep, lang: it._lang })}
        />
      )}
      {updated.length > 0 && (
        <Section title="Recently Updated" viewAll onViewAll={() => onNavigate('updated')}>
          <div className="grid">
            {updated.slice(0, 12).map((m, i) => (
              <AnimeCard key={m.id} media={m} delay={i * 34} onNavigate={onNavigate} onToast={onToast} />
            ))}
          </div>
        </Section>
      )}
      <Section title="Top Airing" viewAll onViewAll={() => onNavigate('trending')}>
        <div className="grid">
          {airing.map((m, i) => (
            <AnimeCard key={m.id} media={m} delay={i * 34} onNavigate={onNavigate} onToast={onToast} />
          ))}
        </div>
      </Section>
      {movies.length > 0 && (
        <Section title="Popular Movies" viewAll onViewAll={() => onNavigate('movies')}>
          <div className="grid">
            {movies.map((m, i) => (
              <AnimeCard key={m.id} media={m} delay={i * 34} onNavigate={onNavigate} onToast={onToast} />
            ))}
          </div>
        </Section>
      )}
      {cw.length > 0 && (
        <HSection
          title="Continue Watching"
          items={cw.map(it => ({ ...it, sub: `EP ${it.ep} • ${it.lang.toUpperCase()}` }))}
          onClickItem={it => onNavigate('watch', { id: it.id, name: it.title, titleAlt: it.titleAlt, ep: it.ep, lang: it.lang })}
        />
      )}
      {rv.length > 0 && (
        <HSection
          title="Recently Viewed"
          items={rv.map(it => ({ ...it, sub: '' }))}
          onClickItem={it => onNavigate('anime', { id: it.id, name: it.title, titleAlt: it.titleAlt || it.title })}
        />
      )}
    </>
  );
}
