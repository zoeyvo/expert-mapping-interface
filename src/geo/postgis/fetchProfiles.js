/**
 * fetchProfiles.js
 * 
 * Purpose:
 * Fetches research profiles from the API and saves formatted responses to JSON files.
 * Creates both timestamped and latest versions of the data.
 * 
 * Usage:
 * node src/geo/postgis/fetchProfiles.js
 * 
 * Output:
 * - src/geo/data/json/formatted_response_[timestamp].json
 * - src/geo/data/json/formatted_response_latest.json
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

// Update path to src/geo/data/json
const outputDir = path.join(__dirname, '../data/json');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Get the response from the API
http.get('http://localhost:3001/api/research-locations', (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      // Parse and format the JSON
      const formattedJson = JSON.stringify(JSON.parse(data), null, 2);

      // Save to timestamped file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filePath = path.join(outputDir, `formatted_response_${timestamp}.json`);
      fs.writeFileSync(filePath, formattedJson);

      // Save/update latest version (copy instead of symlink)
      const latestPath = path.join(outputDir, 'formatted_response_latest.json');
      fs.copyFileSync(filePath, latestPath);

      console.log(`✅ Saved formatted response to: ${filePath}`);
      console.log(`📄 Updated latest copy: ${latestPath}`);

      // Log some stats about the data
      const parsedData = JSON.parse(data);
      console.log(`📊 Data summary:`);
      console.log(`   - Total features: ${parsedData.features.length}`);
      console.log(`   - First researcher: ${parsedData.features[0].properties.researcher}`);
      console.log(`   - Last researcher: ${parsedData.features[parsedData.features.length - 1].properties.researcher}`);
    } catch (error) {
      console.error('❌ Error processing response:', error);
      process.exit(1);
    }
  });
}).on('error', (error) => {
  console.error('❌ Error fetching data:', error);
  process.exit(1);
});
