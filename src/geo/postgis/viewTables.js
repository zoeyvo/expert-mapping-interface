const { pool, tables } = require('./config');

async function viewTables(limit = 50, offset = 0) {
    const client = await pool.connect();
    
    try {
        // Show total counts
        console.log('\n📊 Total Counts:');
        for (const [key, tableName] of Object.entries(tables)) {
            const result = await client.query(`SELECT COUNT(*) FROM ${tableName}`);
            console.log(`${tableName}: ${result.rows[0].count} rows`);
        }

        // Locations with coordinates
        console.log(`\n📍 Locations (showing ${limit} rows, starting at ${offset}):`);
        const locations = await client.query(`
            SELECT 
                id,
                name as location_name,
                ST_X(geom) as longitude,
                ST_Y(geom) as latitude
            FROM ${tables.locations}
            ORDER BY location_name
            LIMIT $1 OFFSET $2;
        `, [limit, offset]);
        console.table(locations.rows);

        // Researchers with their locations and work counts
        console.log(`\n👥 Researchers (showing ${limit} rows, starting at ${offset}):`);
        const researchers = await client.query(`
            SELECT 
                r.id,
                r.name as researcher_name,
                r.url,
                l.name as location_name,
                COUNT(w.id) as work_count
            FROM ${tables.researchers} r
            JOIN ${tables.locations} l ON r.location_id = l.id
            LEFT JOIN ${tables.works} w ON w.researcher_id = r.id
            GROUP BY r.id, r.name, l.name, r.url
            ORDER BY work_count DESC, researcher_name
            LIMIT $1 OFFSET $2;
        `, [limit, offset]);
        console.table(researchers.rows);

        // Works with their metadata
        console.log(`\n📚 Works (showing ${limit} rows, starting at ${offset}):`);
        const works = await client.query(`
            SELECT 
                w.id,
                w.title,
                r.name as researcher_name,
                l.name as location_name
            FROM ${tables.works} w
            JOIN ${tables.researchers} r ON w.researcher_id = r.id
            JOIN ${tables.locations} l ON r.location_id = l.id
            ORDER BY researcher_name, w.title
            LIMIT $1 OFFSET $2;
        `, [limit, offset]);
        console.table(works.rows);

    } catch (error) {
        console.error('Error viewing tables:', error);
    } finally {
        client.release();
    }
}

// Run if called directly
if (require.main === module) {
    const limit = parseInt(process.argv[2]) || 50;
    const offset = parseInt(process.argv[3]) || 0;
    viewTables(limit, offset).then(() => process.exit(0));
}

module.exports = viewTables; 