const fs = require('fs');
const path = require('path');
const { pool, tables } = require('./config');

async function loadGeoJson(geoJsonPath) {
  const client = await pool.connect();
  
  try {
    const geoJson = JSON.parse(fs.readFileSync(geoJsonPath, 'utf-8'));
    await client.query('BEGIN');

    for (const feature of geoJson.features) {
      const {
        geometry: { coordinates },
        properties: { researcher, location, works, url }
      } = feature;

      // Insert location
      const locationResult = await client.query(`
        INSERT INTO ${tables.locations} (
          name, 
          geom,
          original_coordinates
        )
        VALUES (
          $1, 
          ST_SetSRID(ST_MakePoint($2, $3), 4326),
          $4::jsonb
        )
        ON CONFLICT (name) 
        DO UPDATE SET 
          geom = EXCLUDED.geom,
          original_coordinates = EXCLUDED.original_coordinates
        RETURNING id;
      `, [
        location,
        coordinates[0],
        coordinates[1],
        JSON.stringify(coordinates)
      ]);

      const locationId = locationResult.rows[0].id;

      // Insert researcher
      const researcherResult = await client.query(`
        INSERT INTO ${tables.researchers} (
          name,
          url,
          location_id
        )
        VALUES ($1, $2, $3)
        ON CONFLICT (name, location_id) 
        DO UPDATE SET url = EXCLUDED.url
        RETURNING id;
      `, [
        researcher,
        url,
        locationId
      ]);

      const researcherId = researcherResult.rows[0].id;

      // Insert works
      for (const work of works) {
        await client.query(`
          INSERT INTO ${tables.works} (
            title, 
            researcher_id,
            metadata
          )
          VALUES ($1, $2, $3)
          ON CONFLICT (title, researcher_id) DO NOTHING;
        `, [
          work, 
          researcherId,
          JSON.stringify({ original_work: work })
        ]);
      }
    }

    await client.query('COMMIT');
    console.log('✅ GeoJSON data loaded successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error loading GeoJSON:', error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = loadGeoJson;

// Run if called directly
if (require.main === module) {
  const geoJsonPath = process.argv[2];
  if (!geoJsonPath) {
    console.error('Please provide path to GeoJSON file');
    process.exit(1);
  }
  loadGeoJson(geoJsonPath).then(() => process.exit(0));
} 