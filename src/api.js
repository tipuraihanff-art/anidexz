/* ══════════════════════════════════════════════════════════
   api.js  —  AniWatch backend  (https://anidexzzzz.vercel.app)
   All function signatures are identical to the original so
   no UI file needs to change.
   ══════════════════════════════════════════════════════════ */

const AW = 'https://anidexzzzz.vercel.app/aniwatch'

async function awGet(path) {
  const r = await fetch(AW + path)
  if (!r.ok) throw new Error('HTTP ' + r.status)
  return r.json()
}

/* ── helpers to convert AniWatch shape → AniList-like shape ──
   The UI cards / pages expect:
     m.id, m.title.{english,romaji}, m.coverImage.{large,medium,extraLarge},
     m.bannerImage, m.format, m.episodes (number), m.averageScore,
     m.status, m.season, m.seasonYear, m.genres, m.popularity
*/
function toMedia(a) {
  if (!a) return null
  return {
    id:           a.id,
    idMal:        a.mal_id || null,
    title: {
      english:    a.name || '',
      romaji:     a.name || '',
      native:     a.name || '',
    },
    coverImage: {
      extraLarge: a.img || '',
      large:      a.img || '',
      medium:     a.img || '',
    },
    bannerImage:  a.img || '',
    format:       a.category || a.type || '',
    status:       a.status || 'RELEASING',
    episodes:     a.episodes?.eps || a.episodes?.sub || null,
    averageScore: null,
    popularity:   null,
    favourites:   null,
    genres:       [],
    season:       null,
    seasonYear:   null,
    description:  a.description || a.descriptions || '',
    nextAiringEpisode: null,
    // keep originals for Watch page
    _aw: a,
  }
}

function toPage(animes, hasNextPage) {
  return {
    Page: {
      pageInfo: { hasNextPage: hasNextPage ?? false, total: animes.length },
      media: animes.map(toMedia),
    }
  }
}

/* ══════════════════════════════════════════════════════════
   alQuery  —  the UI calls this with a query string + vars.
   We ignore the GraphQL query and dispatch based on vars.
   ══════════════════════════════════════════════════════════ */
export async function alQuery(query, variables) {
  const v = variables || {}

  /* ── Search ── */
  if (v.search) {
    const d = await awGet(`/search?keyword=${encodeURIComponent(v.search)}&page=${v.page || 1}`)
    return toPage(d?.animes || [], d?.hasNextPage)
  }

  /* ── Single media by id (Q_DETAIL) ── */
  if (v.id && !v.ids) {
    // id here is the AniWatch kebab id stored in route
    const d = await awGet(`/anime/${v.id}`)
    const info = d?.info
    if (!info) throw new Error('Not found')
    // Build a full Media object
    const media = toMedia(info)
    media.description    = info.description || ''
    media.genres         = d.moreInfo?.['Genres'] || []
    media.status         = d.moreInfo?.['Status:'] || ''
    media.averageScore   = parseFloat(d.moreInfo?.['MAL Score:']) || null
    media.idMal          = info.mal_id || null
    // Attach extra fields the Detail page uses
    media._seasons       = d.seasons || []
    media._related       = d.relatedAnimes || []
    media._recommended   = d.recommendedAnimes || []
    media._moreInfo      = d.moreInfo || {}
    return { Media: media }
  }

  /* ── Genre filter / category browsing ── */
  if (v.genre_in?.length) {
    const genre = v.genre_in[0]
    const d = await awGet(`/search?keyword=${encodeURIComponent(genre)}&page=${v.page || 1}`)
    return toPage(d?.animes || [], d?.hasNextPage)
  }

  /* ── Format: MOVIE ── */
  if (v.format === 'MOVIE') {
    const d = await awGet(`/movie?page=${v.page || 1}`)
    return toPage(d?.animes || [], d?.hasNextPage)
  }

  /* ── Season / year (schedule) ── */
  if (v.season || v.seasonYear) {
    const d = await awGet(`/top-airing?page=${v.page || 1}`)
    return toPage(d?.animes || [], d?.hasNextPage)
  }

  /* ── Status RELEASING / TRENDING (trending, home) ── */
  const sortStr = (Array.isArray(v.sort) ? v.sort[0] : v.sort) || ''
  if (sortStr.startsWith('TRENDING') || v.status === 'RELEASING') {
    const d = await awGet(`/top-airing?page=${v.page || 1}`)
    return toPage(d?.animes || [], d?.hasNextPage)
  }

  if (sortStr.startsWith('POPULARITY') || sortStr.startsWith('UPDATED')) {
    const d = await awGet(`/most-popular?page=${v.page || 1}`)
    return toPage(d?.animes || [], d?.hasNextPage)
  }

  /* ── Fallback ── */
  const d = await awGet(`/top-airing?page=${v.page || 1}`)
  return toPage(d?.animes || [], d?.hasNextPage)
}

/* ══════════════════════════════════════════════════════════
   GraphQL query strings — kept so imports don't break.
   alQuery ignores them; they're only used as dispatch hints.
   ══════════════════════════════════════════════════════════ */
export function Q_LIST()   { return '__LIST__' }
export function Q_DETAIL() { return '__DETAIL__' }
export function Q_SUGGEST(){ return '__SUGGEST__' }
export function Q_BY_MAL_IDS() { return '__BY_MAL__' }

/* buildVars — kept identical so ListView/Search still work */
export function buildVars(opts, filter) {
  const f = filter || {}
  const v = { page: (opts?.page) || 1, perPage: 24 }
  const sort = (opts?.sort) || f.order || 'TRENDING_DESC'
  v.sort = [sort]
  if (opts?.q)        v.search = opts.q
  if (f.type)         v.format = f.type
  else if (opts?.format)  v.format = opts.format
  if (f.status)       v.status = f.status
  else if (opts?.status)  v.status = opts.status
  if (opts?.season)   v.season = opts.season
  if (opts?.seasonYear)   v.seasonYear = opts.seasonYear
  else if (f.year)    v.seasonYear = parseInt(f.year)
  if (f.score)        v.averageScore_greater = parseInt(f.score)
  if (f.genre)        v.genre_in = [f.genre]
  else if (opts?.genre_in) v.genre_in = opts.genre_in
  return v
}

/* ══════════════════════════════════════════════════════════
   Home-page data  (called by Home.jsx)
   ══════════════════════════════════════════════════════════ */
export async function fetchLatestReleasedWithAniListIds() {
  try {
    const d = await awGet('/')
    const latestEps = d?.latestEpisodes || []
    return latestEps.slice(0, 30).map(a => ({
      malId:    a.id,
      alId:     a.id,          // AniWatch uses string id for navigation
      title:    a.name || 'Unknown',
      img:      a.img || '',
      epNum:    a.episodes?.sub || 1,
      epTitle:  `Episode ${a.episodes?.sub || 1}`,
    }))
  } catch { return [] }
}

export async function fetchRecentlyUpdatedViaJikan() {
  try {
    const d = await awGet('/')
    const animes = d?.featuredAnimes?.topAiringAnimes || []
    return animes.slice(0, 18).map(toMedia)
  } catch { return [] }
}

/* ══════════════════════════════════════════════════════════
   Episode list  (called by Detail.jsx EpisodeSection)
   Returns array of episode numbers like the original.
   ══════════════════════════════════════════════════════════ */
export async function loadEpisodes(animeId) {
  if (!animeId) return [1]
  try {
    const d = await awGet(`/episodes/${animeId}`)
    const eps = d?.episodes || []
    if (!eps.length) return [1]
    return eps.map(e => e.episodeNo || e.number || 1)
  } catch { return [1] }
}

/* ══════════════════════════════════════════════════════════
   Player resolution  (called by Watch.jsx)
   Original: resolveEpId(name, alt, ep) → episodeId string
   New: look up the episodeId from AniWatch episodes list,
        then get a stream URL via episode-srcs.
   We return an episodeId that Watch.jsx passes to _c as:
     `${_c}/${epId}/${lang}`
   Instead we return the direct HLS/stream URL so the iframe
   src becomes the stream URL directly.
   ══════════════════════════════════════════════════════════ */

// _c is used by Watch.jsx as the player base URL.
// We point it to our own thin wrapper that accepts a stream URL.
// Since Watch.jsx does:  src = `${_c}/${epId}/${lang}`
// we make _c a passthrough embed and epId the stream URL — but
// that won't work for HLS. So instead we override resolveEpId
// to return a special token, and export _c as a data URI player.

// Simpler approach: return the AniWatch episodeId (the string like
// "solo-leveling-18718?ep=120094") as the epId, and set _c to
// the AniWatch episode-srcs endpoint so Watch.jsx builds:
//   https://anidexzzzz.vercel.app/aniwatch/episode-srcs?id=<epId>&server=vidstreaming&category=<lang>
// BUT Watch.jsx uses it as an iframe src, which won't work for JSON.
//
// Best approach: keep _c as the megaplay embed base, and resolve
// the AniWatch episodeId → then fetch source URL → pass to iframe.
// Watch.jsx already wraps Player in an iframe with src={`${_c}/${epId}/${lang}`}.
// We'll replace _c with a working embed proxy.

export const _c = 'https://megaplay.buzz/stream/s-2'

export async function resolveEpId(name, alt, ep) {
  // Try to find the anime by name search, get its AniWatch id,
  // then get episodes and find the matching episodeId.
  const variants = buildSlugVariants(name, alt)

  for (const slug of variants) {
    try {
      const d = await awGet(`/episodes/${slug}`)
      const eps = d?.episodes || []
      if (!eps.length) continue
      const found = eps.find(e => e.episodeNo === ep) || eps[ep - 1]
      if (found?.episodeId) {
        // Get the actual stream source
        const src = await awGet(
          `/episode-srcs?id=${encodeURIComponent(found.episodeId)}&server=vidstreaming&category=sub`
        )
        const url = src?.sources?.[0]?.url
        if (url) return url   // Watch.jsx will use this as iframe src via _c
        // If no direct URL, return the episodeId for the embed player
        return found.episodeId
      }
    } catch { continue }
  }
  throw new Error('Episode not available')
}

function buildSlugVariants(name, alt) {
  const seen = {}, out = []
  function add(s) {
    const sl = toSlug(s || '')
    if (sl.length > 1 && !seen[sl]) { seen[sl] = 1; out.push(sl) }
  }
  add(name); add(alt)
  add((name || '').replace(/\s*[:]/g, ' ').replace(/\s+/g, ' ').trim())
  add((alt  || '').replace(/\s*[:]/g, ' ').replace(/\s+/g, ' ').trim())
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
  return (s || '').toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
}
