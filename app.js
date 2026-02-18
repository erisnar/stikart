// Download GPX file
function downloadGpx(url, fileName) {
    fetch(url)
        .then(response => response.blob())
        .then(blob => {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = fileName;
            link.click();
            URL.revokeObjectURL(link.href);
        })
        .catch(err => console.error('Download failed:', err));
}

// Generate a random hex color
function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

// Regenerate colors for all race routes
function regenerateColors() {
    raceRoutes.forEach(race => {
        race.color = getRandomColor();
    });

    // Update polyline colors on the map
    for (const [name, polylines] of Object.entries(racePolylines)) {
        const race = raceRoutes.find(r => r.name === name);
        if (race) {
            polylines.forEach(pl => {
                pl.setStyle({ color: race.color });
            });
        }
    }

    // Update legend color indicators in the layer control
    document.querySelectorAll('.toggle-race').forEach(checkbox => {
        const raceName = checkbox.dataset.race;
        const race = raceRoutes.find(r => r.name === raceName);
        if (race) {
            const colorIcon = checkbox.parentElement.querySelector('.layer-icon');
            if (colorIcon) {
                colorIcon.style.backgroundColor = race.color;
            }
        }
    });
}

// Initialize Leaflet map centered on Oslo
// Oslo coordinates: 59.9139° N, 10.7522° E
const map = L.map('map').setView([59.9139, 10.7522], 11);

// Add standard OSM layer (fast and reliable)
const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
});

// Add Kartverket Norgeskart (Norwegian topographic map with excellent detail)
const kartverketLayer = L.tileLayer('https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/{z}/{y}/{x}.png', {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.kartverket.no/" target="_blank">Kartverket</a>'
});

// Add default layer - Kartverket Norgeskart
kartverketLayer.addTo(map);

// Add scale control
L.control.scale({
    metric: true,
    imperial: false,
    position: 'bottomleft'
}).addTo(map);

// Race distance categories
const raceCategories = [
    { id: 'marathon-trail', name: '<50K' },
    { id: '50k', name: '50K' },
    { id: '50-miles', name: '50 Miles' },
    { id: '100k', name: '100K' },
    { id: '100-miles', name: '100 Miles' },
    { id: '100-miles-plus', name: '100 Miles+' }
];

// GPX race routes configuration
const raceRoutes = [
    {
        name: 'NSM Ultra 2025',
        files: ['race-calendar/NordmarkaSkogsmaraton/NSM_Ultra_2025.gpx'],
        color: '#ff6b35',
        url: 'https://nordmarkaskogsmaraton.no/',
        useCalculatedStats: true,
        category: '50k',
        date: '2026-20-06'
    },
    {
        name: 'OBT Oslo-Bergen Trail',
        files: [
            'race-calendar/OsloBergenTrail/M1_Oslo-Bergen.gpx',
            'race-calendar/OsloBergenTrail/M2_Vasstulan-Bergen.gpx',
            'race-calendar/OsloBergenTrail/M3_Voss-Bergen.gpx',
            'race-calendar/OsloBergenTrail/M4_Gullbotn-Bergen.gpx'
        ],
        color: '#3498db',
        url: 'https://oslobergentrail.com/',
        manualDistance: 500,
        manualElevation: 15000,
        category: '100-miles-plus',
        date: '2027-07-01'
    },
    {
        name: 'SMVE - Soria Moria til Verdens Ende',
        files: ['race-calendar/SoriaMoriaTilVerdensEnde/SMVE_2024_100_miles_02.gpx'],
        color: '#9b59b6',
        url: 'https://soriamoriatilverdensende.com',
        useCalculatedStats: true,
        category: '100-miles',
        date: '2026-05-30'
    },
    {
        name: 'Nøsen Hundreds',
        files: ['race-calendar/Nøsen/Nosen_100.gpx'],
        color: '#e74c3c',
        url: 'https://www.nosenhundreds.com/',
        useCalculatedStats: true,
        category: '100k',
        date: '2026-06-13'
    },
    {
        name: 'Dobbeltravern - Nordmarkstraveren',
        files: ['race-calendar/Nordmakstravern/dobbeltravern_60km_1_.gpx'],
        color: '#f39c12',
        url: 'http://www.nordmarkstravern.no/',
        useCalculatedStats: true,
        category: '50k',
        date: '2026-09-05'
    },
    {
        name: 'Lillomarka Rundt',
        files: ['race-calendar/Sidespor-SkyBlazers/Lillomarka_rundt_51_km_Frysja_161025.gpx'],
        color: '#1abc9c',
        url: 'https://www.sidespor.no/lop/lillomarka-rundt',
        useCalculatedStats: true,
        category: '50k',
        date: '2026-10-25'
    },
    {
        name: 'Flyktningeruta',
        files: ['race-calendar/ØstmarkaTrailChallenge/Flyktningeruta_2025.gpx'],
        color: '#e67e22',
        url: 'https://www.ostmarkatrail.no/flyktningeruta/',
        useCalculatedStats: true,
        category: 'marathon-trail',
        date: '2026-08-26'
    },
    {
        name: 'Endless Shore Ultra',
        files: ['race-calendar/EndlessShores/Endless_Shores_Ultra_Trail_100_miles_2025_FINAL.gpx'],
        color: '#16a085',
        url: 'https://www.endless-shore.no/',
        useCalculatedStats: true,
        category: '100-miles',
        date: '2026-05-23'
    },
    {
        name: 'Sandnes 100 Miles',
        files: ['race-calendar/SandsnesUltraTrail/sandnes100-miles.gpx'],
        color: '#c0392b',
        url: 'https://www.sandnes100miles.no/',
        useCalculatedStats: true,
        category: '100-miles',
        date: '2026-04-17'
    },
    {
        name: 'Lofoten Ultra Trail 100 Miles',
        files: ['race-calendar/LofotenUltraTrail/lofoten-ultra-trail-100-miles.gpx'],
        color: '#2980b9',
        url: 'https://thearctictriple.no/lofoten-ultra-trail-100-miles',
        useCalculatedStats: true,
        category: '100-miles',
        date: '2026-05-28'
    },
    {
        name: 'Lofoten Ultra Trail 50 Miles',
        files: ['race-calendar/LofotenUltraTrail/lofoten-ultra-trail-50-miles.gpx'],
        color: '#5dade2',
        url: 'https://thearctictriple.no/lofoten-ultra-trail-50-miles',
        useCalculatedStats: true,
        category: '50-miles',
        date: '2026-05-28'
    },
    {
        name: 'Lofoten Ultra Trail 48K',
        files: ['race-calendar/LofotenUltraTrail/lofoten-ultra-trail-48km.gpx'],
        color: '#85c1e9',
        url: 'https://thearctictriple.no/lofoten-ultra-trail-48-km',
        useCalculatedStats: true,
        category: '50k',
        date: '2026-05-28'
    },
    {
        name: 'MMC 100 Miles',
        files: ['race-calendar/MeråkerMountainChallenge/MMC_100M.gpx'],
        color: '#8e44ad',
        url: 'https://mmctrail.no/100m',
        useCalculatedStats: true,
        category: '100-miles',
        date: '2026-08-01'
    },
    {
        name: 'MMC 100K',
        files: ['race-calendar/MeråkerMountainChallenge/MMC_100K.gpx'],
        color: '#a569bd',
        url: 'https://mmctrail.no/100k',
        useCalculatedStats: true,
        category: '100k',
        date: '2026-08-01'
    },
    {
        name: 'MMC 70K',
        files: ['race-calendar/MeråkerMountainChallenge/MMC_70K.gpx'],
        color: '#bb8fce',
        url: 'https://mmctrail.no/70k',
        useCalculatedStats: true,
        category: '50-miles',
        date: '2026-08-01'
    },
    {
        name: 'Hardangerjøkulen Ultra 95K',
        files: ['race-calendar/HardangerjøkulenUltra/hardangerjokulen-ultra-95k.gpx'],
        color: '#27ae60',
        url: 'https://xtremeidfjord.no/hardangerjokulen-ultra/',
        useCalculatedStats: true,
        category: '100k',
        date: '2026-07-11'
    },
    {
        name: 'Hardangerjøkulen Ultra 34K',
        files: ['race-calendar/HardangerjøkulenUltra/hardangerjokulen-ultra-34k.gpx'],
        color: '#58d68d',
        url: 'https://xtremeidfjord.no/hardangerjokulen-ultra/',
        useCalculatedStats: true,
        category: 'marathon-trail',
        date: '2026-07-11'
    },
    {
        name: 'Oslo Trail Challenge 200K',
        files: [
            'race-calendar/OsloTrailChallenge/OTC_200K_First_Half.gpx',
            'race-calendar/OsloTrailChallenge/OTC_100K.gpx'
        ],
        color: '#d35400',
        url: 'https://langtoglenge.org/en/events_en/otc_en.html',
        useCalculatedStats: true,
        category: '100-miles-plus',
        date: '2026-09-20'
    },
    {
        name: 'Oslo Trail Challenge 100K',
        files: ['race-calendar/OsloTrailChallenge/OTC_100K.gpx'],
        color: '#dc7633',
        url: 'https://langtoglenge.org/en/events_en/otc_en.html',
        useCalculatedStats: true,
        category: '100k',
        date: '2026-09-27'
    },
    {
        name: 'Oslo Trail Challenge 55K',
        files: ['race-calendar/OsloTrailChallenge/OTC_2024_55K_FINAL.gpx'],
        color: '#f0b27a',
        url: 'https://langtoglenge.org/en/events_en/otc_en.html',
        useCalculatedStats: true,
        category: '50k',
        date: '2026-09-27'
    },
    {
        name: 'Lustrafjorden Inn Ultra 100',
        files: ['race-calendar/LustrafjordenInn/Lustrafjorden_Inn_2024_Ultra100.gpx'],
        color: '#1a5276',
        url: 'https://www.lustrafjordeninn.no/',
        useCalculatedStats: true,
        category: '100k',
        date: '2026-08-14'
    },
    {
        name: 'Hornindal Rundt 75K',
        files: ['race-calendar/HornindalRundt/HornindalRundt75K.gpx'],
        color: '#7d3c98',
        url: 'https://hornindalrundt.no/',
        useCalculatedStats: true,
        category: '50-miles',
        date: '2026-07-04'
    },
    {
        name: 'Dynafit Hardangervidda Maraton 43K',
        files: ['race-calendar/HardangerviddaMaraton/hardangervidda-marathon-43k.gpx'],
        color: '#d4ac0d',
        url: 'https://xtremeidfjord.no/hardangerjokulen-ultra/',
        useCalculatedStats: true,
        category: 'marathon-trail',
        date: '2026-08-29'
    },
    {
        name: 'Nøsen 50K',
        files: ['race-calendar/Nøsen/Nosen_50km.gpx'],
        color: '#cb4335',
        url: 'https://www.nosenhundreds.com/50km',
        useCalculatedStats: true,
        category: '50k',
        date: '2026-06-14'
    },
    {
        name: 'KRSUltra 60',
        files: ['race-calendar/KRSUltra/krsultra-60k-2025-v1.gpx'],
        color: '#e55039',
        url: 'https://www.krsultra.no/lop/krsultra-60',
        useCalculatedStats: true,
        category: '50k',
        date: '2026-04-11'
    },
    {
        name: 'Skogvokteren',
        files: ['race-calendar/Skogvokteren/Skogvokteren_2025.gpx'],
        color: '#2d6a4f',
        url: 'https://grenlandultrarunners.no/skogvokteren-ultra-2/',
        useCalculatedStats: true,
        category: '50-miles',
        date: '2026-05-02'
    },
    {
        name: 'Ecotrail Oslo 80K',
        files: ['race-calendar/ecotrail/ecotrail_oslo_80km_2026.gpx'],
        color: '#40916c',
        url: 'https://oslo.ecotrail.com/en/race-ecotrail-oslo/trail-80-km',
        useCalculatedStats: true,
        category: '50-miles',
        date: '2026-05-30'
    },
    {
        name: 'Ecotrail Oslo 50K',
        files: ['race-calendar/ecotrail/ecotrail_oslo_50km_2026.gpx'],
        color: '#74c69d',
        url: 'https://oslo.ecotrail.com/en/race-ecotrail-oslo/trail-80-km',
        useCalculatedStats: true,
        category: '50k',
        date: '2026-05-30'
    },
    {
        name: 'Sognefjord Trail Run 50K',
        files: ['race-calendar/SognefjordTrail/STR+50K+2026.gpx'],
        color: '#0077b6',
        url: 'https://www.sognefjordtrailrun.com/50k',
        useCalculatedStats: true,
        category: '50k',
        date: '2026-06-06'
    },
    {
        name: 'Vestfold Historic Ultra 147K',
        files: ['race-calendar/VestfoldHistoricUltra/VHUT_2025_147km.gpx'],
        color: '#6930c3',
        url: 'https://www.vhut.no/loyper/',
        useCalculatedStats: true,
        category: '100-miles',
        date: '2026-05-18'
    },
    {
        name: 'Vestfold Historic Ultra 87K',
        files: ['race-calendar/VestfoldHistoricUltra/VHUT_2025_87km.gpx'],
        color: '#7400b8',
        url: 'https://www.vhut.no/loyper/',
        useCalculatedStats: true,
        category: '50-miles',
        date: '2026-05-18'
    },
    {
        name: 'Vestfold Historic Ultra 50K',
        files: ['race-calendar/VestfoldHistoricUltra/VHUT_2025_50km.gpx'],
        color: '#9d4edd',
        url: 'https://www.vhut.no/loyper/',
        useCalculatedStats: true,
        category: '50k',
        date: '2026-05-18'
    },
    {
        name: 'Jotunheimen Trail Run',
        files: ['race-calendar/JotunheimenTrail/JTR+ULTRA+2026.gpx'],
        color: '#023e8a',
        url: 'https://www.jotunheimentrailrun.com/',
        useCalculatedStats: true,
        category: '50-miles',
        date: '2026-07-31'
    },
    {
        name: 'Bodøryggen Ultra',
        files: ['race-calendar/Bodøryggen/Bodoryggen_2025_ultra.gpx'],
        color: '#00b4d8',
        url: 'https://bodorunfestival.no/bodoryggen/',
        useCalculatedStats: true,
        category: 'marathon-trail',
        date: '2026-08-01'
    },
    {
        name: 'Stranda Fjord Trail 55K',
        files: ['race-calendar/StrandaFjordTrail/55k.gpx'],
        color: '#ff6d00',
        url: 'https://strandafjordtrailrace.com/',
        useCalculatedStats: true,
        category: '50k',
        date: '2026-08-12'
    },
    {
        name: 'Stranda Fjord Trail 95K',
        files: ['race-calendar/StrandaFjordTrail/95K.gpx'],
        color: '#ff9500',
        url: 'https://strandafjordtrailrace.com/',
        useCalculatedStats: true,
        category: '100k',
        date: '2026-08-12'
    },
    {
        name: 'Trollheimen Ultra 100K',
        files: ['race-calendar/TrollheimenUltra/trollheimen-ultra-trip.gpx'],
        color: '#6a040f',
        url: 'https://trollheimenultra100km.webnode.page/',
        useCalculatedStats: true,
        category: '100k',
        date: '2026-08-15'
    },
    {
        name: 'Tromsø Mountain Challenge 50K',
        files: ['race-calendar/TromsøMountainChallenge/TMC_Ultra_50km_2025.gpx'],
        color: '#4cc9f0',
        url: 'https://msm.no/en/mountain-challenge/loypekart-tromso-mountain-challenge/',
        useCalculatedStats: true,
        category: '50k',
        date: '2026-08-22'
    },
    {
        name: 'Blefjell Troll 57K',
        files: ['race-calendar/Blefjell/BB_01_Troll_4.gpx'],
        color: '#5c4033',
        url: 'https://blefjellsbeste.com/',
        useCalculatedStats: true,
        category: '50k',
        date: '2026-07-24'
    },
    {
        name: 'Blefjell Storetroll 96K',
        files: [
            'race-calendar/Blefjell/BB_01_Troll_4.gpx',
            'race-calendar/Blefjell/BB_02_Tusser_3.gpx',
            'race-calendar/Blefjell/BB_10K_Smatusser.gpx',
            'race-calendar/Blefjell/BB_05K_Smatroll.gpx'
        ],
        color: '#3d2817',
        url: 'https://blefjellsbeste.com/',
        useCalculatedStats: true,
        category: '100k',
        date: '2026-07-24'
    }
];

// Month names in Norwegian
const monthNames = ['Januar', 'Februar', 'Mars', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Desember'];

// Current month filter (null = show all)
let currentMonthFilter = null;

// Current category filter (null = show all)
let currentCategoryFilter = null;

// Format date for display
function formatDate(dateStr) {
    const date = new Date(dateStr);
    const day = date.getDate();
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    return `${day}. ${month} ${year}`;
}

// Apply both month and category filters
function applyFilters() {
    raceRoutes.forEach(race => {
        const raceMonth = new Date(race.date).getMonth();
        const matchesMonth = currentMonthFilter === null || raceMonth === currentMonthFilter;
        const matchesCategory = currentCategoryFilter === null || race.category === currentCategoryFilter;
        const shouldShow = matchesMonth && matchesCategory;

        if (shouldShow && !map.hasLayer(raceLayers[race.name])) {
            map.addLayer(raceLayers[race.name]);
            layerStates[race.name] = true;
        } else if (!shouldShow && map.hasLayer(raceLayers[race.name])) {
            map.removeLayer(raceLayers[race.name]);
            layerStates[race.name] = false;
        }

        // Update checkbox state
        const checkbox = document.querySelector(`.toggle-race[data-race="${race.name}"]`);
        if (checkbox) checkbox.checked = shouldShow;
    });
}

// Filter races by month
function filterByMonth(month) {
    currentMonthFilter = month;
    applyFilters();
}

// Filter races by category
function filterByCategory(category) {
    currentCategoryFilter = category;
    applyFilters();
}

// Track layer groups for each race
const raceLayers = {};
const layerStates = {};
const racePolylines = {}; // track polylines per race for highlight/dim

// Initialize individual race states
raceRoutes.forEach(race => {
    layerStates[race.name] = true;
    raceLayers[race.name] = L.layerGroup().addTo(map);
});

// Load GPX files and add to map
async function loadRaces() {
    console.log('Loading races');

    for (const race of raceRoutes) {
        try {
            const allCoordinates = [];
            let totalDistance = 0;
            let totalElevationGain = 0;

            // Load all GPX segments for this race
            for (const gpxFile of race.files) {
                const response = await fetch(gpxFile);
                const gpxText = await response.text();
                const geoJSON = parseGPXToGeoJSON(gpxText);

                if (geoJSON.features && geoJSON.features.length > 0) {
                    const feature = geoJSON.features[0];
                    const coords = feature.geometry.coordinates;

                    // Convert to Leaflet format [lat, lng]
                    const leafletCoords = coords.map(c => [c[1], c[0]]);
                    allCoordinates.push(leafletCoords);

                    // Accumulate statistics
                    totalDistance += feature.properties.distance || 0;
                    totalElevationGain += feature.properties.elevationGain || 0;
                }
            }

            // Use manual stats if provided, otherwise use calculated
            const finalDistance = race.manualDistance !== undefined ? race.manualDistance : totalDistance;
            const finalElevation = race.manualElevation !== undefined ? race.manualElevation : totalElevationGain;

            // Create polyline for each segment
            if (!racePolylines[race.name]) racePolylines[race.name] = [];

            allCoordinates.forEach(coords => {
                const polyline = L.polyline(coords, {
                    color: race.color,
                    weight: 3,
                    opacity: 0.8
                });

                racePolylines[race.name].push(polyline);

                // Build download links for GPX files
                const downloadLinks = race.files.map((file, index) => {
                    const fileName = file.split('/').pop();
                    const githubUrl = `https://raw.githubusercontent.com/erisnar/Stikart/main/${encodeURI(file)}`;
                    const label = race.files.length > 1 ? `GPX ${index + 1}` : 'Last ned GPX';
                    return `<a href="#" onclick="downloadGpx('${githubUrl}', '${fileName}'); return false;" class="race-download-link">${label}</a>`;
                }).join(' ');

                // Add popup with race info
                const popupHTML = `
                    <div class="race-popup">
                        <h3>${race.name}</h3>
                        <div class="race-details">
                            <div><strong>Dato:</strong> ${formatDate(race.date)}</div>
                            <div><strong>Distanse:</strong> ${finalDistance.toFixed(1)} km</div>
                            <div><strong>Høydemeter:</strong> ${finalElevation} m</div>
                            <div><strong>GPX:</strong> ${downloadLinks}</div>
                        </div>
                        <p class="race-disclaimer">⚠️ Løyper kan endres. Bruk alltid siste versjon fra arrangørens nettside.</p>
                        <a href="${race.url}" target="_blank" rel="noopener noreferrer" class="race-link">
                            Besøk nettside →
                        </a>
                    </div>
                `;

                polyline.bindPopup(popupHTML);

                // Grey out other routes when popup opens
                polyline.on('popupopen', () => {
                    highlightRace(race.name);
                });
                polyline.on('popupclose', () => {
                    resetRaceStyles();
                });

                polyline.addTo(raceLayers[race.name]);
            });

            console.log(`Loaded race: ${race.name} (${race.files.length} segments)`);
        } catch (error) {
            console.error(`Error loading ${race.name}:`, error);
        }
    }
}

// Highlight a specific race and grey out all others
function highlightRace(activeName) {
    for (const [name, polylines] of Object.entries(racePolylines)) {
        polylines.forEach(pl => {
            if (name === activeName) {
                pl.setStyle({ opacity: 1, weight: 5 });
                pl.bringToFront();
            } else {
                pl.setStyle({ opacity: 0.15, weight: 2 });
            }
        });
    }
}

// Reset all race styles back to normal
function resetRaceStyles() {
    for (const [name, polylines] of Object.entries(racePolylines)) {
        const race = raceRoutes.find(r => r.name === name);
        polylines.forEach(pl => {
            pl.setStyle({ color: race.color, opacity: 0.8, weight: 3 });
        });
    }
}

// Custom layer control (base map only)
L.Control.CustomLayers = L.Control.extend({
    onAdd: function(map) {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control layer-control-container');

        container.innerHTML = `
            <button id="layer-toggle-btn" class="layer-control-btn" title="Kartlag">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 2L2 6l8 4 8-4-8-4z"/>
                    <path d="M2 10l8 4 8-4M2 14l8 4 8-4" opacity="0.6"/>
                </svg>
            </button>
            <div id="layer-dropdown" class="layer-dropdown" style="display: none;">
                <div class="layer-dropdown-header">Kartlag</div>
                <div class="layer-section">
                    <label class="layer-checkbox-item">
                        <input type="radio" name="base-layer" value="kartverket" checked>
                        <span>Norgeskart</span>
                    </label>
                    <label class="layer-checkbox-item">
                        <input type="radio" name="base-layer" value="osm">
                        <span>OpenStreetMap</span>
                    </label>
                </div>
            </div>
        `;

        // Prevent map clicks when interacting with control
        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.disableScrollPropagation(container);

        // Toggle dropdown
        const toggleBtn = container.querySelector('#layer-toggle-btn');
        const dropdown = container.querySelector('#layer-dropdown');

        toggleBtn.onclick = (e) => {
            e.stopPropagation();
            const isVisible = dropdown.style.display !== 'none';
            dropdown.style.display = isVisible ? 'none' : 'block';
            toggleBtn.classList.toggle('active', !isVisible);
        };

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!container.contains(e.target)) {
                dropdown.style.display = 'none';
                toggleBtn.classList.remove('active');
            }
        });

        // Toggle base layers
        container.querySelectorAll('input[name="base-layer"]').forEach(radio => {
            radio.onchange = (e) => {
                map.removeLayer(osmLayer);
                map.removeLayer(kartverketLayer);

                if (e.target.value === 'osm') {
                    map.addLayer(osmLayer);
                } else if (e.target.value === 'kartverket') {
                    map.addLayer(kartverketLayer);
                }
            };
        });

        return container;
    }
});

// Add the custom layer control to the map
map.addControl(new L.Control.CustomLayers(), { position: 'topright' });

// Add zoom control to top right
map.zoomControl.setPosition('topright');

// Load all data
regenerateColors(); // Randomize colors on startup
loadRaces();
