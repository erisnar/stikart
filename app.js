// Touch device detection
const isTouchDevice = (function() {
    return (
        ('ontouchstart' in window) ||
        (navigator.maxTouchPoints > 0) ||
        (navigator.msMaxTouchPoints > 0) ||
        (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
    );
})();

function slugify(name) {
    return name
        .toLowerCase()
        .replace(/æ/g, 'ae').replace(/ø/g, 'oe').replace(/å/g, 'aa')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

function raceBySlug(slug) {
    return raceRoutes.find(r => slugify(r.name) === slug) || null;
}

// Info overlay functions
function showInfoOverlay() {
    document.getElementById('info-overlay').classList.remove('hidden');
    const el = document.getElementById('visit-count');
    if (el && !el.dataset.loaded) {
        fetch('https://stikart.goatcounter.com/counter/TOTAL.json')
            .then(r => r.json())
            .then(data => {
                el.textContent = 'Antall besøk på stikart.no: ' + data.count;
                el.dataset.loaded = '1';
            })
            .catch(() => { el.textContent = ''; });
    }
}

function closeInfoOverlay() {
    document.getElementById('info-overlay').classList.add('hidden');
}

// Close info overlay when clicking outside
document.addEventListener('click', (e) => {
    const overlay = document.getElementById('info-overlay');
    if (e.target === overlay) {
        closeInfoOverlay();
    }
});

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

// Pool of dark + vibrant saturated colors (no pale greens/blues)
const darkColorPool = [
    '#e63946', '#d62828', '#9b2335', '#c1121f', '#ff006e',
    '#f72585', '#b5179e', '#e91e63', '#c2185b', '#ad1457',
    '#e76f51', '#f4a261', '#fb5607', '#ff5400', '#e65100',
    '#ff6d00', '#f57c00', '#ef6c00', '#d84315', '#bf360c',
    '#8338ec', '#7209b7', '#6a1b9a', '#4a148c', '#311b92',
    '#5e35b1', '#512da8', '#4527a0', '#7c4dff', '#651fff',
    '#0d47a1', '#1565c0', '#1976d2', '#1e88e5', '#0277bd',
    '#01579b', '#023e8a', '#0353a4', '#3a86ff', '#4361ee',
    '#1b5e20', '#2e7d32', '#388e3c', '#087f5b', '#0b7285',
    '#5d4037', '#4e342e', '#6d4c41', '#795548', '#8d6e63'
];

// Shuffle array (Fisher-Yates)
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Generate a random dark color from the pool (used for single color changes)
function getRandomColor() {
    return darkColorPool[Math.floor(Math.random() * darkColorPool.length)];
}

// Regenerate colors for all race routes with unique colors
function regenerateColors() {
    const shuffledColors = shuffleArray(darkColorPool);
    raceRoutes.forEach((race, index) => {
        race.color = shuffledColors[index % shuffledColors.length];
    });

    // Update polyline colors on the map
    for (const [name, polylines] of Object.entries(racePolylines)) {
        const race = raceRoutes.find(r => r.name === name);
        if (race) {
            polylines.forEach(pl => {
                pl.setStyle({ color: race.color });
            });
            (raceDecorators[name] || []).forEach(dec => {
                dec.setPatterns(makeArrowPattern(race.color, 0));
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

// Add default layer - OpenStreetMap
osmLayer.addTo(map);

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
        date: '2026-06-20'
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
        date: '2026-05-30',
        checkpoints: [
            { name: 'CP1 Drammen', lat: 59.740395, lng: 10.214029 },
            { name: 'CP2 Sande', lat: 59.587464, lng: 10.210863 },
            { name: 'CP3 Hengsrød', lat: 59.393109, lng: 10.308104 },
            { name: 'CP4 Teie', lat: 59.249809, lng: 10.400786 },
        ]
    },
    {
        name: 'Nøsen Hundreds',
        files: ['race-calendar/Nøsen/Nosen_100.gpx'],
        color: '#e74c3c',
        url: 'https://www.nosenhundreds.com/',
        useCalculatedStats: true,
        category: '100k',
        date: '2026-06-13',
        checkpoints: [
            { name: 'Syndinstøga', km: 42 },
            { name: 'Pikkhaug', km: 72 },
        ]
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
        date: '2026-05-23',
        checkpoints: [
            { name: 'Heyerdalbukta, Jeløy', km: 25 },
            { name: 'Brevikbukta', km: 52 },
            { name: 'Sogsti Skole, Drøbak', km: 80 },
            { name: 'Digerud, Nesodden', km: 103 },
            { name: 'Dal, Frogn', km: 117 },
            { name: 'Alværn, Nesodden', km: 143 },
        ]
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
        date: '2026-08-14',
        checkpoints: [
            { name: 'Solvorn', km: 31.5 },
            { name: 'Gaupne', km: 54 },
            { name: 'Luster', km: 77.5 },
        ]
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
        date: '2026-06-14',
        checkpoints: [
            { name: 'Syndinstøga', km: 27 },
            { name: 'Grønsenstølane', km: 40 },
        ]
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
        date: '2026-05-30',
        checkpoints: [
            { name: 'Maridalen Kirke', km: 13 },
            { name: 'Holmenkollen', km: 32 },
            { name: 'Sørkedalen', km: 51 },
            { name: 'Fossum', km: 61 },
            { name: 'Thaugland', km: 73 },
        ]
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
        files: ['race-calendar/Bodoryggen/Bodoryggen_2025_ultra.gpx'],
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
        files: ['race-calendar/TromsoMountainChallenge/TMC_Ultra_50km_2025.gpx'],
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
        const matchesSearch = !currentSearchFilter || race.name.toLowerCase().includes(currentSearchFilter);
        const shouldShow = matchesMonth && matchesCategory && matchesSearch;

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
    document.getElementById('month-filter-btn').classList.toggle('active', month !== null);
    applyFilters();
}

// Filter races by category
function filterByCategory(category) {
    currentCategoryFilter = category;
    document.getElementById('category-filter-btn').classList.toggle('active', category !== null);
    applyFilters();
}

let currentSearchFilter = null;

function filterBySearch(value) {
    const trimmed = value.trim().toLowerCase();
    currentSearchFilter = trimmed || null;
    const clearBtn = document.getElementById('search-clear-btn');
    if (clearBtn) clearBtn.style.display = trimmed ? 'inline' : 'none';
    applyFilters();
}

function clearSearch() {
    currentSearchFilter = null;
    const input = document.getElementById('search-input');
    if (input) input.value = '';
    const clearBtn = document.getElementById('search-clear-btn');
    if (clearBtn) clearBtn.style.display = 'none';
    applyFilters();
}

// Track layer groups for each race
const raceLayers = {};
const layerStates = {};
const racePolylines = {}; // track polylines per race for highlight/dim
const hitAreaPolylines = {}; // invisible wider polylines for touch
const raceDecorators = {}; // directional arrow decorators
const raceMarkers = {}; // start/finish markers per race
let activeCheckpointMarkers = []; // checkpoint markers for the highlighted race
const raceElevationData = {};
const raceChartMeta = {};

const startIcon = L.divIcon({
    className: '',
    html: '<div class="track-marker track-marker-start">S</div>',
    iconSize: [22, 22],
    iconAnchor: [11, 11]
});

const finishIcon = L.divIcon({
    className: '',
    html: '<div class="track-marker track-marker-finish"></div>',
    iconSize: [22, 22],
    iconAnchor: [11, 11]
});

function makeArrowPattern(color, opacity) {
    return [{
        repeat: 300,
        symbol: L.Symbol.arrowHead({
            pixelSize: 18,
            polygon: true,
            pathOptions: { stroke: true, fill: true, color: '#000', fillColor: color, fillOpacity: opacity, opacity, weight: 1 }
        })
    }];
}

// Initialize individual race states
raceRoutes.forEach(race => {
    layerStates[race.name] = true;
    raceLayers[race.name] = L.layerGroup().addTo(map);
});

function buildElevationProfile(coords, offsetKm) {
    // coords is [lon, lat, ele] format
    const points = [];
    let cumKm = offsetKm || 0;
    for (let i = 0; i < coords.length; i++) {
        if (i > 0) cumKm += haversineKm(coords[i-1][1], coords[i-1][0], coords[i][1], coords[i][0]);
        if (coords[i][2] !== null && coords[i][2] !== undefined) {
            points.push({ km: cumKm, ele: coords[i][2] });
        }
    }
    return { points, totalKm: cumKm };
}

function renderElevationChart(elevPoints, color, raceName, checkpoints) {
    if (!elevPoints || elevPoints.length < 2) return '';

    const n = Math.min(elevPoints.length, 250);
    const step = (elevPoints.length - 1) / (n - 1);
    const sampled = Array.from({ length: n }, (_, i) => elevPoints[Math.round(i * step)]);

    const totalKm = sampled[sampled.length - 1].km;
    if (!totalKm) return '';

    const eles = sampled.map(p => p.ele);
    const minEle = Math.min(...eles);
    const maxEle = Math.max(...eles);
    const eleRange = maxEle - minEle || 1;

    if (raceName) raceChartMeta[raceName] = { totalKm, minEle, eleRange };

    const W = 300, H = 64;
    const padL = 36, padR = 4, padT = 4, padB = 16;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;

    const toX = km => padL + (km / totalKm) * chartW;
    const toY = ele => padT + (1 - (ele - minEle) / eleRange) * chartH;

    const pts = sampled.map(p => `${toX(p.km).toFixed(1)},${toY(p.ele).toFixed(1)}`);
    const bottom = (padT + chartH).toFixed(1);
    const pathD = `M ${pts.join(' L ')} L ${toX(totalKm).toFixed(1)},${bottom} L ${padL},${bottom} Z`;

    const cpLines = resolveCheckpoints(checkpoints, raceName)
        .filter(cp => cp.km > 0)
        .map(cp => {
            const x = Math.min(toX(cp.km), padL + chartW).toFixed(1);
            const base = padT + chartH;
            return `<line x1="${x}" y1="${padT + 4}" x2="${x}" y2="${base}" stroke="rgba(255,255,255,0.7)" stroke-width="2"/>
                    <line x1="${x}" y1="${padT + 4}" x2="${x}" y2="${base}" stroke="rgba(0,0,0,0.45)" stroke-width="1" stroke-dasharray="3,2"/>
                    <circle cx="${x}" cy="${padT + 4}" r="2.5" fill="#444" stroke="white" stroke-width="1"/>
                    <line x1="${x}" y1="${base}" x2="${x}" y2="${base + 5}" stroke="#444" stroke-width="2"/>`;
        }).join('');

    return `<div class="elevation-chart-wrapper">
        <svg viewBox="0 0 ${W} ${H}" class="elevation-chart" xmlns="http://www.w3.org/2000/svg">
            <path d="${pathD}" fill="${color}" fill-opacity="0.2" stroke="${color}" stroke-width="1.5" stroke-linejoin="round"/>
            ${cpLines}
            <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + chartH}" stroke="#ddd" stroke-width="0.5"/>
            <line x1="${padL}" y1="${padT + chartH}" x2="${padL + chartW}" y2="${padT + chartH}" stroke="#ddd" stroke-width="0.5"/>
            <text x="${padL - 3}" y="${padT + 8}" text-anchor="end" font-size="8" fill="#888">${Math.round(maxEle)}m</text>
            <text x="${padL - 3}" y="${padT + chartH}" text-anchor="end" font-size="8" fill="#888">${Math.round(minEle)}m</text>
            <text x="${padL}" y="${H - 2}" text-anchor="start" font-size="8" fill="#aaa">0</text>
            <text x="${padL + chartW}" y="${H - 2}" text-anchor="end" font-size="8" fill="#aaa">${Math.round(totalKm)}km</text>
            <line id="elev-cursor" x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + chartH}" stroke="#333" stroke-width="1" stroke-dasharray="2,1" opacity="0" pointer-events="none"/>
            <circle id="elev-dot" cx="${padL}" cy="${padT + chartH / 2}" r="3" fill="#111" stroke="white" stroke-width="1.5" opacity="0" pointer-events="none"/>
        </svg>
    </div>`;
}

// ── Pace planner ──────────────────────────────────────────────────────────────

function gradeFactor(gradePct) {
    if (gradePct >= 0) {
        return 1 + 0.033 * gradePct;
    }
    const g = Math.abs(gradePct);
    return g <= 20 ? 1 - 0.015 * g : 0.7 + 0.01 * (g - 20);
}

function calcCheckpointSplits(raceName, checkpoints, targetMinutes) {
    const elevPoints = raceElevationData[raceName];
    if (!elevPoints || elevPoints.length < 2) return null;

    // Build waypoints: start + checkpoints + finish
    const totalKm = elevPoints[elevPoints.length - 1].km;
    const waypoints = [
        { name: 'Start', km: 0 },
        ...resolveCheckpoints(checkpoints, raceName)
            .filter(cp => cp.km > 0)
            .map(cp => ({ ...cp, km: Math.min(cp.km, totalKm) })),
        { name: 'Mål', km: totalKm }
    ];

    // For each inter-waypoint segment, sum grade-adjusted effort
    function effortForSegment(fromKm, toKm) {
        let effort = 0;
        for (let i = 1; i < elevPoints.length; i++) {
            const p0 = elevPoints[i - 1], p1 = elevPoints[i];
            if (p1.km <= fromKm || p0.km >= toKm) continue;
            const segKm = Math.min(p1.km, toKm) - Math.max(p0.km, fromKm);
            if (segKm <= 0) continue;
            const rise = p1.ele - p0.ele;
            const horiz = (p1.km - p0.km) * 1000;
            const grade = horiz > 0 ? (rise / horiz) * 100 : 0;
            effort += segKm * gradeFactor(grade);
        }
        return effort;
    }

    // Total effort across whole course
    const totalEffort = effortForSegment(0, totalKm);
    if (totalEffort === 0) return null;

    // Elevation gain per segment
    function eleGainForSegment(fromKm, toKm) {
        let gain = 0;
        for (let i = 1; i < elevPoints.length; i++) {
            const p0 = elevPoints[i - 1], p1 = elevPoints[i];
            if (p1.km <= fromKm || p0.km >= toKm) continue;
            const rise = p1.ele - p0.ele;
            if (rise > 0) gain += rise;
        }
        return Math.round(gain);
    }

    let cumMinutes = 0;
    const splits = waypoints.map((wp, i) => {
        if (i === 0) return { ...wp, arrivalMinutes: 0, segmentMinutes: 0, eleGain: 0 };
        const prev = waypoints[i - 1];
        const segEffort = effortForSegment(prev.km, wp.km);
        const segMinutes = (segEffort / totalEffort) * targetMinutes;
        const eleGain = eleGainForSegment(prev.km, wp.km);
        cumMinutes += segMinutes;
        return { ...wp, arrivalMinutes: cumMinutes, segmentMinutes: segMinutes, eleGain };
    });

    return splits;
}

function fmtTime(minutes) {
    let h = Math.floor(minutes / 60);
    let m = Math.round(minutes % 60);
    if (m === 60) { h += 1; m = 0; }
    return h > 0 ? `${h}t ${m.toString().padStart(2, '0')}m` : `${m}m`;
}

function fmtPace(segKm, segMinutes) {
    if (segKm <= 0) return '–';
    const minkm = segMinutes / segKm;
    const m = Math.floor(minkm);
    const s = Math.round((minkm - m) * 60);
    return `${m}:${s.toString().padStart(2, '0')}/km`;
}

const PACE_DESC = 'Splittider beregnes basert på løypeprofil og stigningsgrad. Teknisk terreng med mye stigning gir lavere fart. Posisjoner for checkpoints er ikke presise.';

// Resolve checkpoints: convert {lat,lng} entries to {km} using nearest point on route
function resolveCheckpoints(checkpoints, raceName) {
    if (!checkpoints || checkpoints.length === 0) return [];
    const routePoints = buildRoutePoints(raceName);
    return checkpoints.map(cp => {
        if (cp.km !== undefined) return cp;
        if (cp.lat !== undefined && cp.lng !== undefined && routePoints && routePoints.length > 0) {
            const nearest = nearestOnRoute(routePoints, cp.lat, cp.lng);
            return { name: cp.name, km: nearest.km };
        }
        return null;
    }).filter(Boolean);
}

function renderPacePlanner(race) {
    if (!race.checkpoints || race.checkpoints.length === 0) return '';
    if (!raceElevationData[race.name] || raceElevationData[race.name].length < 2) return '';

    if (isTouchDevice) {
        return `<button class="pace-planner-btn" onclick="openPacePlanner('${race.name.replace(/'/g, "\\'")}')">Beregn pacing →</button>`;
    }

    return `<div class="pace-planner">
        <div class="pace-planner-header">
            <span class="pace-planner-title">Pacing-kalkulator</span>
            <input type="text" class="pace-target-input" id="pace-target-input"
                placeholder="t:mm" maxlength="7"
                oninput="updatePacePlanner()">
        </div>
        <p class="pace-desc">${PACE_DESC}</p>
        <div id="pace-splits-table"><p class="pace-hint">Skriv inn måltid for å se splits</p></div>
    </div>`;
}

let pacePlannerRace = null;

function openPacePlanner(raceName) {
    pacePlannerRace = raceName;
    document.getElementById('pace-overlay-title').textContent = raceName;
    document.getElementById('pace-overlay-input').value = '';
    document.getElementById('pace-overlay-table').innerHTML = `<p class="pace-hint">Skriv inn måltid for å se splits per post</p><p class="pace-desc">${PACE_DESC}</p>`;
    document.getElementById('pace-overlay').classList.remove('hidden');
    setTimeout(() => document.getElementById('pace-overlay-input').focus(), 50);
}

function closePacePlanner() {
    document.getElementById('pace-overlay').classList.add('hidden');
    pacePlannerRace = null;
}

function updatePacePlanner() {
    const input = document.getElementById(isTouchDevice ? 'pace-overlay-input' : 'pace-target-input');
    const tableEl = document.getElementById(isTouchDevice ? 'pace-overlay-table' : 'pace-splits-table');
    if (!input || !tableEl || !pacePlannerRace) return;

    const raw = input.value.trim();
    const matchFull = raw.match(/^(\d+):(\d{1,2})$/);
    const matchHours = raw.match(/^(\d+)$/);
    if (!matchFull && !matchHours) {
        tableEl.innerHTML = raw
            ? '<p class="pace-hint pace-hint-err">Format: t:mm – f.eks. 24:00</p>'
            : '<p class="pace-hint">Skriv inn måltid for å se splits per post</p>';
        return;
    }

    const hours = parseInt(matchFull ? matchFull[1] : matchHours[1]);
    const mins = matchFull ? parseInt(matchFull[2]) : 0;
    if (mins >= 60) { tableEl.innerHTML = '<p class="pace-hint pace-hint-err">Format: t:mm – f.eks. 24:00</p>'; return; }
    const targetMinutes = hours * 60 + mins;

    const race = raceRoutes.find(r => r.name === pacePlannerRace);
    if (!race) return;
    const splits = calcCheckpointSplits(pacePlannerRace, race.checkpoints, targetMinutes);
    if (!splits) return;

    const rows = splits.map((sp, i) => {
        if (i === 0) return '';
        const prev = splits[i - 1];
        const segKm = sp.km - prev.km;
        const pace = fmtPace(segKm, sp.segmentMinutes);
        const isFinish = i === splits.length - 1;
        return `<div class="spl-row${isFinish ? ' spl-row-finish' : ''}">
            <span class="spl-name">${sp.name}</span>
            <span class="spl-arrive">${fmtTime(sp.arrivalMinutes)}</span>
            <span class="spl-meta">${sp.km.toFixed(0)} km · +${sp.eleGain}m · ${pace}</span>
        </div>`;
    }).join('');

    tableEl.innerHTML = `<div class="splits-list">${rows}</div>`;
}

function getLatLngAtKm(routePoints, km) {
    if (!routePoints || routePoints.length === 0) return null;
    let lo = 0, hi = routePoints.length - 1;
    while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (routePoints[mid].cumDist < km) lo = mid + 1;
        else hi = mid;
    }
    if (lo === 0) return routePoints[0];
    const p1 = routePoints[lo - 1], p2 = routePoints[lo];
    const span = p2.cumDist - p1.cumDist;
    const t = span > 0 ? (km - p1.cumDist) / span : 0;
    return { lat: p1.lat + t * (p2.lat - p1.lat), lng: p1.lng + t * (p2.lng - p1.lng) };
}

function getElevAtKm(raceName, km) {
    const pts = raceElevationData[raceName];
    if (!pts || pts.length === 0) return null;
    let lo = 0, hi = pts.length - 1;
    while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (pts[mid].km < km) lo = mid + 1;
        else hi = mid;
    }
    if (lo === 0) return pts[0].ele;
    const p1 = pts[lo - 1], p2 = pts[lo];
    const t = (km - p1.km) / (p2.km - p1.km);
    return p1.ele + t * (p2.ele - p1.ele);
}

function updateElevCursor(raceName, km, visible) {
    const cursor = document.getElementById('elev-cursor');
    const dot = document.getElementById('elev-dot');
    if (!cursor || !dot) return;

    const meta = raceChartMeta[raceName];
    if (!meta || !visible) {
        cursor.setAttribute('opacity', '0');
        dot.setAttribute('opacity', '0');
        return;
    }

    const padL = 36, padR = 4, padT = 4, padB = 16;
    const W = 300, H = 64;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;

    const x = (padL + (km / meta.totalKm) * chartW).toFixed(1);
    cursor.setAttribute('x1', x);
    cursor.setAttribute('x2', x);
    cursor.setAttribute('opacity', '0.5');

    const ele = getElevAtKm(raceName, km);
    if (ele !== null) {
        const y = (padT + (1 - (ele - meta.minEle) / meta.eleRange) * chartH).toFixed(1);
        dot.setAttribute('cx', x);
        dot.setAttribute('cy', y);
        dot.setAttribute('opacity', '1');
    }
}

// Load a single race's GPX files and add to map
async function loadRace(race) {
    try {
        const allCoordinates = [];
        let totalDistance = 0;
        let totalElevationGain = 0;
        if (!raceElevationData[race.name]) raceElevationData[race.name] = [];

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

                // Only build elevation profile for races with sequential segments.
                // Races with manualDistance have non-sequential files (different starting points)
                // and concatenating their coords would give a wrong cumulative distance.
                if (race.useCalculatedStats) {
                    const offsetKm = raceElevationData[race.name].length > 0
                        ? raceElevationData[race.name][raceElevationData[race.name].length - 1].km
                        : 0;
                    const { points } = buildElevationProfile(coords, offsetKm);
                    raceElevationData[race.name].push(...points);
                }
            }
        }

        // Use manual stats if provided, otherwise use calculated
        race.distance = race.manualDistance !== undefined ? race.manualDistance : totalDistance;
        race.elevation = race.manualElevation !== undefined ? race.manualElevation : totalElevationGain;

        // Create polyline for each segment
        if (!racePolylines[race.name]) racePolylines[race.name] = [];

        allCoordinates.forEach(coords => {
            const polyline = L.polyline(coords, {
                color: race.color,
                weight: 3,
                opacity: 0.8,
                interactive: false
            });

            racePolylines[race.name].push(polyline);

            // Add invisible hit area for easier touch/click targeting
            if (!hitAreaPolylines[race.name]) hitAreaPolylines[race.name] = [];
            const hitArea = L.polyline(coords, {
                color: 'transparent',
                weight: 50,
                opacity: 0,
                interactive: true
            });
            hitAreaPolylines[race.name].push(hitArea);
            hitArea.on('click', (e) => {
                L.DomEvent.stopPropagation(e);
                if (selectedRaceName) {
                    closeRaceDetail();
                } else {
                    selectRace(race.name);
                }
            });
            hitArea.addTo(raceLayers[race.name]);

            polyline.addTo(raceLayers[race.name]);

            // Add directional arrow decorator (hidden until track is highlighted)
            if (!raceDecorators[race.name]) raceDecorators[race.name] = [];
            const decorator = L.polylineDecorator(polyline, {
                patterns: makeArrowPattern(race.color, 0)
            });
            raceDecorators[race.name].push(decorator);
            decorator.addTo(raceLayers[race.name]);
        });

        // Add start/finish markers (hidden until highlighted)
        if (allCoordinates.length > 0) {
            const startCoord = allCoordinates[0][0];
            const lastSeg = allCoordinates[allCoordinates.length - 1];
            const finishCoord = lastSeg[lastSeg.length - 1];

            const startMarker = L.marker(startCoord, { icon: startIcon, interactive: false, opacity: 0 });
            const finishMarker = L.marker(finishCoord, { icon: finishIcon, interactive: false, opacity: 0 });
            raceMarkers[race.name] = { start: startMarker, finish: finishMarker };
            startMarker.addTo(raceLayers[race.name]);
            finishMarker.addTo(raceLayers[race.name]);
        }

        console.log(`Loaded race: ${race.name} (${race.files.length} segments)`);
    } catch (error) {
        console.error(`Error loading ${race.name}:`, error);
    }
}

// Load all races, optionally skipping one already loaded
async function loadRaces(skip = null) {
    for (const race of raceRoutes) {
        if (skip && race.name === skip.name) continue;
        await loadRace(race);
    }
}

// ============================================
// DISTANCE DOT FEATURE
// ============================================

let distanceDotMarker = null;
let activeRoutePoints = null;
let dotMapMoveHandler = null;
let chartTouchMarker = null;
let dotFrozen = false;

function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ/2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function buildRoutePoints(raceName) {
    const polylines = racePolylines[raceName];
    if (!polylines) return [];
    const points = [];
    let cumDist = 0;
    let prev = null;
    for (const pl of polylines) {
        for (const ll of pl.getLatLngs()) {
            if (prev) cumDist += haversineKm(prev.lat, prev.lng, ll.lat, ll.lng);
            points.push({ lat: ll.lat, lng: ll.lng, cumDist });
            prev = ll;
        }
    }
    return points;
}

function nearestOnRoute(points, lat, lng) {
    let best = { dist: Infinity, lat: 0, lng: 0, km: 0 };
    for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i], p2 = points[i + 1];
        const dx = p2.lat - p1.lat, dy = p2.lng - p1.lng;
        const lenSq = dx * dx + dy * dy;
        const t = lenSq > 0 ? Math.max(0, Math.min(1, ((lat - p1.lat) * dx + (lng - p1.lng) * dy) / lenSq)) : 0;
        const pLat = p1.lat + t * dx, pLng = p1.lng + t * dy;
        const d = haversineKm(lat, lng, pLat, pLng);
        if (d < best.dist) {
            const segLen = haversineKm(p1.lat, p1.lng, p2.lat, p2.lng);
            best = { dist: d, lat: pLat, lng: pLng, km: p1.cumDist + t * segLen };
        }
    }
    return best;
}

function enableDistanceDot(raceName) {
    disableDistanceDot();
    if (isTouchDevice) return;

    const race = raceRoutes.find(r => r.name === raceName);
    if (!race) return;

    activeRoutePoints = buildRoutePoints(raceName);
    const color = race ? race.color : '#333';

    distanceDotMarker = L.circleMarker([0, 0], {
        radius: 6,
        color: '#fff',
        weight: 2,
        fillColor: color,
        fillOpacity: 0,
        opacity: 0,
        interactive: true
    }).addTo(map);

    distanceDotMarker.bindTooltip('', {
        permanent: true,
        direction: 'top',
        offset: [0, -8],
        className: 'distance-dot-tooltip',
        opacity: 0
    });

    distanceDotMarker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        dotFrozen = !dotFrozen;
        distanceDotMarker.setStyle(dotFrozen
            ? { color: '#e67e22', weight: 3, radius: 8 }
            : { color: '#fff', weight: 2, radius: 6 });
    });

    dotMapMoveHandler = (e) => {
        if (dotFrozen) return;
        const { lat, lng } = e.latlng;
        const nearest = nearestOnRoute(activeRoutePoints, lat, lng);
        // Convert hit area pixel width (~50px) to km at current zoom
        const metersPerPixel = 156543 * Math.cos(lat * Math.PI / 180) / Math.pow(2, map.getZoom());
        const thresholdKm = (50 * metersPerPixel) / 1000;
        const isNear = nearest.dist < thresholdKm;
        if (isNear) {
            distanceDotMarker.setLatLng([nearest.lat, nearest.lng]);
            distanceDotMarker.setStyle({ fillOpacity: 1, opacity: 1 });
            distanceDotMarker.setTooltipContent(`${nearest.km.toFixed(1)} km`);
            distanceDotMarker.getTooltip().setOpacity(1);
        } else {
            distanceDotMarker.setStyle({ fillOpacity: 0, opacity: 0 });
            distanceDotMarker.getTooltip().setOpacity(0);
        }
        updateElevCursor(raceName, nearest.km, isNear);
    };
    map.on('mousemove', dotMapMoveHandler);
}

function disableDistanceDot() {
    dotFrozen = false;
    if (distanceDotMarker) {
        distanceDotMarker.remove();
        distanceDotMarker = null;
    }
    if (dotMapMoveHandler) {
        map.off('mousemove', dotMapMoveHandler);
        dotMapMoveHandler = null;
    }
    activeRoutePoints = null;
    const cursor = document.getElementById('elev-cursor');
    const dot = document.getElementById('elev-dot');
    if (cursor) cursor.setAttribute('opacity', '0');
    if (dot) dot.setAttribute('opacity', '0');
}

function minimizeDetail() {
    document.getElementById('race-detail-overlay').classList.add('minimized');
    const btn = document.getElementById('minimize-detail');
    if (btn) { btn.innerHTML = '&#9650;'; btn.title = 'Utvid'; }
}

function expandDetail() {
    document.getElementById('race-detail-overlay').classList.remove('minimized');
    const btn = document.getElementById('minimize-detail');
    if (btn) { btn.innerHTML = '&#9660;'; btn.title = 'Minimer'; }
}

function enableChartMouse(raceName) {
    const svg = document.querySelector('.elevation-chart');
    if (!svg) return;

    const routePoints = buildRoutePoints(raceName);
    if (!routePoints || routePoints.length === 0) return;

    svg.style.cursor = 'crosshair';

    const handleMove = (e) => {
        if (dotFrozen) return;
        const rect = svg.getBoundingClientRect();
        const svgX = (e.clientX - rect.left) / rect.width * 300;
        const meta = raceChartMeta[raceName];
        if (!meta) return;

        const padL = 36, chartW = 260;
        const km = Math.max(0, Math.min(meta.totalKm, (svgX - padL) / chartW * meta.totalKm));

        updateElevCursor(raceName, km, true);

        const pos = getLatLngAtKm(routePoints, km);
        if (!pos) return;

        if (!chartTouchMarker) {
            chartTouchMarker = L.circleMarker([pos.lat, pos.lng], {
                radius: 8, color: '#fff', weight: 2,
                fillColor: '#111', fillOpacity: 0.85, interactive: false
            }).addTo(map);
            chartTouchMarker.bindTooltip(`${km.toFixed(1)} km`, {
                permanent: true, direction: 'top', offset: [0, -10],
                className: 'distance-dot-tooltip', opacity: 1
            });
        } else {
            chartTouchMarker.setLatLng([pos.lat, pos.lng]);
            chartTouchMarker.setTooltipContent(`${km.toFixed(1)} km`);
        }
    };

    const handleLeave = () => {
        if (dotFrozen) return;
        if (chartTouchMarker) { chartTouchMarker.remove(); chartTouchMarker = null; }
        updateElevCursor(raceName, 0, false);
    };

    const handleClick = (e) => {
        e.stopPropagation();
        dotFrozen = !dotFrozen;
        if (chartTouchMarker) {
            chartTouchMarker.setStyle(dotFrozen
                ? { color: '#e67e22', weight: 3 }
                : { color: '#fff', weight: 2 });
        }
        if (!dotFrozen) {
            if (chartTouchMarker) { chartTouchMarker.remove(); chartTouchMarker = null; }
            updateElevCursor(raceName, 0, false);
        }
    };

    svg.addEventListener('mousemove', handleMove);
    svg.addEventListener('mouseleave', handleLeave);
    svg.addEventListener('click', handleClick);
}

function enableChartTouch(raceName) {
    const svg = document.querySelector('.elevation-chart');
    if (!svg) return;

    const routePoints = buildRoutePoints(raceName);
    if (!routePoints || routePoints.length === 0) return;

    svg.classList.add('chart-interactive');

    let touchStartX = null;

    const handleTouch = (e) => {
        e.preventDefault();
        const touch = e.touches[0] || e.changedTouches[0];
        if (e.type === 'touchstart') {
            touchStartX = touch.clientX;
            if (dotFrozen) {
                dotFrozen = false;
                if (chartTouchMarker) chartTouchMarker.setStyle({ color: '#fff', weight: 2 });
            }
        }
        if (dotFrozen) return;
        const rect = svg.getBoundingClientRect();
        const svgX = (touch.clientX - rect.left) / rect.width * 300;

        const meta = raceChartMeta[raceName];
        if (!meta) return;

        const padL = 36, chartW = 260;
        const km = Math.max(0, Math.min(meta.totalKm, (svgX - padL) / chartW * meta.totalKm));

        updateElevCursor(raceName, km, true);

        const pos = getLatLngAtKm(routePoints, km);
        if (!pos) return;

        if (!chartTouchMarker) {
            chartTouchMarker = L.circleMarker([pos.lat, pos.lng], {
                radius: 8, color: '#fff', weight: 2,
                fillColor: '#111', fillOpacity: 0.85, interactive: false
            }).addTo(map);
            chartTouchMarker.bindTooltip(`${km.toFixed(1)} km`, {
                permanent: true, direction: 'top', offset: [0, -10],
                className: 'distance-dot-tooltip', opacity: 1
            });
        } else {
            chartTouchMarker.setLatLng([pos.lat, pos.lng]);
            chartTouchMarker.setTooltipContent(`${km.toFixed(1)} km`);
        }
    };

    const handleTouchEnd = (e) => {
        const touch = e.changedTouches[0];
        const moved = touchStartX !== null && Math.abs(touch.clientX - touchStartX) > 8;
        if (!moved) {
            // Tap: toggle freeze
            dotFrozen = !dotFrozen;
            if (chartTouchMarker) {
                chartTouchMarker.setStyle(dotFrozen
                    ? { color: '#e67e22', weight: 3 }
                    : { color: '#fff', weight: 2 });
            }
            if (!dotFrozen) {
                if (chartTouchMarker) { chartTouchMarker.remove(); chartTouchMarker = null; }
                updateElevCursor(raceName, 0, false);
            }
            return;
        }
        if (dotFrozen) return;
        // Lock in last scrubbed position
        dotFrozen = true;
        if (chartTouchMarker) chartTouchMarker.setStyle({ color: '#e67e22', weight: 3 });
    };

    svg.addEventListener('touchstart', handleTouch, { passive: false });
    svg.addEventListener('touchmove', handleTouch, { passive: false });
    svg.addEventListener('touchend', handleTouchEnd);
}

// Highlight a specific race and grey out all others
function highlightRace(activeName) {
    for (const [name, polylines] of Object.entries(racePolylines)) {
        const isActive = name === activeName;
        polylines.forEach(pl => {
            if (isActive) {
                pl.setStyle({ opacity: 1, weight: 5 });
                pl.bringToFront();
            } else {
                pl.setStyle({ opacity: 0.15, weight: 2 });
            }
        });
        const race = raceRoutes.find(r => r.name === name);
        (raceDecorators[name] || []).forEach(dec => {
            dec.setPatterns(makeArrowPattern(race.color, 0));
        });
        const markers = raceMarkers[name];
        if (markers) {
            markers.start.setOpacity(isActive ? 1 : 0);
            markers.finish.setOpacity(isActive ? 1 : 0);
        }
    }
    enableDistanceDot(activeName);

    // Add checkpoint markers for the active race
    activeCheckpointMarkers.forEach(m => m.remove());
    activeCheckpointMarkers = [];
    const activeRace = raceRoutes.find(r => r.name === activeName);
    if (activeRace && activeRace.checkpoints && activeRace.checkpoints.length > 0) {
        const routePoints = buildRoutePoints(activeName);
        if (routePoints && routePoints.length > 0) {
            const cpIcon = L.divIcon({
                className: '',
                html: `<svg width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">
                    <polygon points="6,1 11,6 6,11 1,6" fill="#fff" stroke="#333" stroke-width="1.5"/>
                </svg>`,
                iconSize: [12, 12],
                iconAnchor: [6, 6]
            });
            resolveCheckpoints(activeRace.checkpoints, activeName).forEach(cp => {
                const pos = getLatLngAtKm(routePoints, cp.km);
                if (!pos) return;
                const marker = L.marker([pos.lat, pos.lng], { icon: cpIcon, interactive: true }).addTo(map);
                marker.bindTooltip(`${cp.name} (~${cp.km} km)`, {
                    permanent: false, direction: 'top', offset: [0, -6],
                    className: 'distance-dot-tooltip'
                });
                activeCheckpointMarkers.push(marker);
            });
        }
    }
}

// Reset all race styles back to normal
function resetRaceStyles() {
    disableDistanceDot();
    activeCheckpointMarkers.forEach(m => m.remove());
    activeCheckpointMarkers = [];
    for (const [name, polylines] of Object.entries(racePolylines)) {
        const race = raceRoutes.find(r => r.name === name);
        polylines.forEach(pl => {
            pl.setStyle({ color: race.color, opacity: 0.8, weight: 3 });
        });
        (raceDecorators[name] || []).forEach(dec => {
            dec.setPatterns(makeArrowPattern(race.color, 0));
        });
        const markers = raceMarkers[name];
        if (markers) {
            markers.start.setOpacity(0);
            markers.finish.setOpacity(0);
        }
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
                        <input type="radio" name="base-layer" value="kartverket">
                        <span>Norgeskart</span>
                    </label>
                    <label class="layer-checkbox-item">
                        <input type="radio" name="base-layer" value="osm" checked>
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
const params = new URLSearchParams(window.location.search);
const priorityRace = params.get('race') ? raceBySlug(params.get('race')) : null;

if (priorityRace) {
    loadRace(priorityRace).then(() => {
        selectRace(priorityRace.name);
        if (!isTouchDevice) loadRaces(priorityRace);
    });
} else if (!isTouchDevice) {
    loadRaces();
}

// Clicking the map background closes the detail card
map.on('click', () => {
    if (selectedRaceName) closeRaceDetail();
});

// ============================================
// RACE PANEL MODULE
// ============================================

let isPanelExpanded = false;
let selectedRaceName = null;
let isMobile = window.innerWidth <= 768;

function welcomeLoadAll() {
    document.getElementById('mobile-welcome').classList.add('hidden');
    document.getElementById('month-filter-btn').classList.add('visible');
    document.getElementById('category-filter-btn').classList.add('visible');
    loadRaces();
}

function welcomePickFromList() {
    document.getElementById('mobile-welcome').classList.add('hidden');
    isPanelExpanded = true;
    document.getElementById('race-panel').classList.add('expanded');
}

// Initialize race panel
function initRacePanel() {
    const handle = document.getElementById('panel-handle');

    // Click/tap to toggle
    handle.addEventListener('click', togglePanel);

    // Close / minimize detail overlay
    document.getElementById('close-detail').addEventListener('click', closeRaceDetail);
    document.getElementById('minimize-detail').addEventListener('click', () => {
        if (document.getElementById('race-detail-overlay').classList.contains('minimized')) {
            expandDetail();
        } else {
            minimizeDetail();
        }
    });
    document.getElementById('race-detail-overlay').addEventListener('click', (e) => {
        if (e.target.classList.contains('race-detail-overlay')) {
            closeRaceDetail();
        }
    });

    // Handle window resize
    window.addEventListener('resize', debounce(() => {
        isMobile = window.innerWidth <= 768;
        renderRaceList();
    }, 250));

    // On mobile show welcome screen (unless arriving via direct race link)
    if (isTouchDevice && !priorityRace) {
        document.getElementById('mobile-welcome').classList.remove('hidden');
    }

    // Initial render after races load
    setTimeout(renderRaceList, 500);
}

function togglePanel() {
    const panel = document.getElementById('race-panel');
    isPanelExpanded = !isPanelExpanded;
    panel.classList.toggle('expanded', isPanelExpanded);
}

function getVisibleRaces() {
    return raceRoutes.filter(race => {
        const raceMonth = new Date(race.date).getMonth();
        const matchesMonth = currentMonthFilter === null || raceMonth === currentMonthFilter;
        const matchesCategory = currentCategoryFilter === null || race.category === currentCategoryFilter;
        const matchesSearch = !currentSearchFilter || race.name.toLowerCase().includes(currentSearchFilter);
        return matchesMonth && matchesCategory && matchesSearch;
    }).sort((a, b) => new Date(a.date) - new Date(b.date));
}

function renderRaceList() {
    const raceList = document.getElementById('race-list');
    const raceCount = document.getElementById('race-count');
    if (!raceList) return;

    const visibleRaces = getVisibleRaces();
    raceCount.textContent = `Løpskalender`;

    raceList.innerHTML = visibleRaces.map(race => `
        <div class="race-item ${selectedRaceName === race.name ? 'selected' : ''}" data-race="${race.name}">
            <span class="race-color-indicator" style="background-color: ${race.color}"></span>
            <div class="race-item-info">
                <div class="race-item-name">${race.name}</div>
                <div class="race-item-meta">${formatDate(race.date)}</div>
            </div>
        </div>
    `).join('');

    raceList.querySelectorAll('.race-item').forEach(item => {
        item.addEventListener('click', () => {
            selectRace(item.dataset.race);
        });
    });
}

async function selectRace(raceName) {
    const race = raceRoutes.find(r => r.name === raceName);
    if (!race) return;

    selectedRaceName = raceName;

    // Clear search so the panel is ready for the next race selection
    if (currentSearchFilter) clearSearch();

    document.querySelectorAll('.race-item').forEach(item => {
        item.classList.toggle('selected', item.dataset.race === raceName);
    });

    // Close the dropdown
    const panel = document.getElementById('race-panel');
    isPanelExpanded = false;
    panel.classList.remove('expanded');

    history.replaceState(null, '', '?race=' + slugify(raceName));
    if (window.goatcounter && window.goatcounter.count) {
        window.goatcounter.count({ path: '/?race=' + slugify(raceName) });
    }

    // Lazy-load GPX if not yet fetched (mobile)
    const isLoaded = racePolylines[raceName] && racePolylines[raceName].length > 0;
    if (!isLoaded) {
        showRaceDetailOverlay(race, true);
        await loadRace(race);
    }

    highlightRace(raceName);
    panToRace(raceName);
    showRaceDetailOverlay(race);
    positionDetailNearRace();
    if (isTouchDevice) enableChartTouch(raceName);
    else enableChartMouse(raceName);
}

function positionDetailNearRace() {
    if (isTouchDevice) return;

    const overlay = document.getElementById('race-detail-overlay');
    const margin = 16;

    requestAnimationFrame(() => {
        const card = overlay.querySelector('.race-detail-card');
        const cardH = card ? card.offsetHeight : 500;
        const top = Math.max(margin, (window.innerHeight - cardH) / 2);
        overlay.style.left = margin + 'px';
        overlay.style.top = top + 'px';
        overlay.style.bottom = 'auto';
        overlay.style.right = 'auto';
    });
}

function panToRace(raceName) {
    const polylines = racePolylines[raceName];
    if (!polylines || polylines.length === 0) return;

    const bounds = L.latLngBounds([]);
    polylines.forEach(pl => bounds.extend(pl.getBounds()));

    map.fitBounds(bounds, {
        padding: isMobile ? [50, 50] : [100, 100],
        maxZoom: 13
    });
}

function openRacePopup(raceName) {
    const polylines = racePolylines[raceName];
    if (!polylines || polylines.length === 0) return;

    const firstPolyline = polylines[0];
    const center = firstPolyline.getCenter();
    firstPolyline.openPopup(center);
}

function showRaceDetailOverlay(race, loading = false) {
    const overlay = document.getElementById('race-detail-overlay');
    const content = document.getElementById('race-detail-content');

    if (loading) {
        content.innerHTML = `<div class="race-popup"><h3>${race.name}</h3><p class="race-loading">Laster løype…</p></div>`;
        overlay.classList.remove('hidden');
        return;
    }

    const downloadLinks = race.files.map((file, index) => {
        const fileName = file.split('/').pop();
        const githubUrl = `https://raw.githubusercontent.com/erisnar/stikart/main/${encodeURI(file)}`;
        const label = race.files.length > 1 ? `GPX ${index + 1}` : 'Last ned GPX';
        return `<a href="#" onclick="downloadGpx('${githubUrl}', '${fileName}'); return false;" class="race-download-link">${label}</a>`;
    }).join(' ');

    content.innerHTML = `
        <div class="race-popup">
            <h3>${race.name} <span class="popup-color-btn" onclick="changeRaceColor('${race.name}')" title="Endre farge">🎨</span></h3>
            <div class="race-popup-details">
                <div class="race-details">
                    <div><strong>Dato:</strong> ${formatDate(race.date)}</div>
                    <div><strong>Distanse:</strong> ${race.distance ? race.distance.toFixed(1) + ' km' : 'N/A'}</div>
                    <div><strong>Høydemeter:</strong> ${race.elevation ? race.elevation + ' m' : 'N/A'}</div>
                    <div><strong>GPX:</strong> ${downloadLinks}</div>
                </div>
                <div class="race-actions">
                    <a href="${race.url}" target="_blank" rel="noopener noreferrer" class="race-link">
                        Besøk nettside →
                    </a>
                    <button class="race-share-btn" onclick="shareRace('${race.name.replace(/'/g, "\\'")}')">
                        Del løype
                    </button>
                </div>
            </div>
            ${renderElevationChart(raceElevationData[race.name], race.color, race.name, race.checkpoints)}
            ${renderPacePlanner(race)}
        </div>
    `;

    overlay.classList.remove('hidden', 'minimized');
    const minBtn = document.getElementById('minimize-detail');
    if (minBtn) { minBtn.innerHTML = '&#9660;'; minBtn.title = 'Minimer'; }
    if (!isTouchDevice) pacePlannerRace = race.name;
}

function closeRaceDetail() {
    const overlay = document.getElementById('race-detail-overlay');
    overlay.classList.add('hidden');
    // Reset desktop positioning so CSS defaults apply next time
    overlay.style.left = '';
    overlay.style.top = '';
    overlay.style.bottom = '';
    overlay.style.right = '';
    resetRaceStyles();
    selectedRaceName = null;
    history.replaceState(null, '', window.location.pathname);
    if (chartTouchMarker) { chartTouchMarker.remove(); chartTouchMarker = null; }
    document.getElementById('race-detail-overlay').classList.remove('minimized');

    document.querySelectorAll('.race-item').forEach(item => {
        item.classList.remove('selected');
    });
}

function shareRace(raceName) {
    const url = window.location.origin + window.location.pathname + '?race=' + slugify(raceName);
    const isTouchDevice = navigator.maxTouchPoints > 0;
    if (isTouchDevice && navigator.share) {
        navigator.share({ title: raceName, url });
    } else {
        navigator.clipboard.writeText(url).then(() => {
            const btn = document.querySelector('.race-share-btn');
            const actions = document.querySelector('.race-actions');
            if (!btn || !actions) return;
            btn.textContent = 'Kopiert!';
            let urlDisplay = actions.querySelector('.share-url-display');
            if (!urlDisplay) {
                urlDisplay = document.createElement('div');
                urlDisplay.className = 'share-url-display';
                actions.appendChild(urlDisplay);
            }
            urlDisplay.textContent = url;
            setTimeout(() => {
                btn.textContent = 'Del løype';
                urlDisplay.textContent = '';
            }, 3000);
        });
    }
}

function changeRaceColor(raceName) {
    const race = raceRoutes.find(r => r.name === raceName);
    if (!race) return;

    race.color = getRandomColor();

    // Update polylines on the map
    if (racePolylines[raceName]) {
        racePolylines[raceName].forEach(pl => {
            pl.setStyle({ color: race.color });
        });
    }
    (raceDecorators[raceName] || []).forEach(dec => {
        dec.setPatterns(makeArrowPattern(race.color, 0));
    });

    // Update the color dot in the list
    const raceItem = document.querySelector(`.race-item[data-race="${raceName}"]`);
    if (raceItem) {
        const indicator = raceItem.querySelector('.race-color-indicator');
        if (indicator) indicator.style.backgroundColor = race.color;
    }

    // Update elevation chart in open detail overlay
    const chartPath = document.querySelector('#race-detail-content .elevation-chart path');
    if (chartPath) {
        chartPath.setAttribute('fill', race.color);
        chartPath.setAttribute('stroke', race.color);
    }
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

// Wrap applyFilters to update panel
const originalApplyFilters = applyFilters;
applyFilters = function() {
    originalApplyFilters();
    renderRaceList();

    // Clear selection if selected race is now hidden
    if (selectedRaceName) {
        const race = raceRoutes.find(r => r.name === selectedRaceName);
        if (race) {
            const raceMonth = new Date(race.date).getMonth();
            const matchesMonth = currentMonthFilter === null || raceMonth === currentMonthFilter;
            const matchesCategory = currentCategoryFilter === null || race.category === currentCategoryFilter;
            const matchesSearch = !currentSearchFilter || race.name.toLowerCase().includes(currentSearchFilter);
            if (!matchesMonth || !matchesCategory || !matchesSearch) {
                closeRaceDetail();
            }
        }
    }
};

// Wrap regenerateColors to update panel colors and open detail chart
const originalRegenerateColors = regenerateColors;
regenerateColors = function() {
    originalRegenerateColors();
    renderRaceList();
    if (selectedRaceName) {
        const race = raceRoutes.find(r => r.name === selectedRaceName);
        if (race) {
            const chartPath = document.querySelector('#race-detail-content .elevation-chart path');
            if (chartPath) {
                chartPath.setAttribute('fill', race.color);
                chartPath.setAttribute('stroke', race.color);
            }
        }
    }
};

// Initialize panel on DOM ready
document.addEventListener('DOMContentLoaded', initRacePanel);
