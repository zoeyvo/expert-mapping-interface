import React from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './styles/icon-fix';
import './styles/index.css';

const bgImage = require('./topImage2.png');
import logo from './aggie-experts-logo-primary.png';

function App() {
  return (
    <div className="App">
      {/* Navbar */}
      <nav className="flex items-center py-6 px-8 bg-white shadow-md">
        {/* Logo Section */}
        <div className="flex items-center space-x-6">
          <img src={logo} alt="Aggie Experts Logo" className="h-16 w-auto ml-2 mb-0" />
          <div className="flex items-center space-x-8">
            <a href="#" className="text-3xl font-semibold"style={{ color: '#022851' }} >Aggie Experts Interactive Map</a>
          </div>
        </div>
      </nav>

      {/* Blue Section with Links */}
      <div className="flex justify-between items-center bg-blue-900 px-12 py-4" style={{ backgroundColor: '#022851' }}>
        <div className="flex space-x-10">
          <a href="https://experts.ucdavis.edu/browse/expert/a" className="text-2xl font-semibold text-white">Experts</a>
          <a href="https://experts.ucdavis.edu/browse/grant/1" className="text-2xl font-semibold text-white">Grants</a>
        </div>
        <a href="https://www.ucdavis.edu/" className="text-2xl font-semibold text-white flex items-center">
  My Account
  <span className="ml-2 rounded-full p-2">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
      <circle cx="12" cy="8" r="4" fill="white" stroke="white" strokeWidth="2"/>
      <path d="M4 20c0-4 4-6 8-6s8 2 8 6" fill="white" stroke="white" strokeWidth="2"/>
    </svg>
  </span>
</a>
      </div>

      {/* Background Image - Hero Section */}
      <div 
        className="w-full min-h-[250px] text-white text-center bg-cover bg-center"
        style={{ backgroundImage: `url(${bgImage})` }}
      >
      </div>

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
