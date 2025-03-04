/**
 * cacheJson.js
 * 
 * Purpose:
 * Caches GeoJSON data in Redis database (and in server).
 * 
 * 
 * Usage:
 * node src/geo/redis/cacheJson.js
 * 
 */

const { createClient } = require('redis');
const http = require('http');

// Create a Redis client
const redisClient = createClient();

redisClient.on('error', (err) => {
  console.error('❌ Redis connection error:', err);
});
redisClient.on('ready', () => {
  console.log('🔄 Redis client is ready');
});

redisClient.on('end', () => {
  console.log('🔌 Redis connection closed');
});

// Connect to Redis
redisClient.connect().then(() => {
// Test Redis connection on start up
  redisClient.ping().then((res) => {
    console.log('🖲️ Redis connected successfully');
  }).catch((err) => {
    console.error('❌ Redis connection error:', err);
  });

  http.get('http://localhost:3001/api/redis/cache', (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
    try {
        // Parse and cache the JSON data
        const cacheKey = 'research-locations';
        const parsedData = JSON.parse(data);
        redisClient.set(cacheKey, JSON.stringify(parsedData), 'EX', 86400, (err, reply) => {
        if (err) {
            console.error('❌ Error caching data:', err);
        } else {
            console.log('✅ Cached GeoJSON data in Redis');
        }
        });
    } catch (error) {
      console.error('❌ Error processing response:', error);
    }
    });
  }).on('error', (err) => {
    console.error('❌ HTTP request error:', err);
  });
}).on('error', (err) => {
  console.error('❌ Redis connection error:', err);
});