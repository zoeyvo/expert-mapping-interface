import React, { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet.markercluster";
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
  const mapRef = useRef(null);
  const markerClusterGroupRef = useRef(null);

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

      markerClusterGroupRef.current = L.markerClusterGroup();
      mapRef.current.addLayer(markerClusterGroupRef.current);
    }

    if (geoData) {
      markerClusterGroupRef.current.clearLayers();

      geoData.features.forEach((feature, index) => {
        const [lng, lat] = feature.geometry.coordinates;
        const marker = L.marker([lat, lng], { icon: customMarker });

        const popupContent = document.createElement("div");
        popupContent.innerHTML = `
          <div id="popup-${index}" class="custom-popup" style="padding: 10px; background: white; border-radius: 5px;">
            <strong>${feature.properties.researcher}</strong><br />
            <strong>Related Works:</strong><br />
            ${feature.properties.works?.[0]}<br />
            ${feature.properties.url ? `<a href="${feature.properties.url}" target="_blank" rel="noopener noreferrer">Profile</a>` : ''}
          </div>
        `;

        const popup = L.popup({ autoClose: false, closeOnClick: false }).setContent(popupContent);
        marker.bindPopup(popup);

        // Ensure pop-up stays open when hovering
        marker.on("mouseover", () => {
          marker.openPopup();
        });

        marker.on("mouseout", () => {
          setTimeout(() => {
            const popupDiv = document.getElementById(`popup-${index}`);
            if (!popupDiv || !popupDiv.matches(":hover")) {
              marker.closePopup();
            }
          }, 300);
        });

        setTimeout(() => {
          const popupDiv = document.getElementById(`popup-${index}`);
          if (popupDiv) {
            popupDiv.addEventListener("mouseenter", () => marker.openPopup());
            popupDiv.addEventListener("mouseleave", () => marker.closePopup());
          }
        }, 500);

        markerClusterGroupRef.current.addLayer(marker);
      });
    }
  }, [geoData]);

  return <div id="map" style={{ height: "100vh", width: "300vh", paddingBottom: "100px" }} />;
};

export default ResearchMap;
