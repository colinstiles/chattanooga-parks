class ChattanoogaMap {
    constructor() {
        this.map = null;
        this.parksLayer = null;
        this.trailsLayer = null;
        this.baseMaps = {};
        this.overlayMaps = {};

        // Initialize map immediately when page loads
        this.init();

        // Bind the 'Enter Map' button click to hide splash screen
        document.getElementById('enterMapButton').addEventListener('click', () => {
            this.hideSplashScreen();
        });
    }

    hideSplashScreen() {
        const splashScreen = document.getElementById('splashScreen');
        splashScreen.classList.add('hidden');
    }

    init() {
        this.initMap();
        this.initBaseMaps();
        this.initControls();
        this.loadData();
    }
    
    initMap() {
        // Initialize the map without a default center or zoom
        this.map = L.map('map', {
            zoomControl: false
        });
        
        // Add custom zoom control
        L.control.zoom({
            position: 'bottomright'
        }).addTo(this.map);
    }
    
    initBaseMaps() {
        const esriTopo = L.tileLayer('https://server.arcgisonline.com/arcgis/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
            attribution: '© Esri'
        });
        const NatGeo = L.tileLayer('https://server.arcgisonline.com/arcgis/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}', {
            attribution: '© Esri'
        });
        const esriImagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: '© Esri'
        });
        const esriLabels = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
            attribution: '© Esri'
        });

        this.baseMaps = {
            "Topographic": esriTopo,
            "National Geographic": NatGeo,
            "Street Map": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }),
            "Imagery": esriImagery,
            "Hybrid Imagery": L.layerGroup([esriImagery, esriLabels]),
        };
        
        this.baseMaps["Topographic"].addTo(this.map);
    }
    
    initControls() {
        // Reset view
        document.getElementById('resetView').addEventListener('click', () => {
            this.resetView();
        });
    }
    
    resetView() {
        this.setInitialView();
    }
    
    showLoading() {
        document.getElementById('loadingIndicator').classList.add('active');
    }
    
    hideLoading() {
        document.getElementById('loadingIndicator').classList.remove('active');
    }
    
    showError(message) {
        const errorEl = document.getElementById('errorMessage');
        errorEl.textContent = message;
        errorEl.classList.add('active');
        setTimeout(() => errorEl.classList.remove('active'), 5000);
    }
    
    // This method fetches the data from the provided GeoJSON files using Promise.all
    async loadData() {
        this.showLoading();
        
        try {
            const [parksResponse, trailsResponse] = await Promise.all([
                fetch('chatt_parks.geojson'),
                fetch('chatt_trails.geojson')
            ]);
            
            if (!parksResponse.ok || !trailsResponse.ok) {
                throw new Error('One or more GeoJSON files could not be loaded.');
            }

            const parksData = await parksResponse.json();
            const trailsData = await trailsResponse.json();

            this.loadParks(parksData);
            this.loadTrails(trailsData);

            // After loading data, set map initial view
            this.setInitialView();
            
            // Create the Leaflet layer control with the legend symbols inside the layer name
            this.overlayMaps = {
                '<i class="park"></i> Parks': this.parksLayer,
                '<i class="trail"></i> Trails': this.trailsLayer
            };

            L.control.layers(this.baseMaps, this.overlayMaps, { collapsed: false, position: 'topright' }).addTo(this.map);
            
            this.hideLoading();
        } catch (error) {
            this.hideLoading();
            this.showError(`Error loading map data: ${error.message}. Make sure the GeoJSON files are in the same directory.`);
            console.error('Error loading data:', error);
        }
    }
    
    loadParks(geojsonData) {
        this.parksLayer = L.geoJSON(geojsonData, {
            style: {
                fillColor: "#27ae60",
                color: "#fff",
                weight: 2,
                opacity: 1,
                fillOpacity: 0.7
            },
            onEachFeature: (feature, layer) => {
                const props = feature.properties;
                if (props) {
                    const popupContent = `
                        <div class="popup-content">
                            <div class="feature-type park">PARK</div>
                            <h3>${props['Name'] || props['name'] || 'No Name'}</h3>
                            <p><strong>Address:</strong> ${props['ADDRESS'] || 'N/A'}</p>
                            <p><strong>Amenities:</strong> ${props['AMENITIES'] || 'N/A'}</p>
                            <p><strong>Hours:</strong> ${props['HOURS'] || 'N/A'}</p>
                            <p><strong>Description:</strong> ${props['DESCRIPTION'] || 'N/A'}</p>
                            <p><strong>External Link:</strong> ${props['EXT_LINK'] ? `<a href="${props['EXT_LINK']}" target="_blank">View Website</a>` : 'N/A'}</p>
                            <p><strong>Acres:</strong> ${props['ACRES'] || 'N/A'}</p>
                            <p><strong>Latitude:</strong> ${props['LATITUDE'] || 'N/A'}</p>
                            <p><strong>Longitude:</strong> ${props['LONGITUDE'] || 'N/A'}</p>
                        </div>
                    `;
                    layer.bindPopup(popupContent);
                }
            }
        });
        
        // This layer is now added to the overlayMaps object after all data is loaded
    }
    
    loadTrails(geojsonData) {
        this.trailsLayer = L.geoJSON(geojsonData, {
            style: {
                color: "#f39c12",
                weight: 4,
                opacity: 0.8
            },
            onEachFeature: (feature, layer) => {
                const props = feature.properties;
                if (props) {
                    const popupContent = `
                        <div class="popup-content">
                            <div class="feature-type trail">TRAIL</div>
                            <h3>${props['NAME'] || 'No Name'}</h3>
                            <p><strong>Trail Type:</strong> ${props['TRAIL_TYPE'] || 'N/A'}</p>
                            <p><strong>Length (mi):</strong> ${props['LENGTH_MI'] || 'N/A'}</p>
                            <p><strong>ADA Accessible:</strong> ${props['ADA'] || 'N/A'}</p>
                            <p><strong>External Link:</strong> ${props['EXT_LINK'] ? `<a href="${props['EXT_LINK']}" target="_blank">View Website</a>` : 'N/A'}</p>
                        </div>
                    `;
                    layer.bindPopup(popupContent);
                }
            }
        });
        
        // This layer is now added to the overlayMaps object after all data is loaded
    }

    setInitialView() {
        const defaultCenter = [35.0456, -85.3097];
        const defaultZoom = 11;

        // Check if the trails layer has been loaded before attempting to get its bounds
        if (this.trailsLayer && Object.keys(this.trailsLayer.getBounds()).length > 0) {
            this.map.fitBounds(this.trailsLayer.getBounds());
        } else {
            this.map.setView(defaultCenter, defaultZoom);
        }

        // Add layers to the map after fitting the view
        if (this.parksLayer) {
            this.parksLayer.addTo(this.map);
        }
        if (this.trailsLayer) {
            this.trailsLayer.addTo(this.map);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ChattanoogaMap();
});