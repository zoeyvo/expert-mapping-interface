import os
import time
import logging
import pandas as pd
import spacy
import json
from geopy.geocoders import Nominatim
from unidecode import unidecode

# Clear the log file on each run
log_file = "processing.log"
if os.path.exists(log_file):
  os.remove(log_file)

# Setup logging
logging.basicConfig(filename=log_file, level=logging.INFO, format="%(asctime)s - %(message)s")

# Geocoding API
geolocator = Nominatim(user_agent="lctnguyen@ucdavis.edu")
  
# Define batch size for NLP processing
BATCH_SIZE = 10  # ~ 1.8 min to process sample data

# Temporary storage. Store in Json file
profiles = {}     # Expert's name -> Profile object
locations = {}    # Location -> {Expert's name -> GeoProfileMapping object}
coordinates = {}  # Location -> Coordinate

# Use in this script only. Store geocoded locations
geoData = {}      # Location's name -> its info (normalized name, coordinate, type)

unique_titles = set()
unique_locations = set()
unique_researchers = set()

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

# Load NLP model
start_time = time.time()
nlp = spacy.load("en_core_web_trf")
logging.info("Loaded spaCy model in %.2f seconds", time.time() - start_time)

# Locate the CSV file
script_dir = os.path.dirname(os.path.abspath(__file__))
csv_file_path = os.path.join(script_dir, "..", "data", "csv", "expert_profiles.csv")
csv_file_path = os.path.abspath(csv_file_path)

if not os.path.exists(csv_file_path):
  raise FileNotFoundError(f"CSV file not found at: {csv_file_path}")

logging.info("Processing file: %s", csv_file_path)

# Read data
data = pd.read_csv(csv_file_path)
total_rows = len(data)
titles = data["title"].tolist()
names = data["Name"].tolist()

# Process in batches
start_nlp_time = time.time()
total_locations = 0

for batch_start in range(0, total_rows, BATCH_SIZE):
  batch_end = min(batch_start + BATCH_SIZE, total_rows)
  batch_titles = titles[batch_start:batch_end]
  batch_names = names[batch_start:batch_end]

  batch_start_time = time.time()
  batch_docs = list(nlp.pipe(batch_titles, batch_size=BATCH_SIZE))

  batch_location_count = 0

  for name, title, doc in zip(batch_names, batch_titles, batch_docs):
    unique_researchers.add(name)  # Track unique researchers

    # Add title to corresponding expert profile
    if name not in profiles:
      profiles[name] = Profile(name)
    profiles[name].addTitle(title)

    # Extract locations
    found_location = False  # Track if any location was found
    for ent in doc.ents:
      if ent.label_ == "GPE":
        geo = ent.text
        # Geocode if it's a new location
        if geo not in geoData:
          # Waiting for API
          time.sleep(0.1)
          
          location = geolocator.geocode(geo)
          if location:
            found_location = True
            batch_location_count += 1
            
            full_info = location.raw
            info = {
              "geo_name" : unidecode(full_info["name"]),
              "coordinate" : [location.latitude, location.longitude],
              "type" : full_info["place_rank"]      # Country = 4, State = 8, City = 16
            }
            geoData[geo] = info
          else:
            continue
        
        # Use location's normalized name
        geo_name = geoData[geo]["geo_name"]
        
        # Store new coordinates
        if geo_name not in coordinates:
          coordinates[geo_name] = geoData[geo]["coordinate"]

        # Add location to expert's profile
        profiles[name].addLocation(geo_name)

        # Update location-based profile mapping
        if geo_name not in locations:
          locations[geo_name] = {}
        if name not in locations[geo_name]:
          locations[geo_name][name] = GeoProfileMapping(name, geo_name)

        locations[geo_name][name].addRelatedWork(title)

    if not found_location:
      # If no location found, we can consider this as a non-geo profile
      profiles[name].addLocation("None")  # Or any other way to represent no location

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

logging.info("Completed NLP processing in %.2f seconds", time.time() - start_nlp_time)

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
  json.dump(locations, file_locations, default=geoProfileMappingToJson, indent=2)
  
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

print("\nFinal Statistics:")
print(f"Total unique researchers: {len(unique_researchers)}")
print(f"Total unique works (titles) parsed: {len(unique_titles)}")
print(f"Total unique locations extracted: {len(unique_locations)}")
print(f"Total execution time: {total_time / 60:.2f} minutes")

print("Processing complete. Check processing.log for batch statistics.")
