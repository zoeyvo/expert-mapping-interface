const { pool } = require('./config');

async function viewTables(limit = 50, offset = 0) {
    const client = await pool.connect();
    
    try {
        // Show total count
        console.log('\n📊 Total Count:');
        const result = await client.query('SELECT COUNT(*) FROM research_locations');
        console.log(`research_locations: ${result.rows[0].count} rows`);

        // Locations with researchers and work counts
        console.log(`\n📍 Research Locations (showing ${limit} rows, starting at ${offset}):`);
        const locations = await client.query(`
            SELECT 
                id,
                ST_X(geom) as longitude,
                ST_Y(geom) as latitude,
                properties->>'researcher' as researcher_name,
                properties->>'location' as location_name,
                properties->>'url' as url,
                jsonb_array_length(properties->'works') as work_count,
                created_at,
                updated_at
            FROM research_locations
            ORDER BY properties->>'researcher'
            LIMIT $1 OFFSET $2;
        `, [limit, offset]);
        console.table(locations.rows);

        // Works with their researchers
        console.log(`\n📚 Works (showing ${limit} rows, starting at ${offset}):`);
        const works = await client.query(`
            SELECT 
                properties->>'researcher' as researcher_name,
                properties->>'location' as location_name,
                jsonb_array_elements_text(properties->'works') as work_title
            FROM research_locations
            LIMIT $1 OFFSET $2;
        `, [limit, offset]);
        console.table(works.rows);

    } catch (error) {
        console.error('❌ Error viewing tables:', error);
    } finally {
        client.release();
    }
}

// If this file is run directly (not required as a module)
if (require.main === module) {
    const limit = process.argv[2] ? parseInt(process.argv[2]) : 50;
    const offset = process.argv[3] ? parseInt(process.argv[3]) : 0;
    
    viewTables(limit, offset)
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = viewTables; 