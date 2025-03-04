import os
import time
import logging
import pandas as pd
import json
import re
from unidecode import unidecode

from geopy.geocoders import Nominatim

# API
geolocator = Nominatim(user_agent="lctnguyen@ucdavis.edu")
manual_geo_name = {
  "CA" : "California",
  "California, U.S.A." : "California",
  "the United States" : "USA",
  "U.S." : "USA",
  "Greenland" : "Greenland, Denmark",
  "East Greenland" : "Greenland, Denmark"
}

BATCH_SIZE = 100

# Clear the log file on each run
log_file = "processing.log"
if os.path.exists(log_file):
  os.remove(log_file)

# Setup logging
logging.basicConfig(filename=log_file, level=logging.INFO, format="%(asctime)s - %(message)s")

# Temporary storage. Will parse into Json file
profiles = {}           # Expert's name -> Profile object
location_based = {}     # Location -> {Expert's name -> GeoProfileMapping object}
coordinates = {}        # Location -> Coordinates

# Use in this script only. Store geocoded locations
geoData = {}          # Location's name -> its info (id, coordinate, level)
standardGeoName = {}  # Location's id -> normalized name

unique_titles = set()
unique_locations = set()
unique_researchers = set()

def normalizeLocationName(location):
  location = location.strip().lower()
  location = re.sub(r'\s+', ' ', location)
  location = re.sub(r'^the\s+', '', location, flags=re.IGNORECASE)
  location = re.sub(r'\b\w', lambda c: c.group(0).upper(), location)
  return location

class Profile:
  def __init__(self, name):
    self.name = name
    self.titles = []
    self.locations = []

  def addTitle(self, title):
    self.titles.append(title)
    unique_titles.add(title)

  def addLocation(self, location):
    self.locations.append(location)
    unique_locations.add(location)

def profileToJson(profile: Profile):
  return {"titles": profile.titles, "locations": profile.locations}

class GeoProfileMapping:
  def __init__(self, name, location):
    self.name = name
    self.location = location
    self.relatedWork = []
    self.matchesCount = 0

  def addRelatedWork(self, work):
    self.relatedWork.append(work)
    self.matchesCount += 1

def geoProfileMappingToJson(mapping: GeoProfileMapping):
  return {"matches": mapping.matchesCount, "works": mapping.relatedWork}


# -----Main-----
start_time = time.time()

# Locate files
script_dir = os.path.dirname(os.path.abspath(__file__))
csv_file_path = os.path.join(script_dir, "..", "data", "csv", "expert_profiles.csv")
csv_file_path = os.path.abspath(csv_file_path)
geo_file_path = os.path.join(script_dir, "..", "data", "json", "llama_geo_results.jsonl")
geo_file_path = os.path.abspath(geo_file_path)

if not os.path.exists(csv_file_path):
  raise FileNotFoundError(f"CSV file not found at: {csv_file_path}")
if not os.path.exists(geo_file_path):
  raise FileNotFoundError(f"Llama's result file not found at: {geo_file_path}")

logging.info("Processing file: %s", csv_file_path)
logging.info("Processing file: %s", geo_file_path)

# Read data from expert_profiles.csv
data = pd.read_csv(csv_file_path)
total_rows = len(data)

# Read locations from llama_geo_results.jsonl
with open(geo_file_path, "r") as file:
  llama_results = list(file)

# Match locations to data
geo = ["N/A"] * total_rows
for ret in llama_results:
  ret = json.loads(ret)
  id = int(ret["custom_id"])
  geo[id] = ret["response"]["body"]["choices"][0]["message"]["content"]
data["geo"] = geo

titles = data["title"].tolist()
names = data["Name"].tolist()
locations = data["geo"].tolist()

total_locations = 0
fail_to_geocode = set()

# Use batch for stats/visualization only
for batch_start in range(0, total_rows, BATCH_SIZE):
  batch_end = min(batch_start + BATCH_SIZE, total_rows)
  batch_names = names[batch_start:batch_end]
  batch_titles = titles[batch_start:batch_end]
  batch_locations = locations[batch_start:batch_end]
  
  batch_start_time = time.time()
  batch_location_count = 0
  
  for name, title, location in zip(batch_names, batch_titles, batch_locations):
    unique_researchers.add(name)  # Track unique researchers
    
    # Add title to corresponding expert profile
    if name not in profiles:
      profiles[name] = Profile(name)
    profiles[name].addTitle(title)
    
    # Some manual name changes for api
    if location in manual_geo_name:
      location = manual_geo_name[location]
    
    # Geocode and store to 'geoData' if it's a new location
    if location != "N/A":
      if location not in geoData:
        time.sleep(0.6)
        try:
          geo = geolocator.geocode(location)
          if geo:
            full_info = geo.raw
            geoData[location] = {
              "geo_id" : full_info["osm_id"],
              "coordinate" : [geo.latitude, geo.longitude],
              "level" : full_info["place_rank"]
            }
          else:
            fail_to_geocode.add(location)
        except Exception:
          print("API error geocoding: ", location)
          
    # Handle expert/title that has location
    if location in geoData:
      batch_location_count += 1

      # Use standardize location's name
      if geoData[location]["geo_id"] not in standardGeoName:
        standardGeoName[geoData[location]["geo_id"]] = location
      location_name = standardGeoName[geoData[location]["geo_id"]]
      location_name = normalizeLocationName(location_name)
      
      # Store new coordinates
      if location_name not in coordinates:
        coordinates[location_name] = geoData[location]["coordinate"]
      
      # Add location to expert's profile
      profiles[name].addLocation(location_name)
      
      # Update location-based profile mapping
      if location_name not in location_based:
        location_based[location_name] = {}
      if name not in location_based[location_name]:
        location_based[location_name][name] = GeoProfileMapping(name, location_name)

      location_based[location_name][name].addRelatedWork(title)
    else:
      profiles[name].addLocation("None")
      
  batch_time = time.time() - batch_start_time
  total_locations += batch_location_count

  logging.info(
    "Batch %d-%d processed in %.2f seconds | Locations found: %d | Total locations: %d",
    batch_start, batch_end, batch_time, batch_location_count, total_locations
  )
  print(
    f"Processed batch {batch_start}-{batch_end} in {batch_time:.2f}s | "
    f"Locations found: {batch_location_count}"
  )


logging.info("Completed in %.2f seconds", time.time() - start_time)

# Save JSON files, creating them if they don't exist
start_save = time.time()

# Create directories if they don't exist
json_dir = os.path.join(script_dir, "..", "data", "json")
os.makedirs(json_dir, exist_ok=True)

# Save expert profiles
expert_profiles_path = os.path.join(json_dir, "expert_profiles.json")
with open(expert_profiles_path, "w") as file_profiles:
  json.dump(profiles, file_profiles, default=profileToJson, indent=2)

# Save location-based profiles
location_based_profiles_path = os.path.join(json_dir, "location_based_profiles.json")
with open(location_based_profiles_path, "w") as file_locations:
  json.dump(location_based, file_locations, default=geoProfileMappingToJson, indent=2)
  
# Save coordinate
coordinates_path = os.path.join(json_dir, "location_coordinates.json")
with open(coordinates_path, "w") as file_profiles:
  json.dump(coordinates, file_profiles, indent=2)

# Save non-geo profiles
non_geo_profiles = {name: profile for name, profile in profiles.items() if "None" in profile.locations}
non_geo_profiles_path = os.path.join(json_dir, "non_geo_profiles.json")
with open(non_geo_profiles_path, "w") as file_non_geo_profiles:
  json.dump(non_geo_profiles, file_non_geo_profiles, default=profileToJson, indent=2)

logging.info("Saved JSON files in %.2f seconds", time.time() - start_save)

# Final Stats
total_time = time.time() - start_time
logging.info("Final Statistics:")
logging.info("Total unique researchers: %d", len(unique_researchers))
logging.info("Total unique works (titles) parsed: %d", len(unique_titles))
logging.info("Total unique locations extracted: %d", len(unique_locations))
logging.info("Total execution time: %.2f minutes", total_time / 60)

# print("\nLocations that can't be geocoded:")
# for loc in fail_to_geocode:
#   print(loc, "\n")
print(f"Fail to geocode: {len(fail_to_geocode)}")

print("\nFinal Statistics:")
print(f"Total unique researchers: {len(unique_researchers)}")
print(f"Total unique works (titles) parsed: {len(unique_titles)}")
print(f"Total unique locations extracted: {len(unique_locations)}")
print(f"Total execution time: {total_time / 60:.2f} minutes")

print("Processing complete. Check processing.log for batch statistics.")
