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
require('dotenv').config();

const MAPBOX_TOKEN = "pk.eyJ1IjoiengzIiwiYSI6ImNtN3ZoeHBvcTBjeDIybG9qZXNpdDlkZW8ifQ.7Vg3DQ4n-NnslaO2srFKqQ";
const CACHE_FILE = path.join(__dirname, '../data', 'json', 'location_coordinates.json');
const DELAY_MS = 1000; // 1 request per second as per Nominatim's usage policy
const MAX_POINTS = 100; // Maximum points to keep in a polygon

// Get locations file from command line argument or use default
const LOCATIONS_FILE = process.argv[2] || path.join(__dirname, '../data', 'json', 'location_based_profiles.json');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function simplifyPolygon(coordinates, maxPoints) {
    if (!Array.isArray(coordinates) || coordinates.length === 0) return coordinates;

    // Handle MultiPolygon
    if (Array.isArray(coordinates[0][0][0])) {
        return coordinates.map(poly => simplifyPolygon(poly, maxPoints));
    }

    // Handle single Polygon
    const totalPoints = coordinates[0].length;
    if (totalPoints <= maxPoints) return coordinates;

    // Calculate step size to reduce points
    const step = Math.ceil(totalPoints / maxPoints);
    
    return coordinates.map(ring => {
        if (ring.length <= maxPoints) return ring;
        return ring.filter((_, index) => index % step === 0 || index === ring.length - 1);
    });
}

async function geocodeLocation(location) {
    try {
        const response = await axios.get(`https://nominatim.openstreetmap.org/search`, {
            params: {
                q: location,
                format: 'json',
                polygon_geojson: 1,
                addressdetails: 1,
                limit: 10,
                featuretype: 'city,state,country,town' // Restrict to these types
            },
            headers: {
                'User-Agent': 'Research_Profile_Generator'
            }
        });

        if (!response.data?.length) {
            console.log(`❌ No results found for ${location}`);
            return null;
        }

        // Find the best matching feature by type
        const result = response.data.find(r => 
            (r.type === 'administrative' || 
             r.type === 'city' ||
             r.type === 'town' ||
             r.type === 'state' ||
             r.type === 'country') &&
            r.display_name.toLowerCase().includes(location.toLowerCase())
        ) || response.data[0];

        let geometry;

        // Check if we have valid polygon data
        if (result.geojson && result.geojson.coordinates?.length > 0) {
            let coordinates;
            
            if (result.geojson.type === 'MultiPolygon') {
                // Get the largest polygon from the MultiPolygon
                const areas = result.geojson.coordinates.map(poly => {
                    let area = 0;
                    const ring = poly[0];
                    for (let i = 0; i < ring.length - 1; i++) {
                        area += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
                    }
                    return Math.abs(area / 2);
                });
                const largestIndex = areas.indexOf(Math.max(...areas));
                coordinates = result.geojson.coordinates[largestIndex];
                console.log(`ℹ️ Converting MultiPolygon to largest Polygon for ${location}`);
            } else if (result.geojson.type === 'Polygon') {
                coordinates = result.geojson.coordinates;
            } else {
                geometry = {
                    type: "Point",
                    coordinates: [parseFloat(result.lon), parseFloat(result.lat)]
                };
                console.log(`ℹ️ Using point geometry for ${location}`);
                return createFeature(geometry, location, result);
            }

            if (coordinates[0].length > MAX_POINTS) {
                const step = Math.ceil(coordinates[0].length / MAX_POINTS);
                coordinates = coordinates.map(ring => 
                    ring.filter((_, index) => index % step === 0 || index === ring.length - 1)
                );
            }

            geometry = {
                type: "Polygon",
                coordinates: coordinates
            };
            console.log(`ℹ️ Using ${coordinates[0].length}-point polygon for ${location} (${result.type})`);
        } else {
            geometry = {
                type: "Point",
                coordinates: [parseFloat(result.lon), parseFloat(result.lat)]
            };
            console.log(`ℹ️ Using point geometry for ${location}`);
        }
        
        return {
            type: "Feature",
            properties: {
                name: location,
                display_name: result.display_name,
                type: result.type,
                osm_type: result.osm_type,
                class: result.class
            },
            geometry: geometry
        };

    } catch (error) {
        console.error(`Error geocoding ${location}:`, error.message);
        return null;
    }
}

function createFeature(geometry, location, result) {
    return {
        type: "Feature",
        properties: {
            name: location,
            display_name: result.display_name,
            type: result.type
        },
        geometry: geometry
    };
}

async function createLocationCoordinates() {
    if (!MAPBOX_TOKEN) {
        console.error('❌ MAPBOX_TOKEN environment variable is required');
        process.exit(1);
    }

    const startTime = Date.now();
    let successCount = 0;
    let failureCount = 0;
    let geoData = { 
        type: "FeatureCollection", 
        features: [],
        licence: "Data © OpenStreetMap contributors, ODbL 1.0. https://osm.org/copyright"
    };

    try {
        if (fs.existsSync(CACHE_FILE)) {
            geoData = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
        }

        const locationsData = JSON.parse(fs.readFileSync(LOCATIONS_FILE, 'utf8'));
        const uniqueLocations = [...new Set(Object.keys(locationsData).map(normalizeLocationName))];
        
        console.log(`🌍 Found ${uniqueLocations.length} unique locations`);

        for (const location of uniqueLocations) {
            if (!geoData.features.some(f => f.properties.name === location)) {
                const feature = await geocodeLocation(location);
                if (feature) {
                    geoData.features.push(feature);
                    fs.writeFileSync(CACHE_FILE, JSON.stringify(geoData, null, 2));
                    console.log(`✅ Geocoded ${location}`);
                    successCount++;
                } else {
                    console.log(`❌ Failed to geocode ${location}`);
                    failureCount++;
                }
                await sleep(DELAY_MS); // Respect rate limit
            }
        }

        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;
        console.log('\n📊 Geocoding Statistics:');
        console.log(`⏱️  Total time: ${Math.floor(duration / 60)}m ${Math.floor(duration % 60)}s`);
        console.log(`✅ Successfully geocoded: ${successCount} locations`);
        console.log(`❌ Failed to geocode: ${failureCount} locations`);

        return geoData;
    } catch (error) {
        console.error('💥 Error:', error.message);
        process.exit(1);
    }
}

// Run if called directly (not imported)
if (require.main === module) {
    createLocationCoordinates().catch(error => {
        console.error('💥 Fatal error:', error);
        process.exit(1);
    });
}

module.exports = { createLocationCoordinates, geocodeLocation };