import React, { useState, useEffect } from 'react'
import { useApp } from '../AppContext.jsx'
import { alImg, alTitle, alTitleAlt, scoreDisp, fmtFormat } from '../helpers.js'
import { Skels, Empty } from '../components/Shared.jsx'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/* ── Fetch real airing schedule from AniList ── */
async function fetchAiringSchedule() {
  const now = Math.floor(Date.now() / 1000)
  const weekLater = now + 7 * 24 * 3600

  const query = `
    query ($page: Int, $airingAt_greater: Int, $airingAt_lesser: Int) {
      Page(page: $page, perPage: 50) {
        pageInfo { hasNextPage }
        airingSchedules(
          airingAt_greater: $airingAt_greater
          airingAt_lesser: $airingAt_lesser
          sort: TIME
        ) {
          id
          airingAt
          episode
          media {
            id
            title { romaji english }
            coverImage { large extraLarge }
            bannerImage
            format
            episodes
            genres
            averageScore
            popularity
            status
            nextAiringEpisode {
              airingAt
              episode
            }
          }
        }
      }
    }
  `

  const pages = [1, 2, 3]
  const results = await Promise.all(pages.map(page =>
    fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        query,
        variables: { page, airingAt_greater: now - 86400, airingAt_lesser: weekLater }
      })
    }).then(r => r.json())
  ))

  const all = results.flatMap(r => r?.data?.Page?.airingSchedules || [])

  // dedupe by media id, keep earliest upcoming
  const seen = new Map()
  for (const s of all) {
    if (!s.media) continue
    const mid = s.media.id
    if (!seen.has(mid) || s.airingAt < seen.get(mid).airingAt) {
      seen.set(mid, s)
    }
  }
  return Array.from(seen.values())
}

/* ── Countdown component — updates every second ── */
function Countdown({ airingAt }) {
  const [display, setDisplay] = useState('')
  const [urgent, setUrgent] = useState(false)
  const [aired, setAired] = useState(false)

  useEffect(() => {
    function calc() {
      const diff = airingAt * 1000 - Date.now()
      if (diff <= 0) {
        setAired(true)
        setDisplay('Aired')
        return
      }
      const totalSecs = Math.floor(diff / 1000)
      const d = Math.floor(totalSecs / 86400)
      const h = Math.floor((totalSecs % 86400) / 3600)
      const m = Math.floor((totalSecs % 3600) / 60)
      const s = totalSecs % 60
      setUrgent(diff < 3600000)
      if (d > 0) setDisplay(`${d}d ${h}h`)
      else if (h > 0) setDisplay(`${h}h ${m}m`)
      else if (m > 0) setDisplay(`${m}m ${s}s`)
      else setDisplay(`${s}s`)
    }
    calc()
    const t = setInterval(calc, 1000)
    return () => clearInterval(t)
  }, [airingAt])

  return { display, urgent, aired }
}

/* ── Schedule card ── */
function ScheduleCard({ schedule }) {
  const { go } = useApp()
  const { media, airingAt, episode } = schedule
  const { display, urgent, aired } = Countdown({ airingAt })

  const title = alTitle(media)
  const titleAlt = alTitleAlt(media)
  const score = scoreDisp(media)
  const fmt = fmtFormat(media.format)
  const poster = alImg(media)

  const airDate = new Date(airingAt * 1000)
  const airTime = `${String(airDate.getHours()).padStart(2, '0')}:${String(airDate.getMinutes()).padStart(2, '0')}`

  return (
    <div
      className="sched-card"
      onClick={() => go('anime', { id: media.id, name: title, titleAlt })}
    >
      <div className="sched-poster">
        <img
          src={poster} alt={title} loading="lazy"
          onError={e => { e.target.src = 'https://placehold.co/56x80/0d0d15/555577?text=N/A' }}
        />
      </div>

      <div className="sched-info">
        <div className="sched-title">{title}</div>
        <div className="sched-meta">
          {fmt && <span className="sched-badge">{fmt}</span>}
          {score && score !== 'N/A' && <span className="sched-badge">★ {score}</span>}
          <span className="sched-badge ep">EP {episode}</span>
          {media.episodes && <span className="sched-badge dim">/ {media.episodes} eps</span>}
        </div>
        <div className="sched-genres">
          {(media.genres || []).slice(0, 3).map(g => (
            <span key={g} className="sched-genre">{g}</span>
          ))}
        </div>
      </div>

      <div className={'sched-time' + (urgent && !aired ? ' urgent' : '') + (aired ? ' aired' : '')}>
        <div className="sched-airtime">{airTime}</div>
        <div className="sched-countdown">{display}</div>
        <div className="sched-label">
          {aired ? 'Aired' : urgent ? 'Soon' : 'Upcoming'}
        </div>
      </div>
    </div>
  )
}

/* ── Live clock ── */
function LiveClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="sched-clock">
      <div className="sched-clock-time">
        {String(now.getHours()).padStart(2, '0')}:
        {String(now.getMinutes()).padStart(2, '0')}:
        {String(now.getSeconds()).padStart(2, '0')}
      </div>
      <div className="sched-clock-date">
        {DAYS[now.getDay()]}, {now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
      </div>
    </div>
  )
}

export default function Schedule() {
  const { pbStart, pbDone } = useApp()
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeDay, setActiveDay] = useState(new Date().getDay())

  useEffect(() => {
    pbStart()
    setLoading(true)
    fetchAiringSchedule()
      .then(data => {
        setSchedules(data)
        setLoading(false)
        pbDone()
      })
      .catch(e => {
        setError(e.message)
        setLoading(false)
        pbDone()
      })
  }, [])

  /* group by day of week using real airingAt timestamp */
  const byDay = DAYS.map((_, di) =>
    schedules
      .filter(s => new Date(s.airingAt * 1000).getDay() === di)
      .sort((a, b) => a.airingAt - b.airingAt)
  )

  const todayItems = byDay[activeDay] || []
  const isToday = activeDay === new Date().getDay()

  return (
    <div className="sched-wrap">

      {/* header */}
      <div className="sched-hero">
        <div className="sched-hero-left">
          <h1 className="sched-hero-title">Airing Schedule</h1>
          <div className="sched-hero-sub">Real-time airing times for the next 7 days</div>
        </div>
        <LiveClock />
      </div>

      {/* day tabs */}
      <div className="sched-tabs">
        {DAYS.map((day, i) => {
          const isT = i === new Date().getDay()
          const cnt = byDay[i]?.length || 0
          return (
            <button
              key={day}
              className={'sched-tab' + (activeDay === i ? ' active' : '') + (isT ? ' today' : '')}
              onClick={() => setActiveDay(i)}
            >
              <span className="sched-tab-day">{day.slice(0, 3)}</span>
              {isT && <span className="sched-tab-live">LIVE</span>}
              {cnt > 0 && <span className="sched-tab-cnt">{cnt}</span>}
            </button>
          )
        })}
      </div>

      {/* day label */}
      <div className="sched-day-label">
        <span className="sched-day-name">
          {isToday ? 'Today — ' : ''}{DAYS[activeDay]}
        </span>
        <span className="sched-day-count">{todayItems.length} anime airing</span>
      </div>

      {/* content */}
      {loading ? (
        <div className="grid"><Skels /></div>
      ) : error ? (
        <Empty title="Failed to load" body={error} />
      ) : !todayItems.length ? (
        <Empty title="Nothing scheduled" body="No anime airing on this day." />
      ) : (
        <div className="sched-list">
          {todayItems.map(s => (
            <ScheduleCard key={s.id} schedule={s} />
          ))}
        </div>
      )}

      <style>{`
        .sched-wrap { padding: 22px 0 40px; }
        .sched-hero {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          padding: 0 4px 20px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .sched-hero-title {
          font-size: 22px;
          font-weight: 700;
          margin: 0 0 4px;
          color: var(--fg);
        }
        .sched-hero-sub { font-size: 13px; color: var(--dim); }
        .sched-clock { text-align: right; }
        .sched-clock-time {
          font-size: 28px;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          color: var(--accent, #7c3aed);
          letter-spacing: 2px;
          line-height: 1;
        }
        .sched-clock-date { font-size: 12px; color: var(--dim); margin-top: 4px; }
        .sched-tabs {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          padding-bottom: 4px;
          margin-bottom: 16px;
          scrollbar-width: none;
        }
        .sched-tabs::-webkit-scrollbar { display: none; }
        .sched-tab {
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 10px 16px;
          border-radius: 10px;
          border: 1px solid var(--bdr, rgba(255,255,255,0.08));
          background: transparent;
          color: var(--dim);
          cursor: pointer;
          font-size: 13px;
          transition: all 0.18s;
        }
        .sched-tab:hover {
          border-color: var(--accent, #7c3aed);
          color: var(--fg);
        }
        .sched-tab.active {
          background: var(--accent, #7c3aed);
          border-color: var(--accent, #7c3aed);
          color: #fff;
        }
        .sched-tab.today:not(.active) {
          border-color: var(--accent, #7c3aed);
          color: var(--accent, #7c3aed);
        }
        .sched-tab-day { font-weight: 600; font-size: 13px; }
        .sched-tab-live {
          font-size: 9px;
          font-weight: 700;
          background: #ef4444;
          color: #fff;
          padding: 1px 5px;
          border-radius: 4px;
          letter-spacing: 0.5px;
          animation: pulse-live 1.5s infinite;
        }
        @keyframes pulse-live {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .sched-tab-cnt {
          font-size: 10px;
          background: rgba(255,255,255,0.1);
          padding: 1px 6px;
          border-radius: 10px;
        }
        .sched-tab.active .sched-tab-cnt { background: rgba(255,255,255,0.25); }
        .sched-day-label {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 2px 14px;
        }
        .sched-day-name { font-size: 15px; font-weight: 600; color: var(--fg); }
        .sched-day-count { font-size: 12px; color: var(--dim); }
        .sched-list { display: flex; flex-direction: column; gap: 10px; }
        .sched-card {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 12px;
          border-radius: 12px;
          border: 1px solid var(--bdr, rgba(255,255,255,0.07));
          background: var(--card-bg, rgba(255,255,255,0.03));
          cursor: pointer;
          transition: border-color 0.18s, background 0.18s;
        }
        .sched-card:hover {
          border-color: var(--accent, #7c3aed);
          background: rgba(124,58,237,0.08);
        }
        .sched-poster { flex-shrink: 0; }
        .sched-poster img {
          width: 56px;
          height: 80px;
          object-fit: cover;
          border-radius: 6px;
          display: block;
        }
        .sched-info { flex: 1; min-width: 0; }
        .sched-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--fg);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 6px;
        }
        .sched-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          margin-bottom: 6px;
        }
        .sched-badge {
          font-size: 10px;
          padding: 2px 7px;
          border-radius: 4px;
          background: rgba(255,255,255,0.08);
          color: var(--dim);
        }
        .sched-badge.ep {
          background: rgba(124,58,237,0.2);
          color: var(--accent, #7c3aed);
        }
        .sched-badge.dim { opacity: 0.5; }
        .sched-genres { display: flex; flex-wrap: wrap; gap: 4px; }
        .sched-genre {
          font-size: 10px;
          padding: 1px 6px;
          border-radius: 10px;
          border: 1px solid var(--bdr, rgba(255,255,255,0.08));
          color: var(--dim);
        }
        .sched-time {
          flex-shrink: 0;
          text-align: center;
          min-width: 72px;
          padding: 8px 10px;
          border-radius: 8px;
          background: rgba(255,255,255,0.04);
          border: 1px solid var(--bdr, rgba(255,255,255,0.07));
          transition: all 0.3s;
        }
        .sched-time.urgent {
          background: rgba(239,68,68,0.1);
          border-color: rgba(239,68,68,0.4);
        }
        .sched-time.aired {
          background: rgba(255,255,255,0.02);
          opacity: 0.5;
        }
        .sched-airtime {
          font-size: 16px;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          color: var(--fg);
          line-height: 1;
          margin-bottom: 4px;
        }
        .sched-countdown {
          font-size: 12px;
          font-variant-numeric: tabular-nums;
          color: var(--accent, #7c3aed);
          font-weight: 600;
          margin-bottom: 3px;
        }
        .sched-time.urgent .sched-countdown { color: #ef4444; }
        .sched-time.aired .sched-countdown { color: var(--dim); }
        .sched-label { font-size: 10px; color: var(--dim); }
        @media (max-width: 480px) {
          .sched-title { font-size: 13px; }
          .sched-poster img { width: 46px; height: 66px; }
          .sched-clock-time { font-size: 22px; }
          .sched-time { min-width: 62px; }
        }
      `}</style>

    </div>
  )
}
