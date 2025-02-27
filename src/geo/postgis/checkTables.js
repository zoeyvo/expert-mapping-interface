const { pool } = require('./config');

async function checkTables() {
  const client = await pool.connect();
  
  try {
    // Check total count
    console.log('\n📊 Row Count:');
    const countResult = await client.query('SELECT COUNT(*) FROM research_locations');
    console.log(`research_locations: ${countResult.rows[0].count} rows`);

    // Sample locations with researchers
    console.log('\n📍 Sample Research Locations:');
    const locations = await client.query(`
      SELECT 
        id,
        ST_X(geom) as longitude,
        ST_Y(geom) as latitude,
        properties->>'researcher' as researcher,
        properties->>'location' as location,
        properties->>'url' as url,
        jsonb_array_length(properties->'works') as work_count
      FROM research_locations
      LIMIT 5
    `);
    console.table(locations.rows);

    // Check spatial extent
    console.log('\n🌍 Spatial Extent:');
    const extent = await client.query(`
      SELECT 
        ST_XMin(ST_Extent(geom)) as min_longitude,
        ST_XMax(ST_Extent(geom)) as max_longitude,
        ST_YMin(ST_Extent(geom)) as min_latitude,
        ST_YMax(ST_Extent(geom)) as max_latitude
      FROM research_locations
    `);
    console.table(extent.rows);

    // Sample works
    console.log('\n📚 Sample Works:');
    const works = await client.query(`
      SELECT 
        properties->>'researcher' as researcher,
        properties->>'location' as location,
        jsonb_array_elements_text(properties->'works') as work_title
      FROM research_locations
      LIMIT 5
    `);
    console.table(works.rows);

    // Add this to your checkTables function
    console.log('\n🔍 Sample Raw Data:');
    const sampleData = await client.query(`
      SELECT 
        ST_AsGeoJSON(geom) as geometry,
        properties,
        created_at
      FROM research_locations
      LIMIT 1;
    `);
    console.log(JSON.stringify(sampleData.rows[0], null, 2));

  } catch (error) {
    console.error('❌ Error checking tables:', error);
  } finally {
    client.release();
  }
}

// If this file is run directly (not required as a module)
if (require.main === module) {
  checkTables()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = checkTables; 