// Initialize the map
var map = L.map('map').setView([35.0456, -85.3097], 13); // Centered on Chattanooga, TN, zoom level 13

// Add a base tile layer (OpenStreetMap)
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

// Add a marker
var marker = L.marker([35.0456, -85.3097]).addTo(map);

// Add a popup to the marker
marker.bindPopup("<b>Hello, Chattanooga!</b><br>This is my first interactive map.").openPopup();

// You can add more features here, like:
// - GeoJSON data: L.geoJSON(yourGeoJsonData).addTo(map);
// - Circles, polygons, etc.
// - Event listeners for clicks, hovers, etc.