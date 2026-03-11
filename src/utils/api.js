// ─── Constants ───
export const AL = 'https://graphql.anilist.co';
export const EP_BASE = (() => {
  const p = ['https://episode-id', 'onrender.com', 'get-link'];
  return p[0] + '.' + p[1] + '/' + p[2];
})();
export const STREAM_BASE = (() => {
  const p = ['https://megaplay', 'buzz', 'stream', 's-2'];
  return p[0] + '.' + p[1] + '/' + p[2] + '/' + p[3];
})();

export const GENRES = [
  'Action','Adventure','Comedy','Drama','Fantasy','Horror','Mystery',
  'Psychological','Romance','Sci-Fi','Slice of Life','Sports','Supernatural',
  'Thriller','Ecchi','Harem','Isekai','Mecha','Military','Music','School','Shounen',
  'Shoujo','Seinen','Josei',
];

// ─── GraphQL Queries ───
export function Q_LIST() {
  return `query($page:Int $perPage:Int $sort:[MediaSort] $format:MediaFormat
$status:MediaStatus $season:MediaSeason $seasonYear:Int
$genre_in:[String] $search:String $averageScore_greater:Int){
Page(page:$page perPage:$perPage){
pageInfo{hasNextPage total}
media(type:ANIME sort:$sort format:$format status:$status
season:$season seasonYear:$seasonYear genre_in:$genre_in search:$search
averageScore_greater:$averageScore_greater){
id idMal title{romaji english native}
coverImage{extraLarge large medium}
bannerImage format status episodes season seasonYear
averageScore popularity favourites genres
studios(isMain:true){nodes{id name}}
nextAiringEpisode{episode airingAt}
}}}`;
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
}}`;
}

// ─── AniList fetch ───
function cleanVars(obj) {
  const out = {};
  for (const k in obj) {
    if (obj[k] !== null && obj[k] !== undefined) out[k] = obj[k];
  }
  return out;
}

async function _alFetch(query, vars) {
  const res = await fetch(AL, {
    method: 'POST', mode: 'cors', credentials: 'omit',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables: vars }),
  });
  return res;
}

async function _alFetchProxy(query, vars) {
  const res = await fetch('https://corsproxy.io/?' + encodeURIComponent(AL), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables: vars }),
  });
  return res;
}

export async function alQuery(query, variables = {}) {
  const vars = cleanVars(variables);
  let res;
  try { res = await _alFetch(query, vars); }
  catch { res = await _alFetchProxy(query, vars); }
  if (res.status === 429) {
    await new Promise(r => setTimeout(r, 2500));
    return alQuery(query, variables);
  }
  const d = await res.json();
  if (d.errors?.length) throw new Error(d.errors[0].message || 'GraphQL error');
  if (!d.data) throw new Error('No data returned');
  return d.data;
}

// ─── Helpers ───
export const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const alImg = (m, size = 'large') => m?.coverImage?.[size] || m?.coverImage?.medium || 'https://placehold.co/300x420/0d0d15/555577?text=No+Image';
export const alTitle = m => m?.title?.english || m?.title?.romaji || 'Unknown';
export const alTitleAlt = m => m?.title?.romaji || m?.title?.english || '';
export const scoreDisp = m => { if (!m) return 'N/A'; const s = m.averageScore || m.meanScore; return s || 'N/A'; };
export const fmtFormat = f => (f || '').replace(/_/g, ' ');
export const fmtNum = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n);

// ─── Storage ───
const STORE = { WL: 'anz_wl', CW: 'anz_cw', RV: 'anz_rv' };
export const lsGet = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
export const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

export const getWL = () => lsGet(STORE.WL) || [];
export const isWL = id => getWL().some(a => a.id === id);
export function toggleWL(item) {
  const wl = getWL();
  const idx = wl.findIndex(a => a.id === item.id);
  if (idx >= 0) { wl.splice(idx, 1); lsSet(STORE.WL, wl); return false; }
  wl.unshift(item); lsSet(STORE.WL, wl); return true;
}
export const addRV = (id, title, titleAlt, poster) => {
  let rv = lsGet(STORE.RV) || [];
  rv = rv.filter(a => a.id !== id);
  rv.unshift({ id, title, titleAlt, poster });
  if (rv.length > 12) rv = rv.slice(0, 12);
  lsSet(STORE.RV, rv);
};
export const saveCW = (id, ep, lang, title, titleAlt, poster) => {
  const cw = lsGet(STORE.CW) || {};
  cw[String(id)] = { id, ep, lang, title, titleAlt, poster, ts: Date.now() };
  lsSet(STORE.CW, cw);
};
export const getCW = () => {
  const cw = lsGet(STORE.CW) || {};
  return Object.values(cw).sort((a, b) => b.ts - a.ts).slice(0, 8);
};

// ─── AniList vars builder ───
export function buildVars(opts = {}, filter = {}) {
  const v = { page: opts.page || 1, perPage: 24 };
  const sort = opts.sort || filter.order || 'TRENDING_DESC';
  v.sort = [sort];
  if (opts.q) v.search = opts.q;
  if (filter.type) v.format = filter.type;
  else if (opts.format) v.format = opts.format;
  if (filter.status) v.status = filter.status;
  else if (opts.status) v.status = opts.status;
  if (opts.season) v.season = opts.season;
  if (opts.seasonYear) v.seasonYear = opts.seasonYear;
  else if (filter.year) v.seasonYear = parseInt(filter.year);
  if (filter.score) v.averageScore_greater = parseInt(filter.score);
  if (filter.genre) v.genre_in = [filter.genre];
  else if (opts.genre_in) v.genre_in = opts.genre_in;
  return cleanVars(v);
}

// ─── Episode loading ───
export async function loadEpisodes(malId) {
  if (!malId) return [1];
  const jikanBase = 'https://api.jikan.moe/v4';
  async function fetchPage(page, acc) {
    try {
      const r = await fetch(`${jikanBase}/anime/${malId}/episodes?page=${page}`);
      const d = r.ok ? await r.json() : { data: [], pagination: { has_next_page: false } };
      const all = [...acc, ...(d.data || [])];
      if (d.pagination?.has_next_page && page < 5) {
        await new Promise(res => setTimeout(res, 350));
        return fetchPage(page + 1, all);
      }
      return all;
    } catch { return acc; }
  }
  const eps = await fetchPage(1, []);
  if (!eps.length) return [1];
  return eps.map(e => e.mal_id || e.episode_id || 1);
}

// ─── Episode ID resolution ───
function toSlug(s) { return (s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, '-').replace(/-{2,}/g, '-').replace(/^-|-$/g, ''); }
function slugVariants(name, alt) {
  const seen = {}, out = [];
  const add = s => { const sl = toSlug(s || ''); if (sl.length > 1 && !seen[sl]) { seen[sl] = 1; out.push(sl); } };
  add(name); add(alt);
  add((name || '').replace(/\s*[:]/g, ' ').replace(/\s+/g, ' ').trim());
  add((alt || '').replace(/\s*[:]/g, ' ').replace(/\s+/g, ' ').trim());
  add((name || '').replace(/\s*[:\u2013\u2014].*$/, '').trim());
  add((alt || '').replace(/\s*[:\u2013\u2014].*$/, '').trim());
  add((name || '').replace(/\s+(season|part|cour|s)\s*\d+\s*$/i, '').trim());
  add((alt || '').replace(/\s+(season|part|cour|s)\s*\d+\s*$/i, '').trim());
  add((name || '').replace(/\s*\(\d{4}\)\s*$/, '').trim());
  add((name || '').split(/\s+/)[0]);
  add((alt || '').split(/\s+/)[0]);
  return out;
}
function parseEpResponse(d) {
  if (d?.contents) { try { d = JSON.parse(d.contents); } catch {} }
  const id = d?.episode_id || d?.episodeId || d?.epId || d?.id;
  if (id) return String(id);
  throw new Error(d?.message || 'Episode not found');
}
async function fetchDirect(slug, ep) {
  const r = await fetch(`${EP_BASE}?name=${slug}&episode=${ep}`, { cache: 'no-store' });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return parseEpResponse(await r.json());
}
async function fetchViaProxy(slug, ep, base) {
  const r = await fetch(base + encodeURIComponent(`${EP_BASE}?name=${slug}&episode=${ep}`), { cache: 'no-store' });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return parseEpResponse(await r.json());
}
async function fetchEpId(slug, ep) {
  try { return await fetchDirect(slug, ep); } catch {}
  try { return await fetchViaProxy(slug, ep, 'https://api.allorigins.win/raw?url='); } catch {}
  return fetchViaProxy(slug, ep, 'https://corsproxy.io/?');
}
export async function resolveEpId(name, alt, ep) {
  const variants = slugVariants(name, alt);
  for (const v of variants) {
    try { return await fetchEpId(v, ep); } catch {}
  }
  throw new Error('Episode not available');
}
