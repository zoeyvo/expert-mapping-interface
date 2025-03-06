const express = require('express');
const cors = require('cors');
const { pool } = require('./geo/postgis/config');

const app = express();
const PORT = 3001;

let activeConnections = 0;

// Test database connection on startup
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection error:', err);
  } else {
    console.log('✅ Database connected successfully');
  }
});

app.use(cors());
app.use(express.json());

// Connection tracking middleware
app.use((req, res, next) => {
  activeConnections++;
  console.log(`\n📈 Active connections: ${activeConnections}`);
  console.log(`📥 ${req.method} request to ${req.path}`);
  
  res.on('finish', () => {
    activeConnections--;
    console.log(`\n📉 Request completed. Active connections: ${activeConnections}`);
  });
  next();
});

// GET endpoint to fetch all research locations
app.get('/api/research-locations', async (req, res) => {
  console.log('📍 Received request for research locations');
  const client = await pool.connect();
  console.log('✅ Database connection established');
  
  try {
    // Get total count first
    const countResult = await client.query(`
      SELECT COUNT(*) FROM research_locations_all;
    `);
    const totalCount = parseInt(countResult.rows[0].count);
    console.log(`📊 Total locations in database: ${totalCount}`);

    // Get all features in batches
    const batchSize = 100;
    let allFeatures = [];
    
    for (let offset = 0; offset < totalCount; offset += batchSize) {
      console.log(`🔍 Fetching batch ${offset / batchSize + 1}/${Math.ceil(totalCount/batchSize)}...`);
      
      const result = await client.query(`
        SELECT json_build_object(
          'type', 'Feature',
          'geometry', ST_AsGeoJSON(geom)::json,
          'properties', json_build_object(
            'id', id,
            'name', name,
            'type', properties->>'type',
            'researchers', properties->'researchers',
            'geometry_type', geometry_type
          )
        ) as feature
        FROM research_locations_all
        ORDER BY name
        LIMIT $1 OFFSET $2;
      `, [batchSize, offset]);
      
      allFeatures = allFeatures.concat(result.rows.map(row => row.feature));
    }

    const geojson = {
      type: 'FeatureCollection',
      features: allFeatures
    };

    console.log(`✅ Query successful - Found ${geojson.features.length} features`);
    console.log('📤 Sending response...');
    res.json(geojson);
  } catch (error) {
    console.error('❌ Error fetching locations:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  } finally {
    console.log('👋 Releasing database connection');
    client.release();
  }
});

// GET endpoint to fetch researcher profiles
app.get('/api/researchers', async (req, res) => {
  const { name, location, limit = 50, offset = 0 } = req.query;
  console.log('\n📥 Received researcher profiles request:');
  console.log('----------------------------------------');
  console.log(`Name filter: ${name || 'none'}`);
  console.log(`Location filter: ${location || 'none'}`);
  console.log(`Limit: ${limit}`);
  console.log(`Offset: ${offset}`);
  
  const client = await pool.connect();
  console.log('✅ Database connection established');
  
  try {
    let query = `
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
        WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (name) {
      query += ` AND r->>'name' ILIKE $${paramCount}`;
      params.push(`%${name}%`);
      paramCount++;
    }

    if (location) {
      query += ` AND l.name ILIKE $${paramCount}`;
      params.push(`%${location}%`);
      paramCount++;
    }

    query += `) SELECT 
        researcher_name,
        researcher_url,
        jsonb_array_length(works) as work_count,
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
      ORDER BY researcher_name
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    params.push(limit, offset);

    console.log('🔍 Executing query...');
    const result = await client.query(query, params);
    console.log(`✅ Found ${result.rows.length} researchers`);
    
    if (result.rows.length > 0) {
      console.log('\n📊 Sample results:');
      console.log(`First researcher: ${result.rows[0].researcher_name}`);
      console.log(`Last researcher: ${result.rows[result.rows.length - 1].researcher_name}`);
    }
    
    console.log('📤 Sending response...');
    res.json({
      count: result.rows.length,
      researchers: result.rows
    });
  } catch (error) {
    console.error('❌ Error fetching researchers:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  } finally {
    console.log('👋 Releasing database connection');
    client.release();
  }
});

// GET endpoint to fetch researcher details by name
app.get('/api/researchers/:name', async (req, res) => {
  const { name } = req.params;
  console.log('\n📥 Received researcher detail request:');
  console.log('----------------------------------------');
  console.log(`Researcher name: ${name}`);
  
  const client = await pool.connect();
  console.log('✅ Database connection established');
  
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
        WHERE r->>'name' = $1
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
    `, [name]);

    if (result.rows.length === 0) {
      console.log('❌ Researcher not found');
      res.status(404).json({ error: 'Researcher not found' });
    } else {
      console.log('✅ Researcher found');
      console.log(`📊 Number of locations: ${result.rows[0].locations.length}`);
      console.log(`📚 Number of works: ${result.rows[0].works.length}`);
      console.log('📤 Sending response...');
      res.json(result.rows[0]);
    }
  } catch (error) {
    console.error('❌ Error fetching researcher details:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  } finally {
    console.log('👋 Releasing database connection');
    client.release();
  }
});

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// Add graceful shutdown handlers
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

function gracefulShutdown() {
  console.log('\n🛑 Received kill signal, shutting down gracefully');
  console.log(`ℹ️  Active connections: ${activeConnections}`);
  
  server.close(async () => {
    try {
      await pool.end();
      console.log('✅ Database pool has ended');
      console.log('✅ Closed out remaining connections');
      process.exit(0);
    } catch (err) {
      console.error('❌ Error during shutdown:', err);
      process.exit(1);
    }
  });

  setTimeout(() => {
    console.error('⚠️  Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
}