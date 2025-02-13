import React, { useEffect, useState } from 'react';
import './utils/icon-fix';
import './index.css';
import { loadGeoData } from './utils/geo/geoData/geoDataLoader';
import Map from './components/map';

function App() {
  const [geoData, setGeoData] = useState([]);

  useEffect(() => {
    const data = loadGeoData();
    setGeoData(data);
  }, []);

  return (
    <div className="App">
      <h1 className="text-3xl font-bold text-center my-4">
        Geo Data Visualizer
      </h1>
      <div className="container mx-auto p-4">
        <Map data={geoData} />
      </div>
    </div>
  );
}

export default App;