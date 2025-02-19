import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

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

  return (
    <MapContainer center={[20, 0]} zoom={2} style={{ height: "100%", width: "100%" }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />

      {geoData &&
        geoData.features.map((feature, index) => {
        const [lng, lat] = feature.geometry.coordinates; // GeoJSON is [longitude, latitude]
        return (
          <Marker key={index} position={[lat, lng]} icon={customMarker}>
              <Popup>
                <strong>{feature.properties.researcher}</strong>
                <br />
                <strong> Related Works: </strong>
                <br />
                {feature.properties.works?.[0]}
                <br />
                {feature.properties.url && (
                  <a href={feature.properties.url} target="_blank" rel="noopener noreferrer">
                    Profile
                  </a>
                )}
              </Popup>
            </Marker>
          );
        })}
    </MapContainer>
  );
};

export default ResearchMap;