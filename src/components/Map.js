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

        const popupContent = document.createElement("div");
        popupContent.innerHTML = `
          <div style='position: relative; padding: 15px; font-size: 14px; line-height: 1.5; width: 250px;'>
            <div style="font-weight: bold; font-size: 16px; color: #13639e;">
              ${count === 1 ? experts[0].researcher : `${count} Experts at this Location`}
            </div>
            <div style="margin-top: 10px; font-size: 13px;">
              <strong>Location:</strong> ${experts[0].location || "Unknown"}
            </div>
            ${
              count === 1
                ? `
                <div style="margin-top: 10px; font-size: 13px;">
                  <strong>Related Works:</strong> ${experts[0].works?.[0] || "N/A"}
                </div>
                ${
                  experts[0].url
                    ? `<a href='${experts[0].url}' target='_blank' 
                          style="display: block; margin-top: 12px; padding: 8px 10px; background: #13639e; color: white; text-align: center; border-radius: 5px; text-decoration: none; font-weight: bold;">
                          View Profile
                        </a>`
                    : `<div style="display: block; margin-top: 12px; padding: 8px 10px; background: #ccc; color: white; text-align: center; border-radius: 5px; font-weight: bold; opacity: 0.6;">
                        No Profile Found
                      </div>`
                }`
                : `<a href='#' 
                      style="display: block; margin-top: 12px; padding: 8px 10px; background: #13639e; color: white; text-align: center; border-radius: 5px; text-decoration: none; font-weight: bold;">
                      View Experts
                    </a>`
            }
          </div>
        `;

        const popup = L.popup({ closeButton: false, autoClose: false }).setContent(popupContent);
        marker.bindPopup(popup);

        let isMouseOver = false; 

        marker.on("mouseover", function () {
          clearTimeout(popupTimeoutRef.current);
          this.openPopup();
        });

        marker.on("mouseout", function () {
          if (!isMouseOver) {
            popupTimeoutRef.current = setTimeout(() => {
              this.closePopup();
            }, 500);  
          }
        });

        popupContent.querySelector("a")?.addEventListener("mouseover", () => {
          isMouseOver = true;
        });

        popupContent.querySelector("a")?.addEventListener("mouseout", () => {
          isMouseOver = false;
        });

        if (count > 1) {
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
        height: "800px",  
        minHeight: "auto", 
        overflowY: "auto", 
      }}>
          <button 
            onClick={() => setPanelOpen(false)} 
            style={{ 
              position: "absolute", 
              top: "10px", 
              right: "10px", 
              background: "#ddd", 
              border: "none", 
              padding: "5px", 
              cursor: "pointer", 
              fontSize: "16px"
              
            }}
          >×</button>
  
          <div style={{ marginTop: "10px", fontSize: "13px" }}>
            <strong>Location:</strong> {selectedExperts[0]?.location || "Unknown"}
          </div>
  
          {selectedExperts.map((expert, index) => (
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
                {expert.researcher}
              </div>
              <div style={{ marginTop: "10px", fontSize: "13px" }}>
                <strong>Related Works:</strong> {expert.works?.[0] || "N/A"}
              </div>
              <a 
  href={expert.url || "#"} 
  target={expert.url ? "_blank" : "_self"} 
  rel="noopener noreferrer" 
  style={{ 
    display: "block", 
    marginTop: "12px", 
    padding: "8px 10px", 
    background: expert.url ? "#13639e" : "#ccc",  
    color: "white", 
    textAlign: "center", 
    borderRadius: "5px", 
    textDecoration: "none", 
    fontWeight: "bold", 
    opacity: expert.url ? "1" : "0.6", 
    cursor: expert.url ? "pointer" : "default"
  }}
>
  {expert.url ? "View Profile" : "No Profile Found"}
</a>

            </div>
          ))}
        </div>
      )}
    </div>
  );
  
};

export default ResearchMap;

