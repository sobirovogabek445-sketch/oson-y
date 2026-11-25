import {useCallback, useEffect, useRef, useState} from 'react';
import {
  AdvancedMarker,
  ColorScheme,
  InfoWindow,
  Map as GoogleMap,
  MapMouseEvent,
  useAdvancedMarkerRef,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {Crosshair, LocateFixed, Minus, Navigation, Plus, X} from 'lucide-react';
import {
  LatLngLiteral,
  NearbyPlaceItem,
  RouteStepItem,
  RouteSummary,
  TravelModeKey,
} from '../types/places';
import {
  buildGoogleMapsDirectionUrl,
  checkAndDispatchQuotaError,
  formatDistanceUz,
  formatDurationUz,
} from '../utils/geo';

interface MapViewportProps {
  userLocation: LatLngLiteral;
  places: NearbyPlaceItem[];
  selectedPlace: NearbyPlaceItem | null;
  activeDestination: NearbyPlaceItem | null;
  travelMode: TravelModeKey;
  isPickingLocation: boolean;
  focusTrigger: number;
  onSelectPlace: (place: NearbyPlaceItem) => void;
  onStartRoute: (place: NearbyPlaceItem) => void;
  onPickLocationOnMap: (coords: LatLngLiteral) => void;
  onStartMapPick: () => void;
  onCancelMapPick: () => void;
  onLocateMe: () => void;
  onRouteComputed: (summary: RouteSummary | null) => void;
  onRouteLoadingChange: (loading: boolean) => void;
  onRouteError: (message: string | null) => void;
}

interface PlaceMarkerProps {
  place: NearbyPlaceItem;
  rank: number;
  isSelected: boolean;
  isDestination: boolean;
  isInfoOpen: boolean;
  onMarkerClick: (place: NearbyPlaceItem) => void;
  onCloseInfo: () => void;
  onStartRoute: (place: NearbyPlaceItem) => void;
}

function PlaceMarker({
  place,
  rank,
  isSelected,
  isDestination,
  isInfoOpen,
  onMarkerClick,
  onCloseInfo,
  onStartRoute,
}: PlaceMarkerProps) {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const isHighlighted = isSelected || isDestination;
  const isNearest = rank === 1;

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={place.location}
        title={place.displayName}
        zIndex={isHighlighted ? 40 : isNearest ? 30 : 20 - Math.min(rank, 15)}
        onClick={() => onMarkerClick(place)}
      >
        <div
          className={`flex items-center justify-center rounded-full font-mono text-xs font-semibold tabular-nums transition-transform duration-150 cursor-pointer shadow-lg ${
            isHighlighted
              ? 'w-9 h-9 bg-[#EF4444] text-white border-2 border-white scale-110 shadow-[#991B1B]/60'
              : isNearest
                ? 'w-8 h-8 bg-[#B91C1C] text-white border-2 border-[#FCA5A5] hover:scale-110'
                : 'w-7 h-7 bg-[#2A0E14] text-[#FCA5A5] border border-[#991B1B] hover:bg-[#7F1D1D] hover:text-white hover:scale-105'
          }`}
        >
          {rank}
        </div>
      </AdvancedMarker>

      {isInfoOpen && marker && (
        <InfoWindow
          anchor={marker}
          onCloseClick={onCloseInfo}
          maxWidth={260}
        >
          <div className="bg-[#190A0D] text-[#F9F2F3] p-1 min-w-[200px] space-y-2">
            <div>
              <p className="font-display text-sm font-bold text-white leading-snug">
                {place.displayName}
              </p>
              <p className="text-xs text-[#C9A8AE] mt-1">
                {formatDistanceUz(place.distanceMeters)}
                {place.isOpenNow !== undefined && (
                  <>
                    {' · '}
                    <span
                      className={
                        place.isOpenNow ? 'text-[#86EFAC]' : 'text-[#FCA5A5]'
                      }
                    >
                      {place.isOpenNow ? 'Hozir ochiq' : 'Hozir yopiq'}
                    </span>
                  </>
                )}
              </p>
              {place.formattedAddress && (
                <p className="text-xs text-[#A5848B] mt-1 line-clamp-2">
                  {place.formattedAddress}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onStartRoute(place)}
              className="w-full min-h-[36px] px-3 py-1.5 rounded-lg bg-[#B91C1C] hover:bg-[#DC2626] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Yo&apos;lni ko&apos;rsatish</span>
            </button>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

function MapController({
  userLocation,
  places,
  activeDestination,
  focusTrigger,
}: {
  userLocation: LatLngLiteral;
  places: NearbyPlaceItem[];
  activeDestination: NearbyPlaceItem | null;
  focusTrigger: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    map.panTo(userLocation);
    if (!activeDestination && places.length === 0) {
      map.setZoom(15);
    }
  }, [map, userLocation, focusTrigger, activeDestination, places.length]);

  useEffect(() => {
    if (!map || activeDestination || places.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    bounds.extend(userLocation);
    // Fit user + top 5 nearest places for clean initial framing
    places.slice(0, 5).forEach((p) => bounds.extend(p.location));
    map.fitBounds(bounds, {top: 72, right: 48, bottom: 72, left: 48});
  }, [map, places, userLocation, activeDestination]);

  return null;
}

function RouteLayer({
  origin,
  destination,
  travelMode,
  onRouteComputed,
  onRouteLoadingChange,
  onRouteError,
}: {
  origin: LatLngLiteral;
  destination: NearbyPlaceItem | null;
  travelMode: TravelModeKey;
  onRouteComputed: (summary: RouteSummary | null) => void;
  onRouteLoadingChange: (loading: boolean) => void;
  onRouteError: (message: string | null) => void;
}) {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  const clearPolylines = useCallback(() => {
    polylinesRef.current.forEach((poly) => poly.setMap(null));
    polylinesRef.current = [];
  }, []);

  useEffect(() => {
    clearPolylines();
    onRouteError(null);

    if (!destination) {
      onRouteComputed(null);
      onRouteLoadingChange(false);
      return;
    }

    if (!routesLib || !map) return;

    let isCancelled = false;
    onRouteLoadingChange(true);

    const request: google.maps.routes.ComputeRoutesRequest = {
      origin,
      destination: destination.location,
      travelMode: travelMode as google.maps.TravelModeString,
      ...(travelMode === 'DRIVING' ? {routingPreference: 'TRAFFIC_AWARE'} : {}),
      fields: [
        'path',
        'distanceMeters',
        'durationMillis',
        'viewport',
        'legs',
        'localizedValues',
      ],
      internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio'],
    };

    routesLib.Route.computeRoutes(request)
      .then(({routes}) => {
        if (isCancelled) return;
        onRouteLoadingChange(false);

        if (!routes || routes.length === 0) {
          onRouteError("Ushbu transport turi bo'yicha yo'l topilmadi.");
          onRouteComputed(null);
          return;
        }

        const primaryRoute = routes[0];
        const createdPolylines: google.maps.Polyline[] = [];

        // Draw dark crimson casing underneath for crisp contrast on dark maps
        if (primaryRoute.path && primaryRoute.path.length > 0) {
          const casing = new google.maps.Polyline({
            path: primaryRoute.path,
            strokeColor: '#450A0A',
            strokeOpacity: 0.9,
            strokeWeight: 10,
            zIndex: 10,
            map,
          });
          createdPolylines.push(casing);
        }

        const innerLines = primaryRoute.createPolylines({
          polylineOptions: {
            strokeColor: '#EF4444',
            strokeOpacity: 0.96,
            strokeWeight: 5,
            zIndex: 11,
            map,
          },
        });
        innerLines.forEach((line) => {
          line.setMap(map);
          createdPolylines.push(line);
        });

        polylinesRef.current = createdPolylines;

        if (primaryRoute.viewport) {
          map.fitBounds(primaryRoute.viewport, {
            top: 72,
            right: 56,
            bottom: 72,
            left: 56,
          });
        }

        const totalMeters = primaryRoute.distanceMeters ?? destination.distanceMeters;
        const totalMillis = primaryRoute.durationMillis ?? 60000;

        const steps: RouteStepItem[] = [];
        const firstLeg = primaryRoute.legs?.[0];
        if (firstLeg?.steps) {
          firstLeg.steps.forEach((step, idx) => {
            steps.push({
              index: idx + 1,
              instruction:
                step.instructions?.trim() || "Yo'nalish bo'yicha harakatlaning",
              distanceMeters: step.distanceMeters ?? 0,
              distanceText:
                step.localizedValues?.distance ||
                formatDistanceUz(step.distanceMeters ?? 0),
              durationText:
                step.localizedValues?.staticDuration ||
                formatDurationUz(step.staticDurationMillis ?? 0),
              maneuver: step.maneuver ?? null,
            });
          });
        }

        onRouteComputed({
          destinationId: destination.id,
          destinationName: destination.displayName,
          travelMode,
          distanceMeters: totalMeters,
          durationMillis: totalMillis,
          distanceText:
            primaryRoute.localizedValues?.distance || formatDistanceUz(totalMeters),
          durationText:
            primaryRoute.localizedValues?.duration || formatDurationUz(totalMillis),
          steps,
          googleMapsDirUrl: buildGoogleMapsDirectionUrl(
            origin,
            destination.location,
            travelMode
          ),
        });
      })
      .catch((err) => {
        if (isCancelled) return;
        onRouteLoadingChange(false);
        checkAndDispatchQuotaError(err);
        onRouteError(
          "Yo'nalishni hisoblab bo'lmadi. Boshqa transport turini sinab ko'ring."
        );
        onRouteComputed(null);
      });

    return () => {
      isCancelled = true;
      clearPolylines();
    };
  }, [
    routesLib,
    map,
    origin,
    destination,
    travelMode,
    clearPolylines,
    onRouteComputed,
    onRouteLoadingChange,
    onRouteError,
  ]);

  return null;
}

function FloatingMapControls({
  onLocateMe,
  isPickingLocation,
  onTogglePickMode,
}: {
  onLocateMe: () => void;
  isPickingLocation: boolean;
  onTogglePickMode: () => void;
}) {
  const map = useMap();

  const handleZoom = (delta: number) => {
    if (!map) return;
    const current = map.getZoom() ?? 14;
    map.setZoom(Math.min(20, Math.max(3, current + delta)));
  };

  return (
    <div className="absolute right-4 top-4 lg:top-auto lg:bottom-6 z-20 flex flex-col gap-2">
      <button
        type="button"
        onClick={onLocateMe}
        title="Turgan joyimga qaytish"
        aria-label="Turgan joyimga qaytish"
        className="w-11 h-11 rounded-xl bg-[#190A0D]/95 backdrop-blur-md border border-[#4A1C26] text-[#F9F2F3] hover:bg-[#991B1B] hover:border-[#EF4444] flex items-center justify-center shadow-lg transition-colors cursor-pointer"
      >
        <LocateFixed className="w-5 h-5" />
      </button>

      <button
        type="button"
        onClick={onTogglePickMode}
        title="Xaritadan joy tanlash"
        aria-label="Xaritadan joy tanlash"
        className={`w-11 h-11 rounded-xl backdrop-blur-md border flex items-center justify-center shadow-lg transition-colors cursor-pointer ${
          isPickingLocation
            ? 'bg-[#DC2626] border-white text-white'
            : 'bg-[#190A0D]/95 border-[#4A1C26] text-[#F9F2F3] hover:bg-[#2E1117]'
        }`}
      >
        <Crosshair className="w-5 h-5" />
      </button>

      <div className="hidden sm:flex flex-col rounded-xl bg-[#190A0D]/95 backdrop-blur-md border border-[#4A1C26] overflow-hidden shadow-lg">
        <button
          type="button"
          onClick={() => handleZoom(1)}
          title="Yaqinlashtirish"
          aria-label="Yaqinlashtirish"
          className="w-11 h-10 flex items-center justify-center text-[#F9F2F3] hover:bg-[#2E1117] border-b border-[#38161D] transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => handleZoom(-1)}
          title="Uzoqlashtirish"
          aria-label="Uzoqlashtirish"
          className="w-11 h-10 flex items-center justify-center text-[#F9F2F3] hover:bg-[#2E1117] transition-colors cursor-pointer"
        >
          <Minus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function MapViewport({
  userLocation,
  places,
  selectedPlace,
  activeDestination,
  travelMode,
  isPickingLocation,
  focusTrigger,
  onSelectPlace,
  onStartRoute,
  onPickLocationOnMap,
  onStartMapPick,
  onCancelMapPick,
  onLocateMe,
  onRouteComputed,
  onRouteLoadingChange,
  onRouteError,
}: MapViewportProps) {
  const [infoPlaceId, setInfoPlaceId] = useState<string | null>(null);

  const handleMapClick = useCallback(
    (event: MapMouseEvent) => {
      if (isPickingLocation && event.detail.latLng) {
        onPickLocationOnMap({
          lat: event.detail.latLng.lat,
          lng: event.detail.latLng.lng,
        });
        return;
      }
      setInfoPlaceId(null);
    },
    [isPickingLocation, onPickLocationOnMap]
  );

  const handleMarkerClick = useCallback(
    (place: NearbyPlaceItem) => {
      setInfoPlaceId(place.id);
      onSelectPlace(place);
    },
    [onSelectPlace]
  );

  return (
    <div className="relative w-full h-full bg-[#0D0507]">
      <GoogleMap
        mapId="DEMO_MAP_ID"
        colorScheme={ColorScheme.DARK}
        defaultCenter={userLocation}
        defaultZoom={15}
        gestureHandling="greedy"
        disableDefaultUI={true}
        clickableIcons={false}
        onClick={handleMapClick}
        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        className="w-full h-full"
      >
        <MapController
          userLocation={userLocation}
          places={places}
          activeDestination={activeDestination}
          focusTrigger={focusTrigger}
        />

        <RouteLayer
          origin={userLocation}
          destination={activeDestination}
          travelMode={travelMode}
          onRouteComputed={onRouteComputed}
          onRouteLoadingChange={onRouteLoadingChange}
          onRouteError={onRouteError}
        />

        {/* User Current Position Marker */}
        <AdvancedMarker
          position={userLocation}
          title="Siz turgan joy"
          zIndex={50}
        >
          <div className="relative flex items-center justify-center w-8 h-8">
            <span className="absolute w-7 h-7 rounded-full bg-[#EF4444]/40 animate-gps-ring" />
            <span className="relative w-4 h-4 rounded-full bg-[#EF4444] border-[2.5px] border-white shadow-md shadow-black/60" />
          </div>
        </AdvancedMarker>

        {/* Ranked Nearby Places */}
        {places.map((place, idx) => (
          <PlaceMarker
            key={place.id}
            place={place}
            rank={idx + 1}
            isSelected={selectedPlace?.id === place.id}
            isDestination={activeDestination?.id === place.id}
            isInfoOpen={infoPlaceId === place.id}
            onMarkerClick={handleMarkerClick}
            onCloseInfo={() => setInfoPlaceId(null)}
            onStartRoute={(p) => {
              setInfoPlaceId(null);
              onStartRoute(p);
            }}
          />
        ))}
      </GoogleMap>

      {/* Map Pick Mode Prompt */}
      {isPickingLocation && (
        <div className="absolute top-4 left-4 right-16 lg:right-auto lg:max-w-sm z-20 rounded-xl bg-[#190A0D]/95 backdrop-blur-md border border-[#EF4444] px-4 py-3 shadow-xl flex items-center justify-between gap-3">
          <p className="text-xs sm:text-sm text-white font-medium">
            Turgan joyingizni belgilash uchun xaritaga bosing
          </p>
          <button
            type="button"
            onClick={onCancelMapPick}
            aria-label="Bekor qilish"
            className="min-h-[32px] min-w-[32px] rounded-lg bg-[#2E1117] hover:bg-[#451A22] text-[#FCA5A5] flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <FloatingMapControls
        onLocateMe={onLocateMe}
        isPickingLocation={isPickingLocation}
        onTogglePickMode={() => {
          if (isPickingLocation) {
            onCancelMapPick();
          } else {
            onStartMapPick();
          }
        }}
      />
    </div>
  );
}
