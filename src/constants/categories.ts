import {LatLngLiteral, PlaceCategory, TravelModeConfig} from '../types/places';

export const DEFAULT_FALLBACK_CENTER: LatLngLiteral = {
  lat: 41.2995,
  lng: 69.2401,
};

export const DEFAULT_FALLBACK_LABEL = 'Toshkent markazi';

export const PLACE_CATEGORIES: PlaceCategory[] = [
  {
    id: 'pharmacy',
    label: 'Dorixona',
    primaryTypes: ['pharmacy', 'drugstore'],
    searchKeyword: 'dorixona apteka',
  },
  {
    id: 'hospital',
    label: 'Shifoxona',
    primaryTypes: ['hospital', 'doctor', 'medical_lab'],
    searchKeyword: 'shifoxona klinika',
  },
  {
    id: 'supermarket',
    label: "Do'kon",
    primaryTypes: ['supermarket', 'grocery_store', 'convenience_store'],
    searchKeyword: "oziq-ovqat do'koni",
  },
  {
    id: 'atm',
    label: 'Bankomat',
    primaryTypes: ['atm', 'bank'],
    searchKeyword: 'bankomat bank',
  },
  {
    id: 'cafe',
    label: 'Kafe',
    primaryTypes: ['cafe', 'bakery', 'coffee_shop'],
    searchKeyword: 'kafe qahvaxona',
  },
  {
    id: 'gas_station',
    label: "Yoqilg'i",
    primaryTypes: ['gas_station', 'electric_vehicle_charging_station'],
    searchKeyword: "yoqilg'i quyish shoxobchasi",
  },
  {
    id: 'restaurant',
    label: 'Oshxona',
    primaryTypes: ['restaurant', 'meal_takeaway'],
    searchKeyword: 'oshxona restoran',
  },
  {
    id: 'transit_station',
    label: 'Bekat',
    primaryTypes: ['subway_station', 'bus_station', 'transit_station'],
    searchKeyword: 'metro avtobus bekati',
  },
];

export const TRAVEL_MODES: TravelModeConfig[] = [
  {id: 'WALKING', label: 'Piyoda'},
  {id: 'DRIVING', label: 'Mashinada'},
  {id: 'TRANSIT', label: 'Jamoat'},
  {id: 'BICYCLING', label: 'Velosiped'},
];

export const RADIUS_OPTIONS: {value: number; label: string}[] = [
  {value: 1000, label: '1 km'},
  {value: 2500, label: '2.5 km'},
  {value: 5000, label: '5 km'},
  {value: 10000, label: '10 km'},
];
