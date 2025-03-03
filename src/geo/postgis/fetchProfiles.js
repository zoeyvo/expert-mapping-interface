/**
 * fetchProfiles.js
 * 
 * Purpose:
 * Fetches research profiles from the API and saves formatted responses to JSON files.
 * Creates both timestamped and latest versions of the data.
 * 
 * Usage:
 * node src/geo/postgis/fetchProfiles.js
 * 
 * Output:
 * - src/geo/data/json/formatted_response_[timestamp].json
 * - src/geo/data/json/formatted_response_latest.json
 */


const fs = require('fs');
const path = require('path');
const http = require('http');
const { createClient } = require('redis');

// Create a Redis client
const redisClient = createClient();

// Redis connection end event
redisClient.on('end', () => {
  console.log('🔌 Redis connection closed');
});

// Connect to Redis
redisClient.connect().then(() => {
  // Test Redis connection on start up
  redisClient.ping().then((res) => {
    console.log('✅ Redis connected successfully');
    }).catch((err) => {
      console.error('❌ Redis connection error:', err);
    });
  });

// Update path to src/geo/data/json
const outputDir = path.join(__dirname, '../data/json');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function displayResearcherDetails(name) {
    console.log(`\n🔍 Looking up details for: ${name}`);
    try {
        const details = await fetchResearcherDetails(name);
        if (!details) {
            console.log('❌ Researcher not found');
            return;
        }

        console.log('\nResearcher Details:');
        console.log('------------------');
        console.log(`Name: ${details.researcher_name}`);
        console.log(`URL: ${details.researcher_url}`);
        console.log(`Number of works: ${details.works.length}`);
        console.log('\nLocations:');
        details.locations.forEach(loc => {
            console.log(`- ${loc.name} (${loc.type})`);
        });

        console.log('\nWorks:');
        details.works.forEach((work, index) => {
            console.log(`${index + 1}. ${work.title} (${work.year || 'Year unknown'})`);
        });

        return details;
    } catch (error) {
        console.error('Error fetching researcher details:', error);
        return null;
    }
}

async function fetchAllResearchers() {
    const batchSize = 100;
    let allResearchers = [];
    let offset = 0;
    let totalFetched = 0;
    let totalAvailable = null;

    console.log('📊 Fetching all researcher profiles...');

    while (true) {
        const result = await fetchResearcherProfiles({
            limit: batchSize,
            offset: offset
        });

        if (!result.researchers || result.researchers.length === 0) {
            break;
        }

        allResearchers = allResearchers.concat(result.researchers);
        totalFetched += result.researchers.length;
        totalAvailable = result.total;
        offset += batchSize;

        console.log(`📥 Fetched ${totalFetched} of ${totalAvailable} researchers (${Math.round(totalFetched/totalAvailable * 100)}%)...`);

        // Break if we've fetched all available researchers
        if (!result.has_more || totalFetched >= totalAvailable) {
            break;
        }
    }

    console.log(`✅ Completed fetching all ${totalFetched} researchers`);
    return allResearchers;
}

function convertToGeoJSON(researchers) {
    // Create a feature for each researcher-location combination
    const features = researchers.flatMap(researcher => {
        return researcher.locations.map(location => {
            const geometry = location.geometry;

            return {
                type: 'Feature',
                geometry: geometry,
                properties: {
                    researcher_name: researcher.researcher_name,
                    researcher_url: researcher.researcher_url,
                    work_count: researcher.work_count,
                    location_name: location.name,
                    location_type: location.type,
                    location_id: location.location_id
                }
            };
        });
    });

    return {
        type: 'FeatureCollection',
        features: features,
        metadata: {
            total_researchers: researchers.length,
            total_locations: features.length,
            generated_at: new Date().toISOString()
        }
    };
}

async function saveGeoJSON(geojson, filename) {
    try {
        await fs.writeFile(filename, JSON.stringify(geojson, null, 2));
        console.log(`\n✅ GeoJSON saved to ${filename}`);
    } catch (error) {
        console.error('Error saving GeoJSON:', error);
    }
}

async function main() {
    const startTime = Date.now();
    try {
        // Parse command line arguments
        const searchName = process.argv[2];
        const limit = process.argv[3] ? parseInt(process.argv[3]) : 0;
        const outputFile = process.argv[4] || 'researcher_locations.geojson';

        if (searchName) {
            // If name provided, show detailed info and save specific researcher
            const details = await displayResearcherDetails(searchName);
            if (details) {
                const geojson = convertToGeoJSON([details]);
                await saveGeoJSON(geojson, outputFile);
            }
        } else {
            // Otherwise show general statistics and save all researchers
            let researchers;
            if (limit > 0) {
                // If limit specified, fetch just that amount
                const result = await fetchResearcherProfiles({ limit });
                researchers = result.researchers;
                console.log(`\n✅ Fetched ${researchers.length} researchers (limited to ${limit})`);
            } else {
                // Otherwise fetch all researchers
                researchers = await fetchAllResearchers();
                console.log(`\n✅ Fetched all ${researchers.length} researchers`);
            }

            if (researchers.length > 0) {
                await displayResearcherStats(researchers);
                const geojson = convertToGeoJSON(researchers);
                await saveGeoJSON(geojson, outputFile);
            }
        }
    } catch (error) {
        console.error('Error:', error);
    }
    finally {
        const endTime = Date.now();
        console.log(`⏳ Total execution time: ${(endTime - startTime) / 1000} seconds`);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

// Export all functions for use as a module
module.exports = {
    fetchResearcherProfiles,
    fetchResearcherDetails,
    fetchResearchLocations,
    fetchAllResearchers,
    displayResearcherStats,
    displayResearcherDetails,
    convertToGeoJSON,
    saveGeoJSON
};