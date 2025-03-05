/**
 * generateGeoJson.js
 * 
 * Purpose:
 * Generates GeoJSON from processed location and researcher data.
 * Creates files in both public and src directories for different use cases.
 * 
 * Usage:
 * node src/geo/etl/generateGeoJson.js
 * 
 * Output:
 * - public/data/research_profiles.geojson
 * - src/geo/data/json/research_profiles.geojson
 */

// ~ 0.07 sec for sample data

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
    console.log("✅  CSV Parsed.");
    generateGeoJSON();
  });

// Step 3: Read location-based profiles and generate GeoJSON
function generateGeoJSON() {
  const startTime = Date.now();
  let locationCount = 0;
  let researcherCount = 0;
  let workCount = 0;

  const locationProfiles = JSON.parse(fs.readFileSync(profilesPath, "utf-8"));
  const locationGeoData = JSON.parse(fs.readFileSync(coordsPath, "utf-8"));
  
  // Create a map of locations to researcher data
  const locationResearchers = new Map();
  
  // First pass - collect all researcher information by location
  for (const [location, researchers] of Object.entries(locationProfiles)) {
    const normalizedLocation = normalizeLocationName(location);
    const researcherData = [];
    
    for (const [researcherName, data] of Object.entries(researchers)) {
      const normalizedResearcher = normalizeResearcherName(researcherName);
      const lastName = normalizedResearcher.split(',')[0].toLowerCase();
      const url = researcherUrls[lastName];
      
      if (url) {
        researcherData.push({
          name: normalizedResearcher,
          url: url,
          works: data.works
        });
      }
    }
    
    if (researcherData.length > 0) {
      locationResearchers.set(normalizedLocation, researcherData);
    }
  }

  // Update location coordinates with researcher information
  locationGeoData.features = locationGeoData.features.map(feature => {
    const locationName = feature.properties.name;
    const researchers = locationResearchers.get(locationName);
    
    if (researchers) {
      return {
        ...feature,
        properties: {
          ...feature.properties,
          researchers: researchers
        }
      };
    }
    return feature;
  });

  // Write to both locations
  const publicOutputPath = path.join(process.cwd(), 'public', 'data', 'research_profiles.geojson');
  const srcOutputPath = path.join(__dirname, '../data', 'json', 'research_profiles.geojson');

  // Ensure directories exist
  fs.mkdirSync(path.dirname(publicOutputPath), { recursive: true });
  fs.mkdirSync(path.dirname(srcOutputPath), { recursive: true });

  // Write files
  fs.writeFileSync(publicOutputPath, JSON.stringify(locationGeoData, null, 2));
  fs.writeFileSync(srcOutputPath, JSON.stringify(locationGeoData, null, 2));
  
  console.log(`✅ Updated ${locationResearchers.size} locations with researcher data`);
  console.log(`✅ Written to ${publicOutputPath}`);
  console.log(`✅ Written to ${srcOutputPath}`);
  
  return locationGeoData;
}
