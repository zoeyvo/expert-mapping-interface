import json
from geopy.geocoders import Nominatim
from time import sleep

# Load JSON files
with open("geoData/location-based-profiles.json", "r", encoding="utf-8") as file:
    locations_data = json.load(file)

with open("researchers.json", "r", encoding="utf-8") as file:
    researcher_urls = json.load(file)

# Geocode locations
geolocator = Nominatim(user_agent="geo_locator")
location_coords = {}

for location in locations_data.keys():
    try:
        geo = geolocator.geocode(location)
        if geo:
            location_coords[location] = (geo.longitude, geo.latitude)  # GeoJSON uses [lon, lat]
        else:
            location_coords[location] = None
    except Exception as e:
        print(f"Error for {location}: {e}")
        location_coords[location] = None

    sleep(1)  # Avoid rate limits

# Build GeoJSON structure
geojson = {
    "type": "FeatureCollection",
    "features": []
}

for location, researchers in locations_data.items():
    coords = location_coords.get(location)

    if coords:  # Only include valid locations
        feature = {
            "type": "Feature",
            "properties": {
                "location": location,
                "researchers": []
            },
            "geometry": {
                "type": "Point",
                "coordinates": coords
            }
        }

        for researcher, details in researchers.items():
            works = details.get("works", [])
            url = researcher_urls.get(researcher, "No URL Found")

            feature["properties"]["researchers"].append({
                "name": researcher,
                "works": works,
                "url": url
            })

        geojson["features"].append(feature)

# Save to a GeoJSON file
with open("research_profiles.geojson", "w", encoding="utf-8") as file:
    json.dump(geojson, file, indent=2)

print("GeoJSON file created: research_profiles.geojson")
