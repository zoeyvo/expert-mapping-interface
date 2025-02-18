import React from "react";
import "./styles/index.css";
import Map from './components/Map';


function App() {
  return (
    <div className="App">
      <h1 className="text-3xl font-bold text-center my-4">Geo Data Visualizer</h1>
      <div className="container mx-auto p-4">
        <Map />
      </div>
    </div>
  );
}

export default App;
