class ChattanoogaMap {
    constructor() {
        this.map = null;
        this.parksLayer = null;
        this.trailsLayer = null;
        this.baseMaps = {};
        this.overlayMaps = {};
        this.defaultCenter = [35.0456, -85.3097]; // Chattanooga coordinates
        this.defaultZoom = 11;

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
        this.map = L.map('map', {
            center: this.defaultCenter,
            zoom: this.defaultZoom,
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
            "Topo": esriTopo,
            "National Geographic": NatGeo,
            "Street Map": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }),
            "Imagery": esriImagery,
            "Hybrid Imagery": L.layerGroup([esriImagery, esriLabels]),
        };
        
        this.baseMaps["Topo"].addTo(this.map);
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
    
    // This method fetches the data from the provided GeoJSON files
    async loadData() {
        this.showLoading();
        
        try {
            const parksResponse = await fetch('chatt_parks.geojson');
            if (!parksResponse.ok) throw new Error(`HTTP error! Status: ${parksResponse.status}`);
            const parksData = await parksResponse.json();
            this.loadParks(parksData);

            const trailsResponse = await fetch('chatt_trails.geojson');
            if (!trailsResponse.ok) throw new Error(`HTTP error! Status: ${trailsResponse.status}`);
            const trailsData = await trailsResponse.json();
            this.loadTrails(trailsData);

            // After loading data, set map initial view
            this.setInitialView();

            // Create the Leaflet layer control
            L.control.layers(this.baseMaps, this.overlayMaps, { collapsed: false }).addTo(this.map);
            
            this.hideLoading();
        } catch (error) {
            this.hideLoading();
            this.showError(`Error loading map data: ${error.message}. Make sure the GeoJSON files are in the same directory.`);
            console.error('Error loading data:', error);
        }
    }
    
    loadParks(geojsonData) {
        this.parksLayer = L.geoJSON(geojsonData, {
            pointToLayer: (feature, latlng) => {
                return L.circleMarker(latlng, {
                    radius: 8,
                    fillColor: "#27ae60",
                    color: "#fff",
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.8
                });
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
                            <p><strong>External Link:</strong> ${props['EXT_LINK'] || 'N/A'}</p>
                            <p><strong>Acres:</strong> ${props['ACRES'] || 'N/A'}</p>
                            <p><strong>Latitude:</strong> ${props['LATITUDE'] || 'N/A'}</p>
                            <p><strong>Longitude:</strong> ${props['LONGITUDE'] || 'N/A'}</p>
                        </div>
                    `;
                    layer.bindPopup(popupContent);
                }
            }
        });
        
        // Add parks layer to overlayMaps object for control
        this.overlayMaps["Parks"] = this.parksLayer;
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
                            <p><strong>External Link:</strong> ${props['EXT_LINK'] || 'N/A'}</p>
                        </div>
                    `;
                    layer.bindPopup(popupContent);
                }
            }
        });
        
        // Add trails layer to the overlayMaps object for control
        this.overlayMaps["Trails"] = this.trailsLayer;
    }

    setInitialView() {
        if (this.trailsLayer) {
            this.map.fitBounds(this.trailsLayer.getBounds());
        } else {
            this.map.setView(this.defaultCenter, this.defaultZoom);
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