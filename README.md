# Stikart - Trail Running Map

Interactive map for discovering trail running and ultra race routes in Norway.

## Features

- Leaflet.js interactive map with Kartverket (Norgeskart) and OpenStreetMap base layers
- GPX race route display with distance, elevation, and race info popups
- Layer controls to toggle individual race routes on/off

## How to Run

Run a local web server to avoid CORS issues when loading GPX files:

```bash
python3 server.py
```

Then open http://localhost:8000/index.html

## Adding Race Routes

1. Create a folder under `race-calendar/` for your race
2. Add your GPX file(s) to that folder
3. Add an entry to the `raceRoutes` array in `app.js`:

```javascript
{
    name: 'Your Race Name',
    files: ['race-calendar/YourRace/route.gpx'],
    color: '#ff6b35',
    description: 'Race description',
    url: 'https://race-website.com/',
    useCalculatedStats: true,
    location: 'Location'
}
```

1. Refresh your browser

## File Structure

```text
Stikart/
  index.html
  app.js
  style.css
  gpx-parser.js
  server.py
  race-calendar/
    EndlessShores/
    Nordmakstravern/
    NordmarkaSkogsmaraton/
    OsloBergenTrail/
    Sidespor-SkyBlazers/
    SandsnesUltraTrail/
    SoriaMoriaTilVerdensEnde/
    Nøsen/
    ØstmarkaTrailChallenge/
```

## Supported Trails

### 100 Miles+
| Race | Distance | Elevation | Location |
|------|----------|-----------|----------|
| OBT Oslo-Bergen Trail | 500 km | 15000 m | Oslo til Bergen |
| Oslo Trail Challenge 200K | 200 km | - | Oslo / Nordmarka |

### 100 Miles
| Race | Distance | Elevation | Location |
|------|----------|-----------|----------|
| SMVE - Soria Moria til Verdens Ende | 160 km | - | Oslo området |
| Endless Shore Ultra | 160 km | - | Norsk kyst |
| Sandnes 100 Miles | 160 km | - | Sandnes |
| Lofoten Ultra Trail 100 Miles | 160 km | - | Lofoten |
| MMC 100 Miles | 161 km | - | Meråker, Trøndelag |
| Vestfold Historic Ultra 147K | 147 km | 5000 m | Vestfold |

### 100K
| Race | Distance | Elevation | Location |
|------|----------|-----------|----------|
| Nøsen Hundreds | 100 km | - | Nøsen området |
| MMC 100K | 100 km | - | Meråker, Trøndelag |
| Hardangerjøkulen Ultra 95K | 95 km | - | Eidfjord, Hardanger |
| Oslo Trail Challenge 100K | 100 km | - | Oslo / Nordmarka |
| Lustrafjorden Inn Ultra 100 | 104 km | 6000 m | Luster, Sogn |
| Stranda Fjord Trail 95K | 95 km | 6800 m | Stranda, Sunnmøre |
| Trollheimen Ultra 100K | 100 km | 3143 m | Trollheimen |

### 50 Miles
| Race | Distance | Elevation | Location |
|------|----------|-----------|----------|
| Lofoten Ultra Trail 50 Miles | 80 km | - | Lofoten |
| MMC 70K | 70 km | - | Meråker, Trøndelag |
| Hornindal Rundt 75K | 75 km | 5600 m | Hornindal |
| Skogvokteren | 88 km | 3500 m | Norge |
| Ecotrail Oslo 80K | 81.7 km | 1991 m | Oslo |
| Vestfold Historic Ultra 87K | 87 km | 2750 m | Vestfold |
| Jotunheimen Trail Run | 73 km | 2500 m | Jotunheimen |

### 50K
| Race | Distance | Elevation | Location |
|------|----------|-----------|----------|
| NSM Ultra | 50 km | - | Nordmarka, Oslo |
| Dobbeltravern | 60 km | - | Nordmarka, Oslo |
| Lillomarka Rundt | 51 km | - | Lillomarka, Oslo |
| Lofoten Ultra Trail 48K | 48 km | - | Lofoten |
| Oslo Trail Challenge 55K | 55 km | - | Oslo / Nordmarka |
| Nøsen 50K | 50 km | 1910 m | Valdres |
| KRSUltra 60 | 60 km | 2200 m | Kristiansand |
| Ecotrail Oslo 50K | 50.5 km | 1026 m | Oslo |
| Sognefjord Trail Run 50K | 50 km | 2400 m | Sognefjorden |
| Vestfold Historic Ultra 50K | 50 km | 1280 m | Vestfold |
| Stranda Fjord Trail 55K | 55 km | 3800 m | Stranda, Sunnmøre |
| Tromsø Mountain Challenge 50K | 50 km | - | Tromsø |

### <50K (Marathon Trail)
| Race | Distance | Elevation | Location |
|------|----------|-----------|----------|
| Flyktningeruta | 42 km | - | Østmarka, Oslo |
| Hardangerjøkulen Ultra 34K | 34 km | - | Eidfjord, Hardanger |
| Hardangervidda Maraton 43K | 43 km | - | Eidfjord, Hardanger |
| Bodøryggen Ultra | 48.8 km | 1778 m | Bodø |

## Technologies

- [Leaflet.js](https://leafletjs.com/) - Interactive map rendering
- [Kartverket](https://www.kartverket.no/) - Norwegian topographic map tiles
- [OpenStreetMap](https://www.openstreetmap.org/) - Map data
