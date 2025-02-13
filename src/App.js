import React from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './styles/icon-fix';
import './styles/index.css';

const bgImage = require('./topImage.png');

function App() {
  return (
    <div className="App">
      {/* Navbar */}
        <nav className="flex justify-between items-center py-10 px-12 bg-blue-900 shadow-md">
          <div className="flex space-x-10">
            <a href="#" className="text-3xl font-semibold text-white">Aggie Experts Interactive Map</a>
            <a href="https://experts.ucdavis.edu/browse/expert/a" className="text-3xl font-semibold text-white">Experts</a>
            <a href="https://experts.ucdavis.edu/browse/grant/1" className="text-3xl font-semibold text-white">Grants</a>
          </div>
          <a href="https://www.ucdavis.edu/" className="text-3xl font-semibold text-white">My Account</a>
        </nav>

        {/* Background Image - hero */}
       <div 
         className="w-full min-h-[200px] text-white text-center bg-cover bg-center"
         style={{ backgroundImage: `url(${bgImage})` }}
       >       </div>

       {/* Map Section */}
      <div className="container mx-auto p-4">
        <MapContainer
          center={[0, 0]}
          zoom={2}
          style={{ height: '700px', width: '100%' }}
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