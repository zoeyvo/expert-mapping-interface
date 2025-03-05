/**
 * loadGeoJson.js
 * 
 * Purpose:
 * Loads GeoJSON data into PostGIS database with upsert functionality.
 * Updates existing records or inserts new ones based on researcher and location.
 * 
 * Usage:
 * node src/geo/postgis/loadGeoJson.js ./public/data/research_profiles.geojson
 * 
 * Process:
 * 1. Reads GeoJSON file
 * 2. For each feature:
 *    - Attempts to update existing record
 *    - If no record exists, inserts new one
 * 3. Uses transaction to ensure data integrity
 */

const fs = require('fs');
const path = require('path');
const { pool } = require('./config');

async function loadGeoJson(geoJsonPath) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const geoJson = JSON.parse(fs.readFileSync(geoJsonPath, 'utf8'));
    
    for (const feature of geoJson.features) {
      const { geometry, properties } = feature;
      
      const updateResult = await client.query(`
        UPDATE research_locations 
        SET 
          geom = ST_SetSRID(ST_GeomFromGeoJSON($1), 4326),
          properties = $2::jsonb,
          updated_at = CURRENT_TIMESTAMP
        WHERE 
          properties->>'researcher' = $3 
          AND properties->>'location' = $4
        RETURNING id
      `, [
        JSON.stringify(geometry),
        JSON.stringify(properties),
        properties.researcher,
        properties.location
      ]);

      if (updateResult.rowCount === 0) {
        await client.query(`
          INSERT INTO research_locations (
            geom,
            properties
          ) VALUES (
            ST_SetSRID(ST_GeomFromGeoJSON($1), 4326),
            $2::jsonb
          )
        `, [
          JSON.stringify(geometry),
          JSON.stringify(properties)
        ]);
      }
    }

    await client.query('COMMIT');
    console.log('✅ GeoJSON loaded successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error loading GeoJSON:', error);
    throw error;
  } finally {
    client.release();
  }
}

// If this file is run directly (not required as a module)
if (require.main === module) {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Please provide a GeoJSON file path');
    process.exit(1);
  }
  loadGeoJson(filePath)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = loadGeoJson; 