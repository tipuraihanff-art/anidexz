import { useState, useRef, useEffect } from 'react';

const YEARS = (() => {
  const cy = new Date().getFullYear();
  const y = [];
  for (let i = cy; i >= 2000; i--) y.push(i);
  return y;
})();

export default function Header({ view, onNavigate, onSearch, onRandom, filter, setFilter }) {
  const [query, setQuery] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [aspOpen, setAspOpen] = useState(false);
  const [pwaPrompt, setPwaPrompt] = useState(null);
  const aspRef = useRef(null);

  useEffect(() => {
    const handler = e => {
      if (aspRef.current && !aspRef.current.contains(e.target)) setAspOpen(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  useEffect(() => {
    const handler = e => {
      e.preventDefault();
      setPwaPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  function handleSearch() {
    if (query.trim()) onSearch(query.trim());
  }

  function handleKey(e) {
    if (e.key === 'Enter') handleSearch();
  }

  function nav(v) {
    setDrawerOpen(false);
    onNavigate(v);
  }

  function applyFilter() {
    setAspOpen(false);
    onNavigate(view === 'search' ? view : 'search', view === 'search' ? undefined : { q: '' });
  }

  function resetFilter() {
    setFilter({ genre: '', type: '', status: '', year: '', score: '', order: 'SCORE_DESC' });
    setAspOpen(false);
  }

  async function installPwa() {
    if (!pwaPrompt) return;
    pwaPrompt.prompt();
    const { outcome } = await pwaPrompt.userChoice;
    setPwaPrompt(null);
  }

  const navItems = [
    { label: 'Home', v: 'home' },
    { label: 'Trending', v: 'trending' },
    { label: 'Movies', v: 'movies' },
    { label: 'Schedule', v: 'schedule' },
    { label: 'Browse', v: 'browse' },
    { label: '♡ My List', v: 'mylist' },
    { label: 'Community', v: 'community' },
  ];

  return (
    <>
      <header className="hdr">
        <button className="logo" onClick={() => nav('home')}><b>ani</b>dexz</button>
        <nav className="hnav">
          {navItems.map(n => (
            <button key={n.v} className={`hn${view === n.v ? ' on' : ''}`} onClick={() => nav(n.v)}>{n.label}</button>
          ))}
        </nav>
        <button className="rand-btn" title="Random Anime" onClick={onRandom}>
          <svg fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13">
            <polyline points="16 3 21 3 21 8"/><line x1="4" x2="21" y1="20" y2="3"/>
            <polyline points="21 16 21 21 16 21"/><line x1="15" x2="21" y1="15" y2="21"/>
          </svg>
          Random
        </button>
        <div className="sw">
          <input
            className="si" type="search" placeholder="Search anime..." autoComplete="off"
            value={query} onChange={e => setQuery(e.target.value)} onKeyDown={handleKey}
          />
          <button
            className={`asearch-btn${aspOpen ? ' on' : ''}`} title="Advanced Filters"
            onClick={e => { e.stopPropagation(); setAspOpen(p => !p); }}
            ref={aspRef}
          >
            <svg fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14">
              <line x1="4" x2="20" y1="6" y2="6"/><line x1="8" x2="16" y1="12" y2="12"/><line x1="11" x2="13" y1="18" y2="18"/>
            </svg>
          </button>
          <button className="sb" onClick={handleSearch}>
            <svg fill="none" height="15" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" width="15">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </button>
        </div>
        {pwaPrompt && (
          <button className="pwa-btn" style={{ display: 'flex' }} onClick={installPwa} title="Install App">
            <svg fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>
            </svg>
            Install
          </button>
        )}
        <button className="mob-btn" onClick={() => setDrawerOpen(p => !p)}>
          <svg fill="none" height="20" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="20">
            <line x1="3" x2="21" y1="6" y2="6"/><line x1="3" x2="21" y1="12" y2="12"/><line x1="3" x2="21" y1="18" y2="18"/>
          </svg>
        </button>
      </header>

      {/* Advanced Search Panel */}
      <div className={`asearch-panel${aspOpen ? ' open' : ''}`}>
        <div className="asp-row">
          <div className="asp-group">
            <span className="asp-label">Format</span>
            <select className="asp-sel" value={filter.type} onChange={e => setFilter(f => ({ ...f, type: e.target.value }))}>
              <option value="">Any Format</option>
              <option value="TV">TV Series</option>
              <option value="MOVIE">Movie</option>
              <option value="OVA">OVA</option>
              <option value="ONA">ONA</option>
              <option value="SPECIAL">Special</option>
              <option value="MUSIC">Music</option>
            </select>
          </div>
          <div className="asp-group">
            <span className="asp-label">Status</span>
            <select className="asp-sel" value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}>
              <option value="">Any Status</option>
              <option value="RELEASING">Airing</option>
              <option value="FINISHED">Completed</option>
              <option value="NOT_YET_RELEASED">Upcoming</option>
            </select>
          </div>
          <div className="asp-group">
            <span className="asp-label">Year</span>
            <select className="asp-sel" value={filter.year} onChange={e => setFilter(f => ({ ...f, year: e.target.value }))}>
              <option value="">Any Year</option>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="asp-group">
            <span className="asp-label">Min Score</span>
            <select className="asp-sel" value={filter.score} onChange={e => setFilter(f => ({ ...f, score: e.target.value }))}>
              <option value="">Any Score</option>
              <option value="90">90+</option>
              <option value="80">80+</option>
              <option value="70">70+</option>
              <option value="60">60+</option>
            </select>
          </div>
          <div className="asp-group">
            <span className="asp-label">Sort By</span>
            <select className="asp-sel" value={filter.order} onChange={e => setFilter(f => ({ ...f, order: e.target.value }))}>
              <option value="SCORE_DESC">Score</option>
              <option value="POPULARITY_DESC">Popularity</option>
              <option value="START_DATE_DESC">Newest</option>
              <option value="TRENDING_DESC">Trending</option>
              <option value="FAVOURITES_DESC">Favourites</option>
            </select>
          </div>
        </div>
        <div className="asp-btns">
          <button className="bp" style={{ fontSize: 12, padding: '8px 18px' }} onClick={applyFilter}>Apply Filters</button>
          <button className="bs" style={{ fontSize: 12, padding: '8px 16px' }} onClick={resetFilter}>Reset</button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <div className={`mob-drawer${drawerOpen ? ' open' : ''}`}>
        {navItems.map(n => (
          <button key={n.v} className={`hn${view === n.v ? ' on' : ''}`} onClick={() => nav(n.v)}>{n.label}</button>
        ))}
        <button className="hn" onClick={() => { setDrawerOpen(false); onRandom(); }}>■ Random Anime</button>
      </div>
    </>
  );
}
