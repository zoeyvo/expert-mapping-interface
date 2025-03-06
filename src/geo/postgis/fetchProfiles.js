/**
 * fetchProfiles.js
 * 
 * Purpose:
 * Provides functions to fetch and analyze researcher profiles
 * from the PostGIS database.
 */

const { pool } = require('./config');

async function fetchResearcherProfiles(options = {}) {
  const {
    locationId = null,
    researcherName = null,
    bbox = null,
    limit = 100,
    offset = 0
  } = options;

  const client = await pool.connect();
  try {
    let query = `
      WITH researcher_data AS (
        SELECT 
          l.id as location_id,
          l.name as location_name,
          l.properties->>'type' as location_type,
          ST_AsGeoJSON(l.geom)::json as location_geometry,
          jsonb_array_elements(l.properties->'researchers') as researcher
        FROM research_locations_all l
        WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    // Add location filter if specified
    if (locationId) {
      query += ` AND l.id = $${paramCount}`;
      params.push(locationId);
      paramCount++;
    }

    // Add bbox filter if specified
    if (bbox) {
      const [minLon, minLat, maxLon, maxLat] = bbox;
      query += ` AND ST_Intersects(l.geom, ST_MakeEnvelope($${paramCount}, $${paramCount+1}, $${paramCount+2}, $${paramCount+3}, 4326))`;
      params.push(minLon, minLat, maxLon, maxLat);
      paramCount += 4;
    }

    query += `
      )
      SELECT 
        location_id,
        location_name,
        location_type,
        location_geometry,
        researcher->>'name' as researcher_name,
        researcher->>'url' as researcher_url,
        researcher->'works' as works
      FROM researcher_data
    `;

    // Add researcher name filter if specified
    if (researcherName) {
      query += ` WHERE researcher->>'name' ILIKE $${paramCount}`;
      params.push(`%${researcherName}%`);
      paramCount++;
    }

    // Add ordering and pagination
    query += `
      ORDER BY location_name, researcher->>'name'
      LIMIT $${paramCount} OFFSET $${paramCount+1}
    `;
    params.push(limit, offset);

    const result = await client.query(query, params);
    return result.rows;

  } catch (error) {
    console.error('Error fetching researcher profiles:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function getResearcherStats() {
  const client = await pool.connect();
  try {
    const stats = await client.query(`
      WITH researcher_data AS (
        SELECT 
          jsonb_array_elements(properties->'researchers') as researcher
        FROM research_locations_all
      ),
      work_data AS (
        SELECT 
          researcher->>'name' as researcher_name,
          jsonb_array_length(researcher->'works') as work_count
        FROM researcher_data
      )
      SELECT 
        COUNT(DISTINCT researcher_name) as total_researchers,
        SUM(work_count) as total_works,
        ROUND(AVG(work_count)::numeric, 2) as avg_works_per_researcher,
        MAX(work_count) as max_works
      FROM work_data
    `);

    // Get top researchers by work count
    const topResearchers = await client.query(`
      WITH researcher_data AS (
        SELECT 
          jsonb_array_elements(properties->'researchers') as researcher
        FROM research_locations_all
      )
      SELECT 
        researcher->>'name' as name,
        jsonb_array_length(researcher->'works') as work_count
      FROM researcher_data
      ORDER BY jsonb_array_length(researcher->'works') DESC
      LIMIT 10
    `);

    return {
      summary: stats.rows[0],
      topResearchers: topResearchers.rows
    };

  } catch (error) {
    console.error('Error getting researcher stats:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function findResearchersByLocation(lat, lon, radiusMeters = 10000) {
  const client = await pool.connect();
  try {
    const researchers = await client.query(`
      WITH nearby_locations AS (
        SELECT 
          id,
          name as location_name,
          properties->>'type' as location_type,
          ST_Distance(
            geom::geography,
            ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
          ) as distance,
          jsonb_array_elements(properties->'researchers') as researcher
        FROM research_locations_all
        WHERE ST_DWithin(
          geom::geography,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          $3
        )
      )
      SELECT 
        location_name,
        location_type,
        ROUND((distance/1000)::numeric, 2) as distance_km,
        researcher->>'name' as researcher_name,
        researcher->>'url' as researcher_url,
        jsonb_array_length(researcher->'works') as work_count
      FROM nearby_locations
      ORDER BY distance, location_name, researcher->>'name'
    `, [lon, lat, radiusMeters]);

    return researchers.rows;

  } catch (error) {
    console.error('Error finding researchers by location:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Example usage
async function main() {
  try {
    console.log('📊 Fetching researcher statistics...');
    const stats = await getResearcherStats();
    
    console.log('\nResearcher Summary:');
    console.log('-------------------');
    console.log(`Total Researchers: ${stats.summary.total_researchers}`);
    console.log(`Total Works: ${stats.summary.total_works}`);
    console.log(`Average Works per Researcher: ${stats.summary.avg_works_per_researcher}`);
    console.log(`Maximum Works by a Researcher: ${stats.summary.max_works}`);

    console.log()
  } catch (error) {
    console.error('Error:', error);
  } finally {
    pool.end();
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  fetchResearcherProfiles,
  getResearcherStats,
  findResearchersByLocation
};