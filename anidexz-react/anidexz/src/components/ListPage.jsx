import { useState, useEffect, useRef } from 'react';
import { alQuery, Q_LIST, buildVars } from '../utils/api';
import AnimeCard from './AnimeCard';
import { Spinner, EmptyState, CardSkeleton } from './UI';

export default function ListPage({ type, filter, onNavigate, onToast, pbStart, pbDone }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef(null);

  const label = type === 'movies' ? 'Top Anime Movies' : type === 'updated' ? 'Recently Updated' : 'Trending Anime';

  function getOpts(p) {
    if (type === 'movies') return { format: 'MOVIE', sort: 'POPULARITY_DESC', page: p };
    if (type === 'updated') return { sort: 'UPDATED_AT_DESC', status: 'RELEASING', page: p };
    return { sort: 'TRENDING_DESC', page: p };
  }

  useEffect(() => {
    setLoading(true);
    setList([]);
    setPage(1);
    setHasMore(true);
    pbStart();
    alQuery(Q_LIST(), buildVars(getOpts(1), filter))
      .then(d => {
        const media = d?.Page?.media || [];
        setList(media);
        setHasMore(d?.Page?.pageInfo?.hasNextPage ?? false);
        setLoading(false);
        pbDone();
      })
      .catch(e => { setError(e.message); setLoading(false); pbDone(); });
  }, [type, filter]);

  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return;
    const io = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !loadingMore && hasMore) {
        setLoadingMore(true);
        const nextPage = page + 1;
        alQuery(Q_LIST(), buildVars(getOpts(nextPage), filter))
          .then(d => {
            const media = d?.Page?.media || [];
            setList(prev => [...prev, ...media]);
            setPage(nextPage);
            setHasMore(d?.Page?.pageInfo?.hasNextPage ?? false);
            setLoadingMore(false);
          })
          .catch(() => { setLoadingMore(false); setHasMore(false); });
      }
    }, { threshold: 0.1, rootMargin: '200px' });
    io.observe(sentinelRef.current);
    return () => io.disconnect();
  }, [sentinelRef, hasMore, loadingMore, page, filter, type]);

  if (error) return <EmptyState title="Something Went Wrong" body={error} />;

  return (
    <div className="sec" style={{ paddingTop: 22 }}>
      <div className="sec-hdr">
        <h2 className="sec-title">{label}</h2>
      </div>
      <div className="grid">
        {loading ? <CardSkeleton count={12} /> : (
          list.length === 0
            ? null
            : list.map((m, i) => <AnimeCard key={m.id} media={m} delay={(i % 24) * 34} onNavigate={onNavigate} onToast={onToast} />)
        )}
      </div>
      {!loading && list.length === 0 && <EmptyState title="Nothing Found" body="Try different filters or browse another genre." />}
      {loadingMore && <div style={{ padding: '20px', textAlign: 'center', color: 'var(--dim)', fontSize: 12 }}>Loading more...</div>}
      <div ref={sentinelRef} style={{ height: 1 }} />
    </div>
  );
}
