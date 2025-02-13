Expert Mapping Interface (EMI): Zoey Vo, Alyssa Vallejo, Marina Mata, Loc Nguyen

Project Overview
Introduction
The Aggie Experts Geo Data Visualizer addresses the challenge of visualizing research studies, grants, and scholarships among UC Davis researchers based on their affiliated geographic locations. Currently, finding relevant research or experts is limited to keyword-based text searches, which often yield ambiguous or irrelevant results. Our solution introduces an interactive, user-friendly map that allows users to discover spatially relevant researchers by navigating intuitively through geographic regions. Users can click on different areas to explore researchers, their work, and grants, bridging the gap between text-based searches and spatially contextualized research discovery.

Problem Statement
Current UC Davis researcher databases rely on static search interfaces that:
Lack spatial context, making it difficult to identify region-specific experts.
Suffer from ambiguity (e.g., homonyms like “Turkey” the country vs. “turkey” the bird).
Overwhelm users with unstructured data in research-dense regions (e.g., hundreds of experts in California).

Solution: Geo Data Visualizer
The Geo Data Visualizer dynamically displays Aggie Experts (A.E.) data through:
Interactive World Map
Dynamic Clustering: Automatically groups researchers in dense areas (e.g., California) into clusters that expand on zoom.
Geospatial Precision: Pins link to researcher profiles, grants, and publications, filtered by relevance to the selected region.
Multi-Scale Visualization: Displays continental trends at a macro level and granular details (country, region, city, etc.) dynamically on zoom.

System Architecture (C4 Diagrams)
Context diagram: Illustrates the system’s ecosystem, including actors (researchers, students, administrators) and external systems.
Container Diagram: Details components such as the web server, database, and data processing pipelines.
Component Diagram: Breaks down frontend elements like the map controller, location extractor, and profile viewer.

Technology Stack
Backend
PostGIS: Geospatial database for storing and querying researcher locations as GeoJSON. Enables complex queries (e.g., “Show all experts within 50km of Santiago, Chile”).
Node.js: RESTful API handling data fetching, filtering, and aggregation.

Frontend
React.js: Dynamic UI components for seamless map interactions.
Leaflet: Open-source library for rendering vector maps with smooth zoom/pan and custom layers.
Tailwind CSS: Responsive, utility-first styling aligned with UC Davis branding.
Data Pipeline
Python Scripts: Clean and geocode raw data (e.g., extracting locations from unstructured grant text using NLP libraries like spaCy).
Geocoding APIs: Convert place names (e.g., “Atacama Desert”) to coordinates for accurate pin placement.

Requirements & Development Roadmap
MVP (Minimum Viable Product)
Core Features:
Interactive map with clickable regions/clusters.
Researcher pins linked to Aggie Experts profiles.
Anti-Clutter Measures:
Progressive Disclosure: Show high-level trends (e.g., “50 experts in Brazil”) on low zoom; individual pins on high zoom.
Heatmap Overlay: Visualize research density without overlapping pins.
False Positive Mitigation:
Contextual Queries: Search “Turkey” prioritizes country-based results using geospatial context over text.
User Feedback Loop: Reporting mechanism to flag inaccuracies.
UC Davis Branding: A cohesive UI adhering to university style guides, integrating official colors, logos, and accessibility standards.

Post-MVP Enhancements
Pop-up Cards:
Expand linking to profile to display bio and works/grants relevant to researcher location
Geoparsing Grants/Bios:
Extract grant, bio, and work from databases, find the right package to be able to identify location ex: Atacama is in Chile
Multi-Location Experts:
Pin Multiplicity: Allow researchers to appear in multiple regions tied to specific projects (e.g., Dr. Smith in both Kenya and Nepal).

User Stories (Prioritized)
As a site user, I want a highlight of the reasons for matching profiles so that I can save time looking through each profile and focus on the relevant ones.
As a student, I want search results to be accurate and organized by relevance so that I can find the best fit.
As a student with a passion for research, I want to see what research is happening in specific regions so that I can find fieldwork internships.
As a potential donor, I want to see research projects in specific fields so that I can find and support impactful work.
As a journalist, I want to see where UC Davis researchers are conducting studies so that I can write stories on impactful research in different regions of the world.
As a researcher, I want to see my works represented accurately to ensure that those interested in what I do can contact me.
As a site user, I want the results on the map to be not clustered so it will be easier for me to look through the results.
As a graduate student, I want to be able to contact researchers who have or are currently working in my field of research so that I can ask for their expert opinions or collaboration.
As a site user, I want the map to have high accuracy so that the searching process can be more convenient.
As a researcher, I want a professional profile that displays my work and contact information so that interested individuals are encouraged to reach out to me.

Challenges & Considerations
Data Quality: Cleaning inconsistent location data from legacy systems.
Performance: Optimizing render speed for 10,000+ researcher entries.
Accessibility: WCAG-compliant design for screen readers and keyboard navigation.
Existing Codebase: Integrating into an existing system.
Accuracy: Ensuring precise research and location identification.

Development Considerations
Cost
Map: Leaflet.js is free and open source.
Geographic Data Extraction: NLP libraries with Named Entity Recognition like spaCy and Flair are free to use.
Space
The client aims to avoid hosting data locally by using linked data to different sources. Extracted geographic data will be stored using PostgreSQL.
Security
Data is fetched from public sources. Users log in through CAS, but the site might be opened to the public later (handled by the client).
Privacy
Experts can customize the visibility of their information (handled by the client).
Scalability
The project is designed for UC Davis and its experts only. It might work for others if the provided data conforms to the same format.
Maintainability
The project will be integrated into the UC Davis library’s system, requiring careful design and thorough documentation for future developers.
Social Aspect
Making UC Davis research more accessible and easier to identify grants/work based on geo-spatial location.
License
MIT License.

Conclusion & Impact
By transforming geographic data into actionable insights, the Aggie Experts Geo Data Visualizer empowers UC Davis to showcase its global research footprint, accelerate discovery, and provide accessible information. This tool not only enhances research visibility but also fosters collaboration and supports the university’s mission to make knowledge more accessible to all.
