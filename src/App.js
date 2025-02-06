import React from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './utils/icon-fix';
import './index.css';

function App() {
  return (
    <div className="App">
      <h1 className="text-3xl font-bold text-center my-4">
        Geo Data Visualizer
      </h1>
      <div className="container mx-auto p-4">
        <MapContainer 
          center={[0, 0]} 
          zoom={2} 
          style={{ height: '500px', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
        </MapContainer>
      </div>
    </div>
  );
}

export default App;