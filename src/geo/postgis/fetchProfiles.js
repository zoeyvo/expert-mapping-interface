/**
 * fetchProfiles.js
 * 
 * Purpose:
 * Command-line tool to fetch and display researcher profiles
 * using the API endpoints and output as GeoJSON.
 */

const { 
    fetchResearcherProfiles, 
    fetchResearcherDetails,
    searchResearchers,
    fetchResearchLocations 
} = require('../../api/fetchProfiles');
const fs = require('fs').promises;

async function displayResearcherStats(researchers) {
    console.log('\nResearcher Summary:');
    console.log('-------------------');
    console.log(`Total Researchers: ${researchers.length}`);
    
    // Calculate work statistics
    const workCounts = researchers.map(r => r.work_count);
    const totalWorks = workCounts.reduce((a, b) => a + b, 0);
    const avgWorks = totalWorks / researchers.length;
    const maxWorks = Math.max(...workCounts);

    console.log(`Total Works: ${totalWorks}`);
    console.log(`Average Works per Researcher: ${avgWorks.toFixed(2)}`);
    console.log(`Maximum Works by a Researcher: ${maxWorks}`);
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
    } catch (error) {
        console.error('Error fetching researcher details:', error);
    }
}

async function fetchAllResearchers() {
    const batchSize = 100;
    let allResearchers = [];
    let offset = 0;
    let hasMore = true;

    console.log('📊 Fetching all researcher profiles...');

    while (hasMore) {
        const result = await fetchResearcherProfiles({ 
            limit: batchSize, 
            offset: offset 
        });
        
        if (result.researchers.length === 0) {
            hasMore = false;
        } else {
            allResearchers = allResearchers.concat(result.researchers);
            offset += batchSize;
            console.log(`📥 Fetched ${allResearchers.length} researchers so far...`);
        }
    }

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
    try {
        // Parse command line arguments
        const searchName = process.argv[2];
        const limit = process.argv[3] ? parseInt(process.argv[3]) : 0;
        const outputFile = process.argv[4] || 'researcher_locations.geojson';

        if (searchName) {
            // If name provided, show detailed info and save specific researcher
            const details = await fetchResearcherDetails(searchName);
            if (details) {
                await displayResearcherDetails(searchName);
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
}

if (require.main === module) {
    main();
}

module.exports = {
    displayResearcherStats,
    displayResearcherDetails,
    convertToGeoJSON
};