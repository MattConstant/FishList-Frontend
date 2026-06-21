# FishList

**Map the water. Log the bite. Share the story.**

[fishlist.ca](https://www.fishlist.ca), an Ontario-first fishing app for logging catches, exploring provincial lake data, and sharing trips with friends.

Built by an Ottawa angler who got tired of juggling maps, stocking PDFs, photos, and notes across a dozen tabs. FishList brings the useful parts into one place.

---

## What it is

FishList is a full-stack fishing log and social app:

- **Explore** Ontario waters on an interactive map with MNRF stocking data, species presence records, bathymetry, and community catch pins.
- **Log** catches and camp spots with photos, species, gear, and notes, straight from the map.
- **Share** a community feed with likes, threaded comments, and friend filters.
- **Plan** with fishing forecasts, solunar timing, and lake-level insights.

Guests can browse the map and landing page. Create a free account to post, comment, and build your angler profile.

---

## Features

### Map & data

- Interactive Leaflet map with satellite or street basemap
- **MNRF stocking** layer: filter by species, district, stage, and volume
- **Species presence (ARA)**: provincial occurrence records
- **Lake search** with geocoding and deep links to a lake pin
- **Bathymetry** contours (Ontario LIO, where surveyed)
- **Community catch pins** from the feed (signed-in users)
- Map favorites and onboarding for first-time visitors

### Catches & feed

- Log catches from the map with multiple photos per post
- Edit post details (location, visibility, species, description)
- Full-screen photo lightbox in the feed
- Feed scopes: everyone, friends only, or your posts
- Likes, nested comments, and reply threads
- Delete your own posts

### Social & profile

- Friend requests and friend-only visibility
- Public user profiles with catch history
- Achievements and badges
- Notifications for activity
- English and French UI

### Planning tools

- Fishing forecast page with condition ratings
- Solunar / pressure charts on lake detail sheets
- Optional AI lake fishing tips (when configured on the API)

### Account & auth

- Email + password registration with email verification
- Google sign-in (optional, when `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is set)
- Session-based API auth against the FishList backend

---

## Tech stack

| Layer | Tools |
|-------|--------|
| Framework | [Next.js 16](https://nextjs.org/) (App Router) |
| UI | React 19, TypeScript, Tailwind CSS 4 |
| Maps | Leaflet, Esri Leaflet, marker clustering, Ontario GeoHub |
| i18n | Custom locale dictionaries (`en` / `fr`) |
| Analytics | Vercel Analytics & Speed Insights |
| Hosting | [Vercel](https://vercel.com/) (frontend) |
| API | [FishList backend](https://github.com/MattConstant/FishList-Backend), Spring Boot on Render |

---

## Prerequisites

- **Node.js 20+** and npm
- **FishList backend** running locally for full auth, posts, and uploads. See the [FishList-Backend](https://github.com/MattConstant/FishList-Backend) repo (`docker compose up --build` → API at `http://localhost:8080`)

---

## Local setup

### 1. Clone and install

```bash
git clone https://github.com/MattConstant/FishList-Frontend.git
cd FishList-Frontend
npm ci
```

### 2. Environment

Copy or create `.env.local` for secrets and overrides (git-ignored):

```bash
# Required: Spring Boot API (local Docker or remote)
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080

# Optional: canonical site URL for metadata / sitemap
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Optional: Google OAuth (must match backend GOOGLE_CLIENT_ID)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=

# Optional: reserved usernames / admin (comma-separated)
NEXT_PUBLIC_ADMIN_USERNAME=
NEXT_PUBLIC_RESERVED_USERNAMES=
```

Tracked defaults:

- `.env.development` → `NEXT_PUBLIC_API_BASE_URL=http://localhost:8080`
- `.env.production` → `NEXT_PUBLIC_API_BASE_URL=https://fishlist-backend.onrender.com`

`.env.local` wins over those files for local dev.

### 3. Start the backend

In a separate terminal, from your backend clone:

```bash
cd FishList-Backend   # or FishList/ in a local workspace
docker compose up --build
```

API: `http://localhost:8080`  
MinIO console (local uploads): `http://localhost:9001`

### 4. Run the frontend

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Use `npm run dev:turbo` for Turbopack instead of webpack if you prefer.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server (webpack) |
| `npm run dev:turbo` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint |
| `npm run generate:favicons` | Regenerate favicon assets |

---

## Project layout

```
src/
├── app/              # Routes (pages, API routes, layout)
├── components/       # UI components (map, feed, forms, landing)
├── contexts/         # Auth, locale, achievement toasts
├── lib/              # API client, geocoding, map utilities
├── locales/          # en / fr translation strings
└── styles/           # Page-specific CSS
public/               # Static assets, favicons, landing images
```

Server routes under `src/app/api/` proxy geocoding, forecasts, and AI tips so keys stay off the client where needed.

---

## Deployment (Vercel)

1. Import the **FishList-Frontend** GitHub repo.
2. **Root Directory**: leave blank (app lives at repo root).
3. Framework preset: **Next.js** (auto-detected).
4. Set environment variables:
   - `NEXT_PUBLIC_API_BASE_URL` → your production API URL
   - `NEXT_PUBLIC_SITE_URL` → e.g. `https://www.fishlist.ca`
   - `NEXT_PUBLIC_GOOGLE_CLIENT_ID` → if using Google login

Production API: `https://fishlist-backend.onrender.com`

---

## Backend repo

This repository is **frontend only**. The Spring Boot API, database migrations, Docker Compose, and mail/storage config live in:

**[github.com/MattConstant/FishList-Backend](https://github.com/MattConstant/FishList-Backend)**

For email verification in local dev, confirmation links are logged to the backend console when SMTP is not configured.

---

## Data & attribution

- Fish stocking map data: [Ontario GeoHub](https://geohub.lrc.gov.on.ca/) (Province of Ontario)
- Species presence: provincial ARA records via GeoHub
- Bathymetry: Ontario LIO (not for navigation)

---

## Contributing

Issues and pull requests are welcome. Run `npm run lint` and `npm run build` before opening a PR.

---

## License

Private / all rights reserved unless otherwise noted in the repository settings.
