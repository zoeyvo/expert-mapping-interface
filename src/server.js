const express = require('express');
const cors = require('cors');
const { pool, tables } = require('./geo/postgis/config');
const { createClient } = require('redis');
const { exec } = require('child_process');

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

// New endpoint to fetch GeoJSON data from Redis
app.get('/api/redis/geodata', (req, res) => {
  console.log('🗺️ Map.js requesting for GeoJSON data');
  const cacheKey = 'research-locations';
  redisClient.get(cacheKey).then((cachedData) => {
    if (cachedData) {
      console.log('📦 Returning cached GeoJSON data');
      return res.json(JSON.parse(cachedData));
    } else {
      return res.status(404).json({ error: 'GeoJSON data not found in cache' });
    }
  }).catch((err) => {
    console.error('❌ Redis get error:', err);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  });
});

app.get('/api/redis/cache', (req, res) => {
  console.log('📦 Caching GeoJSON data in Redis');
  const cacheKey = 'research-locations';
  redisClient.get(cacheKey).then((cachedData) => {
    if (cachedData) {
      console.log('📦 GeoJSON data already cached');
      return res.json({ message: 'GeoJSON data already cached' });
    } else {
      // Run fetchProfiles.js to get the data
      exec('node src/geo/postgis/fetchProfiles.js', (error, stdout, stderr) => {
        if (error) {
          console.error('❌ Error caching data:', error);
          return res.status(500).json({ error: 'Internal server error', details: error.message });
        }
        console.log('🔄 Fetching data from API...');
        // This stuff needs debugging badly
        // Need to figure out a method to get data from this file without changing the stdout of this file
      //   const geodata = require('./geo/data/json/formatted_response_latest.json');
      //   console.log('🔄 Data fetched successfully');
      //   redisClient.set(cacheKey, JSON.stringify(geodata), 'EX', 86400, (err, reply) => {
      //     if (err) {
      //       console.error('❌ Error caching data:', err);
      //       return res.status(500).json({ error: 'Internal server error', details: err.message });
      //     } else {
      //       console.log('📦 GeoJSON data cached successfully');
      //       return res.json({ message: 'GeoJSON data cached successfully' });
      //     }
      //   });
      //   return res.json({ message: 'GeoJSON data cached successfully' });
      // });
    }
        });
      });
    }
  }).catch((err) => {
    console.error('❌ Redis get error:', err);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  });
  
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
      // Close the database pool
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