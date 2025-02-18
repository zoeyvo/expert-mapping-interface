const fs = require('fs');
const path = require('path');
const { pool, tables } = require('./config');
const { normalizeLocationName } = require('../etl/utils');

async function loadGeoJson(geoJsonPath) {
  const client = await pool.connect();
  
  try {
    const geoJson = JSON.parse(fs.readFileSync(geoJsonPath, 'utf-8'));
    await client.query('BEGIN');

    for (const feature of geoJson.features) {
      const {
        geometry: { coordinates },
        properties: { researcher, works, url }
      } = feature;

      // Extract location from works (you may want to adjust this logic)
      const locationName = works[0].match(/in ([^,\.]+)/)?.[1] || 'Unknown';
      const normalizedLocation = normalizeLocationName(locationName);

      // Insert or get location
      const locationResult = await client.query(`
        INSERT INTO ${tables.locations} (name, normalized_name, geom)
        VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326))
        ON CONFLICT (normalized_name) DO UPDATE SET geom = EXCLUDED.geom
        RETURNING id;
      `, [locationName, normalizedLocation, coordinates[0], coordinates[1]]);

      const locationId = locationResult.rows[0].id;

      // Insert or get researcher
      const researcherResult = await client.query(`
        INSERT INTO ${tables.researchers} (name, url, location_id)
        VALUES ($1, $2, $3)
        ON CONFLICT (name, location_id) DO UPDATE SET url = EXCLUDED.url
        RETURNING id;
      `, [researcher, url, locationId]);

      const researcherId = researcherResult.rows[0].id;

      // Insert works
      for (const work of works) {
        await client.query(`
          INSERT INTO ${tables.works} (title, researcher_id)
          VALUES ($1, $2)
          ON CONFLICT (title, researcher_id) DO NOTHING;
        `, [work, researcherId]);
      }
    }

    await client.query('COMMIT');
    console.log('🎉 GeoJSON data loaded successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error loading GeoJSON:', error);
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  const geoJsonPath = path.join(__dirname, '../data/json/research_profiles.geojson');
  loadGeoJson(geoJsonPath)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { loadGeoJson }; 