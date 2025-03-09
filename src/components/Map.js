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
    fetch("/data/researcher_locations.geojson")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const text = await response.text();
        try {
          return JSON.parse(text);
        } catch (error) {
          throw new Error(`Invalid JSON: ${text}`);
        }
      })
      .then((data) => setGeoData(data))
      .catch((error) => console.error("Error fetching geojson:", error));
  }, []);

  useEffect(() => {
    if (!mapRef.current) {
      mapRef.current = L.map("map", { minZoom: 1, maxZoom: 9 }).setView([20, 0], 2);

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
      const locationExpertCounts = new Map();

      geoData.features.forEach((feature) => {
        const locationId = feature.properties.location_id;
        if (locationId) {
          locationExpertCounts.set(locationId, (locationExpertCounts.get(locationId) || 0) + 1);
        }
      });

      geoData.features.forEach((feature) => {
        const geometry = feature.geometry;

        // Handle Polygon
        if (geometry.type === "Polygon") {
          const coordinates = geometry.coordinates[0];
          if (Array.isArray(coordinates) && Array.isArray(coordinates[0])) {
            const flippedCoordinates = coordinates.map(([lng, lat]) => [lat, lng]);

            const polygon = L.polygon(flippedCoordinates, {
              color: '#13639e',
              weight: 2,
              fillColor: '#d8db9a',
              fillOpacity: 0.3,
            }).addTo(mapRef.current);

            const locationId = feature.properties.location_id;
            const expertCount = locationExpertCounts.get(locationId) || 0;
            const locationName = feature.properties.location_name || "Unknown";

            polygon.on("mouseover", (event) => {
              clearTimeout(popupTimeoutRef.current);

              const popupContent = document.createElement("div");
              popupContent.innerHTML = `
                <div style='position: relative; padding: 15px; font-size: 14px; line-height: 1.5; width: 250px;'>
                  <div style="font-weight: bold; font-size: 16px; color: #13639e;">
                    ${expertCount} Experts at this location
                  </div>
                  <div style="font-size: 14px; color: #333; margin-top: 5px;">
                    <strong>Location:</strong> ${locationName}
                  </div>
                  <a href='#' 
                     class="view-experts-btn"
                     style="display: block; margin-top: 12px; padding: 8px 10px; background: #13639e; color: white; text-align: center; border-radius: 5px; text-decoration: none; font-weight: bold;">
                    View Experts
                  </a>
                </div>
              `;

              const popup = L.popup({ closeButton: false, autoClose: false })
                .setLatLng(event.latlng)
                .setContent(popupContent);

              polygon.bindPopup(popup).openPopup();

              let isMouseOver = false;

              popupContent.addEventListener("mouseenter", () => {
                isMouseOver = true;
                clearTimeout(popupTimeoutRef.current);
              });

              popupContent.addEventListener("mouseleave", () => {
                isMouseOver = false;
                popupTimeoutRef.current = setTimeout(() => {
                  polygon.closePopup();
                }, 500);
              });

              popupContent.querySelector(".view-experts-btn")?.addEventListener("click", (e) => {
                e.preventDefault();
                const experts = geoData.features.filter(f => f.properties.location_id === locationId);
                setSelectedExperts(experts);
                setPanelOpen(true);
                polygon.closePopup();
              });
            });

            polygon.on("mouseout", () => {
              popupTimeoutRef.current = setTimeout(() => {
                polygon.closePopup();
              }, 500);
            });
          }
        }

        // Handle Point and MultiPoint
        if (geometry.type === "Point" || geometry.type === "MultiPoint") {
          const coordinates = geometry.coordinates;
          if (Array.isArray(coordinates) && coordinates.length === 2) {
            const [lng, lat] = coordinates;
            const key = `${lat},${lng}`;

            if (!locationMap.has(key)) {
              locationMap.set(key, []);
            }
            locationMap.get(key).push(feature.properties);
          }
        }
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

        const popupContent = document.createElement("div");
        popupContent.innerHTML = `
          <div style='position: relative; padding: 15px; font-size: 14px; line-height: 1.5; width: 250px;'>
            <div style="font-weight: bold; font-size: 16px; color: #13639e;">
              ${count === 1 ? experts[0].researcher_name : `${count} Experts at this Location`}
            </div>
            <div style="margin-top: 10px; font-size: 13px;">
              <strong>Location:</strong> ${experts[0].location_name || "Unknown"}
            </div>
            ${
              count === 1
                ? `
                  <div style="margin-top: 10px; font-size: 13px;">
                    <strong>Related Works:</strong> ${experts[0].work_count || "N/A"}
                  </div>
                  ${
                    experts[0].researcher_url
                      ? `<a href='${experts[0].researcher_url}' target='_blank' 
                            style="display: block; margin-top: 12px; padding: 8px 10px; background: #13639e; color: white; text-align: center; border-radius: 5px; text-decoration: none; font-weight: bold;">
                            View Profile
                          </a>`
                      : ""
                  }
                `
                : ""
            }
          </div>
        `;

        marker.bindPopup(popupContent).addTo(markerClusterGroupRef.current);
      });
    }
  }, [geoData]);


return (
  <div style={{ display: 'flex' }}>
    <div id="map" style={{ flex: 1, height: '100vh' }}></div>
    {panelOpen && (
      <div 
        style={{ 
          width: '300px', 
          background: '#f0f0f0', 
          padding: '20px', 
          overflowY: 'auto', 
          height: '80vh',
          position: 'relative' 
        }}
      >
        <button 
          onClick={() => setPanelOpen(false)} 
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: 'transparent',
            border: 'none',
            fontSize: '20px',
            color: '#13639e',
            cursor: 'pointer',
          }}
        >
          &times;
        </button>
        
        <h2>Selected Experts</h2>

        {/* Display Location (taken from the first expert) */}
        {selectedExperts.length > 0 && (
          <div style={{ marginBottom: '20px', fontSize: '14px', color: '#555' }}>
            <strong>Location:</strong> {selectedExperts[0].properties.location_name || "Unknown"}
          </div>
        )}

        <ul>
          {selectedExperts
  .sort((a, b) => a.properties.researcher_name.localeCompare(b.properties.researcher_name)) // Sort alphabetically by name
  .map((expert, index) => (
    <div key={index} style={{ 
      position: "relative", 
      padding: "15px", 
      fontSize: "14px", 
      lineHeight: "1.5", 
      width: "100%", 
      border: "1px solid #ccc", 
      borderRadius: "5px", 
      marginBottom: "15px",
      background: "#f9f9f9"
    }}>
      <div style={{ fontWeight: "bold", fontSize: "16px", color: "#13639e" }}>
        {expert.properties.researcher_name}
      </div>
      <div style={{ marginTop: "10px", fontSize: "13px" }}>
        <strong>Location:</strong> {expert.properties.location_name || "Unknown"}
      </div>
      <div style={{ marginTop: "10px", fontSize: "13px" }}>
        <strong>Related Works:</strong> {expert.properties.work_count || "N/A"}
      </div>
      <a 
        href={expert.properties.researcher_url || "#"} 
        target={expert.properties.researcher_url ? "_blank" : "_self"} 
        rel="noopener noreferrer" 
        style={{ 
          display: "block", 
          marginTop: "12px", 
          padding: "8px 10px", 
          background: expert.properties.researcher_url ? "#13639e" : "#ccc",  
          color: "white", 
          textAlign: "center", 
          borderRadius: "5px", 
          textDecoration: "none", 
          fontWeight: "bold", 
          opacity: expert.properties.researcher_url ? "1" : "0.6", 
          cursor: expert.properties.researcher_url ? "pointer" : "default"
        }}
      >
        {expert.properties.researcher_url ? "View Profile" : "No Profile Found"}
      </a>
    </div>
))}

        </ul>
      </div>
    )}
  </div>
);
};

export default ResearchMap;
