import { useState, useEffect, useRef, useCallback } from 'react';
import { alQuery, Q_DETAIL, alTitle, alTitleAlt, alImg, loadEpisodes, resolveEpId, saveCW, STREAM_BASE } from '../utils/api';
import { Spinner } from './UI';

const CHUNK = 100;

export default function WatchPage({ id, ep, lang: initLang, onNavigate, onToast, pbStart, pbDone }) {
  const [media, setMedia] = useState(null);
  const [eps, setEps] = useState([]);
  const [lang, setLang] = useState(initLang || 'sub');
  const [loading, setLoading] = useState(true);
  const [playerState, setPlayerState] = useState('loading'); // 'loading' | 'loaded' | 'error'
  const [playerSrc, setPlayerSrc] = useState('');
  const [playerError, setPlayerError] = useState('');
  const [theatre, setTheatre] = useState(false);
  const [autoNext, setAutoNext] = useState(false);
  const [anTimer, setAnTimer] = useState(null);
  const [chunkStart, setChunkStart] = useState(0);
  const epListRef = useRef(null);

  const title = media ? alTitle(media) : '';
  const titleAlt = media ? alTitleAlt(media) : '';
  const maxEp = eps.length;

  // Load media + episodes
  useEffect(() => {
    if (!id || !ep) { onNavigate('home'); return; }
    setLoading(true);
    pbStart();
    alQuery(Q_DETAIL(), { id })
      .then(d => {
        const m = d?.Media;
        if (!m) throw new Error('Not found');
        setMedia(m);
        return loadEpisodes(m.idMal);
      })
      .then(list => {
        setEps(list);
        // Set chunk so current ep is visible
        const idx = list.indexOf(ep);
        if (idx >= 0) setChunkStart(Math.floor(idx / CHUNK) * CHUNK);
        setLoading(false);
        pbDone();
      })
      .catch(() => { setLoading(false); pbDone(); });
  }, [id, ep]);

  // Load player
  useEffect(() => {
    if (!media || loading) return;
    setPlayerState('loading');
    setPlayerSrc('');
    const t = alTitle(media), ta = alTitleAlt(media);
    const poster = alImg(media);
    saveCW(id, ep, lang, t, ta, poster);
    resolveEpId(t, ta, ep)
      .then(epId => {
        setPlayerSrc(`${STREAM_BASE}/${epId}/${lang}`);
        setPlayerState('loaded');
      })
      .catch(() => {
        setPlayerError(lang === 'dub' ? 'The dub for this episode may not be available yet. Try switching to SUB.' : 'This episode could not be loaded. Please try again.');
        setPlayerState('error');
      });
  }, [media, ep, lang, loading]);

  // Auto-next timer
  useEffect(() => {
    if (!autoNext || playerState !== 'loaded' || !maxEp || ep >= maxEp) return;
    let count = 5;
    const id2 = setInterval(() => {
      count--;
      onToast?.(`Next episode in ${count}s`);
      if (count <= 0) {
        clearInterval(id2);
        onNavigate('watch', { id, name: title, titleAlt, ep: ep + 1, lang });
      }
    }, 1000);
    setAnTimer(id2);
    return () => clearInterval(id2);
  }, [autoNext, playerState]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft' && ep > 1) onNavigate('watch', { id, name: title, titleAlt, ep: ep - 1, lang });
      if (e.key === 'ArrowRight' && ep < maxEp) onNavigate('watch', { id, name: title, titleAlt, ep: ep + 1, lang });
      if (e.key === 't' || e.key === 'T') setTheatre(p => !p);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [ep, maxEp, title, titleAlt, lang]);

  // Scroll active ep into view
  useEffect(() => {
    if (!epListRef.current) return;
    const active = epListRef.current.querySelector('.epli.on');
    if (active) setTimeout(() => active.scrollIntoView({ block: 'center' }), 60);
  }, [eps, ep]);

  const navEp = (n) => onNavigate('watch', { id, name: title, titleAlt, ep: n, lang });
  const switchLang = (l) => { setLang(l); };

  if (loading) return <div style={{ paddingTop: 80 }}><Spinner /></div>;

  const chunk = eps.slice(chunkStart, chunkStart + CHUNK);
  const totalChunks = Math.ceil(eps.length / CHUNK);
  const stitle = title.length > 22 ? title.slice(0, 22) + '...' : title;

  return (
    <div className={`wlayout${theatre ? ' theatre' : ''}`} id="wlayout">
      {/* Main */}
      <div style={{ minWidth: 0, overflow: 'hidden' }}>
        <div className="pwrap" id="pwrap">
          {playerState === 'loading' && <div className="pload"><Spinner /></div>}
          {playerState === 'loaded' && playerSrc && (
            <iframe
              src={playerSrc}
              allowFullScreen
              allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
              title={`${title} Episode ${ep}`}
            />
          )}
          {playerState === 'error' && (
            <div className="perror">
              <svg width="36" height="36" fill="none" stroke="var(--acc2)" strokeWidth="1.5" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r=".6" fill="var(--acc2)"/>
              </svg>
              <h4>Could not load episode</h4>
              <p>{playerError}</p>
              <button className="bp" style={{ fontSize: 12, padding: '8px 18px', marginTop: 4 }}
                onClick={() => { setPlayerState('loading'); resolveEpId(title, titleAlt, ep).then(epId => { setPlayerSrc(STREAM_BASE + '/' + epId + '/' + lang); setPlayerState('loaded'); }).catch(() => setPlayerState('error')); }}>
                Retry
              </button>
            </div>
          )}
        </div>

        <div className="winfo">
          <div className="wt">{title}</div>
          <div className="wet">Episode {ep}</div>
          <div className="wnav">
            {ep > 1 && <button className="bs" onClick={() => navEp(ep - 1)}>◀ Prev</button>}
            {maxEp > 0 && ep < maxEp && <button className="bp" onClick={() => navEp(ep + 1)}>Next ▶</button>}
            <button className={`wctrl${theatre ? ' on' : ''}`} onClick={() => setTheatre(p => !p)} title="Theatre Mode (T)">
              <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg> Theatre
            </button>
            <button className={`wctrl${autoNext ? ' on' : ''}`} onClick={() => { const n = !autoNext; setAutoNext(n); onToast?.(n ? 'Auto-Next: ON' : 'Auto-Next: OFF'); if (!n && anTimer) clearInterval(anTimer); }}>
              <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/><line x1="19" x2="19" y1="3" y2="21"/></svg> Auto-Next
            </button>
            <div className="ltog" style={{ marginLeft: 'auto' }}>
              <button className={`lbtn${lang === 'sub' ? ' on' : ''}`} onClick={() => switchLang('sub')}>SUB</button>
              <button className={`lbtn${lang === 'dub' ? ' on' : ''}`} onClick={() => switchLang('dub')}>DUB</button>
            </div>
          </div>
          <div className="kb-hint">
            <span><kbd className="kb-key">←</kbd> Prev ep</span>
            <span><kbd className="kb-key">→</kbd> Next ep</span>
            <span><kbd className="kb-key">T</kbd> Theatre</span>
          </div>
        </div>

        {/* Mobile episode grid */}
        <div className="mob-ep-wrap">
          <div className="ep-hdr">
            <h3 className="ep-hdr-title">Episodes</h3>
          </div>
          <div className="epgrid">
            {chunk.map(n => (
              <button key={n} className={`epbtn${n === ep ? ' on' : ''}`} onClick={() => navEp(n)}>{n}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="sbar">
        <div className="sbar-title">{stitle}</div>
        {/* Range selector */}
        {totalChunks > 1 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
            {Array.from({ length: totalChunks }).map((_, ci) => {
              const from = eps[ci * CHUNK], to = eps[Math.min((ci + 1) * CHUNK, eps.length) - 1];
              return (
                <button key={ci} className={`ep-range-btn${chunkStart === ci * CHUNK ? ' active' : ''}`}
                  onClick={() => setChunkStart(ci * CHUNK)} style={{ fontSize: 10, padding: '3px 7px' }}>
                  {from}-{to}
                </button>
              );
            })}
          </div>
        )}
        <div className="eplist" ref={epListRef}>
          {chunk.map(n => (
            <div key={n} className={`epli${n === ep ? ' on' : ''}`} onClick={() => navEp(n)}>
              EP {n}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
