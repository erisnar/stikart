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
| `app.js` | Everything: map init, race data, UI, filters, pace planner (~2470 lines) |
| `gpx-parser.js` | Parses GPX XML → GeoJSON; Haversine distance + elevation gain; extracts `<wpt>` waypoints |
| `index.html` | Shell: map div, filter bar, panels, overlays |
| `style.css` | All styles |
| `server.py` | Local dev server |
| `worker.js` | Cloudflare Worker — handles race submission/edit PRs server-side (holds GitHub PAT) |
| `wrangler.toml` | Cloudflare Worker config |
| `race-calendar/` | GPX files, one folder per race |
| `.github/workflows/validate-race.yml` | CI: validates GPX and auto-merges valid race PRs |

## Race entry format

Each entry in the `raceRoutes` array in `app.js`:

```javascript
{
    id: 'race-slug',            // slugified name — used by worker to find/replace entry on edit
    name: 'Race Name',
    files: ['race-calendar/RaceName/route.gpx'],
    color: '#e63946',
    url: 'https://race-website.no/',
    useCalculatedStats: true,   // must be true to build elevation profile and auto-splits
    gpxUpdated: '2026-05-18',   // date GPX was last committed — update when file changes
    category: '50k',
    date: '2026-08-15'          // next race date, YYYY-MM-DD
}
```

Optional fields:

```javascript
manualDistance: 100,    // km — overrides GPX-calculated distance (required for loop races)
gpxYear: 2025,          // shown as a warning label if GPX is from a prior year
description: 'Text',    // shown in the race detail popup; set via submission form
```

**Checkpoints are not stored in app.js entries.** They are loaded at runtime in `loadRace`:
1. From `<wpt>` waypoint elements in the GPX file — preferred, set by the race organizer
2. Auto-generated at 25/50/75% of race distance if no waypoints found

Races using auto-splits show a small italic note above the pace planner (`race.autoCheckpoints === true`).

Checkpoints power: elevation profile marker lines, pace planner split table, and map dot markers when a race is active.

## Distance categories

| Category value | Distance |
|---|---|
| `marathon-trail` | < 50K |
| `50k` | 50–65 km |
| `50-miles` | 65–130 km |
| `100k` | 130–160 km |
| `100-miles` | 160–500 km |
| `100-miles-plus` | > 500 km |

## GPX conventions

- Use track files (`<trk>`), not route or waypoint files
- Include `<ele>` elevation data — powers the elevation profile and pace planner
- Add `<wpt>` elements for aid stations — they become pace planner checkpoint splits automatically
- Multi-segment races: list GPX files in order under `files`
- Prefer official organizer GPX over Strava exports
- After replacing a GPX file, update `gpxUpdated` in the race entry to today's date

## Loop races

For races where the GPX contains only one loop, set `manualDistance` to the full race distance. This overrides the GPX-calculated distance for display and category detection. Multiple distances of the same loop (e.g. 50K and 100K) each need a separate entry pointing to the same GPX file. The submission form handles this automatically with a multi-distance list when GPX distance < 30 km.

## Mobile UI notes

- Race detail overlay starts **minimized** on mobile (shows title + elevation chart only)
- `.race-description` and `.race-popup-details` are both hidden in the minimized state — keep this in mind when adding new content to the race detail: add a corresponding `minimized` hide rule in CSS if needed
- Elevation chart touch interaction (`enableChartTouch`) requires `useCalculatedStats: true` and elevation data — it attaches `touch-action: none` to the SVG so touch doesn't scroll the card
- Pace planner on mobile opens a full-screen overlay (`pace-overlay`); on desktop it is an inline `<details>` section, collapsed by default

## Key features (for context when editing)

- **Elevation profile** — drawn from GPX `<ele>` data; interactive cursor synced to map; `raceChartMeta[raceName]` holds viewport metadata used by the touch/mouse handlers
- **Pace planner** — checkpoint splits based on estimated finish time + fatigue model (`gradeFactor`, `fatiguedArrival` ~line 950); collapsed by default behind a chevron toggle (`pace-section-toggle`)
- **Distance dot** — hover/click on map to show nearest km along active route (desktop only)
- **Race panel** — slide-up list on mobile; sidebar on desktop; search + filter by month/category
- **Color regeneration** — Fisher-Yates shuffle over `darkColorPool`; unique colors per race
- **Deep linking** — `?race=<slug>` opens a race directly on load
- **GPX date** — `gpxUpdated` shown inline next to the GPX download link in italic

## Race submission form

Users submit new races and propose edits via "Mangler det et løp?" in the info overlay.

**New race flow:**
1. User uploads GPX → client parses distance/elevation/waypoints client-side
2. If GPX < 30 km: loop course detected → multi-distance list appears (each distance creates a separate entry)
3. Client POSTs to the Cloudflare Worker
4. Worker: creates branch → uploads GPX → inserts entry/entries into `raceRoutes` → opens PR
5. GitHub Actions validates and auto-merges

**Edit flow:** "Foreslå endring" button in every race detail popup. Pre-fills the form. Worker locates the entry by `id` field (falls back to name search for legacy entries without `id`), removes it, and inserts the updated entry at the top of `raceRoutes`.

**Honeypot:** hidden `#race-hp` input — if non-empty on submit, request is silently dropped.

## Cloudflare Worker

- **URL config**: `WORKER_URL` constant at the top of `app.js`
- **Deploy**: `wrangler deploy` from the repo root
- **Secret**: `wrangler secret put GITHUB_TOKEN` — fine-grained PAT: `Contents: write` + `Pull requests: write` on this repo
- **CORS**: origin-checked against `ALLOWED_ORIGINS` env var (default: `https://stikart.no,http://localhost:8000`)

## GitHub Actions

**`validate-race.yml`** — triggers on `add-race/*` and `edit-race/*` PR branches:
- Validates GPX has `<trkpt>` track points and total distance ≥ 30 km
- Loop race exception: if GPX < 30 km, checks `manualDistance` in the app.js diff instead
- Comments result on the PR; squash-merges and deletes branch on pass

## Updating `gpxUpdated` for all races

After bulk GPX changes, re-stamp all entries from git history (run from repo root):

```bash
node << 'EOF'
const fs = require('fs'), { execSync } = require('child_process');
let src = fs.readFileSync('app.js', 'utf8'), count = 0;
src = src.replace(/(        files: \[[\s\S]*?\],)(\n        (?!gpxUpdated))/g, (m, filesBlock, nextLine) => {
    const paths = [...filesBlock.matchAll(/['"]([^'"]+\.gpx)['"]/g)].map(m => m[1]);
    const dates = paths.map(p => { try { return execSync(`git log -1 --format="%aI" -- "${p}"`).toString().trim().substring(0,10); } catch { return null; } }).filter(Boolean).sort();
    const latest = dates.pop();
    if (!latest) return m;
    count++;
    return filesBlock + `\n        gpxUpdated: '${latest}',` + nextLine;
});
fs.writeFileSync('app.js', src);
console.log(`Stamped ${count} entries`);
EOF
```

## Deployment

GitHub Pages from `main` branch. Custom domain via `CNAME` (stikart.no). Push to main → live immediately.
