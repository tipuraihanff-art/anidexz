const STORE = { WL: 'anz_wl', CW: 'anz_cw', RV: 'anz_rv' }

export function lsGet(k) {
  try { return JSON.parse(localStorage.getItem(k) || 'null') } catch { return null }
}
export function lsSet(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)) } catch {}
}

/* Watchlist */
export function getWL() { return lsGet(STORE.WL) || [] }
export function isWL(id) { return getWL().some(a => a.id === id) }
export function toggleWL(item) {
  const wl = getWL()
  const idx = wl.findIndex(a => a.id === item.id)
  if (idx >= 0) { wl.splice(idx, 1); lsSet(STORE.WL, wl); return false }
  wl.unshift(item); lsSet(STORE.WL, wl); return true
}

/* Recently Viewed */
export function addRV(id, title, titleAlt, poster) {
  let rv = lsGet(STORE.RV) || []
  rv = rv.filter(a => a.id !== id)
  rv.unshift({ id, title, titleAlt, poster })
  if (rv.length > 12) rv = rv.slice(0, 12)
  lsSet(STORE.RV, rv)
}
export function getRV() { return lsGet(STORE.RV) || [] }

/* Continue Watching */
export function saveCW(id, ep, lang, title, titleAlt, poster) {
  const cw = lsGet(STORE.CW) || {}
  cw[String(id)] = { id, ep, lang, title, titleAlt, poster, ts: Date.now() }
  lsSet(STORE.CW, cw)
}
export function getCW() {
  const cw = lsGet(STORE.CW) || {}
  return Object.values(cw).sort((a, b) => b.ts - a.ts).slice(0, 8)
}
