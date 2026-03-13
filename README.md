# anidexz — React + Vite

Exact 1:1 conversion of the original anidexz Blogger site to React + Vit
## Changes from original:
- **Hentai filtered**: `genre_not_in:["Hentai"]` added to all AniList queries. Adult anime (Overflow, Redo of Healer, etc.) still shows — only the Hentai genre tag is excluded.
- **Recently Updated** now uses Jikan API to show anime ordered by latest episode release dates (fetches recent Jikan episodes → maps to AniList for proper card display).
- Everything else is identical: same CSS, same colors, same layout, same Firebase community, same player.

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Build for production

```bash
npm run build
npm run preview
```

## Deploy to Vercel

1. Push to GitHub
2. Import in Vercel — it auto-detects Vite
3. Deploy

No environment variables needed. Firebase config is embedded (same as original).

## Project structure

```
src/
  App.jsx          # Router + layout
  AppContext.jsx   # Global state (route, toast, progress bar)
  styles.css       # Exact same CSS as original
  firebase.js      # Firebase init (same config)
  api.js           # AniList + Jikan + player resolution
  storage.js       # localStorage (watchlist, history)
  helpers.js       # Utility functions
  components/
    Header.jsx     # Nav + search + advanced filters + mobile drawer
    Shared.jsx     # Card, Spinner, Section, GenreRow, etc.
    UI.jsx         # Toast, ProgressBar, Loader
  views/
    Landing.jsx    # Landing page
    Home.jsx       # Home with hero + all sections
    ListView.jsx   # Trending / Movies / Updated (infinite scroll)
    Search.jsx     # Search results with genre filter
    Schedule.jsx   # Airing this season
    MyList.jsx     # Watchlist
    Browse.jsx     # Browse by season/genre/format
    Detail.jsx     # Anime detail with all tabs
    Watch.jsx      # Video player with sidebar
    Community.jsx  # Firebase community feed
```
