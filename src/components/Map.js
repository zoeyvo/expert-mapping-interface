import React, { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet.markercluster";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

const ResearchMap = () => {
  const [geoData, setGeoData] = useState(null);
  const [selectedExperts, setSelectedExperts] = useState([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const mapRef = useRef(null);
  const markerClusterGroupRef = useRef(null);
  const popupTimeoutRef = useRef(null);

  useEffect(() => {
    fetch("/data/research_profiles.geojson")
      .then((response) => response.json())
      .then((data) => setGeoData(data))
      .catch((error) => console.error("Error loading GeoJSON:", error));
  }, []);

  useEffect(() => {
    if (!mapRef.current) {
      mapRef.current = L.map("map", { minZoom: 2, maxZoom: 8 }).setView([20, 0], 2);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(mapRef.current);

      markerClusterGroupRef.current = L.markerClusterGroup({
        iconCreateFunction: (cluster) => {
          let totalExperts = 0;
          cluster.getAllChildMarkers().forEach((marker) => {
            totalExperts += marker.options.expertCount || 1;
          });

          return L.divIcon({
            html: `<div style='background: #13639e; color: white; border-radius: 50%; width: 35px; height: 35px; display: flex; align-items: center; justify-content: center; font-weight: bold;'>${totalExperts}</div>`,
            className: "custom-cluster-icon",
            iconSize: [35, 35],
          });
        },
      });
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

        const marker = L.marker([lat, lng], {
          icon: L.divIcon({
            html: `<div style='background: #13639e; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold;'>${count}</div>`,
            className: "custom-marker-icon",
            iconSize: [30, 30],
          }),
          expertCount: count,
        });

        if (count === 1) {
          const popupContent = document.createElement("div");
          popupContent.innerHTML = `
            <div style='position: relative; padding: 10px; font-size: 14px;'>
              <strong>${experts[0].researcher}</strong><br/>
              Related Works: ${experts[0].works?.[0] || "N/A"}<br/>
              <a href='${experts[0].url}' target='_blank' style='color: blue;'>Profile</a>
            </div>
          `;

          const popup = L.popup({ closeButton: false, autoClose: false }).setContent(popupContent);
          marker.bindPopup(popup);

          marker.on("mouseover", function () {
            clearTimeout(popupTimeoutRef.current);
            this.openPopup();
          });

          marker.on("mouseout", function () {
            popupTimeoutRef.current = setTimeout(() => {
              this.closePopup();
            }, 250);
          });

          popupContent.addEventListener("mouseenter", () => {
            clearTimeout(popupTimeoutRef.current);
          });

          popupContent.addEventListener("mouseleave", () => {
            marker.closePopup();
          });
        } else {
          const popupContent = document.createElement("div");
          popupContent.innerHTML = `
            <div style='padding: 10px; font-size: 14px;'>
              <strong>${count} experts at this location</strong><br/>
              <a href='#' style='color: blue;'>Click here to see list</a>
            </div>
          `;

          const popup = L.popup({ closeButton: false, autoClose: false }).setContent(popupContent);
          marker.bindPopup(popup);

          marker.on("mouseover", function () {
            clearTimeout(popupTimeoutRef.current);
            this.openPopup();
          });

          marker.on("mouseout", function () {
            popupTimeoutRef.current = setTimeout(() => {
              this.closePopup();
            }, 250);
          });

          popupContent.addEventListener("mouseenter", () => {
            clearTimeout(popupTimeoutRef.current);
          });

          popupContent.addEventListener("mouseleave", () => {
            marker.closePopup();
          });

          popupContent.querySelector("a").addEventListener("click", (e) => {
            e.preventDefault();
            setSelectedExperts(experts);
            setPanelOpen(true);
            marker.closePopup();
          });
        }

        markerClusterGroupRef.current.addLayer(marker);
      });
    }
  }, [geoData]);

return (
  <div style={{ display: "flex", height: "100vh", width: "100vw" }}>
    <div id="map" style={{ flex: panelOpen ? "1" : "100%", transition: "flex 0.3s ease" }} />
    {panelOpen && selectedExperts.length > 0 && (
      <div style={{ 
        width: "350px", 
        background: "white", 
        padding: "15px", 
        borderLeft: "2px solid #aaa", 
        position: "relative", 
        height: "100vh", 
        overflowY: "auto" 
      }}>
        <button onClick={() => setPanelOpen(false)} style={{ position: "absolute", top: "10px", right: "10px", background: "#ddd", border: "none", padding: "5px", cursor: "pointer" }}>×</button>
        <h3>Experts at this location</h3>
        {selectedExperts.map((expert, index) => (
          <div key={index} style={{ marginBottom: "15px", padding: "10px", border: "1px solid #ccc", borderRadius: "5px" }}>
            <strong>{expert.researcher}</strong>
            <p>Related Works: {expert.works?.[0]}</p>
            {expert.url && <a href={expert.url} target="_blank" rel="noopener noreferrer" style={{ color: "blue" }}>Profile</a>}
          </div>
        ))}
      </div>
    )}
  </div>
);
};

export default ResearchMap;
