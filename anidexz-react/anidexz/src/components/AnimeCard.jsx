import { useState, useEffect, useRef } from 'react';
import { alImg, alTitle, alTitleAlt, scoreDisp, fmtFormat, isWL, toggleWL } from '../utils/api';

function HeartSVG({ on }) {
  return (
    <svg width="11" height="11" fill={on ? '#ec4899' : 'none'} stroke={on ? '#ec4899' : 'currentColor'} strokeWidth="2" viewBox="0 0 24 24">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  );
}

export default function AnimeCard({ media, delay = 0, onNavigate, onToast }) {
  const [wl, setWl] = useState(() => isWL(media.id));
  const [animated, setAnimated] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 10 + delay);
    return () => clearTimeout(t);
  }, [delay]);

  const title = alTitle(media);
  const titleAlt = alTitleAlt(media);
  const score = scoreDisp(media);
  const fmt = fmtFormat(media.format);

  function handleHeart(e) {
    e.stopPropagation();
    const added = toggleWL({
      id: media.id, title, titleAlt,
      poster: alImg(media), score, type: fmt,
    });
    setWl(added);
    onToast?.(added ? '✓ Added to My List' : 'Removed from My List');
  }

  return (
    <div
      ref={ref}
      className={`card${animated ? ' in' : ''}`}
      style={{ animationDelay: delay + 'ms' }}
      onClick={() => onNavigate?.('anime', { id: media.id, name: title, titleAlt })}
    >
      {fmt && <span className="cbadge l">{fmt}</span>}
      {score && score !== 'N/A' && <span className="cbadge r">★ {score}</span>}
      <button
        className={`heart-btn${wl ? ' on' : ''}`}
        title={wl ? 'Remove from My List' : 'Add to My List'}
        onClick={handleHeart}
      >
        <HeartSVG on={wl} />
      </button>
      <img
        src={alImg(media)}
        alt={title}
        loading="lazy"
        onError={e => { e.target.src = 'https://placehold.co/300x420/0d0d15/555577?text=N/A'; }}
      />
      <div className="cov">
        <p className="ctitle">{title}</p>
        <span className="cwbtn">▶ Watch</span>
      </div>
    </div>
  );
}
