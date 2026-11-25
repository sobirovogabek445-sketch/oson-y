export interface LatLngLiteral {
  lat: number;
  lng: number;
}

export type CategoryId =
  | 'pharmacy'
  | 'hospital'
  | 'supermarket'
  | 'atm'
  | 'cafe'
  | 'gas_station'
  | 'restaurant'
  | 'transit_station';

export interface PlaceCategory {
  id: CategoryId;
  label: string;
  primaryTypes: string[];
  searchKeyword: string;
}

export type TravelModeKey = 'WALKING' | 'DRIVING' | 'TRANSIT' | 'BICYCLING';

export interface TravelModeConfig {
  id: TravelModeKey;
  label: string;
}

export interface PlaceAttribution {
  provider: string;
  providerURI?: string | null;
}

export interface NearbyPlaceItem {
  id: string;
  displayName: string;
  formattedAddress: string;
  location: LatLngLiteral;
  distanceMeters: number;
  businessStatus?: string | null;
  isOpenNow?: boolean;
  todayHoursText?: string | null;
  rating?: number | null;
  userRatingCount?: number | null;
  nationalPhoneNumber?: string | null;
  primaryTypeDisplayName?: string | null;
  googleMapsURI?: string | null;
  attributions: PlaceAttribution[];
}

export interface RouteStepItem {
  index: number;
  instruction: string;
  distanceMeters: number;
  distanceText: string;
  durationText: string;
  maneuver?: string | null;
}

export interface RouteSummary {
  destinationId: string;
  destinationName: string;
  travelMode: TravelModeKey;
  distanceMeters: number;
  durationMillis: number;
  distanceText: string;
  durationText: string;
  steps: RouteStepItem[];
  googleMapsDirUrl: string;
}

export type LocationSource = 'gps' | 'manual' | 'default';
