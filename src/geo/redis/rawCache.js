/**
 * rawCache.js
 * 
 * Purpose:
 * Fetches data from PostgreSQL and populates the Redis cache with its raw data.
 * 
 * Usage:
 * node src/geo/redis/rawCache.js
 */
const fs = require('fs');
const path = require('path');

// Update path to src/geo/redis/data
const outputDir = path.join(__dirname, 'data');

const { createClient } = require('redis');
const { pool } = require('../postgis/config');


// Create a Redis client
const redisClient = createClient();

redisClient.on('error', (err) => {
  console.error('❌ Redis connection error:', err);
});

redisClient.on('connect', () => {
  console.log('✅ Connected to Redis');
});

redisClient.on('ready', () => {
  console.log('🔄 Redis client is ready');
});

redisClient.on('end', () => {
  console.log('🔌 Redis connection closed');
});

// Connect to Redis
redisClient.connect().then(async () => {
  try {
    // Fetch data from PostgreSQL
    const client = await pool.connect();
    if (!client) {
      throw new Error('❌ Unable to connect to PostgreSQL');
    }
    console.log('🔍 Fetching data from PostgreSQL...');
    // Query 
    const result = await client.query('SELECT * FROM research_locations;');
    client.release();

    const data = result.rows;
    console.log(`📊 Fetched ${data.length} records from PostgreSQL`);
    formattedData = JSON.stringify(data, null, 2);
    redisClient.setEx('rawGeoData',86400, formattedData).then(() => {
      console.log('✅ Cached parsed data in Redis');
    }).catch(error => {
      console.error('❌ Error caching parsed data:', error);
      redisClient.quit();
    });
    
    // // Save to timestamped file
    // const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    // const filePath = path.join(outputDir, `formatted_response_${timestamp}.json`);
    // fs.writeFileSync(filePath, formattedData);
      
    // // Save/update latest version (copy instead of symlink)
    // const latestPath = path.join(outputDir, 'formatted_response_latest.json');
    // fs.copyFileSync(filePath, latestPath);
        
    // console.log(`✅ Saved formatted response to: ${filePath}`);
    // console.log(`📄 Updated latest copy: ${latestPath}`);
    return data;
  }
  catch (error) {
    console.error('❌ Error caching data:', error);
  }
});