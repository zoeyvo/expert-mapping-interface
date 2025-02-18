const { pool, tables } = require('./config');

async function checkTables() {
  const client = await pool.connect();
  
  try {
    // Check counts
    console.log('\n📊 Row Counts:');
    for (const [key, tableName] of Object.entries(tables)) {
      const result = await client.query(`SELECT COUNT(*) FROM ${tableName}`);
      console.log(`${tableName}: ${result.rows[0].count} rows`);
    }

    // Sample locations
    console.log('\n📍 Sample Locations:');
    const locations = await client.query(`
      SELECT name, normalized_name, ST_AsText(geom) as coordinates 
      FROM ${tables.locations} 
      LIMIT 5
    `);
    console.table(locations.rows);

    // Sample researchers with locations
    console.log('\n👥 Sample Researchers with Locations:');
    const researchers = await client.query(`
      SELECT 
        r.name as researcher,
        l.name as location,
        r.url,
        COUNT(w.id) as work_count
      FROM ${tables.researchers} r
      JOIN ${tables.locations} l ON r.location_id = l.id
      LEFT JOIN ${tables.works} w ON w.researcher_id = r.id
      GROUP BY r.name, l.name, r.url
      LIMIT 5
    `);
    console.table(researchers.rows);

    // Sample works
    console.log('\n📚 Sample Works:');
    const works = await client.query(`
      SELECT 
        w.title,
        r.name as researcher
      FROM ${tables.works} w
      JOIN ${tables.researchers} r ON w.researcher_id = r.id
      LIMIT 5
    `);
    console.table(works.rows);

  } catch (error) {
    console.error('Error checking tables:', error);
  } finally {
    client.release();
  }
}

if (require.main === module) {
  checkTables()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { checkTables }; 