import { useState, useEffect, useRef } from 'react';
import { alQuery, Q_LIST, buildVars, GENRES } from '../utils/api';
import AnimeCard from './AnimeCard';
import { EmptyState, CardSkeleton } from './UI';

export default function SearchPage({ q, filter, onNavigate, onToast, pbStart, pbDone }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [genre, setGenre] = useState(filter.genre || '');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef(null);

  function fetchPage(p, g) {
    return alQuery(Q_LIST(), buildVars({ q, page: p, ...(g ? { genre_in: [g] } : {}) }, filter))
      .then(d => ({ media: d?.Page?.media || [], more: d?.Page?.pageInfo?.hasNextPage ?? false }));
  }

  useEffect(() => {
    setLoading(true); setList([]); setPage(1); setHasMore(true);
    pbStart();
    fetchPage(1, genre)
      .then(({ media, more }) => { setList(media); setHasMore(more); setLoading(false); pbDone(); })
      .catch(e => { setError(e.message); setLoading(false); pbDone(); });
  }, [q, filter, genre]);

  useEffect(() => {
    if (!sentinelRef.current || !hasMore || loading) return;
    const io = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !loadingMore && hasMore) {
        setLoadingMore(true);
        fetchPage(page + 1, genre).then(({ media, more }) => {
          setList(prev => [...prev, ...media]);
          setPage(p => p + 1);
          setHasMore(more);
          setLoadingMore(false);
        }).catch(() => { setLoadingMore(false); setHasMore(false); });
      }
    }, { threshold: 0.1, rootMargin: '200px' });
    io.observe(sentinelRef.current);
    return () => io.disconnect();
  }, [sentinelRef, hasMore, loadingMore, page, genre, q, filter, loading]);

  if (error) return <EmptyState title="Search Failed" body={error} />;

  return (
    <>
      <div className="srh-hdr">
        <div className="srh-title">Results for <span>"{q || 'filtered'}"</span></div>
      </div>
      <div className="sec">
        {/* Genre filter row */}
        <div className="genre-row">
          <button className={`gbtn${!genre ? ' on' : ''}`} onClick={() => setGenre('')}>All</button>
          {GENRES.map(g => (
            <button key={g} className={`gbtn${genre === g ? ' on' : ''}`} onClick={() => setGenre(g)}>{g}</button>
          ))}
        </div>
        <div className="grid">
          {loading ? <CardSkeleton count={12} /> : list.map((m, i) => (
            <AnimeCard key={m.id} media={m} delay={(i % 24) * 34} onNavigate={onNavigate} onToast={onToast} />
          ))}
        </div>
        {!loading && list.length === 0 && <EmptyState title="No Results" body="Try a different name or adjust filters." />}
        {loadingMore && <div style={{ padding: 20, textAlign: 'center', color: 'var(--dim)', fontSize: 12 }}>Loading more...</div>}
        <div ref={sentinelRef} style={{ height: 1 }} />
      </div>
    </>
  );
}
