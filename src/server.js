const express = require('express');
const cors = require('cors');
const { pool, tables } = require('./geo/postgis/config');

const app = express();
const PORT = 3001;

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