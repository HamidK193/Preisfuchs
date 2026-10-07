import * as Location from 'expo-location';

export type Coordinates = { latitude: number; longitude: number };
export type Address = { street: string; plz: string; city: string };

export type DeviceLocation =
  | { status: 'granted'; coords: Coordinates; address: Address }
  | { status: 'denied' }
  | { status: 'error' };

// Fragt die Standortfreigabe an und ermittelt die genaue Adresse.
export async function locateDevice(): Promise<DeviceLocation> {
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      return { status: 'denied' };
    }
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    const coords = { latitude: position.coords.latitude, longitude: position.coords.longitude };
    const [address] = await Location.reverseGeocodeAsync(coords);
    return {
      status: 'granted',
      coords,
      address: {
        street: [address?.street, address?.streetNumber].filter(Boolean).join(' '),
        plz: address?.postalCode ?? '',
        city: address?.city ?? '',
      },
    };
  } catch {
    return { status: 'error' };
  }
}

// Wandelt eine eingegebene Adresse in Koordinaten um; undefined, wenn sie nicht gefunden wurde.
export async function geocodeAddress({ street, plz, city }: Address): Promise<Coordinates | undefined> {
  const query = [street.trim(), `${plz} ${city}`.trim(), 'Deutschland'].filter(Boolean).join(', ');
  const [hit] = await Location.geocodeAsync(query);
  return hit ? { latitude: hit.latitude, longitude: hit.longitude } : undefined;
}
