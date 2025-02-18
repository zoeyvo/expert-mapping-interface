// import React, { useEffect, useState } from "react";
// import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
// import L from "leaflet";
// import "leaflet/dist/leaflet.css";



// const ResearchMap = () => {
//   const [geoData, setGeoData] = useState(null);

//   useEffect(() => {
//     fetch("/research_profiles.geojson")
//       .then((response) => response.json())
//       .then((data) => {
//         console.log("GeoJSON data loaded:", data); // Debugging line
//         setGeoData(data);
//       })
//       .catch((error) => console.error("Error loading GeoJSON:", error));
//   }, []);

//   return (
//     <MapContainer center={[20, 0]} zoom={2} style={{ height: "500px", width: "100%" }}>
//       <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
      
//       {geoData &&
//         geoData.features.map((feature, index) => {
//         const [lat, lng] = feature.geometry.coordinates; // Use GeoJSON is lat, lng (zoey said this was geojson format)
//         return (
//           <Marker key={index} position={[lat, lng]}>      
//               <Popup>
//                 <strong>{feature.properties.researcher}</strong>
//                 <br />
//                 {feature.properties.works?.[0]}
//                 <br />
//                 {feature.properties.url && (
//                   <a href={feature.properties.url} target="_blank" rel="noopener noreferrer">
//                     Profile
//                   </a>
//                 )}
//               </Popup>
//             </Marker>
//           );
//         })}
//     </MapContainer>
//   );
// };

// export default ResearchMap;

import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix missing marker icons
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Override Leaflet’s default icon path
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
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
    fetch("/research_profiles.geojson")
      .then((response) => response.json())
      .then((data) => {
        console.log("GeoJSON data loaded:", data); // Debugging line
        setGeoData(data);
      })
      .catch((error) => console.error("Error loading GeoJSON:", error));
  }, []);

  return (
    <MapContainer center={[20, 0]} zoom={2} style={{ height: "500px", width: "100%" }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
      
      {geoData &&
        geoData.features.map((feature, index) => {
        const [lat, lng] = feature.geometry.coordinates; // Use GeoJSON is lat, lng
        return (
          <Marker key={index} position={[lat, lng]}>      
              <Popup>
                <strong>{feature.properties.researcher}</strong>
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
