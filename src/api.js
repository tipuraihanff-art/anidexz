/* ══════════════════════════════════════════════════════════
   api.js  —  AniWatch backend  (https://anidexzzzz.vercel.app/aniwatch)
   All exports match the original signatures — no UI changes needed.
   ══════════════════════════════════════════════════════════ */

const AW = 'https://anidexzzzz.vercel.app/aniwatch'

/* CORS proxy chain — tries direct first, then fallbacks */
const PROXIES = [
  u => u,
  u => `https://corsproxy.io/?${encodeURIComponent(u)}`,
  u => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
]

async function awGet(path) {
  const url = AW + path
  let lastErr
  for (const proxy of PROXIES) {
    try {
      const r = await fetch(proxy(url), {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(10000),
      })
      if (!r.ok) throw new Error('HTTP ' + r.status)
      return await r.json()
    } catch (e) { lastErr = e }
  }
  throw lastErr || new Error('Failed to fetch')
}

/* ── Convert AniWatch item → AniList-shaped Media object ── */
function toMedia(a) {
  if (!a) return null
  return {
    id:          a.id,
    idMal:       null,
    title: {
      english:   a.name || '',
      romaji:    a.name || '',
      native:    a.name || '',
    },
    coverImage: {
      extraLarge: a.img || '',
      large:      a.img || '',
      medium:     a.img || '',
    },
    bannerImage:  a.img || '',
    format:       a.category || a.type || 'TV',
    status:       'RELEASING',
    episodes:     a.episodes?.eps || a.episodes?.sub || null,
    averageScore: null,
    popularity:   null,
    genres:       [],
    season:       null,
    seasonYear:   null,
    description:  a.description || '',
    nextAiringEpisode: null,
    _aw: a,
  }
}

function toPage(animes, hasNextPage) {
  return {
    Page: {
      pageInfo: { hasNextPage: !!hasNextPage, total: (animes || []).length },
      media: (animes || []).map(toMedia),
    }
  }
}

/* ══════════════════════════════════════════════════════════
   alQuery — dispatches based on variables (ignores query string)
   ══════════════════════════════════════════════════════════ */
export async function alQuery(_query, variables) {
  const v = variables || {}

  /* Single detail page */
  if (v.id && !v.search) {
    const d = await awGet(`/anime/${v.id}`)
    const info = d?.anime?.info || d?.info
    if (!info) throw new Error('Not found')
    const media = toMedia(info)
    media.description   = info.description || ''
    media.genres        = (d?.anime?.moreInfo?.genres || d?.moreInfo?.genres || [])
    media.status        = d?.anime?.moreInfo?.status || ''
    media._seasons      = d?.seasons || []
    media._related      = d?.relatedAnimes || []
    media._recommended  = d?.recommendedAnimes || []
    media._moreInfo     = d?.anime?.moreInfo || d?.moreInfo || {}
    return { Media: media }
  }

  /* Search */
  if (v.search) {
    const d = await awGet(`/search?keyword=${encodeURIComponent(v.search)}&page=${v.page || 1}`)
    return toPage(d?.animes, d?.hasNextPage)
  }

  /* Genre */
  if (v.genre_in?.length) {
    const d = await awGet(`/search?keyword=${encodeURIComponent(v.genre_in[0])}&page=${v.page || 1}`)
    return toPage(d?.animes, d?.hasNextPage)
  }

  /* Movie */
  if (v.format === 'MOVIE') {
    const d = await awGet(`/movie?page=${v.page || 1}`)
    return toPage(d?.animes, d?.hasNextPage)
  }

  const sort = (Array.isArray(v.sort) ? v.sort[0] : v.sort) || ''

  if (sort.includes('POPULARITY')) {
    const d = await awGet(`/most-popular?page=${v.page || 1}`)
    return toPage(d?.animes, d?.hasNextPage)
  }

  /* Default / trending / airing */
  const d = await awGet(`/top-airing?page=${v.page || 1}`)
  return toPage(d?.animes, d?.hasNextPage)
}

/* Query string stubs — kept so imports don't break */
export const Q_LIST       = () => '__LIST__'
export const Q_DETAIL     = () => '__DETAIL__'
export const Q_SUGGEST    = () => '__SUGGEST__'
export const Q_BY_MAL_IDS = () => '__BY_MAL__'

/* buildVars — unchanged from original */
export function buildVars(opts, filter) {
  const f = filter || {}
  const v = { page: opts?.page || 1, perPage: 24 }
  const sort = opts?.sort || f.order || 'TRENDING_DESC'
  v.sort = [sort]
  if (opts?.q)             v.search     = opts.q
  if (f.type)              v.format     = f.type
  else if (opts?.format)   v.format     = opts.format
  if (f.status)            v.status     = f.status
  else if (opts?.status)   v.status     = opts.status
  if (opts?.season)        v.season     = opts.season
  if (opts?.seasonYear)    v.seasonYear = opts.seasonYear
  else if (f.year)         v.seasonYear = parseInt(f.year)
  if (f.score)             v.averageScore_greater = parseInt(f.score)
  if (f.genre)             v.genre_in   = [f.genre]
  else if (opts?.genre_in) v.genre_in   = opts.genre_in
  return v
}

/* ══════════════════════════════════════════════════════════
   Home page data
   API response shape:
   { spotLightAnimes, trendingAnimes, latestEpisodes,
     top10Animes:{day,week,month}, featuredAnimes:{topAiringAnimes,...} }
   ══════════════════════════════════════════════════════════ */
export async function fetchLatestReleasedWithAniListIds() {
  try {
    const d = await awGet('/')
    // latestEpisodes: [{id, name, img, episodes:{sub,...}}]
    return (d?.latestEpisodes || []).slice(0, 30).map(a => ({
      malId:   a.id,
      alId:    a.id,
      title:   a.name || 'Unknown',
      img:     a.img  || '',
      epNum:   a.episodes?.sub || 1,
      epTitle: `Episode ${a.episodes?.sub || 1}`,
    }))
  } catch { return [] }
}

export async function fetchRecentlyUpdatedViaJikan() {
  try {
    const d = await awGet('/')
    // Use spotLightAnimes for the hero section / recently updated grid
    const list = d?.spotLightAnimes || d?.trendingAnimes || []
    return list.slice(0, 18).map(toMedia)
  } catch { return [] }
}

/* ══════════════════════════════════════════════════════════
   Episode list → array of episode numbers
   ══════════════════════════════════════════════════════════ */
export async function loadEpisodes(animeId) {
  if (!animeId) return [1]
  try {
    const d = await awGet(`/episodes/${animeId}`)
    const eps = d?.episodes || []
    if (!eps.length) return [1]
    return eps.map(e => e.episodeNo || 1)
  } catch { return [1] }
}

/* ══════════════════════════════════════════════════════════
   Player  — returns AniWatch episodeId string
   Watch.jsx builds:  `${_c}/${epId}/${lang}`
   ══════════════════════════════════════════════════════════ */
export const _c = 'https://megaplay.buzz/stream/s-2'

export async function resolveEpId(name, alt, ep) {
  const variants = slugVariants(name, alt)
  let lastErr

  for (const slug of variants) {
    try {
      const d = await awGet(`/episodes/${slug}`)
      const eps = d?.episodes || []
      if (!eps.length) continue
      const found = eps.find(e => e.episodeNo === ep) || eps[ep - 1]
      if (found?.episodeId) return found.episodeId
    } catch (e) { lastErr = e }
  }

  throw lastErr || new Error('Episode not available')
}

/* ── slug helpers ── */
function slugVariants(name, alt) {
  const seen = {}, out = []
  const add = s => {
    const sl = toSlug(s || '')
    if (sl.length > 1 && !seen[sl]) { seen[sl] = 1; out.push(sl) }
  }
  add(name); add(alt)
  add((name || '').replace(/\s*[:]/g, ' ').trim())
  add((alt  || '').replace(/\s*[:]/g, ' ').trim())
  add((name || '').replace(/\s*[:\u2013\u2014].*$/, '').trim())
  add((alt  || '').replace(/\s*[:\u2013\u2014].*$/, '').trim())
  add((name || '').replace(/\s+(season|part|cour|s)\s*\d+\s*$/i, '').trim())
  add((alt  || '').replace(/\s+(season|part|cour|s)\s*\d+\s*$/i, '').trim())
  add((name || '').replace(/\s*\(\d{4}\)\s*$/, '').trim())
  add((name || '').split(/\s+/)[0])
  add((alt  || '').split(/\s+/)[0])
  return out
}

function toSlug(s) {
  return s.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
}
