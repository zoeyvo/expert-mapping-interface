/**
 * createTables.js
 *
 * Purpose:
 * Creates and initializes the PostgreSQL/PostGIS tables needed for the application.
 * Sets up research_locations table with geometry and JSON properties support.
 *
 * Usage:
 * node src/geo/postgis/createTables.js
 *
 * Schema:
 * research_locations
 *   - id: Serial primary key
 *   - geom: PostGIS geometry (Point, SRID: 4326)
 *   - properties: JSONB (researcher, location, works, url)
 *   - created_at: Timestamp
 *   - updated_at: Timestamp
 */

const { pool, tables } = require('./config');

async function createTables() {
  const client = await pool.connect();
  
  try {
    // Start transaction
    await client.query('BEGIN');

    // Enable PostGIS extension if not enabled
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS postgis;
    `);

    // Create a single table to store GeoJSON features
    await client.query(`
      CREATE TABLE IF NOT EXISTS research_locations (
        id SERIAL PRIMARY KEY,
        geom GEOMETRY(Point, 4326),
        properties JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Create unique constraint
      CREATE UNIQUE INDEX IF NOT EXISTS unique_researcher_location 
      ON research_locations ((properties->>'researcher'), (properties->>'location'));

      -- Create spatial index
      CREATE INDEX IF NOT EXISTS research_locations_geom_idx 
      ON research_locations USING GIST (geom);

      -- Create GIN index for JSON properties searching
      CREATE INDEX IF NOT EXISTS research_locations_properties_idx 
      ON research_locations USING GIN (properties);
    `);

    await client.query('COMMIT');
    console.log('✅ Tables created successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating tables:', error);
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  createTables()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = createTables; 