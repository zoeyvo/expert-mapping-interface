import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer } from "react-leaflet";

// import "leaflet/dist/leaflet.css";
// import "leaflet.markercluster/dist/leaflet.markercluster.css";
// import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import L from "leaflet"; // Ensure you're importing leaflet
import "leaflet.markercluster"; // Import leaflet.markercluster
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";


const customMarker = new L.Icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// const updateMarkerSize = (zoom) => {
//   const size = 25 + (zoom - 2) * 2; // Adjust the multiplier as needed
//   customMarker.options.iconSize = [size, size * 1.64];
//   customMarker.options.iconAnchor = [size / 2, size * 1.64];
//   customMarker.options.shadowSize = [size * 1.64, size * 1.64];
// };

const ResearchMap = () => {
  const [geoData, setGeoData] = useState(null);

  useEffect(() => {
    fetch("/data/research_profiles.geojson")
      .then((response) => response.json())
      .then((data) => {
        setGeoData(data);
      })
      .catch((error) => console.error("Error loading GeoJSON:", error));
  }, []);

  useEffect(() => {
    if (geoData) {
      const markerClusters = L.markerClusterGroup(); // Creating a cluster group
      const map = document.querySelector('.leaflet-container'); // Getting the map container for layer control

      geoData.features.forEach((feature, index) => {
        const [lng, lat] = feature.geometry.coordinates; // GeoJSON is [longitude, latitude]
        const marker = L.marker([lat, lng], { icon: customMarker });

        marker.bindPopup(`
          <strong>${feature.properties.researcher}</strong><br />
          <strong>Related Works:</strong><br />
          ${feature.properties.works?.[0]}<br />
          ${feature.properties.url ? `<a href="${feature.properties.url}" target="_blank" rel="noopener noreferrer">Profile</a>` : ''}
        `);

        markerClusters.addLayer(marker); // Add marker to cluster group
      });

      // Initialize the map and add the markerClusters layer
      const mapInstance = L.map(map, { minZoom: 2, maxZoom: 8 }).setView([20, 0], 2);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(mapInstance);
      mapInstance.addLayer(markerClusters);
    }
  }, [geoData]);

  return (
    <div style={{ display: "flex", justifyContent: "center", height: "100vh" }}>
      <div style={{ height: "100vh", width: "300vh",paddingBottom: "100px" }} className="leaflet-container"></div>
        {/* The map will be initialized dynamically */}
      </div>
  );
};

export default ResearchMap;

