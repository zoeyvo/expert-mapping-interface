const fs = require('fs');
const path = require('path');
const axios = require('axios');

const LOCATIONS_FILE = path.join(__dirname, 'data', 'json', 'location_based_profiles.json');
const CACHE_FILE = path.join(__dirname, 'data', 'json', 'location_coordinates.json');
const DELAY_MS = 500; // 0.5 second delay between requests

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
    // Load existing coordinates if available
    let locationCoordinates = {};
    if (fs.existsSync(CACHE_FILE)) {
        locationCoordinates = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    }

    // Load locations from location-based-profiles.json
    const locationsData = JSON.parse(fs.readFileSync(LOCATIONS_FILE, 'utf8'));

    // Get unique locations that haven't been geocoded yet
    const locations = Object.keys(locationsData).filter(
        location => !locationCoordinates[location]
    );

    console.log(`Geocoding ${locations.length} new locations...`);

    // Geocode new locations with rate limiting
    for (const location of locations) {
        if (!locationCoordinates[location]) {
            const coords = await geocodeLocation(location);
            if (coords) {
                locationCoordinates[location] = [coords.lat, coords.lon];
                console.log(`Geocoded ${location}: ${coords.lat}, ${coords.lon}`);
                
                // Save progress after each successful geocoding
                fs.writeFileSync(CACHE_FILE, JSON.stringify(locationCoordinates, null, 2));
            } else {
                console.log(`Failed to geocode ${location}`);
            }
            
            // Rate limiting
            await sleep(DELAY_MS);
        }
    }

    return locationCoordinates;
}

// Run if called directly
if (require.main === module) {
    createLocationCoordinates()
        .then(() => console.log('Geocoding complete'))
        .catch(console.error);
}

module.exports = { createLocationCoordinates }; 