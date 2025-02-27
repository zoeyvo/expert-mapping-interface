/**
 * geocodeLocation.js
 * 
 * Purpose:
 * Geocodes location names to coordinates using OpenStreetMap Nominatim.
 * Caches results to avoid repeated API calls and respect rate limits.
 * 
 * Usage:
 * node src/geo/etl/geocodeLocation.js
 * 
 * Notes:
 * - Respects Nominatim's rate limit (1 request per second)
 * - Caches coordinates to avoid duplicate requests
 * - Updates existing coordinates file if it exists
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { normalizeLocationName } = require('./utils');

const LOCATIONS_FILE = path.join(__dirname, '../data', 'json', 'location_based_profiles.json');
const CACHE_FILE = path.join(__dirname, '../data', 'json', 'location_coordinates.json');
const DELAY_MS = 100; // 0.5 second delay between requests

async function geocodeLocation(location) {
    try {
        const response = await axios.get('https://nominatim.openstreetmap.org/search', {
            params: {
                format: 'json',
                limit: 1,
                q: location
            },
            headers: {
                'User-Agent': 'GeoDataVisualizer/1.0 (https://github.com/zoeyvo/geo-data-visualizer)',
                'Accept-Language': 'en-US,en;q=0.5'
            }
        });

        if (response.data && response.data[0]) {
            return {
                lat: parseFloat(response.data[0].lat),
                lon: parseFloat(response.data[0].lon)
            };
        }
        return null;
    } catch (error) {
        console.error(`Error geocoding ${location}:`, error.message);
        return null;
    }
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function createLocationCoordinates() {
    const startTime = Date.now();
    let successCount = 0;
    let failureCount = 0;

    let normalizedCoordinates = {};
    if (fs.existsSync(CACHE_FILE)) {
        const rawCache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
        for (const [loc, coords] of Object.entries(rawCache)) {
            const normalizedLoc = normalizeLocationName(loc);
            normalizedCoordinates[normalizedLoc] = coords;
        }
    }

    const locationsData = JSON.parse(fs.readFileSync(LOCATIONS_FILE, 'utf8'));
    const uniqueLocations = [...new Set(
        Object.keys(locationsData).map(normalizeLocationName)
    )];

    console.log(`🌍 Found ${uniqueLocations.length} unique locations`);

    const locationsToGeocode = uniqueLocations.filter(loc => !normalizedCoordinates[loc]);
    console.log(`🔍 Geocoding ${locationsToGeocode.length} new locations...`);

    for (const location of locationsToGeocode) {
        const coords = await geocodeLocation(location);
        if (coords) {
            normalizedCoordinates[location] = [coords.lat, coords.lon];
            console.log(`✅  Geocoded ${location}: ${coords.lat}, ${coords.lon}`);
            fs.writeFileSync(CACHE_FILE, JSON.stringify(normalizedCoordinates, null, 2));
            successCount++;
        } else {
            console.log(`❌  Failed to geocode ${location}`);
            failureCount++;
        }
        await sleep(DELAY_MS);
    }

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    console.log('\n📊  Geocoding Statistics:');
    console.log(`⏱️   Total time: ${timeFormatted}`);
    console.log(`✅  Successfully geocoded: ${successCount} locations`);
    console.log(`❌  Failed to geocode: ${failureCount} locations`);
    if (successCount > 0) {
        const avgDuration = duration / successCount;
        const avgMinutes = Math.floor(avgDuration / 60);
        const avgSeconds = Math.floor(avgDuration % 60);
        const avgFormatted = `${avgMinutes.toString().padStart(2, '0')}:${avgSeconds.toString().padStart(2, '0')}`;
        console.log(`⏱️ Average time per geocode: ${avgFormatted}`);
    }

    return normalizedCoordinates;
}

// Run if called directly
if (require.main === module) {
    createLocationCoordinates()
        .then(() => {
            console.log('✨  Location coordinates updated');
            process.exit(0);
        })
        .catch(error => {
            console.error('💥  Error:', error);
            process.exit(1);
        });
}

module.exports = { createLocationCoordinates };