import {LatLngLiteral} from '../types/places';

const EARTH_RADIUS_METERS = 6371000;

export function calculateHaversineMeters(a: LatLngLiteral, b: LatLngLiteral): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const h =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function formatDistanceUz(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return '—';
  if (meters < 1000) {
    return `${Math.round(meters / 10) * 10 || Math.round(meters)} m`;
  }
  const km = meters / 1000;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
}

export function formatDurationUz(millis: number): string {
  if (!Number.isFinite(millis) || millis <= 0) return '1 daq';
  const totalMinutes = Math.max(1, Math.round(millis / 60000));
  if (totalMinutes < 60) {
    return `${totalMinutes} daq`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins > 0 ? `${hours} soat ${mins} daq` : `${hours} soat`;
}

export function computeIsPlaceOpen(
  openingHours?: google.maps.places.OpeningHours | null,
  utcOffsetMinutes?: number | null
): boolean | undefined {
  if (!openingHours?.periods || openingHours.periods.length === 0) {
    return undefined;
  }

  // 24/7 open convention: single period starting Sunday 00:00 with no close
  if (
    openingHours.periods.length === 1 &&
    openingHours.periods[0].open.day === 0 &&
    openingHours.periods[0].open.hour === 0 &&
    openingHours.periods[0].open.minute === 0 &&
    !openingHours.periods[0].close
  ) {
    return true;
  }

  const now = new Date();
  let targetDay = now.getDay();
  let targetHour = now.getHours();
  let targetMinute = now.getMinutes();

  if (typeof utcOffsetMinutes === 'number') {
    const utcMillis = now.getTime() + now.getTimezoneOffset() * 60000;
    const placeDate = new Date(utcMillis + utcOffsetMinutes * 60000);
    targetDay = placeDate.getUTCDay();
    targetHour = placeDate.getUTCHours();
    targetMinute = placeDate.getUTCMinutes();
  }

  const WEEK_MINUTES = 7 * 24 * 60;
  const currentMinuteOfWeek = targetDay * 1440 + targetHour * 60 + targetMinute;

  for (const period of openingHours.periods) {
    const openMin =
      period.open.day * 1440 + period.open.hour * 60 + period.open.minute;
    if (!period.close) {
      return true;
    }
    let closeMin =
      period.close.day * 1440 + period.close.hour * 60 + period.close.minute;

    if (closeMin <= openMin) {
      closeMin += WEEK_MINUTES;
    }

    if (
      (currentMinuteOfWeek >= openMin && currentMinuteOfWeek < closeMin) ||
      (currentMinuteOfWeek + WEEK_MINUTES >= openMin &&
        currentMinuteOfWeek + WEEK_MINUTES < closeMin)
    ) {
      return true;
    }
  }

  return false;
}

export function getTodayHoursSummary(
  openingHours?: google.maps.places.OpeningHours | null
): string | null {
  if (!openingHours?.weekdayDescriptions?.length) return null;
  if (
    openingHours.periods?.length === 1 &&
    openingHours.periods[0].open.day === 0 &&
    openingHours.periods[0].open.hour === 0 &&
    openingHours.periods[0].open.minute === 0 &&
    !openingHours.periods[0].close
  ) {
    return '24 soat ochiq';
  }
  // weekdayDescriptions typically starts Monday (index 0) or Sunday depending on locale
  const jsDay = new Date().getDay(); // 0=Sun..6=Sat
  const mondayFirstIdx = jsDay === 0 ? 6 : jsDay - 1;
  return (
    openingHours.weekdayDescriptions[mondayFirstIdx] ||
    openingHours.weekdayDescriptions[0] ||
    null
  );
}

export function checkAndDispatchQuotaError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : JSON.stringify(error ?? '');

  const status =
    typeof error === 'object' && error !== null
      ? String(
          (error as {status?: unknown; code?: unknown}).status ??
            (error as {code?: unknown}).code ??
            ''
        )
      : '';

  const isQuota =
    status === 'RESOURCE_EXHAUSTED' ||
    status === 'OVER_QUERY_LIMIT' ||
    status === '429' ||
    message.includes('RESOURCE_EXHAUSTED') ||
    message.includes('OVER_QUERY_LIMIT') ||
    message.includes('QuotaExceededError') ||
    message.includes('OverQuotaMapError') ||
    message.includes('429');

  if (isQuota) {
    window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
    return true;
  }
  return false;
}

export function buildGoogleMapsDirectionUrl(
  origin: LatLngLiteral,
  destination: LatLngLiteral,
  travelMode: string
): string {
  const modeMap: Record<string, string> = {
    WALKING: 'walking',
    DRIVING: 'driving',
    TRANSIT: 'transit',
    BICYCLING: 'bicycling',
  };
  const mode = modeMap[travelMode] || 'walking';
  return `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&travelmode=${mode}`;
}
