// Location Service for Sharing Location
class LocationService {
  constructor() {
    this.watchId = null;
  }

  async getCurrentLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  }

  getMapUrl(latitude, longitude, zoom = 15) {
    // Google Maps URL
    return `https://www.google.com/maps?q=${latitude},${longitude}&z=${zoom}`;
  }

  getStaticMapUrl(latitude, longitude, width = 400, height = 300, zoom = 15) {
    // Static map image URL (Google Maps Static API or OpenStreetMap)
    // For OpenStreetMap (no API key needed):
    return `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s+ff0000(${longitude},${latitude})/${longitude},${latitude},${zoom}/${width}x${height}?access_token=${import.meta.env.VITE_MAPBOX_TOKEN || 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw'}`;
    
    // Alternative: OpenStreetMap (free, no API key):
    // return `https://staticmap.openstreetmap.de/staticmap.php?center=${latitude},${longitude}&zoom=${zoom}&size=${width}x${height}&markers=${latitude},${longitude},red`;
  }

  formatLocation(latitude, longitude) {
    // Format coordinates for display
    const lat = latitude.toFixed(6);
    const lng = longitude.toFixed(6);
    return `${lat}, ${lng}`;
  }

  async reverseGeocode(latitude, longitude) {
    // Reverse geocode to get address
    try {
      // Using OpenStreetMap Nominatim API (free, no API key)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
      );

      if (!response.ok) {
        throw new Error('Failed to reverse geocode');
      }

      const data = await response.json();
      return {
        address: data.display_name || this.formatLocation(latitude, longitude),
        formatted: data.display_name || this.formatLocation(latitude, longitude),
        components: data.address || {}
      };
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return {
        address: this.formatLocation(latitude, longitude),
        formatted: this.formatLocation(latitude, longitude),
        components: {}
      };
    }
  }
}

export const locationService = new LocationService();
export default locationService;

