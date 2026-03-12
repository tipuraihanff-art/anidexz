import React, { useState, useEffect, useRef } from 'react'
import { alImg, alTitle, alTitleAlt, scoreDisp, fmtFormat } from '../helpers.js'
import { isWL, toggleWL } from '../storage.js'
import { useApp } from '../AppContext.jsx'
import { GENRES } from '../helpers.js'

/* ── Spinner ── */
export function Spin() {
  return (
    <div className="spin">
      <span /><span /><span />
    </div>
  )
}

/* ── Skeleton ── */
export function Skel() {
  return <div className="card-skel" />
}

export function Skels({ n = 12 }) {
  return <>{Array.from({ length: n }, (_, i) => <Skel key={i} />)}</>
}

/* ── Heart SVG ── */
export function HeartSVG({ on }) {
  return (
    <svg width="11" height="11" fill={on ? '#ec4899' : 'none'} stroke={on ? '#ec4899' : 'currentColor'} strokeWidth="2" viewBox="0 0 24 24">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

/* ── Anime Card ── */
export function Card({ m, delay = 0 }) {
  const { go, toast } = useApp()
  const [inWl, setInWl] = useState(() => isWL(m.id))
  const [animated, setAnimated] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  const title = alTitle(m)
  const titleAlt = alTitleAlt(m)
  const score = scoreDisp(m)
  const fmt = fmtFormat(m.format)
  const poster = alImg(m)

  function handleHeart(e) {
    e.stopPropagation()
    const added = toggleWL({ id: m.id, title, titleAlt, poster, score, type: fmt })
    setInWl(added)
    toast(added ? 'Added to My List' : 'Removed from My List')
  }

  return (
    <div
      ref={ref}
      className={'card' + (animated ? ' in' : '')}
      style={{ animationDelay: delay + 'ms' }}
      onClick={() => go('anime', { id: m.id, name: title, titleAlt })}
    >
      {fmt && <span className="cbadge l">{fmt}</span>}
      {score && score !== 'N/A' && <span className="cbadge r">★ {score}</span>}
      <button
        className={'heart-btn' + (inWl ? ' on' : '')}
        onClick={handleHeart}
        title={inWl ? 'Remove from My List' : 'Add to My List'}
      >
        <HeartSVG on={inWl} />
      </button>
      <img
        src={poster}
        alt={title}
        loading="lazy"
        onError={e => { e.target.src = 'https://placehold.co/300x420/0d0d15/555577?text=N/A' }}
      />
      <div className="cov">
        <p className="ctitle">{title}</p>
        <span className="cwbtn">▶ Watch</span>
      </div>
    </div>
  )
}

/* ── Cards Grid ── */
export function CardGrid({ items, id, loading }) {
  if (loading) return <div className="grid" id={id}><Skels /></div>
  return (
    <div className="grid" id={id}>
      {items.map((m, i) => <Card key={m.id} m={m} delay={i * 34} />)}
    </div>
  )
}

/* ── Section ── */
export function Section({ title, viewAll, children }) {
  const { go } = useApp()
  return (
    <div className="sec">
      <div className="sec-hdr">
        <h2 className="sec-title">{title}</h2>
        {viewAll && <button className="sec-all" onClick={() => go(viewAll)}>View All</button>}
      </div>
      {children}
    </div>
  )
}

/* ── HCard (horizontal small card) ── */
export function HCard({ item, onClick }) {
  return (
    <div className="hcard" onClick={onClick}>
      <img
        src={item.poster || item.img || ''}
        alt={item.title || ''}
        loading="lazy"
        style={{ width: '108px', height: '152px', objectFit: 'cover', display: 'block' }}
        onError={e => { e.target.src = 'https://placehold.co/108x152/0d0d15/555577?text=N/A' }}
      />
      <div className="hcard-info">
        <div className="hcard-title">{item.title || ''}</div>
        {item.sub && <div className="hcard-sub">{item.sub}</div>}
      </div>
    </div>
  )
}

/* ── Horizontal section ── */
export function HSection({ title, children }) {
  return (
    <div className="sec">
      <div className="sec-hdr"><h2 className="sec-title">{title}</h2></div>
      <div className="hscroll-outer">
        <div className="hscroll">{children}</div>
      </div>
    </div>
  )
}

/* ── Genre filter row ── */
export function GenreRow({ active, onChange }) {
  return (
    <div className="genre-row">
      <button className={'gbtn' + (!active ? ' on' : '')} onClick={() => onChange('')}>All</button>
      {GENRES.map(g => (
        <button
          key={g}
          className={'gbtn' + (active === g ? ' on' : '')}
          onClick={() => onChange(g)}
        >{g}</button>
      ))}
    </div>
  )
}

/* ── Empty state ── */
export function Empty({ title, body }) {
  return (
    <div className="empty" style={{ gridColumn: '1/-1' }}>
      <div className="empty-ic2">
        <svg width="22" height="22" fill="none" stroke="var(--dim)" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" />
          <circle cx="12" cy="16" r=".5" fill="var(--dim)" />
        </svg>
      </div>
      <h3>{title}</h3>
      <p dangerouslySetInnerHTML={{ __html: body }} />
    </div>
  )
}

/* ── Sentinel for infinite scroll ── */
export function Sentinel({ onVisible }) {
  const ref = useRef(null)
  useEffect(() => {
    const io = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) onVisible()
    }, { threshold: 0.1, rootMargin: '200px' })
    if (ref.current) io.observe(ref.current)
    return () => io.disconnect()
  }, [onVisible])
  return <div ref={ref} className="sentinel" />
}
