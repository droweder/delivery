/// <reference types="vite/client" />
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  if (!address || address.trim().length < 3) return null;

  try {
    const response = await fetch(`/api/geocode?address=${encodeURIComponent(address.trim())}`);
    if (response.ok) {
      const data = await response.json();
      if (data.sucesso && typeof data.lat === 'number' && typeof data.lng === 'number') {
        return { lat: data.lat, lng: data.lng };
      }
    }
  } catch (error) {
    console.warn('Geocoding service unavailable:', error);
  }
  return null;
}

