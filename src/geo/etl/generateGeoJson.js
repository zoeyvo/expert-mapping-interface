/**
 * generateGeoJson.js
 * 
 * Generates enriched GeoJSON by combining location coordinates with researcher data.
 * Adds researcher information, work details, and location type indicators to features.
 * 
 * @module generateGeoJson
 */

const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const { normalizeLocationName, normalizeResearcherName } = require('./utils');
const turf = require('@turf/turf');

// Define file paths
const profilesPath = path.join(__dirname, '../data', "json", "location_based_profiles.json");
const urlsPath = path.join(__dirname, '../data', "csv", "expert_url_subset.csv");
const coordsPath = path.join(__dirname, '../data', "json", "location_coordinates.json");
const outputPath = path.join(__dirname, '../data', "json", "research_profiles.geojson");

// Step 1: Load location coordinates
const locationCoordinates = JSON.parse(fs.readFileSync(coordsPath, "utf-8"));

// Step 2: Read expert URLs and store them by last name
const researcherUrls = {};

fs.createReadStream(urlsPath)
  .pipe(csv())
  .on("data", (row) => {
    const url = row["expid"]?.trim();
    const fullName = row["name"]?.trim();

    if (url && fullName) {
      const normalizedName = normalizeResearcherName(fullName);
      const lastName = normalizedName.split(',')[0].toLowerCase();
      researcherUrls[lastName] = url;
    }
  })
  .on("end", () => {
    console.log("\n✅  CSV Parsed!");
    generateGeoJSON();
  });

// Memory optimization: Use Set for deduplication
const processedLocations = new Set();
const processedResearchers = new Set();

/**
 * Processes researcher data for a location
 * @param {Object} researchers - Researcher data object
 * @param {Map} researcherUrls - Map of researcher URLs
 * @returns {Array} Array of processed researcher objects
 */
function processResearcherData(researchers, researcherUrls) {
    return Object.entries(researchers)
        .map(([researcherName, data]) => {
            const normalizedResearcher = normalizeResearcherName(researcherName);
            const lastName = normalizedResearcher.split(',')[0].toLowerCase();
            const url = researcherUrls[lastName];
            
            if (url && !processedResearchers.has(normalizedResearcher)) {
                processedResearchers.add(normalizedResearcher);
                return {
                    name: normalizedResearcher,
                    url: url,
                    works: data.works
                };
            }
            return null;
        })
        .filter(Boolean);
}

// Step 3: Read location-based profiles and generate GeoJSON
function generateGeoJSON() {
  const totalStartTime = Date.now();
  const startTime = Date.now();
  let locationCount = 0;
  let researcherCount = 0;
  let workCount = 0;

  console.log('🚀 Starting GeoJSON generation...');

  const locationProfiles = JSON.parse(fs.readFileSync(profilesPath, "utf-8"));
  const locationGeoData = JSON.parse(fs.readFileSync(coordsPath, "utf-8"));
  
  const loadTime = (Date.now() - startTime) / 1000;
  console.log(`📖 Loaded data files in ${loadTime.toFixed(2)}s`);
  
  // Create a map of locations to researcher data
  const locationResearchers = new Map();
  
  console.log('📖 Processing researcher data...');
  const processingStart = Date.now();
  
  // First pass - collect all researcher information by location
  for (const [location, researchers] of Object.entries(locationProfiles)) {
    const normalizedLocation = normalizeLocationName(location);
    const researcherData = processResearcherData(researchers, researcherUrls);
    
    if (researcherData.length > 0) {
      locationResearchers.set(normalizedLocation, researcherData);
      locationCount++;
      researcherCount += researcherData.length;
      workCount += researcherData.reduce((total, researcher) => total + researcher.works.length, 0);
    }
  }

  const processingTime = (Date.now() - processingStart) / 1000;
  console.log(`⏱️  Processing completed in ${processingTime.toFixed(2)}s`);

  console.log('🗺️  Updating GeoJSON features...');
  const updateStart = Date.now();

  // Update location coordinates with researcher information
  locationGeoData.features = locationGeoData.features.map(feature => {
    const locationName = feature.properties.name;
    const researchers = locationResearchers.get(locationName);
    const type = feature.properties.type;
    
    if (researchers) {
      return {
        ...feature,
        properties: {
          ...feature.properties,
          researchers: researchers
        }
      };
    }
    return {
      ...feature,
      properties: {
        ...feature.properties,
      }
    };
  });

  const updateTime = (Date.now() - updateStart) / 1000;
  console.log(`⏱️  Feature updates completed in ${updateTime.toFixed(2)}s`);

  console.log('💾 Writing files...');
  const writeStart = Date.now();

  // Write to both locations
  const srcOutputPath = path.join(__dirname, '../data', 'json', 'research_profiles.geojson');

  // Ensure directories exist
  fs.mkdirSync(path.dirname(srcOutputPath), { recursive: true });

  // Write files
  fs.writeFileSync(srcOutputPath, JSON.stringify(locationGeoData, null, 2));

  const writeTime = (Date.now() - writeStart) / 1000;
  const totalTime = (Date.now() - totalStartTime) / 1000;

  console.log('\n📊 GeoJSON Generation Statistics:');
  console.log(`⏱️  Total time: ${Math.floor(totalTime / 60)}m ${(totalTime % 60).toFixed(2)}s`);
  console.log(`\nResults:`);
  console.log(`👥 Researchers: ${researcherCount}`);
  console.log(`📚 Works: ${workCount}`);
  console.log(`\n💾 GeoJSON files written to:`);
  console.log(`   ${srcOutputPath}\n`);

  return locationGeoData;
}
