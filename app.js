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

// GPX race routes configuration
const raceRoutes = [
    {
        name: 'NSM Ultra 2025',
        files: ['race-calendar/NordmarkaSkogsmaraton/NSM_Ultra_2025.gpx'],
        color: '#ff6b35',
        description: 'Nordmarka Skogsmaraton Ultra - løp gjennom Nordmarkas skogsområder',
        url: 'https://nordmarkaskogsmaraton.no/',
        useCalculatedStats: true,
        location: 'Nordmarka, Oslo'
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
        description: 'Episk fjellkryssing fra Oslo til Bergen',
        url: 'https://oslobergentrail.com/',
        manualDistance: 500,
        manualElevation: 15000,
        location: 'Oslo til Bergen'
    },
    {
        name: 'SMVE - Soria Moria til Verdens Ende',
        files: ['race-calendar/SoriaMoriaTilVerdensEnde/SMVE_2024_100_miles_02.gpx'],
        color: '#9b59b6',
        description: 'Fra Soria Moria til Verdens Ende',
        url: 'https://soriamoriatilverdensende.com',
        useCalculatedStats: true,
        location: 'Oslo området'
    },
    {
        name: 'Nøsen Hundreds',
        files: ['race-calendar/Nøsen/Nosen_100.gpx'],
        color: '#e74c3c',
        description: 'Ultra distanse terrengløp',
        url: 'https://www.nosenhundreds.com/',
        useCalculatedStats: true,
        location: 'Nøsen området'
    },
    {
        name: 'Dobbeltravern - Nordmarkstraveren',
        files: ['race-calendar/Nordmakstravern/dobbeltravern_60km_1_.gpx'],
        color: '#f39c12',
        description: 'Dobbel Nordmarka traversering',
        url: 'http://www.nordmarkstravern.no/',
        useCalculatedStats: true,
        location: 'Nordmarka, Oslo'
    },
    {
        name: 'Lillomarka Rundt',
        files: ['race-calendar/Sidespor-SkyBlazers/Lillomarka+rundt+51+km+-+Frysja+161025.gpx'],
        color: '#1abc9c',
        description: 'Rundt Lillomarka skog',
        url: 'https://www.sidespor.no/lop/lillomarka-rundt',
        useCalculatedStats: true,
        location: 'Lillomarka, Oslo'
    },
    {
        name: 'Flyktningeruta',
        files: ['race-calendar/ØstmarkaTrailChallenge/Flyktningeruta 2025 (med ny sti ved kraftlinja).gpx'],
        color: '#e67e22',
        description: 'Flyktningeruta - historisk sti',
        url: 'https://www.ostmarkatrail.no/flyktningeruta/',
        useCalculatedStats: true,
        location: 'Østmarka, Oslo'
    },
    {
        name: 'Endless Shore Ultra',
        files: ['race-calendar/EndlessShores/Endless Shores Ultra Trail 100 miles 2025 FINAL.gpx'],
        color: '#16a085',
        description: 'Kyst ultra terrengløp',
        url: 'https://www.endless-shore.no/',
        useCalculatedStats: true,
        location: 'Norsk kyst'
    },
    {
        name: 'Sandnes 100 Miles',
        files: ['race-calendar/SandsnesUltraTrail/sandnes100-miles.gpx'],
        color: '#c0392b',
        description: '100 miles ultra terrengløp',
        url: 'https://www.sandnes100miles.no/',
        useCalculatedStats: true,
        location: 'Sandnes området'
    }
];

// Track layer groups for each race
const raceLayers = {};
const layerStates = {};

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
            allCoordinates.forEach(coords => {
                const polyline = L.polyline(coords, {
                    color: race.color,
                    weight: 3,
                    opacity: 0.8
                });

                // Add popup with race info
                const popupHTML = `
                    <div class="race-popup">
                        <h3>${race.name}</h3>
                        <p class="race-description">${race.description}</p>
                        <div class="race-details">
                            <div><strong>Distanse:</strong> ${finalDistance.toFixed(1)} km</div>
                            <div><strong>Høydemeter:</strong> ${finalElevation} m</div>
                            <div><strong>Sted:</strong> ${race.location}</div>
                        </div>
                        <a href="${race.url}" target="_blank" rel="noopener noreferrer" class="race-link">
                            Besøk nettside →
                        </a>
                    </div>
                `;

                polyline.bindPopup(popupHTML);
                polyline.addTo(raceLayers[race.name]);
            });

            console.log(`Loaded race: ${race.name} (${race.files.length} segments)`);
        } catch (error) {
            console.error(`Error loading ${race.name}:`, error);
        }
    }
}


// Custom layer control
L.Control.CustomLayers = L.Control.extend({
    onAdd: function(map) {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control layer-control-container');

        // Build race checkboxes dynamically
        const raceCheckboxes = raceRoutes.map(race => `
            <label class="layer-checkbox-item layer-checkbox-subitem">
                <input type="checkbox" class="toggle-race" data-race="${race.name}" checked>
                <span class="layer-icon" style="background-color: ${race.color}; width: 16px; height: 3px; display: inline-block; border-radius: 2px;"></span>
                <span>${race.name}</span>
            </label>
        `).join('');

        container.innerHTML = `
            <button id="layer-toggle-btn" class="layer-control-btn" title="Lagkontroller">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 2L2 6l8 4 8-4-8-4z"/>
                    <path d="M2 10l8 4 8-4M2 14l8 4 8-4" opacity="0.6"/>
                </svg>
            </button>
            <div id="layer-dropdown" class="layer-dropdown" style="display: none;">
                <div class="layer-dropdown-header">Lag</div>
                <div class="layer-section">
                    <div class="layer-section-title">Kartlag</div>
                    <label class="layer-checkbox-item">
                        <input type="radio" name="base-layer" value="kartverket" checked>
                        <span>Norgeskart (Kartverket)</span>
                    </label>
                    <label class="layer-checkbox-item">
                        <input type="radio" name="base-layer" value="osm">
                        <span>OpenStreetMap</span>
                    </label>
                </div>
                <div class="layer-section">
                    <div class="layer-section-title">Løp</div>
                    ${raceCheckboxes}
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

        // Toggle individual race layers
        container.querySelectorAll('.toggle-race').forEach(checkbox => {
            checkbox.onchange = (e) => {
                const raceName = e.target.dataset.race;
                layerStates[raceName] = e.target.checked;

                if (e.target.checked) {
                    map.addLayer(raceLayers[raceName]);
                } else {
                    map.removeLayer(raceLayers[raceName]);
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
loadRaces();
