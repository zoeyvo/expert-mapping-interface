/**
 * parsedCache.js
 * 
 * Purpose:
<<<<<<< HEAD
 * Fetches data from PostgreSQL, parses it, and stores it in Redis as the primary database.
=======
 * Fetches data from PostgreSQL, parses it, and populates the Redis cache with its raw data.
>>>>>>> 26a2542 (Created rawCache.js, parsedCache.js, and data directory)
 * 
 * Usage:
 * node src/geo/redis/parsedCache.js
 */

<<<<<<< HEAD
=======
// const fs = require('fs');
// const path = require('path');

// // Update path to src/geo/data/json
// const outputDir = path.join(__dirname, 'data');

// // Ensure output directory exists
// if (!fs.existsSync(outputDir)) {
//   fs.mkdirSync(outputDir, { recursive: true });
// }

>>>>>>> 26a2542 (Created rawCache.js, parsedCache.js, and data directory)
const { createClient } = require('redis');
const { pool } = require('../postgis/config');

// Create a Redis client
const redisClient = createClient();

redisClient.on('error', (err) => {
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
  //console.error('❌ Redis connection error:', err);
});

redisClient.on('connect', () => {
  //console.log('✅ Connected to Redis');
});

redisClient.on('ready', () => {
  //console.log('🔄 Redis client is ready');
});

redisClient.on('end', () => {
  //console.log('🔌 Redis connection closed');
>>>>>>> 26a2542 (Created rawCache.js, parsedCache.js, and data directory)
});

redisClient.connect().then(async () => {
  const client = await pool.connect();
  try {
    // Get total count first
    const countResult = await client.query(`
      SELECT COUNT(*) FROM research_locations WHERE geom IS NOT NULL;
    `);
    const totalCount = parseInt(countResult.rows[0].count);
    //console.log(`📊 Total locations in database: ${totalCount}`);

    // Get all features in batches
    const batchSize = 100;
    let allFeatures = [];

    for (let offset = 0; offset < totalCount; offset += batchSize) {
      //console.log(`🔍 Fetching batch ${offset / batchSize + 1}...`);

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
        SELECT json_build_object(
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

      allFeatures = allFeatures.concat(result.rows.map(row => row.feature));
    }

    const geojson = {
      type: 'FeatureCollection',
      features: allFeatures
    };
>>>>>>> 26a2542 (Created rawCache.js, parsedCache.js, and data directory)

    //console.log(`✅ Query successful - Found ${geojson.features.length} features`);
    //console.log(`📋 First feature: ${geojson.features[0].properties.researcher}`);
    //console.log(`📋 Last feature: ${geojson.features[geojson.features.length - 1].properties.researcher}`);
<<<<<<< HEAD
    // // Parse and format the JSON
    // const formattedJson = JSON.stringify(geojson, null, 2);
=======
    // Parse and format the JSON
    const formattedJson = JSON.stringify(geojson, null, 2);
>>>>>>> 26a2542 (Created rawCache.js, parsedCache.js, and data directory)
    
    // // Save to timestamped file
    // const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    // const filePath = path.join(outputDir, `formatted_response_${timestamp}.json`);
    // fs.writeFileSync(filePath, formattedJson);
  
    // // Save/update latest version (copy instead of symlink)
    // const latestPath = path.join(outputDir, 'formatted_response_latest.json');
    // fs.copyFileSync(filePath, latestPath);
    
    // console.log(`✅ Saved formatted response to: ${filePath}`);
    // console.log(`📄 Updated latest copy: ${latestPath}`);
<<<<<<< HEAD
  } catch (err) {
    console.error('❌ Error fetching data:', err);
  } finally {
    client.release();
    redisClient.disconnect();
  }
=======

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
    });
  } catch (error) {
    console.error('❌ Error fetching profiles:', error);
    throw error;
  } finally {
    client.release();
  }
}).catch(error => {
  console.error('❌ Error connecting to Redis:', error);
>>>>>>> 26a2542 (Created rawCache.js, parsedCache.js, and data directory)
});