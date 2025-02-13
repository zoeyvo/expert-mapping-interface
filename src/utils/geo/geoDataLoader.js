import locations from './geoData/location-based-profiles.json';
import locationCoordinates from './geoData/location_coordinates.json';

export const loadGeoData = async () => {
    try {
        const features = Object.entries(locations).flatMap(([location, experts]) => {
            const coordinates = locationCoordinates[location];
            if (!coordinates) return []; // Skip locations without coordinates

            return [{
                type: "Feature",
                geometry: {
                    type: "Point",
                    coordinates: [coordinates[1], coordinates[0]] // GeoJSON uses [lng, lat]
                },
                properties: {
                    location,
                    researchers: Object.entries(experts).map(([name, data]) => ({
                        name,
                        works: data.works || [],
                        matches: data.matches || 0,
                        url: data.url || null
                    }))
                }
            }];
        });

        return {
            type: "FeatureCollection",
            features
        };
    } catch (error) {
        console.error("Error processing GeoJSON:", error);
        return { type: "FeatureCollection", features: [] };
    }
};
