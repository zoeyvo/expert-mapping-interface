/**
 * createTables.js
 *
 * Purpose:
 * Creates and initializes the PostgreSQL/PostGIS tables needed for the application.
 * Sets up research locations tables with support for both points and polygons,
 * along with JSON properties support.
 *
 * Tables:
 * - research_locations_point: For point geometries (specific locations)
 * - research_locations_poly: For polygon geometries (areas/regions)
 * Both tables include full researcher and work information in JSONB properties
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

    // Create table for point geometries
    await client.query(`
      CREATE TABLE IF NOT EXISTS research_locations_point (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        geom GEOMETRY(Point, 4326),
        properties JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Create spatial index for points
      CREATE INDEX IF NOT EXISTS research_locations_point_geom_idx 
      ON research_locations_point USING GIST (geom);

      -- Create GIN index for JSON properties searching
      CREATE INDEX IF NOT EXISTS research_locations_point_properties_idx 
      ON research_locations_point USING GIN (properties);

      -- Create index on name
      CREATE INDEX IF NOT EXISTS research_locations_point_name_idx 
      ON research_locations_point (name);
    `);

    // Create table for polygon geometries
    await client.query(`
      CREATE TABLE IF NOT EXISTS research_locations_poly (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        geom GEOMETRY(Polygon, 4326),
        properties JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Create spatial index for polygons
      CREATE INDEX IF NOT EXISTS research_locations_poly_geom_idx 
      ON research_locations_poly USING GIST (geom);

      -- Create GIN index for JSON properties searching
      CREATE INDEX IF NOT EXISTS research_locations_poly_properties_idx 
      ON research_locations_poly USING GIN (properties);

      -- Create index on name
      CREATE INDEX IF NOT EXISTS research_locations_poly_name_idx 
      ON research_locations_poly (name);
    `);

    // Create a view that combines both point and polygon locations
    await client.query(`
      CREATE OR REPLACE VIEW research_locations_all AS
        SELECT 
          id,
          name,
          geom,
          properties,
          'point' as geometry_type,
          created_at,
          updated_at
        FROM research_locations_point
      UNION ALL
        SELECT 
          id,
          name,
          geom,
          properties,
          'polygon' as geometry_type,
          created_at,
          updated_at
        FROM research_locations_poly;
    `);

    // Create update trigger function if it doesn't exist
    await client.query(`
      CREATE OR REPLACE FUNCTION update_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Add update triggers to both tables
    await client.query(`
      DROP TRIGGER IF EXISTS update_research_locations_point_timestamp 
      ON research_locations_point;
      
      CREATE TRIGGER update_research_locations_point_timestamp
        BEFORE UPDATE ON research_locations_point
        FOR EACH ROW
        EXECUTE FUNCTION update_timestamp();

      DROP TRIGGER IF EXISTS update_research_locations_poly_timestamp 
      ON research_locations_poly;
      
      CREATE TRIGGER update_research_locations_poly_timestamp
        BEFORE UPDATE ON research_locations_poly
        FOR EACH ROW
        EXECUTE FUNCTION update_timestamp();
    `);

    await client.query('COMMIT');
    console.log('✅ Tables created successfully');
    console.log('📍 Point geometries table: research_locations_point');
    console.log('🗺️  Polygon geometries table: research_locations_poly');
    console.log('👁️  Combined view: research_locations_all');
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