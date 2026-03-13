/* ══════════════════════════════════════════════════════════
   api.js  —  AniWatch backend  (https://anidexzzzz.vercel.app)
   All function signatures are identical to the original so
   no UI file needs to change.
   ══════════════════════════════════════════════════════════ */

const AW = 'https://anidexzzzz.vercel.app/aniwatch'
const PROXIES = [
  u => u,                                                          // direct
  u => 'https://corsproxy.io/?' + encodeURIComponent(u),          // proxy 1
  u => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(u), // proxy 2
]

async function awGet(path) {
  const url = AW + path
  let lastErr
  for (const proxy of PROXIES) {
    try {
      const r = await fetch(proxy(url), { headers: { 'Accept': 'application/json' } })
      if (r.status === 429) {
        await new Promise(res => setTimeout(res, 2000))
        continue
      }
      if (!r.ok) throw new Error('HTTP ' + r.status)
      const text = await r.text()
      return JSON.parse(text)
    } catch (e) { lastErr = e }
  }
  throw lastErr || new Error('Failed to fetch')
}

/* ── helpers to convert AniWatch shape → AniList-like shape ──
   The UI cards / pages expect:
     m.id, m.title.{english,romaji}, m.coverImage.{large,medium,extraLarge},
     m.bannerImage, m.format, m.episodes (number), m.averageScore,
     m.status, m.genres
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
    _aw: a,
  }
}

function toPage(animes, hasNextPage) {
  return {
    Page: {
      pageInfo: { hasNextPage: hasNextPage ?? false, total: animes.length },
      media: (animes || []).map(toMedia),
    }
  }
}

/* ══════════════════════════════════════════════════════════
   alQuery  —  the UI calls this with a query string + vars.
   We ignore the GraphQL query string and dispatch based on vars.
   ══════════════════════════════════════════════════════════ */
export async function alQuery(query, variables) {
  const v = variables || {}

  /* ── Single media by id (Q_DETAIL) ── */
  if (v.id && !v.ids && !v.search) {
    const d = await awGet(`/anime/${v.id}`)
    const info = d?.info
    if (!info) throw new Error('Not found')
    const media = toMedia(info)
    media.description    = info.description || ''
    media.genres         = d.moreInfo?.['Genres'] || []
    media.status         = d.moreInfo?.['Status:'] || ''
    media.averageScore   = parseFloat(d.moreInfo?.['MAL Score:']) || null
    media.idMal          = info.mal_id || null
    media._seasons       = d.seasons || []
    media._related       = d.relatedAnimes || []
    media._recommended   = d.recommendedAnimes || []
    media._moreInfo      = d.moreInfo || {}
    return { Media: media }
  }

  /* ── Search ── */
  if (v.search) {
    const d = await awGet(`/search?keyword=${encodeURIComponent(v.search)}&page=${v.page || 1}`)
    return toPage(d?.animes || [], d?.hasNextPage)
  }

  /* ── Genre filter ── */
  if (v.genre_in?.length) {
    const d = await awGet(`/search?keyword=${encodeURIComponent(v.genre_in[0])}&page=${v.page || 1}`)
    return toPage(d?.animes || [], d?.hasNextPage)
  }

  /* ── Format: MOVIE ── */
  if (v.format === 'MOVIE') {
    const d = await awGet(`/movie?page=${v.page || 1}`)
    return toPage(d?.animes || [], d?.hasNextPage)
  }

  /* ── Season / schedule ── */
  if (v.season || v.seasonYear) {
    const d = await awGet(`/top-airing?page=${v.page || 1}`)
    return toPage(d?.animes || [], d?.hasNextPage)
  }

  /* ── Sort-based dispatch ── */
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
   ══════════════════════════════════════════════════════════ */
export function Q_LIST()       { return '__LIST__' }
export function Q_DETAIL()     { return '__DETAIL__' }
export function Q_SUGGEST()    { return '__SUGGEST__' }
export function Q_BY_MAL_IDS() { return '__BY_MAL__' }

/* buildVars — kept identical */
export function buildVars(opts, filter) {
  const f = filter || {}
  const v = { page: opts?.page || 1, perPage: 24 }
  const sort = opts?.sort || f.order || 'TRENDING_DESC'
  v.sort = [sort]
  if (opts?.q)           v.search     = opts.q
  if (f.type)            v.format     = f.type
  else if (opts?.format) v.format     = opts.format
  if (f.status)          v.status     = f.status
  else if (opts?.status) v.status     = opts.status
  if (opts?.season)      v.season     = opts.season
  if (opts?.seasonYear)  v.seasonYear = opts.seasonYear
  else if (f.year)       v.seasonYear = parseInt(f.year)
  if (f.score)           v.averageScore_greater = parseInt(f.score)
  if (f.genre)           v.genre_in   = [f.genre]
  else if (opts?.genre_in) v.genre_in = opts.genre_in
  return v
}

/* ══════════════════════════════════════════════════════════
   Home-page sections  (called by Home.jsx)
   ══════════════════════════════════════════════════════════ */
export async function fetchLatestReleasedWithAniListIds() {
  try {
    const d = await awGet('/')
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
    return (d?.featuredAnimes?.topAiringAnimes || []).slice(0, 18).map(toMedia)
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
    return eps.map(e => e.episodeNo || 1)
  } catch { return [1] }
}

/* ══════════════════════════════════════════════════════════
   Player resolution  (called by Watch.jsx)
   resolveEpId(name, alt, ep) → episodeId string
   Watch.jsx uses it as:  `${_c}/${epId}/${lang}`
   We search AniWatch for the anime, grab the episodeId,
   then fetch the HLS source URL and return it directly.
   _c is set to '' so Watch.jsx builds src = `/${epId}/${lang}`
   — but actually we return the full URL from resolveEpId,
   and _c is unused when the returned value starts with http.

   Watch.jsx does:  setSrc(`${_c}/${epId}/${lang}`)
   So we set _c = '' and return `https://...m3u8` as epId,
   giving:  '' + '/' + 'https://...m3u8' + '/sub'  — broken.

   Instead: we return just the stream URL as epId, and set
   _c to a single-page HLS player that accepts a URL param:
     https://megaplay.buzz/stream/s-2/<url>/sub  — won't work either.

   Cleanest fix: override _c so that Watch.jsx builds a valid
   URL. We'll use a public HLS.js player page:
     https://hls-player.netlify.app/?src=<url>
   But Watch.jsx builds `${_c}/${epId}/${lang}` with slashes.

   The simplest working approach: keep _c as the megaplay base
   and resolve the AniWatch episodeId string (not a URL) so
   megaplay can embed it.  If megaplay fails, Watch.jsx already
   shows a retry button.
   ══════════════════════════════════════════════════════════ */
export const _c = 'https://megaplay.buzz/stream/s-2'

export async function resolveEpId(name, alt, ep) {
  const variants = buildSlugVariants(name, alt)
  let lastErr

  for (const slug of variants) {
    try {
      const d = await awGet(`/episodes/${slug}`)
      const eps = d?.episodes || []
      if (!eps.length) continue
      const found = eps.find(e => e.episodeNo === ep) || eps[ep - 1]
      if (found?.episodeId) return found.episodeId
    } catch (e) { lastErr = e; continue }
  }

  throw lastErr || new Error('Episode not available')
}

/* ── slug helpers (internal) ── */
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
