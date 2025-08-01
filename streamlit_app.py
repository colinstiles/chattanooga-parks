import streamlit as st
import geopandas as gpd
import folium
from streamlit_folium import folium_static

# --- App Configuration ---
st.set_page_config(
    page_title="Chattanooga Parks & Trails",
    page_icon="🌲",
    layout="wide"
)

# --- Title and Header ---
st.title("Chattanooga Parks & Trails Explorer")
st.markdown("Use the controls below to explore parks and trails in Chattanooga.")

# --- Data Loading ---
@st.cache_data
def load_data():
    """Load GeoJSON data for parks and trails."""
    try:
        parks_gdf = gpd.read_file("chatt_parks.geojson")
        trails_gdf = gpd.read_file("chatt_trails.geojson")
        return parks_gdf, trails_gdf
    except Exception as e:
        st.error(f"Error loading GeoJSON data: {e}")
        return None, None

parks_gdf, trails_gdf = load_data()

# Check if data loaded successfully
if parks_gdf is None or trails_gdf is None:
    st.stop()

# --- Sidebar for Controls ---
st.sidebar.header("Map Controls")

# Basemap selection
basemap_choice = st.sidebar.radio(
    "Select Base Map",
    ("OpenStreetMap", "Stamen Terrain", "Esri Satellite")
)

# Layer toggles
st.sidebar.subheader("Layers")
show_parks = st.sidebar.checkbox("Show Parks", value=True)
show_trails = st.sidebar.checkbox("Show Trails", value=True)

# Display feature counts
st.sidebar.info(f"Parks: {len(parks_gdf)} | Trails: {len(trails_gdf)}")

# Reset button
if st.sidebar.button("Reset View"):
    st.experimental_rerun()


# --- Map Initialization ---
# Create a folium map object centered on Chattanooga
m = folium.Map(location=[35.0456, -85.3097], zoom_start=11)

# Add basemaps
if basemap_choice == "Stamen Terrain":
    folium.TileLayer('Stamen Terrain', attr='Map data © Stamen Design', name='Stamen Terrain').add_to(m)
elif basemap_choice == "Esri Satellite":
    folium.TileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attr='Tiles © Esri', name='Esri Satellite').add_to(m)
else: # Default to OpenStreetMap
    folium.TileLayer('OpenStreetMap', attr='Map data © OpenStreetMap contributors', name='OpenStreetMap').add_to(m)


# --- Add Layers to Map ---

# Add Trails Layer
if show_trails and not trails_gdf.empty:
    folium.GeoJson(
        trails_gdf,
        name="Trails",
        style_function=lambda x: {
            'color': '#f39c12', 
            'weight': 4, 
            'opacity': 0.8
        },
        tooltip=folium.GeoJsonTooltip(fields=['TRAIL_NAME', 'LENGTH', 'SURFACE_TYPE', 'ADA', 'EXT_LINK'],
                                      aliases=['Trail Name:', 'Length (mi):', 'Surface Type:', 'ADA Accessible:', 'External Link:'],
                                      localize=True)
    ).add_to(m)

# Add Parks Layer
if show_parks and not parks_gdf.empty:
    folium.GeoJson(
        parks_gdf,
        name="Parks",
        point_to_layer=lambda feature, latlng: folium.CircleMarker(
            latlng,
            radius=8,
            fill_color="#27ae60",
            color="#fff",
            weight=2,
            opacity=1,
            fill_opacity=0.8
        ),
        tooltip=folium.GeoJsonTooltip(fields=['NAME', 'DESCRIPTION', 'AMENITIES', 'ACRES'],
                                      aliases=['Name:', 'Description:', 'Amenities:', 'Acres:'],
                                      localize=True)
    ).add_to(m)


# Add a layer control to the map
folium.LayerControl().add_to(m)

# --- Display Map in Streamlit ---
# Render the map using streamlit-folium
folium_static(m, width=900, height=600)