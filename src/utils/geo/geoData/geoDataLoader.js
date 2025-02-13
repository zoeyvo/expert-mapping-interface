import locations from './locations.json';
import profiles from './profiles.json';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

export const loadGeoData = () => {
  // This is a simple example - you'll need to implement proper geocoding
  const locationCoordinates = {
    "California": [36.7783, -119.4179],
    "Peru": [-9.1900, -75.0152],
    "Mali": [17.5707, -3.9962],
    // Add more coordinates for your locations
  };

  const mapPoints = [];

  Object.entries(locations).forEach(([location, experts]) => {
    const coordinates = locationCoordinates[location];
    if (coordinates) {
      mapPoints.push({
        name: location,
        lat: coordinates[0],
        lng: coordinates[1],
        experts: Object.keys(experts).length,
        works: Object.values(experts).reduce((acc, curr) => acc + curr.works.length, 0)
      });
    }
  });

  return mapPoints;
};

export const loadProfiles = () => {
  return profiles;
};