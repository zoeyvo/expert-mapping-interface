/**
 * parsedCache.js
 * 
 * Purpose:
<<<<<<< HEAD
 * Fetches data from PostgreSQL, parses it, and stores it in Redis as the primary database.
=======
 * Fetches data from PostgreSQL, parses it, and populates the Redis cache with its raw data.
>>>>>>> 84c4bd0 (Created rawCache.js, parsedCache.js, and data directory)
 * 
 * Usage:
 * node src/geo/redis/parsedCache.js
 */

<<<<<<< HEAD
<<<<<<< HEAD
=======
=======
>>>>>>> 84c4bd0 (Created rawCache.js, parsedCache.js, and data directory)
// const fs = require('fs');
// const path = require('path');

// // Update path to src/geo/data/json
// const outputDir = path.join(__dirname, 'data');

// // Ensure output directory exists
// if (!fs.existsSync(outputDir)) {
//   fs.mkdirSync(outputDir, { recursive: true });
// }

<<<<<<< HEAD
>>>>>>> 26a2542 (Created rawCache.js, parsedCache.js, and data directory)
=======
>>>>>>> 84c4bd0 (Created rawCache.js, parsedCache.js, and data directory)
const { createClient } = require('redis');
const { pool } = require('../postgis/config');

// Create a Redis client
const redisClient = createClient();

redisClient.on('error', (err) => {
<<<<<<< HEAD
<<<<<<< HEAD
  console.error('❌ Redis connection error:', err);
});

redisClient.on('connect', () => {
  console.log('✅ Connected to Redis');
});

redisClient.on('ready', () => {
  console.log('🔄 Redis client is ready');
});

redisClient.on('end', () => {
  console.log('🔌 Redis connection closed');
=======
=======
>>>>>>> 84c4bd0 (Created rawCache.js, parsedCache.js, and data directory)
  //console.error('❌ Redis connection error:', err);
});

redisClient.on('connect', () => {
<<<<<<< HEAD
  console.log('✅ Connected to Redis');
});

redisClient.on('ready', () => {
  console.log('🔄 Redis client is ready');
});

redisClient.on('end', () => {
  console.log('🔌 Redis connection closed');
=======
  //console.log('✅ Connected to Redis');
});

redisClient.on('ready', () => {
  //console.log('🔄 Redis client is ready');
});

redisClient.on('end', () => {
  //console.log('🔌 Redis connection closed');
>>>>>>> 84c4bd0 (Created rawCache.js, parsedCache.js, and data directory)
});

redisClient.connect().then(async () => {
  const client = await pool.connect();
  try {
    // Get total count first
    const countResult = await client.query(`
      SELECT COUNT(*) FROM research_locations WHERE geom IS NOT NULL;
    `);
    const totalCount = parseInt(countResult.rows[0].count);
<<<<<<< HEAD
    console.log(`📊 Total locations in database: ${totalCount}`);

    // Get all features in batches
    const batchSize = 100;
    let index = 1;

    for (let offset = 0; offset < totalCount; offset += batchSize) {
      console.log(`🔍 Fetching batch ${offset / batchSize + 1}...`);

<<<<<<< HEAD
      // const result = await client.query(`
      //   SELECT json_build_object(
      //     'type', 'Feature',
      //     'geometry', json_build_object(
      //       'type', 'Point',
      //       'coordinates', ARRAY[
      //         ST_X(geom),
      //         ST_Y(geom)
      //       ]
      //     ),
      //     'properties', json_build_object(
      //       'researcher', properties->>'researcher',
      //       'location', properties->>'location',
      //       'works', properties->'works',
      //       'url', properties->>'url'
      //     )
      //   ) as feature
      //   FROM research_locations
      //   WHERE geom IS NOT NULL
      //   ORDER BY properties->>'researcher'
      //   LIMIT $1 OFFSET $2;
      // `, [batchSize, offset]);

      // allFeatures = allFeatures.concat(result.rows.map(row => row.feature));
    }

    // const geojson = {
    //   type: 'FeatureCollection',
    //   features: allFeatures
    // };
=======
      const result = await client.query(`
        SELECT id, json_build_object(
=======
    //console.log(`📊 Total locations in database: ${totalCount}`);

    // Get all features in batches
    const batchSize = 100;
    let allFeatures = [];

    for (let offset = 0; offset < totalCount; offset += batchSize) {
      //console.log(`🔍 Fetching batch ${offset / batchSize + 1}...`);

      const result = await client.query(`
        SELECT json_build_object(
>>>>>>> 84c4bd0 (Created rawCache.js, parsedCache.js, and data directory)
          'type', 'Feature',
          'geometry', json_build_object(
            'type', 'Point',
            'coordinates', ARRAY[
              ST_X(geom),
              ST_Y(geom)
            ]
          ),
          'properties', json_build_object(
            'researcher', properties->>'researcher',
            'location', properties->>'location',
            'works', properties->'works',
            'url', properties->>'url'
          )
        ) as feature
        FROM research_locations
        WHERE geom IS NOT NULL
        ORDER BY properties->>'researcher'
        LIMIT $1 OFFSET $2;
      `, [batchSize, offset]);

<<<<<<< HEAD
      // Store each feature as a Redis hash
      for (const row of result.rows) {
        const featureId = index++;
        const feature = row.feature;
        const properties = feature.properties;

        const { coordinates } = feature.geometry;
        const [longitude, latitude] = coordinates;

        redisClient.hSet(`feature:${featureId}`, [
          'type', feature.type,
          'geometry', JSON.stringify(feature.geometry),
          'latitude', latitude,
          'longitude', longitude,
          'researcher', properties.researcher,
          'location', properties.location,
          'works', JSON.stringify(properties.works),
          'url', properties.url
        ]).then(reply => {
          console.log(`✅ Cached feature ${featureId} in Redis:`, reply);
        }).catch(err => {
          console.error(`❌ Error caching feature ${featureId}:`, err);
        });
      }
    }

    console.log(`✅ All features have been cached in Redis`);
    // Close connection and exit process
    redisClient.quit(() => {
      process.exit(0);
=======
      allFeatures = allFeatures.concat(result.rows.map(row => row.feature));
    }

    const geojson = {
      type: 'FeatureCollection',
      features: allFeatures
    };

    //console.log(`✅ Query successful - Found ${geojson.features.length} features`);
    //console.log(`📋 First feature: ${geojson.features[0].properties.researcher}`);
    //console.log(`📋 Last feature: ${geojson.features[geojson.features.length - 1].properties.researcher}`);
    // Parse and format the JSON
    const formattedJson = JSON.stringify(geojson, null, 2);
    
    // // Save to timestamped file
    // const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    // const filePath = path.join(outputDir, `formatted_response_${timestamp}.json`);
    // fs.writeFileSync(filePath, formattedJson);
  
    // // Save/update latest version (copy instead of symlink)
    // const latestPath = path.join(outputDir, 'formatted_response_latest.json');
    // fs.copyFileSync(filePath, latestPath);
    
    // console.log(`✅ Saved formatted response to: ${filePath}`);
    // console.log(`📄 Updated latest copy: ${latestPath}`);

    redisClient.setEx('parsedGeoData',86400,formattedJson).then(() => {
      //console.log('✅ Cached parsed data in Redis');
      // Output the formatted JSON to stdout
      console.log(formattedJson);
      // Close connection and exit process
      redisClient.quit(() => {
        process.exit(0);
      });
    }).catch(error => {
      console.error('❌ Error caching parsed data:', error);
      // Close connection
      redisClient.quit();
>>>>>>> 84c4bd0 (Created rawCache.js, parsedCache.js, and data directory)
    });
  } catch (error) {
    console.error('❌ Error fetching profiles:', error);
    throw error;
  } finally {
    client.release();
  }
}).catch(error => {
  console.error('❌ Error connecting to Redis:', error);
<<<<<<< HEAD
>>>>>>> 26a2542 (Created rawCache.js, parsedCache.js, and data directory)
=======
>>>>>>> 84c4bd0 (Created rawCache.js, parsedCache.js, and data directory)
});