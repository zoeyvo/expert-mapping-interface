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
    console.log('🔍 Executing PostGIS query...');
    const result = await client.query(`
      WITH sample_locations AS (
        SELECT *
        FROM research_locations
        WHERE geom IS NOT NULL
        LIMIT 5
      )
      SELECT json_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(
          array_agg(
            json_build_object(
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
            )
          ),
          ARRAY[]::json[]
        )
      ) as geojson
      FROM sample_locations;
    `);

    const geojson = result.rows[0].geojson;
    
    // Set proper headers
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // Send response
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