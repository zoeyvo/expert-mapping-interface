const { createClient } = require('redis');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

const redisClient = createClient();

async function populateRedis() {
  try {
    await redisClient.connect();

    // Run fetchProfiles.js
    await new Promise((resolve, reject) => {
      exec('node ../postgis/fetchProfiles.js', { cwd: path.join(__dirname, '../postgis') }, (error, stdout, stderr) => {
        if (error) {
          console.error(`❌ Error running fetchProfiles.js: ${error.message}`);
          return reject(error);
        }
        if (stderr) {
          console.error(`❌ Error output from fetchProfiles.js: ${stderr}`);
          return reject(new Error(stderr));
        }
        console.log(`✅ fetchProfiles.js output: ${stdout}`);
        resolve();
      });
    });

    // Read GeoJSON data from researcher_locations.geojson
    const geojsonFilePath = path.join(__dirname, '../postgis/researcher_locations.geojson');
    const geojsonData = await fs.readFile(geojsonFilePath, 'utf8');
    const geojson = JSON.parse(geojsonData);

    // Store each feature in Redis with a unique key
    for (const feature of geojson.features) {
      const { researcher_name, researcher_url, work_count, location_name, location_type, location_id } = feature.properties;
      const { coordinates } = feature.geometry;
      const geometryType = feature.geometry.type;
      const featureKey = `feature:${location_id}`;

      await redisClient.hSet(featureKey, {
        geometry_type: geometryType,
        researcher_name: researcher_name || '',
        researcher_url: researcher_url || '',
        work_count: work_count ? work_count.toString() : '0',
        location_name: location_name || '',
        location_type: location_type || '',
        location_id: location_id ? location_id.toString() : '',
        coordinates: JSON.stringify(coordinates)
      });
    }

    console.log('✅ Profiles cached in Redis');
    // Remove researcher_locations.geojson from postgis directory
    await fs.unlink(geojsonFilePath);
    // console.log('✅ researcher_locations.geojson removed');
  } catch (error) {
    console.error('❌ Error fetching profiles:', error);
  } finally {
    await redisClient.quit();
  }
}

populateRedis();