import React from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const Map = ({ data }) => {
  if (!data || !data.features) {
    return <div>Loading map data...</div>;
  }

  return (
    <MapContainer
      center={[20, 0]}
      zoom={2}
      style={{ height: "500px", width: "100%" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {data.features.map((feature, index) => {
        const { coordinates } = feature.geometry;
        const { location, researcher, works } = feature.properties;

        return (
          <Marker key={index} position={[coordinates[1], coordinates[0]]}>
            <Popup>
              <h3>{location}</h3>
              <div>
                <strong>{researcher}</strong>
                <ul>
                  {works.map((work, i) => (
                    <li key={i}>{work}</li>
                  ))}
                </ul>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
};

export default Map;
