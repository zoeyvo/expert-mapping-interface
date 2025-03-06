/**
 * parsedCache.js
 * 
 * Purpose:
 * Fetches data from PostgreSQL, parses it, and stores it in Redis as the primary database.
 * 
 * Usage:
 * node src/geo/redis/parsedCache.js
 */

const { createClient } = require('redis');
const { pool } = require('../postgis/config');

// Create a Redis client
const redisClient = createClient();

redisClient.on('error', (err) => {
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
});

redisClient.connect().then(async () => {
  const client = await pool.connect();
  try {
    // Get total count first
    const countResult = await client.query(`
      SELECT COUNT(*) FROM research_locations WHERE geom IS NOT NULL;
    `);
    const totalCount = parseInt(countResult.rows[0].count);
    console.log(`📊 Total locations in database: ${totalCount}`);

    // Get all features in batches
    const batchSize = 100;
    let index = 1;

    for (let offset = 0; offset < totalCount; offset += batchSize) {
      console.log(`🔍 Fetching batch ${offset / batchSize + 1}...`);

      const result = await client.query(`
        SELECT id, json_build_object(
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
    });
  } catch (error) {
    console.error('❌ Error fetching profiles:', error);
    throw error;
  } finally {
    client.release();
  }
}).catch(error => {
  console.error('❌ Error connecting to Redis:', error);
});