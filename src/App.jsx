import { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import { ToastContainer, ProgressBar, Loader } from './components/UI';
import HomePage from './components/HomePage';
import ListPage from './components/ListPage';
import SearchPage from './components/SearchPage';
import DetailPage from './components/DetailPage';
import WatchPage from './components/WatchPage';
import CommunityPage from './components/CommunityPage';
import { BrowsePage, SchedulePage, MyListPage, LandingPage } from './components/Pages';
import { useToast } from './hooks/useToast';
import { useProgressBar } from './hooks/useProgressBar';
import { alQuery, Q_LIST, alTitle, alTitleAlt } from './utils/api';

// ─── State from URL ───
function fromURL() {
  const p = new URLSearchParams(location.search);
  return {
    view: p.get('v') || 'landing',
    id: p.get('id') ? +p.get('id') : null,
    name: p.get('n') || null,
    titleAlt: p.get('na') || null,
    ep: p.get('ep') ? +p.get('ep') : null,
    lang: p.get('l') || 'sub',
    q: p.get('q') || '',
  };
}

function buildURL(s) {
  const p = new URLSearchParams();
  if (s.view && s.view !== 'landing') p.set('v', s.view);
  if (s.id) p.set('id', s.id);
  if (s.name) p.set('n', s.name);
  if (s.titleAlt) p.set('na', s.titleAlt);
  if (s.ep) p.set('ep', s.ep);
  if (s.lang && s.lang !== 'sub') p.set('l', s.lang);
  if (s.q) p.set('q', s.q);
  const qs = p.toString();
  return location.pathname + (qs ? '?' + qs : '');
}

export default function App() {
  const [route, setRoute] = useState(fromURL);
  const [filter, setFilter] = useState({ genre: '', type: '', status: '', year: '', score: '', order: 'SCORE_DESC' });
  const { toasts, toast } = useToast();
  const pb = useProgressBar();

  // Scroll to top on route change
  useEffect(() => {
    if (route.view !== 'watch') window.scrollTo(0, 0);
  }, [route.view, route.id, route.ep]);

  // Sync URL
  useEffect(() => {
    try { history.pushState(route, '', buildURL(route)); } catch {}
  }, [route]);

  // Popstate
  useEffect(() => {
    const handler = e => setRoute(e.state || fromURL());
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  // Back to top button
  useEffect(() => {
    const btt = document.getElementById('btt-btn');
    if (!btt) return;
    const handler = () => btt.classList.toggle('show', window.scrollY > 500);
    window.addEventListener('scroll', handler, { passive: true });
    btt.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // Prevent devtools
  useEffect(() => {
    document.addEventListener('contextmenu', e => e.preventDefault());
    const kd = e => {
      if (e.keyCode === 123 || (e.ctrlKey && e.shiftKey && [73,74,67].includes(e.keyCode)) || (e.ctrlKey && [85,83].includes(e.keyCode))) {
        e.preventDefault(); return false;
      }
    };
    document.addEventListener('keydown', kd);
    return () => document.removeEventListener('keydown', kd);
  }, []);

  const navigate = useCallback((view, extra = {}) => {
    setRoute(prev => ({
      view,
      id: null, name: null, titleAlt: null, ep: null,
      lang: prev.lang || 'sub', q: '',
      ...extra,
    }));
  }, []);

  const handleSearch = useCallback((q) => {
    navigate('search', { q });
  }, [navigate]);

  const handleRandom = useCallback(() => {
    toast('Finding random anime…');
    pb.start();
    const page = Math.floor(Math.random() * 50) + 1;
    const idx = Math.floor(Math.random() * 24);
    alQuery(Q_LIST(), { page, perPage: 24, sort: ['POPULARITY_DESC'] })
      .then(d => {
        pb.done();
        const list = d?.Page?.media;
        if (!list?.length) { toast('Nothing found'); return; }
        const m = list[Math.min(idx, list.length - 1)];
        navigate('anime', { id: m.id, name: alTitle(m), titleAlt: alTitleAlt(m) });
      })
      .catch(() => { pb.done(); toast('Failed — try again'); });
  }, [navigate, toast, pb]);

  const { view, id, name, titleAlt, ep, lang, q } = route;
  const showHeader = view !== 'landing';

  function renderPage() {
    const commonProps = { onNavigate: navigate, onToast: toast, pbStart: pb.start, pbDone: pb.done };
    switch (view) {
      case 'landing': return <LandingPage onNavigate={navigate} onSearch={handleSearch} />;
      case 'home': return <HomePage {...commonProps} lang={lang} />;
      case 'trending': return <ListPage type="trending" filter={filter} {...commonProps} />;
      case 'movies': return <ListPage type="movies" filter={filter} {...commonProps} />;
      case 'updated': return <ListPage type="updated" filter={filter} {...commonProps} />;
      case 'search': return <SearchPage q={q} filter={filter} {...commonProps} />;
      case 'anime': return <DetailPage id={id} lang={lang} {...commonProps} />;
      case 'watch': return <WatchPage id={id} ep={ep} lang={lang} {...commonProps} />;
      case 'browse': return <BrowsePage {...commonProps} />;
      case 'schedule': return <SchedulePage {...commonProps} />;
      case 'mylist': return <MyListPage onNavigate={navigate} onToast={toast} />;
      case 'community': return <CommunityPage onToast={toast} />;
      default: return <HomePage {...commonProps} lang={lang} />;
    }
  }

  return (
    <>
      <Loader />
      <ProgressBar width={pb.width} visible={pb.visible} />
      <ToastContainer toasts={toasts} />

      {showHeader && (
        <Header
          view={view}
          onNavigate={navigate}
          onSearch={handleSearch}
          onRandom={handleRandom}
          filter={filter}
          setFilter={setFilter}
        />
      )}

      <main className={`app${!showHeader ? ' no-hdr' : ''}`}>
        {renderPage()}
      </main>

      {showHeader && (
        <footer>
          <div className="flogo"><b>ani</b>dexz</div>
          <p className="ftxt">© 2026 anidexz. All Rights Reserved.</p>
          <p className="ftxt" style={{ fontSize: 11, color: '#333', marginTop: 4 }}>We do not host any files. Content provided by third parties.</p>
        </footer>
      )}

      <button aria-label="Back to top" className="btt" id="btt-btn">
        <svg fill="none" height="14" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" width="14">
          <path d="M18 15l-6-6-6 6"/>
        </svg>
      </button>
    </>
  );
}
