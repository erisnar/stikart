# Stikart

Interactive map for Norwegian trail running and ultra race routes. Deployed at stikart.no via GitHub Pages.

## Running locally

```bash
python3 server.py
# Open http://localhost:8000/index.html
```

The Python server is needed to avoid CORS errors when fetching local GPX files.

## Tech stack

- Vanilla JS, HTML, CSS — no build step, no framework, no npm
- [Leaflet.js](https://leafletjs.com/) 1.9.4 for the map
- [leaflet-polylinedecorator](https://github.com/bbecquet/Leaflet.PolylineDecorator) for route arrows
- Kartverket (Norgeskart) and OpenStreetMap as base layers
- GoatCounter for privacy-friendly analytics

## File structure

| File | Purpose |
|------|---------|
| `app.js` | Everything: map init, race data, UI, filters, pace planner (~2200 lines) |
| `gpx-parser.js` | Parses GPX XML → GeoJSON; Haversine distance + elevation gain |
| `index.html` | Shell: map div, filter bar, panels, overlays |
| `style.css` | All styles |
| `server.py` | Local dev server |
| `race-calendar/` | GPX files, one folder per race |

## Adding a race

1. Create `race-calendar/<RaceName>/` and add the GPX file(s)
2. Add an entry to the `raceRoutes` array in `app.js` (around line 163):

```javascript
{
    name: 'Race Name',
    files: ['race-calendar/RaceName/route.gpx'],
    color: '#e63946',
    url: 'https://race-website.no/',
    useCalculatedStats: true,
    category: '50k',        // see categories below
    date: '2026-08-15'      // next race date, YYYY-MM-DD
}
```

Optional fields:

```javascript
manualDistance: 500,        // km — overrides GPX calculation
manualElevation: 15000,     // m  — overrides GPX calculation
gpxYear: 2026,              // label if GPX is from a specific year
checkpoints: [
    { name: 'Aid station', lat: 59.12, lng: 10.34 },  // preferred: lat/lng
    { name: 'Aid station', km: 42 },                   // fallback: km along route
]
```

## Distance categories

| Category value | Distance |
|---|---|
| `marathon-trail` | < 50K |
| `50k` | 50K |
| `50-miles` | ~80K |
| `100k` | 100K |
| `100-miles` | ~160K |
| `100-miles-plus` | > 160K |

## GPX conventions

- Use track files (`<trk>`), not route or waypoint files
- Include `<ele>` elevation data — it powers the elevation profile and pace planner
- Multi-segment races: list GPX files in order under `files`
- Prefer official organizer GPX over Strava exports

## Key features (for context when editing)

- **Elevation profile** — drawn from GPX `<ele>` data; interactive cursor synced to map
- **Pace planner** — checkpoint splits based on estimated finish time + fatigue model (`gradeFactor`, `fatiguedArrival` in app.js ~line 859)
- **Distance dot** — click the map to show nearest point on a route with km marker
- **Race panel** — slide-up list on mobile; sidebar on desktop; search + filter by month/category
- **Color regeneration** — Fisher-Yates shuffle over `darkColorPool`; unique colors per race
- **Deep linking** — `?race=<slug>` opens a race directly on load

## Race submission (user-facing form)

Users can submit a new race via a form in the info overlay ("Finner du ikke ditt løp?"). On submit, the client:
1. Parses the GPX client-side, validates distance > 30 km
2. Creates a branch `add-race/<slug>` via the GitHub API
3. Uploads the GPX file and inserts a new entry at the top of `raceRoutes` in `app.js`
4. Opens a PR — GitHub Actions validates and auto-merges

**Token required:** Set `GITHUB_TOKEN` in `app.js` (top of file) to a fine-grained PAT for `erisnar/stikart` with `Contents: write` and `Pull requests: write`. The token lives in client-side JS and is publicly visible — use a tightly scoped PAT and rotate it periodically.

**GitHub Actions** (`.github/workflows/validate-race.yml`): triggered on PRs from `add-race/*` branches — validates GPX track points and distance ≥ 30 km, comments result, and squash-merges on success.

## Deployment

GitHub Pages from `main` branch. Custom domain configured via `CNAME` (stikart.no). No CI pipeline — push to main is live.
