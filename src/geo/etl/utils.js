function normalizeLocationName(location) {
  return location.trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/^the\s+/i, '')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function normalizeResearcherName(name) {
  return name.trim()
    .split(',')
    .map(part => part.trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase())
    )
    .join(', ');
}

module.exports = {
  normalizeLocationName,
  normalizeResearcherName
}; 