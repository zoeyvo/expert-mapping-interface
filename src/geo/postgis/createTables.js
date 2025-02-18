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

    // Create locations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${tables.locations} (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        normalized_name VARCHAR(255) NOT NULL,
        geom GEOMETRY(Point, 4326),
        UNIQUE(normalized_name)
      );
    `);

    // Create researchers table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${tables.researchers} (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        url VARCHAR(255),
        location_id INTEGER REFERENCES ${tables.locations}(id),
        UNIQUE(name, location_id)
      );
    `);

    // Create works table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${tables.works} (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        researcher_id INTEGER REFERENCES ${tables.researchers}(id),
        UNIQUE(title, researcher_id)
      );
    `);

    // Create spatial indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS locations_geom_idx 
      ON ${tables.locations} USING GIST (geom);
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

module.exports = { createTables }; 