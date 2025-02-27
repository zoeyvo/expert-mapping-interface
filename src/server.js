const express = require('express');
const cors = require('cors');
const { pool, tables } = require('./geo/postgis/config');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// GET endpoint to fetch all research locations
app.get('/api/research-locations', async (req, res) => {
  const client = await pool.connect();

  try {
    const result = await client.query(`
      SELECT
        json_build_object(
          'type', 'FeatureCollection',
          'features', json_agg(
            json_build_object(
              'type', 'Feature',
              'geometry', ST_AsGeoJSON(l.geom)::json,
              'properties', json_build_object(
                'researcher', r.name,
                'location', l.name,
                'works', array_agg(w.title),
                'url', r.url
              )
            )
          )
        ) as geojson
      FROM ${tables.locations} l
      JOIN ${tables.researchers} r ON r.location_id = l.id
      LEFT JOIN ${tables.works} w ON w.researcher_id = r.id
      GROUP BY l.id, l.geom, l.name, r.name, r.url;
    `);

    res.json(result.rows[0].geojson);
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
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