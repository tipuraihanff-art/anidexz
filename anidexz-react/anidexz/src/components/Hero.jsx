import { useState, useEffect, useRef } from 'react';
import { alImg, alTitle, alTitleAlt } from '../utils/api';

export default function Hero({ list, onNavigate }) {
  const [idx, setIdx] = useState(0);
  const ticker = useRef(null);

  useEffect(() => {
    if (!list.length) return;
    ticker.current = setInterval(() => setIdx(i => (i + 1) % list.length), 6000);
    return () => clearInterval(ticker.current);
  }, [list]);

  if (!list.length) return null;
  const m = list[idx];
  const title = alTitle(m);
  const titleAlt = alTitleAlt(m);
  const desc = (m.description || '').replace(/<[^>]+>/g, '').replace(/\[Written[^\]]*\]/g, '').trim();
  const bg = m.bannerImage || alImg(m, 'extraLarge');

  return (
    <div className="hero">
      <div className="hero-bg" style={{ backgroundImage: `url(${bg})` }} />
      <div className="hero-grad" />
      <div className="hero-cnt">
        <span className="hero-badge">Spotlight</span>
        <h1 className="hero-title">{title}</h1>
        <p className="hero-desc">{desc.length > 200 ? desc.slice(0, 200) + '...' : desc}</p>
        <div className="hero-btns">
          <button className="bp" onClick={() => onNavigate('watch', { id: m.id, name: title, titleAlt, ep: 1, lang: 'sub' })}>
            ▶ Watch Now
          </button>
          <button className="bs" onClick={() => onNavigate('anime', { id: m.id, name: title, titleAlt })}>
            Info
          </button>
        </div>
      </div>
    </div>
  );
}
