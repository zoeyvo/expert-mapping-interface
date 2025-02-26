// ~ 0.07 sec for sample data

const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const { normalizeLocationName, normalizeResearcherName } = require('./utils');

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
  const locationCoordinates = JSON.parse(fs.readFileSync(coordsPath, "utf-8"));

  const seenErrorMessages = new Set();

  // Initialize GeoJSON structure
  const geoJson = {
    type: "FeatureCollection",
    features: []
  };

  for (const [location, researchers] of Object.entries(locationProfiles)) {
    const normalizedLocation = normalizeLocationName(location);
    const coordinates = locationCoordinates[normalizedLocation];

    if (!coordinates) {
      const errorMsg = `No coordinates found for: ${normalizedLocation}`;
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

      if (!url) {
        const errorMsg = `No URL found for: ${normalizedResearcher}`;
        if (!seenErrorMessages.has(errorMsg)) {
          console.warn(`❌  ${errorMsg}`);
          seenErrorMessages.add(errorMsg);
        }
      }

      // Display only titles, not abstracts
      let titles = new Array();
      for (let work of data.works) {
        titles.push(work["title"])
      }

      geoJson.features.push({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [coordinates[1], coordinates[0]]
        },
        properties: {
          researcher: normalizedResearcher,
          location: normalizedLocation,
          works: titles,
          url: url
        }
      });
      researcherCount++;
      workCount += data.works.length;
    }
  }

  // Create public/data directory if it doesn't exist
  const publicDataDir = path.join(process.cwd(), 'public', 'data');
  if (!fs.existsSync(publicDataDir)) {
    fs.mkdirSync(publicDataDir, { recursive: true });
  }

  // Write to both locations (public and src)
  const publicPath = path.join(publicDataDir, 'research_profiles.geojson');
  const srcPath = path.join(__dirname, '../data/json/research_profiles.geojson');

  // Write the files
  fs.writeFileSync(publicPath, JSON.stringify(geoJson, null, 2), 'utf-8');
  fs.writeFileSync(srcPath, JSON.stringify(geoJson, null, 2), 'utf-8');

  const endTime = Date.now();
  console.log(`✨ Generated GeoJSON with:
    - ${locationCount} locations
    - ${researcherCount} researchers
    - ${workCount} works
    Files written to:
    - ${publicPath}
    - ${srcPath}
    Time taken: ${(endTime - startTime) / 1000}s`);

  return geoJson;
}
