import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const Map = ({ data }) => {
  return (
    <MapContainer 
      center={[0, 0]} 
      zoom={2} 
      style={{ height: '500px', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {data.map((point, index) => (
        <Marker key={index} position={[point.lat, point.lng]}>
          <Popup>{point.name}</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default Map;