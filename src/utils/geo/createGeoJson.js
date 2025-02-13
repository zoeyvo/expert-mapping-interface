const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");

// Define file paths
const profilesPath = path.join(__dirname, "geoData", "location_based_profiles.json");
const urlsPath = path.join(__dirname, "geoData", "expert_url_subset.csv");
const coordsPath = path.join(__dirname, "geoData", "location_coordinates.json");
const outputPath = path.join(__dirname, "geoData", "research_profiles.geojson");

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
      const lastName = fullName.split(",")[0].toLowerCase(); // Extract last name
      researcherUrls[lastName] = url; // Store by last name
    }
  })
  .on("end", () => {
    console.log("✅ CSV Parsed.");
    generateGeoJSON();
  });

// Step 3: Read location-based profiles and generate GeoJSON
function generateGeoJSON() {
  const locationProfiles = JSON.parse(fs.readFileSync(profilesPath, "utf-8"));
  const geoJson = {
    type: "FeatureCollection",
    features: [],
  };

  for (const [location, researchers] of Object.entries(locationProfiles)) {
    const coordinates = locationCoordinates[location]; // Normalize case
    if (!coordinates) {
      console.warn(`⚠️ No coordinates found for: ${location}`);
      continue; // Skip locations without coordinates
    }

    for (const [researcherName, data] of Object.entries(researchers)) {
        const lastName = researcherName.split(",")[0].toLowerCase();
        const url = researcherUrls[lastName] || null;

      if (!url) {
        console.warn(`❌ No URL found for: ${researcherName}`);
      }

      geoJson.features.push({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: coordinates,
        },
        properties: {
          researcher: researcherName,
          works: data.works,
          url: url,
        },
      });
    }
  }

  // Step 4: Write GeoJSON file
  fs.writeFileSync(outputPath, JSON.stringify(geoJson, null, 2));
  console.log(`🎉 GeoJSON file created: ${outputPath}`);
}
