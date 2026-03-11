import React, { useState, useEffect } from 'react'
import { useApp } from '../AppContext.jsx'
import { alQuery, Q_LIST } from '../api.js'
import { Card } from '../components/Shared.jsx'

const SEASONS = [
  { label: 'Winter 2025', season: 'WINTER', year: 2025 },
  { label: 'Spring 2025', season: 'SPRING', year: 2025 },
  { label: 'Summer 2025', season: 'SUMMER', year: 2025 },
  { label: 'Fall 2025', season: 'FALL', year: 2025 },
  { label: 'Winter 2026', season: 'WINTER', year: 2026 },
  { label: 'Spring 2026', season: 'SPRING', year: 2026 },
]
const GENRES_LIST = ['Action','Adventure','Comedy','Drama','Ecchi','Fantasy','Horror','Mahou Shoujo','Mecha','Music','Mystery','Psychological','Romance','Sci-Fi','Slice of Life','Sports','Supernatural','Thriller']
const FORMAT_TABS = [
  { label: 'All', val: '' },
  { label: 'TV', val: 'TV' },
  { label: 'Movie', val: 'MOVIE' },
  { label: 'OVA', val: 'OVA' },
  { label: 'ONA', val: 'ONA' },
  { label: 'Special', val: 'SPECIAL' },
]

export default function Browse() {
  const { pbStart, pbDone } = useApp()
  const [genre, setGenre] = useState('')
  const [season, setSeason] = useState(null)
  const [year, setYear] = useState(null)
  const [format, setFormat] = useState('')
  const [items, setItems] = useState([])
  const [brPage, setBrPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)

  function fetchBrowse(page, append = false) {
    setLoading(true)
    const vars = { page, perPage: 24, sort: ['POPULARITY_DESC'] }
    if (genre) vars.genre_in = [genre]
    if (season) vars.season = season
    if (year) vars.seasonYear = year
    if (format) vars.format = format
    alQuery(Q_LIST(), vars)
      .then(d => {
        const media = (d?.Page?.media) || []
        const hn = d?.Page?.pageInfo?.hasNextPage ?? false
        setHasMore(hn)
        setItems(prev => append ? [...prev, ...media] : media)
        setLoading(false)
        pbDone()
      })
      .catch(() => { setLoading(false); pbDone() })
  }

  useEffect(() => {
    pbStart()
    setBrPage(1)
    setHasMore(true)
    fetchBrowse(1, false)
  }, [genre, season, year, format])

  function loadMore() {
    if (loading || !hasMore) return
    const next = brPage + 1
    setBrPage(next)
    fetchBrowse(next, true)
  }

  return (
    <div className="sec" style={{ paddingTop: '22px' }}>
      <div className="browse-page">
        <h2 className="sec-title" style={{ marginBottom: '16px' }}>Browse Anime</h2>

        <div className="browse-section-label">Season</div>
        <div className="browse-pills" style={{ marginBottom: '16px' }}>
          <button className={'br-pill' + (!season ? ' active' : '')} onClick={() => { setSeason(null); setYear(null) }}>All Seasons</button>
          {SEASONS.map(s => (
            <button
              key={s.label}
              className={'br-pill' + (season === s.season && year === s.year ? ' active' : '')}
              onClick={() => { setSeason(s.season); setYear(s.year) }}
            >{s.label}</button>
          ))}
        </div>

        <div className="browse-section-label">Genre</div>
        <div className="browse-pills" style={{ marginBottom: '16px' }}>
          <button className={'br-pill' + (!genre ? ' active' : '')} onClick={() => setGenre('')}>All Genres</button>
          {GENRES_LIST.map(g => (
            <button key={g} className={'br-pill' + (genre === g ? ' active' : '')} onClick={() => setGenre(g)}>{g}</button>
          ))}
        </div>

        <div className="browse-section-label">Format</div>
        <div className="browse-pills" style={{ marginBottom: '20px' }}>
          {FORMAT_TABS.map(f => (
            <button key={f.val} className={'br-pill' + (format === f.val ? ' active' : '')} onClick={() => setFormat(f.val)}>{f.label}</button>
          ))}
        </div>

        <div className="grid">
          {items.map((m, i) => <Card key={m.id} m={m} delay={i < 24 ? i * 34 : 0} />)}
          {!items.length && !loading && (
            <p style={{ color: 'var(--dim)', padding: '20px' }}>No results found.</p>
          )}
        </div>

        {hasMore && !loading && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <button className="bs" onClick={loadMore}>Load More</button>
          </div>
        )}
      </div>
    </div>
  )
}
