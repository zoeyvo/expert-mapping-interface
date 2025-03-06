/**
 * viewTables.js
 *
 * Purpose:
 * Provides detailed view of database tables, including:
 * - Table structure and columns
 * - Row counts and data samples
 * - Index information
 * - Table sizes and statistics
 *
 * Usage:
 * node src/geo/postgis/viewTables.js [limit] [offset] [researcher_name]
 */

const { pool } = require('./config');

async function viewTables(limit = 50, offset = 0) {
    const client = await pool.connect();
    
    try {
        // Show table counts
        console.log('\n📊 Table Counts:');
        const counts = await client.query(`
            SELECT 
                (SELECT COUNT(*) FROM research_locations_point) as points,
                (SELECT COUNT(*) FROM research_locations_poly) as polygons,
                (SELECT COUNT(*) FROM research_locations_all) as total
        `);
        console.log('------------------------');
        console.log(`Points: ${counts.rows[0].points}`);
        console.log(`Polygons: ${counts.rows[0].polygons}`);
        console.log(`Total: ${counts.rows[0].total}`);

        // Show table sizes
        console.log('\n💾 Table Sizes:');
        const tableSizes = await client.query(`
            SELECT 
                table_name,
                pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) as total_size,
                pg_size_pretty(pg_table_size(quote_ident(table_name))) as table_size,
                pg_size_pretty(pg_indexes_size(quote_ident(table_name))) as index_size
            FROM (
                VALUES ('research_locations_point'), ('research_locations_poly')
            ) AS t(table_name)
        `);
        console.table(tableSizes.rows);

        // Sample of point locations
        console.log(`\n📍 Point Locations (showing ${limit} rows, offset ${offset}):`);
        const points = await client.query(`
            SELECT 
                id,
                name,
                ST_X(geom::geometry) as longitude,
                ST_Y(geom::geometry) as latitude,
                properties->>'type' as location_type,
                jsonb_array_length(properties->'researchers') as researcher_count,
                created_at
            FROM research_locations_point
            ORDER BY researcher_count DESC NULLS LAST
            LIMIT $1 OFFSET $2
        `, [limit, offset]);
        console.table(points.rows);

        // Sample of polygon locations
        console.log(`\n🗺️  Polygon Locations (showing ${limit} rows, offset ${offset}):`);
        const polygons = await client.query(`
            SELECT 
                id,
                name,
                properties->>'type' as location_type,
                ST_Area(geom::geography)/1000000 as area_km2,
                jsonb_array_length(properties->'researchers') as researcher_count,
                created_at
            FROM research_locations_poly
            ORDER BY researcher_count DESC NULLS LAST
            LIMIT $1 OFFSET $2
        `, [limit, offset]);
        console.table(polygons.rows);

        // Show researcher distribution
        console.log('\n👥 Researcher Distribution by Location Type:');
        const researcherDist = await client.query(`
            WITH location_researchers AS (
                SELECT 
                    properties->>'type' as location_type,
                    jsonb_array_length(properties->'researchers') as researcher_count
                FROM research_locations_all
                WHERE properties->'researchers' IS NOT NULL
            )
            SELECT 
                location_type,
                COUNT(*) as location_count,
                SUM(researcher_count) as total_researchers,
                ROUND(AVG(researcher_count)::numeric, 2) as avg_researchers_per_location,
                MAX(researcher_count) as max_researchers
            FROM location_researchers
            GROUP BY location_type
            ORDER BY total_researchers DESC NULLS LAST
            LIMIT 10
        `);
        console.table(researcherDist.rows);

    } catch (error) {
        console.error('❌ Error viewing tables:', error);
    } finally {
        client.release();
    }
}

async function viewResearcherDetails(researcherName) {
    const client = await pool.connect();
    console.log('\n📥 Researcher lookup request:');
    console.log('----------------------------------------');
    console.log(`Searching for: ${researcherName}`);
    
    try {
        console.log('🔍 Looking up researcher details...');
        const result = await client.query(`
            WITH researcher_data AS (
                SELECT 
                    l.id as location_id,
                    l.name as location_name,
                    l.properties->>'type' as location_type,
                    ST_AsGeoJSON(l.geom)::json as location_geometry,
                    r->>'name' as researcher_name,
                    r->>'url' as researcher_url,
                    r->'works' as works
                FROM research_locations_all l,
                jsonb_array_elements(l.properties->'researchers') r
                WHERE r->>'name' ILIKE $1
            )
            SELECT 
                researcher_name,
                researcher_url,
                works,
                json_agg(
                    json_build_object(
                        'location_id', location_id,
                        'name', location_name,
                        'type', location_type,
                        'geometry', location_geometry
                    )
                ) as locations
            FROM researcher_data
            GROUP BY researcher_name, researcher_url, works
        `, [`%${researcherName}%`]);

        if (result.rows.length === 0) {
            console.log('❌ No researchers found');
        } else {
            console.log('✅ Found researchers:');
            console.log('----------------------------------------');
            result.rows.forEach(row => {
                console.log(`\nResearcher: ${row.researcher_name}`);
                console.log(`URL: ${row.researcher_url}`);
                console.log(`Number of works: ${row.works.length}`);
                console.log(`Number of locations: ${row.locations.length}`);
                console.log('Locations:');
                row.locations.forEach(loc => {
                    console.log(`  - ${loc.name} (${loc.type})`);
                });
            });
        }
    } catch (error) {
        console.error('❌ Error viewing researcher details:', error);
    } finally {
        client.release();
    }
}

if (require.main === module) {
    const limit = process.argv[2] ? parseInt(process.argv[2]) : 50;
    const offset = process.argv[3] ? parseInt(process.argv[3]) : 0;
    const researcherName = process.argv[4];
    
    Promise.all([
        viewTables(limit, offset),
        researcherName ? viewResearcherDetails(researcherName) : Promise.resolve()
    ])
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = {
    viewTables,
    viewResearcherDetails
}; 