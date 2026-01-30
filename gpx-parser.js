// Calculate distance between two coordinates using Haversine formula
function calculateDistance(lon1, lat1, lon2, lat2) {
    const R = 6371000; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
}

// Calculate statistics from GPX coordinates
function calculateGPXStats(coordinates) {
    let totalDistance = 0;
    let elevationGain = 0;

    for (let i = 1; i < coordinates.length; i++) {
        const [lon1, lat1, ele1] = coordinates[i - 1];
        const [lon2, lat2, ele2] = coordinates[i];

        // Calculate distance
        const dist = calculateDistance(lon1, lat1, lon2, lat2);
        totalDistance += dist;

        // Calculate elevation gain
        const elevDiff = ele2 - ele1;
        if (elevDiff > 0) {
            elevationGain += elevDiff;
        }
    }

    return {
        distance: totalDistance / 1000, // Convert to km
        elevationGain: Math.round(elevationGain)
    };
}

// Simple GPX to GeoJSON parser with statistics
function parseGPXToGeoJSON(gpxText) {
    const parser = new DOMParser();
    const gpxDoc = parser.parseFromString(gpxText, 'text/xml');

    const coordinates = [];
    const trackPoints = gpxDoc.querySelectorAll('trkpt');

    trackPoints.forEach(trkpt => {
        const lat = parseFloat(trkpt.getAttribute('lat'));
        const lon = parseFloat(trkpt.getAttribute('lon'));
        const eleElement = trkpt.querySelector('ele');
        const ele = eleElement ? parseFloat(eleElement.textContent) : 0;

        coordinates.push([lon, lat, ele]);
    });

    const stats = calculateGPXStats(coordinates);

    return {
        type: 'FeatureCollection',
        features: [{
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: coordinates
            },
            properties: {
                distance: stats.distance,
                elevationGain: stats.elevationGain
            }
        }]
    };
}
