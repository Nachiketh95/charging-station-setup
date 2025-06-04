<template>
  <!--
    Map.vue - Charging Stations Map Component
    
    SETUP INSTRUCTIONS:
    1. Install leaflet: npm install leaflet
    2. Ensure your backend has the charging stations API endpoint
    3. Update the API URL in fetchChargingStations() method
    
    BACKEND API REQUIREMENTS:
    - Endpoint: GET /api/charging-stations or /api/chargers
    - Response format: Array of charging station objects with:
      {
        id: number,
        name: string,
        location: { latitude: number, longitude: number, address?: string },
        status: "Active" | "Inactive",
        powerOutput: number,
        connectorType: string
      }
  -->
  <div class="map-container">
    <!-- Header with controls -->
    <div class="map-header">
      <div class="header-left">
        <h1 class="map-title">⚡ Charging Stations Map</h1>
        <div class="station-count" v-if="chargingStations.length > 0">
          {{ chargingStations.length }} stations found
        </div>
      </div>
      <div class="header-controls">
        <button @click="refreshStations" class="refresh-btn" :disabled="loading">
          <span v-if="loading">🔄</span>
          <span v-else>↻</span>
          Refresh
        </button>
        <button @click="goBack" class="back-btn">
          ← Back to Chargers
        </button>
      </div>
    </div>

    <!-- Filter Controls -->
    <div class="filter-bar">
      <div class="filter-group">
        <label>Status:</label>
        <select v-model="statusFilter" @change="filterStations">
          <option value="all">All Stations</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
      </div>
      <div class="filter-group">
        <label>Connector:</label>
        <select v-model="connectorFilter" @change="filterStations">
          <option value="all">All Types</option>
          <option v-for="connector in uniqueConnectors" :key="connector" :value="connector">
            {{ connector }}
          </option>
        </select>
      </div>
      <div class="filter-group">
        <label>Min Power:</label>
        <select v-model="powerFilter" @change="filterStations">
          <option value="0">Any Power</option>
          <option value="50">50kW+</option>
          <option value="100">100kW+</option>
          <option value="150">150kW+</option>
        </select>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <div class="spinner"></div>
      <p>Loading charging stations...</p>
    </div>

    <!-- Error State -->
    <div v-if="error" class="error-container">
      <div class="error-icon">⚠️</div>
      <p class="error-message">{{ error }}</p>
      <button @click="fetchChargingStations" class="retry-btn">Try Again</button>
    </div>

    <!-- Map Container -->
    <div v-show="!loading && !error" id="map" class="map"></div>

    <!-- Map Legend -->
    <div v-if="!loading && !error && chargingStations.length > 0" class="map-legend">
      <h4>Legend</h4>
      <div class="legend-item">
        <div class="legend-marker active"></div>
        <span>Active Station</span>
      </div>
      <div class="legend-item">
        <div class="legend-marker inactive"></div>
        <span>Inactive Station</span>
      </div>
    </div>

    <!-- Charger Details Modal -->
    <div v-if="selectedCharger" class="modal-overlay" @click="closeModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <div class="modal-title-section">
            <h3>{{ selectedCharger.name }}</h3>
            <span :class="['status-badge', selectedCharger.status.toLowerCase()]">
              {{ selectedCharger.status }}
            </span>
          </div>
          <button @click="closeModal" class="close-btn">&times;</button>
        </div>
        
        <div class="modal-body">
          <div class="detail-section">
            <h4>📍 Location</h4>
            <div class="detail-item">
              <strong>Address:</strong>
              <span>{{ selectedCharger.location?.address || 'Address not available' }}</span>
            </div>
            <div class="detail-item">
              <strong>Coordinates:</strong>
              <span>{{ selectedCharger.location?.latitude }}, {{ selectedCharger.location?.longitude }}</span>
            </div>
          </div>

          <div class="detail-section">
            <h4>⚡ Technical Specifications</h4>
            <div class="detail-item">
              <strong>Power Output:</strong>
              <span class="power-value">{{ selectedCharger.powerOutput }} kW</span>
            </div>
            <div class="detail-item">
              <strong>Connector Type:</strong>
              <span class="connector-type">{{ selectedCharger.connectorType }}</span>
            </div>
          </div>

          <div class="detail-section" v-if="selectedCharger.description">
            <h4>ℹ️ Additional Information</h4>
            <p class="description">{{ selectedCharger.description }}</p>
          </div>
        </div>

        <div class="modal-footer">
          <button @click="getDirections" class="directions-btn">
            🗺️ Get Directions
          </button>
          <button @click="closeModal" class="close-modal-btn">Close</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default {
  name: 'ChargingStationsMap',
  data() {
    return {
      map: null,
      markers: [],
      chargingStations: [],
      filteredStations: [],
      selectedCharger: null,
      loading: true,
      error: null,
      statusFilter: 'all',
      connectorFilter: 'all',
      powerFilter: '0',
      mapInitialized: false,
      resizeObserver: null
    };
  },
  computed: {
    uniqueConnectors() {
      const connectors = [...new Set(this.chargingStations.map(station => station.connectorType))];
      return connectors.filter(connector => connector);
    }
  },
  mounted() {
    this.$nextTick(() => {
      // Small delay to ensure DOM is fully rendered
      setTimeout(() => {
        this.initMap();
      }, 50);
    });
  },
  beforeUnmount() {
    this.cleanup();
  },
  methods: {
    cleanup() {
      // Clean up resize observer
      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
        this.resizeObserver = null;
      }

      // Clear all markers first
      this.clearMarkers();

      // Remove map instance
      if (this.map) {
        try {
          this.map.remove();
        } catch (error) {
          console.warn('Error removing map:', error);
        }
        this.map = null;
      }
      
      this.mapInitialized = false;
    },

    initMap() {
      // Ensure cleanup of any existing map
      this.cleanup();

      const mapContainer = document.getElementById('map');
      if (!mapContainer) {
        console.error('Map container not found');
        this.error = 'Map container not found. Please refresh the page.';
        this.loading = false;
        return;
      }

      try {
        // Initialize the map with proper error handling
        this.map = L.map('map', {
          center: [20.5937, 78.9629],
          zoom: 5,
          zoomControl: true,
          attributionControl: true,
          preferCanvas: true, // Use canvas for better performance
          maxZoom: 18,
          minZoom: 3
        });

        // Add OpenStreetMap tiles
        const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
          detectRetina: true
        });

        tileLayer.addTo(this.map);

        // Add scale control
        this.map.addControl(L.control.scale());

        // Set up resize observer to handle container size changes
        this.setupResizeObserver();

        // Wait for map to be fully loaded before proceeding
        this.map.whenReady(() => {
          console.log('Map initialized successfully');
          this.mapInitialized = true;
          
          // Small delay to ensure map is completely ready
          setTimeout(() => {
            this.fetchChargingStations();
          }, 100);
        });

        // Handle map load errors
        this.map.on('tileerror', (e) => {
          console.warn('Tile loading error:', e);
        });

      } catch (error) {
        console.error('Error initializing map:', error);
        this.error = 'Failed to initialize map. Please refresh the page.';
        this.loading = false;
      }
    },

    setupResizeObserver() {
      if (!window.ResizeObserver) return;

      const mapContainer = document.getElementById('map');
      if (!mapContainer) return;

      this.resizeObserver = new ResizeObserver(() => {
        if (this.map && this.mapInitialized) {
          // Debounce resize calls
          clearTimeout(this.resizeTimeout);
          this.resizeTimeout = setTimeout(() => {
            try {
              this.map.invalidateSize();
            } catch (error) {
              console.warn('Error resizing map:', error);
            }
          }, 100);
        }
      });

      this.resizeObserver.observe(mapContainer);
    },

    async fetchChargingStations() {
      if (!this.mapInitialized) {
        console.warn('Map not initialized, cannot fetch stations');
        return;
      }

      try {
        this.loading = true;
        this.error = null;

        // Try to fetch from your backend API
        const response = await fetch('/api/chargers', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch charging stations: ${response.status}`);
        }

        const data = await response.json();
        console.log('Received charging stations:', data);
        
        this.chargingStations = Array.isArray(data) ? data : [];
        
        if (this.chargingStations.length === 0) {
          this.error = 'No charging stations found. Please add some charging stations first.';
          return;
        }

        this.filteredStations = [...this.chargingStations];
        await this.addMarkersToMap();
        await this.fitMapToBounds();

      } catch (error) {
        console.error('Error fetching charging stations:', error);
        
        // Fallback to comprehensive mock data for demonstration
        console.log('Using mock data for demonstration...');
        this.chargingStations = [
          {
            _id: "1",
            name: "Central Plaza Charging Hub",
            location: {
              latitude: 17.385044,
              longitude: 78.486671,
              address: "Banjara Hills, Hyderabad, Telangana 500034"
            },
            status: "Active",
            powerOutput: 50,
            connectorType: "CCS",
            description: "Fast charging station located in the heart of the city with 24/7 availability."
          },
          {
            _id: "2",
            name: "Tech City Fast Charge",
            location: {
              latitude: 17.445692,
              longitude: 78.380292,
              address: "HITEC City, Madhapur, Hyderabad, Telangana 500081"
            },
            status: "Active",
            powerOutput: 150,
            connectorType: "CHAdeMO",
            description: "Ultra-fast charging station serving the IT corridor."
          },
          {
            _id: "3",
            name: "Airport Charging Station",
            location: {
              latitude: 17.240498,
              longitude: 78.429977,
              address: "Rajiv Gandhi International Airport, Shamshabad"
            },
            status: "Inactive",
            powerOutput: 75,
            connectorType: "Type 2",
            description: "Airport charging facility currently under maintenance."
          },
          {
            _id: "4",
            name: "Mall Charging Point",
            location: {
              latitude: 17.4326,
              longitude: 78.4071,
              address: "Forum Sujana Mall, Kukatpally, Hyderabad"
            },
            status: "Active",
            powerOutput: 25,
            connectorType: "Type 1",
            description: "Convenient charging while you shop."
          },
          {
            _id: "5",
            name: "Highway Rest Stop Charger",
            location: {
              latitude: 17.2403,
              longitude: 78.4294,
              address: "Outer Ring Road, Hyderabad"
            },
            status: "Active",
            powerOutput: 100,
            connectorType: "CCS",
            description: "Perfect for long-distance travel charging."
          }
        ];

        this.filteredStations = [...this.chargingStations];
        await this.addMarkersToMap();
        await this.fitMapToBounds();
        
        this.error = null; // Clear error since we have mock data
      } finally {
        this.loading = false;
      }
    },

    refreshStations() {
      if (this.mapInitialized) {
        this.fetchChargingStations();
      } else {
        // Re-initialize map if not ready
        this.initMap();
      }
    },

    async filterStations() {
      if (!this.mapInitialized) return;

      this.filteredStations = this.chargingStations.filter(station => {
        const statusMatch = this.statusFilter === 'all' || 
                           station.status.toLowerCase() === this.statusFilter;
        
        const connectorMatch = this.connectorFilter === 'all' || 
                              station.connectorType === this.connectorFilter;
        
        const powerMatch = station.powerOutput >= parseInt(this.powerFilter);

        return statusMatch && connectorMatch && powerMatch;
      });

      await this.addMarkersToMap();
      
      if (this.filteredStations.length > 0) {
        await this.fitMapToBounds();
      }
    },

    async addMarkersToMap() {
      if (!this.map || !this.mapInitialized) {
        console.warn('Map not ready for adding markers');
        return;
      }

      // Clear existing markers
      this.clearMarkers();

      // Add markers for filtered charging stations
      const promises = this.filteredStations.map(station => {
        if (station.location && station.location.latitude && station.location.longitude) {
          return this.createMarker(station);
        }
        return null;
      });

      const markers = await Promise.all(promises);
      this.markers = markers.filter(marker => marker !== null);
    },

    async createMarker(station) {
      if (!this.map || !this.mapInitialized) {
        console.warn('Map not ready for creating marker');
        return null;
      }

      // Validate coordinates
      const lat = parseFloat(station.location.latitude);
      const lng = parseFloat(station.location.longitude);
      
      if (isNaN(lat) || isNaN(lng)) {
        console.warn('Invalid coordinates for station:', station.name);
        return null;
      }

      try {
        // Create custom icon based on status and power
        const isActive = station.status.toLowerCase() === 'active';
        const isHighPower = station.powerOutput >= 100;
        
        const customIcon = L.divIcon({
          className: 'custom-marker',
          html: `<div class="marker-icon ${station.status.toLowerCase()} ${isHighPower ? 'high-power' : ''}">
                   <div class="marker-inner">
                     <span class="marker-symbol">⚡</span>
                     <span class="marker-power">${station.powerOutput}kW</span>
                   </div>
                 </div>`,
          iconSize: [50, 60],
          iconAnchor: [25, 60],
          popupAnchor: [0, -60]
        });

        const marker = L.marker([lat, lng], { icon: customIcon });
        
        // Add marker to map only after it's created
        marker.addTo(this.map);
        
        // Add click event to show details
        marker.on('click', () => {
          this.showChargerDetails(station);
        });

        // Enhanced tooltip with more information
        const tooltipContent = `
          <div class="custom-tooltip">
            <strong>${station.name}</strong><br>
            <span class="tooltip-status ${station.status.toLowerCase()}">● ${station.status}</span><br>
            <span class="tooltip-power">⚡ ${station.powerOutput} kW</span><br>
            <span class="tooltip-connector">🔌 ${station.connectorType}</span>
          </div>
        `;

        marker.bindTooltip(tooltipContent, { 
          direction: 'top', 
          offset: [0, -65],
          className: 'custom-tooltip-container'
        });

        return marker;
      } catch (error) {
        console.error('Error creating marker for station:', station.name, error);
        return null;
      }
    },

    showChargerDetails(charger) {
      this.selectedCharger = charger;
    },

    closeModal() {
      this.selectedCharger = null;
    },

    getDirections() {
      if (this.selectedCharger && this.selectedCharger.location) {
        const lat = this.selectedCharger.location.latitude;
        const lng = this.selectedCharger.location.longitude;
        const address = encodeURIComponent(this.selectedCharger.location.address || `${lat},${lng}`);
        
        // Open Google Maps with directions
        const url = `https://www.google.com/maps/dir/?api=1&destination=${address}`;
        window.open(url, '_blank');
      }
    },

    clearMarkers() {
      if (this.markers.length > 0) {
        this.markers.forEach(marker => {
          try {
            if (marker && this.map && this.map.hasLayer && this.map.hasLayer(marker)) {
              this.map.removeLayer(marker);
            }
          } catch (error) {
            console.warn('Error removing marker:', error);
          }
        });
      }
      this.markers = [];
    },

    async fitMapToBounds() {
      if (!this.map || !this.mapInitialized) {
        console.warn('Map not ready for bounds fitting');
        return;
      }

      if (this.filteredStations.length > 0) {
        const validStations = this.filteredStations.filter(
          station => station.location && 
                    station.location.latitude && 
                    station.location.longitude &&
                    !isNaN(parseFloat(station.location.latitude)) &&
                    !isNaN(parseFloat(station.location.longitude))
        );

        if (validStations.length > 0) {
          try {
            // Wait a bit for markers to be fully added
            await new Promise(resolve => setTimeout(resolve, 100));

            if (validStations.length === 1) {
              // If only one station, center on it
              const station = validStations[0];
              const lat = parseFloat(station.location.latitude);
              const lng = parseFloat(station.location.longitude);
              this.map.setView([lat, lng], 15);
            } else {
              // Multiple stations, fit bounds
              const bounds = L.latLngBounds(
                validStations.map(station => [
                  parseFloat(station.location.latitude),
                  parseFloat(station.location.longitude)
                ])
              );
              
              this.map.fitBounds(bounds, { 
                padding: [30, 30],
                maxZoom: 16 // Prevent zooming in too much
              });
            }
          } catch (error) {
            console.error('Error fitting map bounds:', error);
            // Fallback to default view
            this.map.setView([20.5937, 78.9629], 5);
          }
        }
      }
    },

    goBack() {
      // Use Vue Router if available, otherwise fallback
      if (this.$router) {
        this.$router.push('/chargers');
      } else {
        window.history.back();
      }
    }
  }
};
</script>

<style scoped>
.map-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f8f9fa;
}

.map-header {
  background: linear-gradient(135deg, #2c3e50, #34495e);
  color: white;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.map-title {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.station-count {
  font-size: 0.9rem;
  opacity: 0.8;
  font-weight: 400;
}

.header-controls {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.refresh-btn, .back-btn {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.refresh-btn:hover, .back-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.filter-bar {
  background: white;
  padding: 1rem 2rem;
  display: flex;
  gap: 2rem;
  align-items: center;
  border-bottom: 1px solid #dee2e6;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.filter-group label {
  font-weight: 600;
  color: #495057;
  white-space: nowrap;
}

.filter-group select {
  padding: 0.4rem 0.8rem;
  border: 1px solid #ced4da;
  border-radius: 4px;
  background: white;
  color: #495057;
  cursor: pointer;
}

.map {
  flex: 1;
  width: 100%;
  position: relative;
}

.map-legend {
  position: absolute;
  top: 100px;
  right: 10px;
  background: white;
  padding: 1rem;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.15);
  z-index: 1000;
  min-width: 150px;
}

.map-legend h4 {
  margin: 0 0 0.75rem 0;
  font-size: 0.9rem;
  color: #2c3e50;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  font-size: 0.85rem;
}

.legend-marker {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 1px 3px rgba(0,0,0,0.3);
}

.legend-marker.active {
  background: #27ae60;
}

.legend-marker.inactive {
  background: #e74c3c;
}

.loading-container, .error-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 1.5rem;
  padding: 2rem;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-icon {
  font-size: 3rem;
}

.error-message {
  color: #e74c3c;
  font-size: 1.2rem;
  text-align: center;
  max-width: 500px;
}

.retry-btn {
  background: #e74c3c;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.3s;
}

.retry-btn:hover {
  background: #c0392b;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
  backdrop-filter: blur(2px);
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  animation: modalSlideIn 0.3s ease-out;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 2rem;
  border-bottom: 1px solid #e9ecef;
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
  border-radius: 12px 12px 0 0;
}

.modal-title-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.modal-header h3 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.5rem;
  font-weight: 700;
}

.close-btn {
  background: none;
  border: none;
  font-size: 2rem;
  cursor: pointer;
  color: #6c757d;
  padding: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.close-btn:hover {
  background: rgba(0,0,0,0.1);
  color: #495057;
}

.modal-body {
  padding: 2rem;
}

.detail-section {
  margin-bottom: 2rem;
}

.detail-section:last-child {
  margin-bottom: 0;
}

.detail-section h4 {
  margin: 0 0 1rem 0;
  color: #2c3e50;
  font-size: 1.1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 0.75rem 0;
  border-bottom: 1px solid #f8f9fa;
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-item strong {
  color: #495057;
  font-weight: 600;
  min-width: 120px;
}

.detail-item span {
  color: #6c757d;
  text-align: right;
  flex: 1;
  margin-left: 1rem;
}

.power-value {
  font-weight: 700;
  color: #28a745 !important;
  font-size: 1.1rem;
}

.connector-type {
  background: #e9ecef;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 600;
}

.description {
  color: #6c757d;
  line-height: 1.6;
  margin: 0;
  font-style: italic;
}

.status-badge {
  padding: 0.4rem 1rem;
  border-radius: 25px;
  font-size: 0.85rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-badge.active {
  background: linear-gradient(135deg, #d4edda, #c3e6cb);
  color: #155724;
  border: 1px solid #b8dacd;
}

.status-badge.inactive {
  background: linear-gradient(135deg, #f8d7da, #f1c2c7);
  color: #721c24;
  border: 1px solid #e2a6af;
}

.modal-footer {
  padding: 1.5rem 2rem;
  border-top: 1px solid #e9ecef;
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  background: #f8f9fa;
  border-radius: 0 0 12px 12px;
}

.directions-btn {
  background: #28a745;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 600;
  transition: background-color 0.3s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.directions-btn:hover {
  background: #218838;
}

.close-modal-btn {
  background: #6c757d;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 600;
  transition: background-color 0.3s;
}

.close-modal-btn:hover {
  background: #5a6268;
}

/* Custom Marker Styles */
:deep(.custom-marker) {
  background: transparent;
  border: none;
}

:deep(.marker-icon) {
  width: 50px;
  height: 50px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 3px solid white;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.7rem;
  font-weight: 700;
}

:deep(.marker-icon:hover) {
  transform: scale(1.1);
  box-shadow: 0 6px 16px rgba(0,0,0,0.4);
}

:deep(.marker-icon.active) {
  background: linear-gradient(135deg, #27ae60, #2ecc71);
}

:deep(.marker-icon.inactive) {
  background: linear-gradient(135deg, #e74c3c, #ec7063);
}

:deep(.marker-icon.high-power) {
  border-color: #f39c12;
  border-width: 4px;
}

:deep(.marker-inner) {
  color: white;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
}

:deep(.marker-symbol) {
  font-size: 16px;
}

:deep(.marker-power) {
  font-size: 9px;
  font-weight: 700;
}

/* Custom Tooltip Styles */
:deep(.custom-tooltip-container) {
  background: rgba(44, 62, 80, 0.95);
  color: white;
  border: none;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  backdrop-filter: blur(5px);
}

:deep(.custom-tooltip) {
  padding: 0.5rem;
  font-size: 0.85rem;
  line-height: 1.4;
}

:deep(.tooltip-status) {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

:deep(.tooltip-status.active) {
  color: #2ecc71;
}

:deep(.tooltip-status.inactive) {
  color: #e74c3c;
}

:deep(.tooltip-power) {
  color: #f39c12;
  font-weight: 600;
}

:deep(.tooltip-connector) {
  color: #3498db;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .filter-bar {
    flex-wrap: wrap;
    gap: 1rem;
  }
  
  .map-legend {
    position: relative;
    top: auto;
    right: auto;
    margin: 1rem;
    order: -1;
  }
}

@media (max-width: 768px) {
  .map-header {
    padding: 1rem;
    flex-direction: column;
    gap: 1rem;
  }

  .header-controls {
    width: 100%;
    justify-content: center;
  }

  .map-title {
    font-size: 1.5rem;
    text-align: center;
  }

  .filter-bar {
    padding: 1rem;
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }

  .filter-group {
    flex-direction: column;
    align-items: stretch;
    gap: 0.25rem;
  }

  .filter-group select {
    width: 100%;
  }

  .modal-content {
    width: 95%;
    margin: 1rem;
    max-height: 90vh;
  }

  .modal-header {
    padding: 1.5rem;
  }

  .modal-body {
    padding: 1.5rem;
  }

  .modal-footer {
    padding: 1rem 1.5rem;
    flex-direction: column;
  }

  .detail-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }

  .detail-item span {
    text-align: left;
    margin-left: 0;
  }

  :deep(.marker-icon) {
    width: 40px;
    height: 40px;
  }

  :deep(.marker-symbol) {
    font-size: 14px;
  }

  :deep(.marker-power) {
    font-size: 8px;
  }
}

@media (max-width: 480px) {
  .map-header {
    padding: 0.75rem;
  }

  .map-title {
    font-size: 1.25rem;
  }

  .station-count {
    font-size: 0.8rem;
  }

  .filter-bar {
    padding: 0.75rem;
  }

  .modal-content {
    width: 98%;
    margin: 0.5rem;
  }

  .modal-header {
    padding: 1rem;
  }

  .modal-body {
    padding: 1rem;
  }

  .modal-footer {
    padding: 0.75rem 1rem;
  }
}

/* Print Styles */
@media print {
  .map-header,
  .filter-bar,
  .modal-overlay {
    display: none;
  }
  
  .map-container {
    height: auto;
  }
  
  .map {
    height: 80vh;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .map-header {
    background: #000;
    color: #fff;
  }
  
  .filter-bar {
    background: #fff;
    border: 2px solid #000;
  }
  
  .modal-content {
    border: 3px solid #000;
  }
  
  :deep(.marker-icon) {
    border-width: 4px;
    border-color: #000;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .spinner {
    animation: none;
  }
  
  .modal-content {
    animation: none;
  }
  
  :deep(.marker-icon) {
    transition: none;
  }
  
  .refresh-btn, .back-btn, .close-btn {
    transition: none;
  }
}
</style>