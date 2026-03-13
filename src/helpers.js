export const AL = 'https://graphql.anilist.co'
export const _b = (() => { const p = ['https://episode-id', 'onrender.com', 'get-link']; return p[0] + '.' + p[1] + '/' + p[2] })()
export const _c = (() => { const p = ['https://megaplay', 'buzz', 'stream', 's-2']; return p[0] + '.' + p[1] + '/' + p[2] + '/' + p[3] })()

export const GENRES = [
  'Action','Adventure','Comedy','Drama','Fantasy','Horror','Mystery',
  'Psychological','Romance','Sci-Fi','Slice of Life','Sports','Supernatural',
  'Thriller','Ecchi','Harem','Isekai','Mecha','Military','Music','School','Shounen',
  'Shoujo','Seinen','Josei'
]

export function esc(s) {
  return String(s || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

export function alImg(m, size) {
  if (!m?.coverImage) return 'https://placehold.co/300x420/0d0d15/555577?text=No+Image'
  return m.coverImage[size || 'large'] || m.coverImage.medium || 'https://placehold.co/300x420/0d0d15/555577?text=No+Image'
}

export function alTitle(m) {
  return (m && (m.title?.english || m.title?.romaji)) || 'Unknown'
}

export function alTitleAlt(m) {
  return (m && (m.title?.romaji || m.title?.english)) || ''
}

export function scoreDisp(m) {
  if (!m) return 'N/A'
  const s = m.averageScore || m.meanScore
  return s ? s : 'N/A'
}

export function fmtFormat(f) { return (f || '').replace(/_/g, ' ') }

export function fmtNum(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return String(n)
}

export function relTime(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 60) return diff + 's ago'
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago'
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago'
  return Math.floor(diff / 86400) + 'd ago'
}

/* Player helpers */
export function toSlug(s) {
  return (s || '').toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
}

export function slugVariants(name, alt) {
  const seen = {}, out = []
  function add(s) {
    const sl = toSlug(s || '')
    if (sl.length > 1 && !seen[sl]) { seen[sl] = 1; out.push(sl) }
  }
  add(name); add(alt)
  add((name || '').replace(/\s*[:]/g, ' ').replace(/\s+/g, ' ').trim())
  add((alt || '').replace(/\s*[:]/g, ' ').replace(/\s+/g, ' ').trim())
  add((name || '').replace(/\s*[:\u2013\u2014].*$/, '').trim())
  add((alt || '').replace(/\s*[:\u2013\u2014].*$/, '').trim())
  add((name || '').replace(/\s+(season|part|cour|s)\s*\d+\s*$/i, '').trim())
  add((alt || '').replace(/\s+(season|part|cour|s)\s*\d+\s*$/i, '').trim())
  add((name || '').replace(/\s*\(\d{4}\)\s*$/, '').trim())
  add((name || '').split(/\s+/)[0])
  add((alt || '').split(/\s+/)[0])
  return out
}
