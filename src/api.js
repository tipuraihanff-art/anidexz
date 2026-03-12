import { AL } from './helpers.js'

/* ── AniList GraphQL ── */
function cleanVars(obj) {
  const out = {}
  for (const k of Object.keys(obj)) {
    if (obj[k] !== null && obj[k] !== undefined) out[k] = obj[k]
  }
  return out
}

function _alFetch(query, vars) {
  return fetch(AL, {
    method: 'POST', mode: 'cors', credentials: 'omit',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ query, variables: vars })
  })
}

function _alProxy(query, vars) {
  return fetch('https://corsproxy.io/?' + encodeURIComponent(AL), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ query, variables: vars })
  })
}

export function alQuery(query, variables) {
  const vars = cleanVars(variables || {})
  return _alFetch(query, vars)
    .catch(() => _alProxy(query, vars))
    .then(r => {
      if (r.status === 429) return new Promise(res => setTimeout(res, 2500)).then(() => alQuery(query, variables))
      return r.json()
    })
    .then(d => {
      if (d.errors?.length) throw new Error(d.errors[0].message || 'GraphQL error')
      if (!d.data) throw new Error('No data returned')
      return d.data
    })
}

/* ── GraphQL Queries ── */
/* NOTE: genre_not_in:["Hentai"] filters hentai but keeps adult anime like Overflow, Redo of Healer */
export function Q_LIST() {
  return `query($page:Int $perPage:Int $sort:[MediaSort] $format:MediaFormat
    $status:MediaStatus $season:MediaSeason $seasonYear:Int
    $genre_in:[String] $search:String $averageScore_greater:Int){
    Page(page:$page perPage:$perPage){
      pageInfo{hasNextPage total}
      media(type:ANIME sort:$sort format:$format status:$status
        season:$season seasonYear:$seasonYear genre_in:$genre_in search:$search
        averageScore_greater:$averageScore_greater
        genre_not_in:["Hentai"]){
        id idMal title{romaji english native}
        coverImage{extraLarge large medium}
        bannerImage format status episodes season seasonYear
        averageScore popularity favourites genres
        studios(isMain:true){nodes{id name}}
        nextAiringEpisode{episode airingAt}
      }
    }
  }`
}

export function Q_DETAIL() {
  return `query($id:Int){
    Media(id:$id type:ANIME){
      id idMal title{romaji english native}
      coverImage{extraLarge large medium}
      bannerImage format status episodes duration
      season seasonYear
      startDate{year month day} endDate{year month day}
      averageScore meanScore popularity favourites trending
      genres description(asHtml:false) synonyms source countryOfOrigin
      studios(isMain:true){nodes{id name isAnimationStudio}}
      nextAiringEpisode{episode airingAt}
      trailer{id site thumbnail}
      tags{name rank isMediaSpoiler}
      characters(sort:[ROLE RELEVANCE] perPage:20){
        edges{
          role
          node{id name{full native} image{large medium}}
          voiceActors(language:JAPANESE){id name{full native} image{large medium}}
        }
      }
      staff(sort:[RELEVANCE] perPage:12){
        edges{ role node{id name{full} image{large medium}} }
      }
      relations{
        edges{
          relationType(version:2)
          node{id title{romaji english} coverImage{medium} format type}
        }
      }
      recommendations(sort:RATING_DESC perPage:10){
        nodes{mediaRecommendation{id title{romaji english} coverImage{medium large} format averageScore}}
      }
      externalLinks{url site type}
    }
  }`
}

export function Q_SUGGEST() {
  return `query($search:String){
    Page(page:1 perPage:5){
      media(type:ANIME search:$search genre_not_in:["Hentai"] sort:SEARCH_MATCH){
        id title{romaji english}
        coverImage{medium}
        format status
      }
    }
  }`
}


  return `query($ids:[Int] $page:Int $perPage:Int){
    Page(page:$page perPage:$perPage){
      media(type:ANIME idMal_in:$ids genre_not_in:["Hentai"]){
        id idMal title{romaji english native}
        coverImage{extraLarge large medium}
        bannerImage format status episodes season seasonYear
        averageScore popularity genres
        nextAiringEpisode{episode airingAt}
      }
    }
  }`
}

/* ── Build AniList vars ── */
export function buildVars(opts, filter) {
  const f = filter || {}
  const v = { page: (opts?.page) || 1, perPage: 24 }
  const sort = (opts?.sort) || f.order || 'TRENDING_DESC'
  v.sort = [sort]
  if (opts?.q) v.search = opts.q
  if (f.type) v.format = f.type
  else if (opts?.format) v.format = opts.format
  if (f.status) v.status = f.status
  else if (opts?.status) v.status = opts.status
  if (opts?.season) v.season = opts.season
  if (opts?.seasonYear) v.seasonYear = opts.seasonYear
  else if (f.year) v.seasonYear = parseInt(f.year)
  if (f.score) v.averageScore_greater = parseInt(f.score)
  if (f.genre) v.genre_in = [f.genre]
  else if (opts?.genre_in) v.genre_in = opts.genre_in
  return v
}

/* ── Jikan API ── */
const JIKAN = 'https://api.jikan.moe/v4'

export async function fetchJikanRecentEpisodes() {
  try {
    const r = await fetch(`${JIKAN}/watch/episodes/recent`)
    if (!r.ok) return { data: [] }
    return r.json()
  } catch {
    return { data: [] }
  }
}

/* Fetch latest released episodes from Jikan, enrich with AniList IDs for navigation.
   Returns array of { malId, alId, title, img, epNum, epTitle } */
export async function fetchLatestReleasedWithAniListIds() {
  try {
    const d = await fetchJikanRecentEpisodes()
    const items = (d.data || []).slice(0, 30)

    // Build flat list of { malId, title, img, epNum, epTitle }
    const cards = []
    const seenMal = new Set()
    for (const item of items) {
      const entry = item?.entry
      if (!entry?.mal_id) continue
      const eps = (item.episodes || []).filter(e => !e.premium)
      for (const ep of eps.slice(0, 2)) {
        const epNum = ep.mal_id || ep.episode_id
        if (!epNum) continue
        const img = ep.images?.jpg?.image_url || entry.images?.jpg?.image_url || ''
        cards.push({
          malId: entry.mal_id,
          alId: null,          // filled in below
          title: entry.title || 'Unknown',
          img,
          epNum: +epNum,
          epTitle: ep.title || `Episode ${epNum}`,
        })
      }
      seenMal.add(entry.mal_id)
    }

    if (!cards.length) return []

    // Lookup AniList IDs for all unique MAL IDs
    const malIds = [...seenMal]
    try {
      const alData = await alQuery(Q_BY_MAL_IDS(), { ids: malIds, page: 1, perPage: malIds.length })
      const alMedia = (alData?.Page?.media) || []
      const malToAl = {}
      for (const m of alMedia) { if (m.idMal) malToAl[m.idMal] = m.id }
      for (const card of cards) { card.alId = malToAl[card.malId] || null }
    } catch { /* alId stays null, will fall back to malId */ }

    return cards
  } catch {
    return []
  }
}

/* Fetch recently updated anime via Jikan (for Recently Updated section)
   Returns AniList-compatible media objects by looking up MAL IDs in AniList */
export async function fetchRecentlyUpdatedViaJikan() {
  try {
    const d = await fetchJikanRecentEpisodes()
    const items = (d.data || []).slice(0, 30)
    // Extract unique MAL IDs
    const malIds = [...new Set(items.map(i => i?.entry?.mal_id).filter(Boolean))]
    if (!malIds.length) return []
    // Fetch AniList data for these MAL IDs
    const data = await alQuery(Q_BY_MAL_IDS(), { ids: malIds, page: 1, perPage: 30 })
    const alMedia = (data?.Page?.media) || []
    // Sort by original Jikan order (most recently aired first)
    const malOrder = {}
    malIds.forEach((id, i) => { malOrder[id] = i })
    alMedia.sort((a, b) => (malOrder[a.idMal] ?? 99) - (malOrder[b.idMal] ?? 99))
    return alMedia
  } catch {
    return []
  }
}

/* ── Episode list via Jikan ── */
export async function loadEpisodes(malId) {
  if (!malId) return [1]
  async function fetchPage(page, acc) {
    try {
      const r = await fetch(`${JIKAN}/anime/${malId}/episodes?page=${page}`)
      const d = r.ok ? await r.json() : { data: [], pagination: { has_next_page: false } }
      const all = [...acc, ...(d.data || [])]
      if (d.pagination?.has_next_page && page < 5) {
        await new Promise(res => setTimeout(res, 350))
        return fetchPage(page + 1, all)
      }
      return all
    } catch {
      return acc
    }
  }
  const eps = await fetchPage(1, [])
  if (!eps.length) return [1]
  return eps.map(e => e.mal_id || e.episode_id || 1)
}

/* ── Player resolution ── */
import { _b, _c, slugVariants } from './helpers.js'

function parseEpResponse(d) {
  if (d?.contents) { try { d = JSON.parse(d.contents) } catch {} }
  const id = d && (d.episode_id || d.episodeId || d.epId || d.id)
  if (id) return String(id)
  throw new Error(d?.message ? d.message : 'Episode not found')
}

function fetchDirect(slug, ep) {
  return fetch(`${_b}?name=${slug}&episode=${ep}`, { cache: 'no-store' })
    .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json() })
    .then(parseEpResponse)
}

function fetchViaProxy(slug, ep, base) {
  return fetch(base + encodeURIComponent(`${_b}?name=${slug}&episode=${ep}`), { cache: 'no-store' })
    .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json() })
    .then(parseEpResponse)
}

function fetchEpId(slug, ep) {
  return fetchDirect(slug, ep)
    .catch(() => fetchViaProxy(slug, ep, 'https://api.allorigins.win/raw?url='))
    .catch(() => fetchViaProxy(slug, ep, 'https://corsproxy.io/?'))
}

export function resolveEpId(name, alt, ep) {
  const variants = slugVariants(name, alt)
  let i = 0
  function next() {
    if (i >= variants.length) return Promise.reject(new Error('Episode not available'))
    const v = variants[i++]
    return fetchEpId(v, ep).catch(() => next())
  }
  return next()
}

export { _c }
