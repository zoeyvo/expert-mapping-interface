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
      const mapInstance = L.map(map).setView([20, 0], 2);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(mapInstance);
      mapInstance.addLayer(markerClusters); 
    }
  }, [geoData]);

  return (
    <div style={{ height: "100vh", marginTop: "-100px", paddingBottom: "100px" }} className="leaflet-container">
      {/* The map will be initialized dynamically */}
    </div>
  );
};

export default ResearchMap;

