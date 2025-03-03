import React, { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet.markercluster";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

const ResearchMap = () => {
  const [geoData, setGeoData] = useState(null);
  const [selectedExperts, setSelectedExperts] = useState([]);
  const mapRef = useRef(null);
  const markerClusterGroupRef = useRef(null);

  useEffect(() => {
    fetch("http://localhost:3001/api/redis/geodata")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => setGeoData(data))
      .catch((error) => {
        console.error("Error loading GeoJSON:", error);
        alert("Failed to load GeoJSON data. Please try again later.");
      });
  }, []);

  useEffect(() => {
    if (!mapRef.current) {
      mapRef.current = L.map("map", { minZoom: 2, maxZoom: 8 }).setView([20, 0], 2);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(mapRef.current);

      markerClusterGroupRef.current = L.markerClusterGroup();
      mapRef.current.addLayer(markerClusterGroupRef.current);
    }

    if (geoData) {
      markerClusterGroupRef.current.clearLayers();
      const locationMap = new Map();

      geoData.features.forEach((feature) => {
        const [lng, lat] = feature.geometry.coordinates;
        const key = `${lat},${lng}`;

        if (!locationMap.has(key)) {
          locationMap.set(key, []);
        }
        locationMap.get(key).push(feature.properties);
      });

      locationMap.forEach((experts, key) => {
        const [lat, lng] = key.split(",").map(Number);
        const count = experts.length;

        const markerColor = "#13639e;";

        const clusterIcon = L.divIcon({
          html: `<div style='background: ${markerColor}; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold;'>${count}</div>`,
          className: "custom-cluster-icon",
          iconSize: [30, 30],
        });

        const marker = L.marker([lat, lng], { icon: clusterIcon });
        marker.on("click", () => setSelectedExperts(experts));
        markerClusterGroupRef.current.addLayer(marker);
      });
    }
  }, [geoData]);

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw" }}>
      <div id="map" style={{ flex: selectedExperts.length > 0 ? "1" : "100%", transition: "flex 0.3s ease" }} />
      {selectedExperts.length > 0 && (
        <div
          style={{
            width: "350px",
            maxHeight: "100vh",
            overflowY: "auto",
            background: "white",
            padding: "15px",
            borderLeft: "2px solid #aaa",
            boxShadow: "-2px 0 5px rgba(0,0,0,0.1)",
            position: "relative",
          }}
        >
          <button
            onClick={() => {
              setSelectedExperts([]);
              document.getElementById("map").style.flex = "100%";
            }}
            style={{
              position: "absolute",
              top: "10px",
              right: "10px",
              background: "#ddd",
              border: "none",
              padding: "5px 10px",
              cursor: "pointer",
              borderRadius: "5px",
            }}
          >
            ×
          </button>
          <h3>Experts at this location</h3>
          {selectedExperts.map((expert, index) => (
            <div key={index} style={{ marginBottom: "15px", padding: "10px", border: "1px solid #ccc", borderRadius: "5px" }}>
              <strong>{expert.researcher}</strong>
              <p>Related Works: {expert.works?.[0]}</p>
              {expert.url && (
                <a href={expert.url} target="_blank" rel="noopener noreferrer" style={{ color: "blue" }}>
                  Profile
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ResearchMap;
