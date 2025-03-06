const express = require('express');
const cors = require('cors');
const { pool, tables } = require('./geo/postgis/config');
const { createClient } = require('redis');
const { exec } = require('child_process');
const { format } = require('path');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;

// Create a Redis client
const redisClient = createClient();

redisClient.on('error', (err) => {
  console.error('❌ Redis connection error:', err);
});

redisClient.on('ready', () => {
  console.log('🔄 Redis client is ready');
});

redisClient.on('end', () => {
  console.log('🔌 Redis connection closed');
});

// Connect to Redis
redisClient.connect().then(() => {
  // Test Redis connection on start up
  redisClient.ping().then((res) => {
    console.log('🖲️ Redis connected successfully');
  }).catch((err) => {
    console.error('❌ Redis connection error:', err);
  });

// Test database connection on startup
  pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection error:', err);
  } else {
    console.log('✅ Database connected successfully');
  }
  });

  app.use(cors());
  app.use(express.json());

  // GET endpoint to fetch all research locations
  app.get('/api/research-locations', async (req, res) => {
    console.log('📍 Received request for research locations');
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
    let allFeatures = [];
    
    for (let offset = 0; offset < totalCount; offset += batchSize) {
      console.log(`🔍 Fetching batch ${offset / batchSize + 1}...`);
      
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

    console.log(`✅ Query successful - Found ${geojson.features.length} features`);
    console.log(`📋 First feature: ${geojson.features[0].properties.researcher}`);
    console.log(`📋 Last feature: ${geojson.features[geojson.features.length - 1].properties.researcher}`);

    res.setHeader('Content-Type', 'application/json');
    res.json(geojson);
  } catch (error) {
    console.error('❌ Error fetching locations:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  } finally {
    client.release();
  }
});

  // GET endpoint to fetch data from Redis cache for Map.js
  app.get('/api/redis/geodata', (req, res) => {
    console.log('🗺️ Map.js requesting for GeoJSON data');
    const cacheKey = 'parsedGeoData';
    redisClient.get(cacheKey).then((cachedData) => {
      if (cachedData) {
        console.log('📦 Returning cached GeoJSON data');
        return res.json(JSON.parse(cachedData));
      }
      else {
        console.log('🔍 Cache miss - Fetching data from PostgreSQL');
        exec('node src/geo/redis/parsedCache.js', (error, stdout, stderr) => {
          if (error) {
            console.error('❌ Error fetching data:', error);
            return res.status(500).json({ error: 'Internal server error', details: error.message });
          }
          console.log('✅ Data fetched successfully');
          return res.json(JSON.parse(stdout));
        });
      }
      }).catch((err) => {
      console.error('❌ Redis get error:', err);
      return res.status(500).json({ error: 'Internal server error', details: err.message });
    });
});

  app.get('/api/redis/query', async (req, res) => {
    console.log('🔍 Querying Redis cache');
    try {
      const expertKeys = await redisClient.keys('expert:*');
      console.log(`🔑 Found ${expertKeys.length} keys`);
      const geoFile = {
        type: 'FeatureCollection',
        features: []
      };

      for (const key of expertKeys) {
        const data = await redisClient.hGetAll(key);
        const feature = {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [
              data.longitude,
              data.latitude
            ]
          },
          properties: {
            researcher: data.researcher,
            location: data.location,
            works: JSON.parse(data.works),
            url: data.url
          }
        };
        geoFile.features.push(feature);
      }

      console.log('✅ GeoJSON constructed successfully');
      // Cache the GeoJSON data in Redis
      const cacheKey = 'expertGeoData';
      formattedData = JSON.stringify(geoFile, null, 2);
      const debugFilePath = path.join(__dirname, 'geo/redis/data', 'expertGeoData.json');
      fs.writeFileSync(debugFilePath, formattedData, 'utf8');
      console.log(`📝 GeoJSON data written to ${debugFilePath} for debugging purposes`);
      redisClient.set(cacheKey, 3600, formattedData).then(() => {
        console.log('📦 GeoJSON data cached successfully');
      }).catch((err) => {
        console.error('❌ Error caching GeoJSON data:', err);
      });

      res.setHeader('Content-Type', 'application/json');
      res.json(formattedData);
    } catch (error) {
      console.error('❌ Error constructing GeoJSON:', error);
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  });
  const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });


  // Add graceful shutdown handlers
  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);

  function gracefulShutdown() {
    console.log('Received kill signal, shutting down gracefully');
    server.close(async () => {
      try {
        // Close the database pool & Redis client
        await pool.end();
        redisClient.quit();
        console.log('Database pool has ended');
        console.log('Closed out remaining connections');
        process.exit(0);
      } catch (err) {
        console.error('Error during shutdown:', err);
        process.exit(1);
      }
    });

    // Force close after 10 seconds
    setTimeout(() => {
      console.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  }
}).catch((err) => {
  console.error('❌ Redis connection error:', err);
});