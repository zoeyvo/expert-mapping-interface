/**
 * fetchProfiles.js
 * 
 * Client-side API functions to fetch researcher profiles from the server.
 */

const API_BASE_URL = 'http://localhost:3001/api';

/**
 * Fetch researcher profiles with optional filters
 * @param {Object} options - Search options
 * @param {string} options.name - Filter by researcher name
 * @param {string} options.location - Filter by location name
 * @param {number} options.limit - Maximum number of results
 * @param {number} options.offset - Offset for pagination
 * @returns {Promise<Object>} Researcher profiles and count
 */
async function fetchResearcherProfiles(options = {}) {
    const { name, location, limit = 50, offset = 0 } = options;
    
    // Build query string
    const params = new URLSearchParams();
    if (name) params.append('name', name);
    if (location) params.append('location', location);
    params.append('limit', limit);
    params.append('offset', offset);

    try {
        const response = await fetch(`${API_BASE_URL}/researchers?${params}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching researcher profiles:', error);
        throw error;
    }
}

/**
 * Fetch detailed information for a specific researcher
 * @param {string} name - Exact researcher name
 * @returns {Promise<Object>} Detailed researcher information
 */
async function fetchResearcherDetails(name) {
    try {
        const response = await fetch(`${API_BASE_URL}/researchers/${encodeURIComponent(name)}`);
        if (!response.ok) {
            if (response.status === 404) {
                return null;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching researcher details:', error);
        throw error;
    }
}

/**
 * Fetch all research locations
 * @returns {Promise<Object>} GeoJSON FeatureCollection
 */
async function fetchResearchLocations() {
    try {
        const response = await fetch(`${API_BASE_URL}/research-locations`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching research locations:', error);
        throw error;
    }
}

// Example usage:
async function searchResearchers(searchTerm) {
    try {
        const results = await fetchResearcherProfiles({
            name: searchTerm,
            limit: 10
        });
        return results;
    } catch (error) {
        console.error('Search failed:', error);
        throw error;
    }
}

module.exports = {
    fetchResearcherProfiles,
    fetchResearcherDetails,
    fetchResearchLocations,
    searchResearchers
}; 