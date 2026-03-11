import { useState, useEffect } from 'react';
import { alQuery, Q_LIST, getWL, alTitle, alTitleAlt, alImg, scoreDisp, fmtFormat } from '../utils/api';
import AnimeCard from './AnimeCard';
import { Spinner, EmptyState } from './UI';

// ─── Browse Page ───
const BROWSE_GENRES = ['Action','Adventure','Comedy','Drama','Ecchi','Fantasy','Horror','Mahou Shoujo','Mecha','Music','Mystery','Psychological','Romance','Sci-Fi','Slice of Life','Sports','Supernatural','Thriller'];
const BROWSE_SEASONS = [
  { label: 'Winter 2025', season: 'WINTER', year: 2025 },
  { label: 'Spring 2025', season: 'SPRING', year: 2025 },
  { label: 'Summer 2025', season: 'SUMMER', year: 2025 },
  { label: 'Fall 2025', season: 'FALL', year: 2025 },
  { label: 'Winter 2026', season: 'WINTER', year: 2026 },
  { label: 'Spring 2026', season: 'SPRING', year: 2026 },
];
const FORMAT_TABS = [
  { label: 'All', val: '' }, { label: 'TV', val: 'TV' }, { label: 'Movie', val: 'MOVIE' },
  { label: 'OVA', val: 'OVA' }, { label: 'ONA', val: 'ONA' }, { label: 'Special', val: 'SPECIAL' },
];

export function BrowsePage({ onNavigate, onToast, pbStart, pbDone }) {
  const [selGenre, setSelGenre] = useState('');
  const [selSeason, setSelSeason] = useState(null);
  const [selYear, setSelYear] = useState(null);
  const [selFormat, setSelFormat] = useState('');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  function fetchBrowse(p, reset = false) {
    const vars = { page: p, perPage: 24, sort: ['POPULARITY_DESC'] };
    if (selGenre) vars.genre_in = [selGenre];
    if (selSeason) vars.season = selSeason;
    if (selYear) vars.seasonYear = selYear;
    if (selFormat) vars.format = selFormat;
    return alQuery(Q_LIST(), vars).then(d => {
      const media = d?.Page?.media || [];
      const more = d?.Page?.pageInfo?.hasNextPage ?? false;
      if (reset) setList(media); else setList(prev => [...prev, ...media]);
      setHasMore(more);
      return media;
    });
  }

  useEffect(() => {
    setLoading(true); setPage(1); pbStart();
    fetchBrowse(1, true).then(() => { setLoading(false); pbDone(); }).catch(() => { setLoading(false); pbDone(); });
  }, [selGenre, selSeason, selYear, selFormat]);

  function loadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    fetchBrowse(page + 1).then(() => { setPage(p => p + 1); setLoadingMore(false); }).catch(() => setLoadingMore(false));
  }

  return (
    <div className="sec" style={{ paddingTop: 22 }}>
      <div className="browse-page">
        <h2 className="sec-title" style={{ marginBottom: 16 }}>Browse Anime</h2>
        <div className="browse-section-label">Season</div>
        <div className="browse-pills" style={{ marginBottom: 16 }}>
          <button className={`br-pill${!selSeason ? ' active' : ''}`} onClick={() => { setSelSeason(null); setSelYear(null); }}>All Seasons</button>
          {BROWSE_SEASONS.map(s => (
            <button key={s.label} className={`br-pill${selSeason === s.season && selYear === s.year ? ' active' : ''}`}
              onClick={() => { setSelSeason(s.season); setSelYear(s.year); }}>{s.label}</button>
          ))}
        </div>
        <div className="browse-section-label">Genre</div>
        <div className="browse-pills" style={{ marginBottom: 16 }}>
          <button className={`br-pill${!selGenre ? ' active' : ''}`} onClick={() => setSelGenre('')}>All Genres</button>
          {BROWSE_GENRES.map(g => (
            <button key={g} className={`br-pill${selGenre === g ? ' active' : ''}`} onClick={() => setSelGenre(g)}>{g}</button>
          ))}
        </div>
        <div className="browse-section-label">Format</div>
        <div className="browse-pills" style={{ marginBottom: 20 }}>
          {FORMAT_TABS.map(f => (
            <button key={f.val} className={`br-pill${selFormat === f.val ? ' active' : ''}`} onClick={() => setSelFormat(f.val)}>{f.label}</button>
          ))}
        </div>
        <div className="grid">
          {loading ? Array.from({ length: 12 }).map((_, i) => <div key={i} className="card-skel" />) :
            list.map((m, i) => <AnimeCard key={m.id} media={m} delay={(i % 24) * 34} onNavigate={onNavigate} onToast={onToast} />)
          }
        </div>
        {!loading && list.length === 0 && <p style={{ color: 'var(--dim)', padding: 20 }}>No results found.</p>}
        {hasMore && !loading && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <button className="bs" onClick={loadMore} disabled={loadingMore}>{loadingMore ? 'Loading...' : 'Load More'}</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Schedule Page ───
export function SchedulePage({ onNavigate, onToast, pbStart, pbDone }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const seasons = ['WINTER','SPRING','SUMMER','FALL'];
  const seasonMap = [0,0,0,1,1,1,2,2,2,3,3,3];
  const now = new Date();
  const curSeason = seasons[seasonMap[now.getMonth()]];
  const curYear = now.getFullYear();
  const dow = now.getDay();

  useEffect(() => {
    pbStart();
    alQuery(Q_LIST(), { page: 1, perPage: 30, sort: ['TRENDING_DESC'], status: 'RELEASING', season: curSeason, seasonYear: curYear })
      .then(d => { setList(d?.Page?.media || []); setLoading(false); pbDone(); })
      .catch(e => { setError(e.message); setLoading(false); pbDone(); });
  }, []);

  if (error) return <EmptyState title="Failed" body={error} />;

  return (
    <div className="sec" style={{ paddingTop: 22 }}>
      <div className="sec-hdr">
        <h2 className="sec-title">Airing This Season — {days[dow]}, {curSeason.charAt(0) + curSeason.slice(1).toLowerCase()} {curYear}</h2>
      </div>
      <div className="grid">
        {loading ? Array.from({ length: 12 }).map((_, i) => <div key={i} className="card-skel" />) :
          list.length === 0 ? null :
          list.map((m, i) => <AnimeCard key={m.id} media={m} delay={i * 34} onNavigate={onNavigate} onToast={onToast} />)
        }
      </div>
      {!loading && list.length === 0 && <EmptyState title="No schedule data" body="Nothing found for this season." />}
    </div>
  );
}

// ─── My List Page ───
export function MyListPage({ onNavigate, onToast }) {
  const wl = getWL();
  return (
    <div className="sec" style={{ paddingTop: 22 }}>
      <div className="sec-hdr">
        <h2 className="sec-title">My List</h2>
        <span style={{ fontSize: 11, color: 'var(--dim)' }}>{wl.length} titles</span>
      </div>
      <div className="grid">
        {wl.length === 0
          ? null
          : wl.map((item, i) => {
              const fakeM = {
                id: item.id,
                title: { english: item.title, romaji: item.titleAlt || item.title },
                coverImage: { large: item.poster || '', medium: item.poster || '' },
                averageScore: item.score,
                format: (item.type || '').replace(/ /g, '_'),
              };
              return <AnimeCard key={item.id} media={fakeM} delay={i * 34} onNavigate={onNavigate} onToast={onToast} />;
            })}
      </div>
      {wl.length === 0 && (
        <EmptyState title="Your list is empty" body='Add anime by clicking the ♥ on any card.<br><a href="#" onclick="return false">Browse Anime</a>' />
      )}
    </div>
  );
}

// ─── Landing Page ───
const TOP = ['Jujutsu Kaisen','One Piece','Demon Slayer','Attack on Titan','Frieren','Solo Leveling','Bleach','Naruto','Dragon Ball','Black Clover'];
const FAQ = [
  ['Is anidexz completely free?', 'Yes, anidexz is 100% free. No subscription, no registration, no payment. Just open and watch.'],
  ['Do I need an account?', 'No account needed. Watch history and My List are saved locally on your device.'],
  ['Does anidexz have dubbed anime?', 'Yes! Use the SUB / DUB toggle on any watch page to switch instantly.'],
  ['How often are episodes updated?', 'New episodes added daily, within hours of Japan broadcast.'],
  ['What quality is available?', 'Up to 1080p HD, auto-adjusts to your connection speed.'],
  ['Does it work on mobile?', 'Yes, fully responsive on phones, tablets, and desktops.'],
];

export function LandingPage({ onNavigate, onSearch }) {
  const [query, setQuery] = useState('');
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div className="lnd-wrap">
      <nav className="lnd-nav">
        <button className="lnd-nl active" onClick={() => onNavigate('home')}>Home</button>
        <button className="lnd-nl" onClick={() => onNavigate('movies')}>Movies</button>
        <button className="lnd-nl" onClick={() => onNavigate('trending')}>TV Series</button>
        <button className="lnd-nl" onClick={() => onNavigate('trending')}>Most Popular</button>
        <button className="lnd-nl" onClick={() => onNavigate('trending')}>Top Airing</button>
        <button className="lnd-nl" onClick={() => onNavigate('community')}>Community</button>
      </nav>

      <div className="lnd-hero">
        <div className="lnd-card">
          <div className="lnd-card-left">
            <div className="lnd-logo"><b>ani</b>dexz</div>
            <div className="lnd-search-row">
              <input className="lnd-inp" type="text" placeholder="Search anime..."
                value={query} onChange={e => setQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && query.trim()) onSearch(query.trim()); }} />
              <button className="lnd-sbtn" onClick={() => { if (query.trim()) onSearch(query.trim()); }}>
                <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </button>
            </div>
            <div className="lnd-topsearch">
              <span className="lnd-tslabel">Top search: </span>
              {TOP.map((t, i) => (
                <button key={t} className="lnd-ts" onClick={() => onSearch(t)}>{t}{i < TOP.length - 1 ? ',' : ''}</button>
              ))}
            </div>
            <button className="lnd-watchbtn" onClick={() => onNavigate('home')}>Watch anime &nbsp;&#9658;</button>
          </div>
          <div className="lnd-card-right">
            <img className="lnd-hero-img" src="https://iili.io/qA6kw1p.jpg" alt="Anime" />
          </div>
        </div>
      </div>

      <div className="lnd-about">
        <div className="lnd-about-inner">
          <h2 className="lnd-about-h">anidexz — The best site to watch anime online for Free</h2>
          <p className="lnd-about-p">Did you know the monthly search volume for anime-related topics exceeds 1 billion times? Anime is famous worldwide and we built anidexz to be the best free anime streaming site for all fans.</p>
          <div className="lnd-qa">
            <div className="lnd-q"><span className="lnd-qn">1/</span> What is anidexz?</div>
            <p className="lnd-about-p">anidexz is a free site to watch anime. Stream subbed or dubbed anime in HD quality without registration or payment.</p>
            <div className="lnd-q"><span className="lnd-qn">2/</span> Is anidexz safe?</div>
            <p className="lnd-about-p">Yes. We run minimal ads and scan them 24/7. If you spot anything suspicious, contact us and we will remove it immediately.</p>
            <div className="lnd-q"><span className="lnd-qn">3/</span> What makes anidexz the best free anime site?</div>
            <p className="lnd-about-p">Safety • Huge library across all genres • HD up to 1080p • Sub &amp; Dub • Daily updates • Mobile &amp; desktop friendly.</p>
          </div>
        </div>
      </div>

      <div className="lnd-faq-section">
        <div className="lnd-about-inner">
          <h2 className="lnd-about-h">Frequently Asked Questions</h2>
          <div className="lnd-faq-list">
            {FAQ.map(([q, a], i) => (
              <div key={i} className={`lnd-faq-item${openFaq === i ? ' open' : ''}`}>
                <div className="lnd-faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span>{q}</span>
                  <svg className="lnd-faq-arr" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
                <div className="lnd-faq-a">{a}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
