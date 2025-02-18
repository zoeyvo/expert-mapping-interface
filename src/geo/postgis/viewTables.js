const { pool, tables } = require('./config');

async function viewTables() {
    const client = await pool.connect();
    
    try {
        // Locations with coordinates
        console.log('\n📍 Locations:');
        const locations = await client.query(`
            SELECT 
                id,
                name,
                normalized_name,
                ST_X(geom) as longitude,
                ST_Y(geom) as latitude
            FROM ${tables.locations}
            ORDER BY name
            LIMIT 10;
        `);
        console.table(locations.rows);

        // Researchers with their locations
        console.log('\n👥 Researchers:');
        const researchers = await client.query(`
            SELECT 
                r.id,
                r.name as researcher_name,
                l.name as location_name,
                r.url,
                COUNT(w.id) as work_count
            FROM ${tables.researchers} r
            JOIN ${tables.locations} l ON r.location_id = l.id
            LEFT JOIN ${tables.works} w ON w.researcher_id = r.id
            GROUP BY r.id, r.name, l.name, r.url
            ORDER BY work_count DESC
            LIMIT 10;
        `);
        console.table(researchers.rows);

        // Works with their researchers
        console.log('\n📚 Works:');
        const works = await client.query(`
            SELECT 
                w.id,
                LEFT(w.title, 50) as title_preview,
                r.name as researcher,
                l.name as location
            FROM ${tables.works} w
            JOIN ${tables.researchers} r ON w.researcher_id = r.id
            JOIN ${tables.locations} l ON r.location_id = l.id
            ORDER BY w.id
            LIMIT 10;
        `);
        console.table(works.rows);

        // Summary statistics
        console.log('\n📊 Summary Statistics:');
        const stats = await client.query(`
            SELECT
                (SELECT COUNT(*) FROM ${tables.locations}) as location_count,
                (SELECT COUNT(*) FROM ${tables.researchers}) as researcher_count,
                (SELECT COUNT(*) FROM ${tables.works}) as work_count,
                (SELECT COUNT(DISTINCT location_id) FROM ${tables.researchers}) as unique_locations,
                (SELECT AVG(work_count)::numeric(10,2) 
                 FROM (
                     SELECT COUNT(w.id) as work_count 
                     FROM ${tables.researchers} r 
                     LEFT JOIN ${tables.works} w ON w.researcher_id = r.id 
                     GROUP BY r.id
                 ) as work_counts
                ) as avg_works_per_researcher
        `);
        console.table(stats.rows);

    } catch (error) {
        console.error('Error viewing tables:', error);
    } finally {
        client.release();
    }
}

if (require.main === module) {
    viewTables().then(() => process.exit());
}

module.exports = { viewTables }; 