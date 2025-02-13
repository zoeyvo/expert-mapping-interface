import React, { useEffect, useState } from 'react';
import './utils/icon-fix';
import './index.css';
import { loadGeoData } from './utils/geo/geoDataLoader';
import Map from './components/Map';

function App() {
  const [geoData, setGeoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await loadGeoData();
        setGeoData(data);
      } catch (error) {
        console.error("Error loading GeoJSON data:", error);
        setError("Failed to load map data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="App">
      <h1 className="text-3xl font-bold text-center my-4">
        Geo Data Visualizer
      </h1>
      <div className="container mx-auto p-4">
        {loading && <p>Loading map data...</p>}
        {error && <p className="text-red-500">{error}</p>}
        {!loading && !error && geoData && <Map data={geoData} />}
      </div>
    </div>
  );
}

export default App;
