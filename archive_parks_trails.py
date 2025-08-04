import streamlit as st
import geopandas as gpd
import folium
from streamlit_folium import st_folium

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
        
        # --- Aggressive Geometry Repair and Cleaning ---
        
        # 1. First, attempt to repair any invalid geometries.
        # This can fix issues like self-intersections.
        parks_gdf['geometry'] = parks_gdf.geometry.make_valid()
        trails_gdf['geometry'] = trails_gdf.geometry.make_valid()

        # 2. Then, filter out any remaining invalid, empty, or None geometries.
        # This is a very robust filter.
        original_parks_count = len(parks_gdf)
        parks_gdf = parks_gdf[parks_gdf.geometry.is_valid & ~parks_gdf.geometry.is_empty & ~parks_gdf.geometry.isna()]
        removed_parks_count = original_parks_count - len(parks_gdf)
        if removed_parks_count > 0:
            st.warning(f"Removed {removed_parks_count} parks with invalid or empty geometries after repair.")
            
        original_trails_count = len(trails_gdf)
        trails_gdf = trails_gdf[trails_gdf.geometry.is_valid & ~trails_gdf.geometry.is_empty & ~trails_gdf.geometry.isna()]
        removed_trails_count = original_trails_count - len(trails_gdf)
        if removed_trails_count > 0:
            st.warning(f"Removed {removed_trails_count} trails with invalid or empty geometries after repair.")
        
        # Check if the dataframe is empty after cleaning
        if parks_gdf.empty or trails_gdf.empty:
            st.error("After cleaning, one of the GeoDataFrames is empty. This may be why the app is failing.")
            st.stop()

        # --- Data Cleaning for JSON Serialization (from previous fix) ---
        for col in parks_gdf.columns:
            if parks_gdf[col].dtype.name not in ['object', 'int64', 'float64', 'bool']:
                parks_gdf[col] = parks_gdf[col].astype(str)
        
        for col in trails_gdf.columns:
            if trails_gdf[col].dtype.name not in ['object', 'int64', 'float64', 'bool']:
                trails_gdf[col] = trails_gdf[col].astype(str)

        return parks_gdf, trails_gdf
    except Exception as e:
        st.error(f"Error loading GeoJSON data: {e}")
        return None, None

parks_gdf, trails_gdf = load_data()

# Check if data loaded successfully
if parks_gdf is None or trails_gdf is None:
    st.stop()

# --- Sidebar for Controls ---
with st.sidebar:
    st.header("Map Controls")
    
    # Basemap selection
    basemap_choice = st.radio(
        "Select Base Map",
        ("OpenStreetMap", "Stamen Terrain", "Esri Satellite")
    )
    
    # Layer toggles
    st.subheader("Layers")
    show_parks = st.checkbox("Show Parks", value=True)
    show_trails = st.checkbox("Show Trails", value=True)
    
    # Display feature counts
    st.info(f"Parks: {len(parks_gdf)} | Trails: {len(trails_gdf)}")
    
    # Reset button
    if st.button("Reset View"):
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


# --- Define Functions for Custom Popups ---

def parks_popup(feature):
    """Generates an HTML popup for park features."""
    props = feature['properties']
    html = f"""
    <div class="popup-content">
        <div class="feature-type park">PARK</div>
        <h3>{props.get('Name', 'No Name')}</h3>
        <p><strong>Description:</strong> {props.get('Description', 'N/A')}</p>
        <p><strong>Acres:</strong> {props.get('Acres', 'N/A')}</p>
        <p><strong>Amenities:</strong> {props.get('Amenities', 'N/A')}</p>
    </div>
    """
    return folium.Popup(html)

def trails_popup(feature):
    """Generates an HTML popup for trail features."""
    props = feature['properties']
    html = f"""
    <div class="popup-content">
        <div class="feature-type trail">TRAIL</div>
        <h3>{props.get('name', 'No Name')}</h3>
        <p><strong>Description:</strong> {props.get('Description', 'N/A')}</p>
        <p><strong>Length:</strong> {props.get('Length (mi)', 'N/A')}</p>
        <p><strong>Difficulty:</strong> {props.get('Difficulty', 'N/A')}</p>
        <p><strong>External Link:</strong> {props.get('External Link', 'N/A')}</p>
    </div>
    """
    return folium.Popup(html)

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
        # Use a lambda function to create the popup for each feature
        on_each_feature=lambda feature, layer: layer.bind_popup(trails_popup(feature))
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
        # Use a lambda function to create the popup for each feature
        on_each_feature=lambda feature, layer: layer.bind_popup(parks_popup(feature))
    ).add_to(m)

# Add a layer control to the map
folium.LayerControl().add_to(m)

# --- Display Map in Streamlit ---
# Render the map using streamlit-folium
st_folium(m, width=900, height=600)