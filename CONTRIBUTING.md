# Contributing to Stikart

Stikart is built by the Norwegian trail running community, for the Norwegian trail running community. Contributions of all kinds are welcome.

## Adding a race

### If you're comfortable with GitHub

1. Fork the repository
2. Create a folder under `race-calendar/` for the race (e.g. `race-calendar/MyRace/`)
3. Add the GPX file(s) to that folder
4. Add an entry to the `raceRoutes` array in `app.js`:

```javascript
{
    name: 'Race Name',
    files: ['race-calendar/MyRace/route.gpx'],
    color: '#e63946',
    url: 'https://race-website.no/',
    useCalculatedStats: true,
    category: '50k',      // marathon-trail | 50k | 50-miles | 100k | 100-miles | 100-miles-plus
    date: '2026-08-15'    // next race date (YYYY-MM-DD)
}
```

5. Open a pull request

### If you're not a developer

[Open an issue](https://github.com/erisnar/Stikart/issues/new) with:

- Race name and website URL
- Distance category
- GPX file (attach to the issue or link to the organizer's download page)
- Next race date

## Updating race info

Race dates change and routes get updated. If you spot outdated or incorrect information, [open an issue](https://github.com/erisnar/Stikart/issues/new) or send a pull request directly.

## GPX files

- Use track files (`<trk>`), not waypoint or route files
- If the organizer publishes an official GPX, prefer that over Strava exports
- Multi-stage races can use multiple GPX files (list them in order under `files`)
- Include elevation data (`<ele>`) if available — it powers the elevation profile chart

## Categories

| Category | Value |
|---|---|
| Marathon trail (< 50K) | `marathon-trail` |
| 50K | `50k` |
| 50 Miles (~80K) | `50-miles` |
| 100K | `100k` |
| 100 Miles (~160K) | `100-miles` |
| 100 Miles+ | `100-miles-plus` |
