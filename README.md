<div align="center">
  <h1>Anidexz</h1>
  <h3>Watch anime online. Free. Fast. No ads.</h3>

  [![Live Demo](https://img.shields.io/badge/Live%20Demo-anidexz.vercel.app-10b981?style=flat-square&logo=vercel&logoColor=white)](https://anidexz.vercel.app)
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

**Anidexz** is a modern, open-source anime streaming frontend built with React and Vite. Heavily inspired by the clean HiAnime UI — lightning-fast, beautiful, and 100% ad-free.

> This project is for **educational purposes only**. We do not host or upload any video files. All content is provided by public third-party APIs.

---

## Preview

![Anidexz Preview](https://iili.io/q1SxCSp.png)

---

## Features

| Feature                          | Status |
|----------------------------------|--------|
| Spotlight hero with auto-rotation | ✅     |
| Top 10 ranked anime              | ✅     |
| Latest released episodes grid    | ✅     |
| This season / Completed / Upcoming sections | ✅ |
| Real-time airing schedule with countdown | ✅ |
| Search with debounce             | ✅     |
| Anime detail page                | ✅     |
| Watch page with video player     | ✅     |
| Continue Watching (local storage)| ✅     |
| Recently Viewed (local storage)  | ✅     |
| My List / Watchlist              | ✅     |
| Browse by genre, type, status, year | ✅  |
| Dark / Light theme toggle        | ✅     |
| PWA support                      | ✅     |
| Mobile responsive                | ✅     |
| No ads                           | ✅     |

---

## APIs Used

| API                          | What it does                                      | Key needed? |
|------------------------------|---------------------------------------------------|-------------|
| [AniList GraphQL](https://graphql.anilist.co) | Anime info, search, trending, schedule, ratings | No          |
| [Jikan REST API](https://api.jikan.moe/v4)    | Latest episodes, recently updated               | No          |
| [Kitsu API](https://kitsu.io/api/edge)        | Trending anime                                  | No          |
| [Anidexz Episode Mapper](https://github.com/tipuraihanff-art/anidexz-episode-id) | Maps AniList IDs to episode stream sources | Self-host   |

> AniList, Jikan, and Kitsu are completely free public APIs — no signup, no keys, no setup required.<br>
> The **only** thing you need to self-host is the Episode Mapper (see below).

---

## Episode Mapper — Required for Watching

The watch page will not work without this. You **must** deploy your own instance.

**Repo:** [github.com/tipuraihanff-art/anidexz-episode-id](https://github.com/tipuraihanff-art/anidexz-episode-id)

### Deploy in one click:
[![Deploy Episode Mapper to Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/tipuraihanff-art/anidexz-episode-id)

After deployment you’ll receive a URL like `https://your-mapper.vercel.app` — copy it for the next step.

> The mapper is pre-configured and ready to use immediately. No additional CORS or server changes required.

---

## Environment Variables

Create a `.env` file in the root (or copy from `.env.example`):

```env
VITE_EPISODE_MAPPER_URL=https://your-mapper.vercel.app
