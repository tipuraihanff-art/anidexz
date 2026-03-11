# anidexz — React App

A full-featured anime streaming frontend built with **React + Vite**, ready to deploy on **Vercel**.

## Tech Stack
- **React 18** + Vite
- **Firebase Realtime Database** (community posts)
- **AniList GraphQL API** (anime data)
- **Jikan API** (episode lists)
- Domain lock (blocks direct copy-paste access)

## Project Structure
```
src/
  components/
    AnimeCard.jsx      — Anime grid card with watchlist toggle
    Header.jsx         — Nav, search, advanced filters, mobile drawer
    Hero.jsx           — Rotating hero banner
    HomePage.jsx       — Home view
    ListPage.jsx       — Trending / Movies / Updated (infinite scroll)
    SearchPage.jsx     — Search results with genre filter
    DetailPage.jsx     — Anime detail with tabs
    WatchPage.jsx      — Episode player with sidebar
    CommunityPage.jsx  — Firebase community board
    Pages.jsx          — Browse / Schedule / MyList / Landing
    UI.jsx             — Spinner, Toast, ProgressBar, Skeleton, Loader
  hooks/
    useToast.js
    useProgressBar.js
  utils/
    api.js             — AniList, Jikan, storage helpers
    firebase.js        — Firebase init
    domainLock.js      — Domain/session protection
  App.jsx              — Router + layout
  main.jsx             — Entry point
```

## Setup

```bash
npm install
npm run dev       # localhost:5173
npm run build     # dist/
```

## Deploy to Vercel

1. Push this folder to GitHub
2. Import repo in Vercel
3. Framework preset: **Vite**
4. Build command: `npm run build`
5. Output directory: `dist`

> `vercel.json` handles SPA routing rewrites automatically.

## Domain Lock

Edit `src/utils/domainLock.js` and update the `ALLOWED` array with your real domain(s).
Localhost is always allowed in development.

## Customization

- Firebase config → `src/utils/firebase.js`
- Allowed domains → `src/utils/domainLock.js`
- Stream base URL → `src/utils/api.js` (`STREAM_BASE`)
- Episode resolver → `src/utils/api.js` (`EP_BASE`)
