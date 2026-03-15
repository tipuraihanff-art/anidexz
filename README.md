<div align="center">

# Anidexz

### Watch anime online. Free. Fast. No ads.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/tipuraihanff-art/anidexz&env=VITE_EPISODE_MAPPER_URL)
[![Stars](https://img.shields.io/github/stars/tipuraihanff-art/anidexz?style=flat-square&color=7c3aed&labelColor=0d0d15&label=Stars)](https://github.com/tipuraihanff-art/anidexz/stargazers)
[![Forks](https://img.shields.io/github/forks/tipuraihanff-art/anidexz?style=flat-square&color=7c3aed&labelColor=0d0d15&label=Forks)](https://github.com/tipuraihanff-art/anidexz/forks)
[![Issues](https://img.shields.io/github/issues/tipuraihanff-art/anidexz?style=flat-square&color=ef4444&labelColor=0d0d15&label=Issues)](https://github.com/tipuraihanff-art/anidexz/issues)
[![License](https://img.shields.io/badge/License-MIT-7c3aed?style=flat-square&labelColor=0d0d15)](LICENSE)
[![React](https://img.shields.io/badge/React-18-61dafb?style=flat-square&labelColor=0d0d15&logo=react)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5-646cff?style=flat-square&labelColor=0d0d15&logo=vite)](https://vitejs.dev)

</div>

---

## What is Anidexz?

**Anidexz** is a modern open-source anime streaming frontend built with React and Vite. Heavily inspired by the HiAnime UI — fast, clean, completely ad-free.

> This project is for educational purposes only. We do not host any video files. All content is provided by third-party sources.

---

## Preview

https://iili.io/q1SxCSp.png`

---

## Features

| Feature | Status |
|---|---|
| Spotlight hero with auto-rotation | ✅ |
| Top 10 ranked anime | ✅ |
| Latest released episodes grid | ✅ |
| This season / Completed / Upcoming sections | ✅ |
| Real-time airing schedule with countdown | ✅ |
| Search with debounce | ✅ |
| Anime detail page | ✅ |
| Watch page with video player | ✅ |
| Continue Watching (local storage) | ✅ |
| Recently Viewed (local storage) | ✅ |
| My List / Watchlist | ✅ |
| Browse by genre, type, status, year | ✅ |
| Dark / Light theme toggle | ✅ |
| PWA support | ✅ |
| Mobile responsive | ✅ |
| No ads | ✅ |

---

## APIs Used

| API | What it does | Key needed? |
|---|---|---|
| [AniList GraphQL](https://graphql.anilist.co) | Anime info, search, trending, schedule, ratings | No |
| [Jikan REST API](https://api.jikan.moe/v4) | Latest episodes, recently updated | No |
| [Kitsu API](https://kitsu.io/api/edge) | Trending anime | No |
| [Anidexz Episode Mapper](https://github.com/tipuraihanff-art/anidexz-episode-id) | Maps AniList IDs to episode stream sources | Self-host |

> AniList, Jikan and Kitsu are all free public APIs — no signup, no keys, no setup needed.
> The only thing you need to self-host is the Episode Mapper below.

---

## Episode Mapper — Required for Watching

Without this your watch page will not work. You must deploy your own instance.

**Repo:** [github.com/tipuraihanff-art/anidexz-episode-id](https://github.com/tipuraihanff-art/anidexz-episode-id)

### Deploy it in one click:

[![Deploy Episode Mapper to Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/tipuraihanff-art/anidexz-episode-id)

After deploying you'll get a URL like `https://your-mapper.vercel.app` — you'll need that in the next step.

> **Important:** After deploying the mapper, open `src/server.ts` and add your Anidexz site URL to the allowed CORS origins, then redeploy.

---

## Environment Variables

Create a `.env` file in the root:
```env
VITE_EPISODE_MAPPER_URL=https://your-mapper.vercel.app
```

| Variable | Required | Description |
|---|---|---|
| `VITE_EPISODE_MAPPER_URL` | Yes | Your deployed episode mapper URL |

---

## Deploy Anidexz

Once your episode mapper is live, deploy Anidexz:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/tipuraihanff-art/anidexz&env=VITE_EPISODE_MAPPER_URL)

Set `VITE_EPISODE_MAPPER_URL` to your mapper URL when Vercel asks for it.

---

## Vercel Config

Make sure you have a `vercel.json` in your root so page refreshes work:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ]
}
```

---

## Local Setup

### Prerequisites
- Node.js v18+
- npm or yarn
```bash
# 1. Clone the repo
git clone https://github.com/tipuraihanff-art/anidexz.git
cd anidexz

# 2. Install dependencies
npm install

# 3. Create your .env
echo "VITE_EPISODE_MAPPER_URL=https://your-mapper.vercel.app" > .env

# 4. Start dev server
npm run dev
```

App runs on `http://localhost:5173`

---

## Project Structure
```
anidexz/
├── public/              # Static assets, favicon
├── src/
│   ├── components/      # Shared UI components (Card, Section, Spinner etc)
│   ├── views/           # Page components (Home, Watch, Detail, Schedule etc)
│   ├── api.js           # All API fetch functions
│   ├── AppContext.jsx   # Router + global state
│   ├── helpers.js       # Utility functions
│   ├── storage.js       # LocalStorage (watchlist, history)
│   └── main.jsx         # Entry point
├── .env.example         # Environment variable template
├── vercel.json          # Vercel SPA routing config
└── vite.config.js       # Vite config
```

---

## Tech Stack

| Technology | Purpose |
|---|---|
| [React 18](https://react.dev) | UI framework |
| [Vite 5](https://vitejs.dev) | Build tool |
| [AniList GraphQL](https://anilist.gitbook.io) | Anime data |
| [Jikan REST API](https://docs.api.jikan.moe) | MAL episode data |
| [Kitsu API](https://kitsu.docs.apiary.io) | Trending data |
| [Anidexz Episode Mapper](https://github.com/tipuraihanff-art/anidexz-episode-id) | Episode ID mapping |

---

## Contributing

1. Fork the repo
2. Create a branch: `git checkout -b feature/your-feature`
3. Commit: `git commit -m 'add your feature'`
4. Push: `git push origin feature/your-feature`
5. Open a Pull Request

---

## Disclaimer

This project is for **educational purposes only**.

- We do not host, upload or distribute any video content
- All content is provided by third-party APIs
- All anime titles and images belong to their respective owners
- Copyright holders can open an issue for content removal

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

Made with love for the anime community

[![Star this repo](https://img.shields.io/badge/-%E2%AD%90%20Star%20this%20repo-7c3aed?style=for-the-badge&labelColor=0d0d15)](https://github.com/tipuraihanff-art/anidexz)

</div>
