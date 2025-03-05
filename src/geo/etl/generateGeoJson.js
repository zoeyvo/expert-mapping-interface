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
  
  const seenErrorMessages = new Set();
  
  const geoJson = {
    type: "FeatureCollection",
    features: []
  };

  for (const [location, researchers] of Object.entries(locationProfiles)) {
    const normalizedLocation = normalizeLocationName(location);
    const locationFeature = locationGeoData.features.find(
      f => f.properties.name === normalizedLocation
    );
    
    if (!locationFeature) {
      const errorMsg = `No geodata found for: ${normalizedLocation}`;
      if (!seenErrorMessages.has(errorMsg)) {
        console.warn(`⚠️ ${errorMsg}`);
        seenErrorMessages.add(errorMsg);
      }
      continue;
    }
    locationCount++;

    for (const [researcherName, data] of Object.entries(researchers)) {
      const normalizedResearcher = normalizeResearcherName(researcherName);
      const lastName = normalizedResearcher.split(',')[0].toLowerCase();
      const url = researcherUrls[lastName] || null;

      geoJson.features.push({
        type: "Feature",
        geometry: locationFeature.geometry,
        properties: {
          researcher: normalizedResearcher,
          location: normalizedLocation,
          works: data.works,
          url: url,
          locationType: locationFeature.properties.locationType,
          centroid: locationFeature.properties.centroid,
          hasPolygon: locationFeature.properties.hasPolygon
        }
      });
      researcherCount++;
      workCount += data.works.length;
    }
  }

  return geoJson;
}
