/**
 * Mapbox Geocoding utility for converting addresses to coordinates.
 * Uses the Mapbox Geocoding API with a bias toward Madrid, Spain.
 */

const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

interface GeocodingResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

/**
 * Geocode an address string to latitude/longitude coordinates.
 * Biased toward Madrid, Spain for better results.
 * 
 * @param address - The address string to geocode
 * @returns Promise with lat/lng coordinates or null if geocoding fails
 */
export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  if (!MAPBOX_ACCESS_TOKEN) {
    console.error("[geocodeAddress] NEXT_PUBLIC_MAPBOX_TOKEN is not set");
    return null;
  }

  if (!address || address.trim().length === 0) {
    console.error("[geocodeAddress] Empty address provided");
    return null;
  }

  try {
    // Encode the address for URL
    const encodedAddress = encodeURIComponent(address);
    
    // Madrid bounding box to bias results (approximate)
    // SW: 40.31, -3.89 | NE: 40.64, -3.52
    const bbox = "-3.89,40.31,-3.52,40.64";
    
    // Proximity to Madrid city center to further bias results
    const proximity = "-3.7038,40.4168";
    
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?` +
      `access_token=${MAPBOX_ACCESS_TOKEN}` +
      `&country=ES` +  // Limit to Spain
      `&bbox=${bbox}` +  // Bounding box around Madrid
      `&proximity=${proximity}` +  // Bias toward Madrid center
      `&limit=1` +  // Only need the best result
      `&types=address,poi,place`;  // Types of places to search

    const response = await fetch(url);
    
    if (!response.ok) {
      console.error("[geocodeAddress] Mapbox API error:", response.status, response.statusText);
      return null;
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      console.warn("[geocodeAddress] No results found for address:", address);
      return null;
    }

    const feature = data.features[0];
    const [longitude, latitude] = feature.center;
    const formattedAddress = feature.place_name || address;

    console.log(`[geocodeAddress] Geocoded "${address}" to:`, { latitude, longitude, formattedAddress });

    return {
      latitude,
      longitude,
      formattedAddress,
    };
  } catch (error) {
    console.error("[geocodeAddress] Error geocoding address:", error);
    return null;
  }
}

/**
 * Validate if coordinates are within a reasonable range for Madrid.
 * 
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns true if coordinates are roughly within the Madrid metropolitan area
 */
export function isValidMadridCoordinates(lat: number, lng: number): boolean {
  // Generous bounding box for Madrid metropolitan area
  const minLat = 40.0;
  const maxLat = 40.8;
  const minLng = -4.2;
  const maxLng = -3.3;

  return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
}



