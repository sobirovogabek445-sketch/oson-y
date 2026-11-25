import {useCallback, useEffect, useRef, useState} from 'react';
import {
  APILoadingStatus,
  APIProvider,
  useApiLoadingStatus,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {ChevronDown, ChevronUp, Navigation} from 'lucide-react';
import {LocationPickerModal} from './components/LocationPickerModal';
import {MapViewport} from './components/MapViewport';
import {PlacesSidebar} from './components/PlacesSidebar';
import {TopBar} from './components/TopBar';
import {useVoiceSearch} from './hooks/useVoiceSearch';
import {
  DEFAULT_FALLBACK_CENTER,
  DEFAULT_FALLBACK_LABEL,
  PLACE_CATEGORIES,
} from './constants/categories';
import {
  CategoryId,
  LatLngLiteral,
  LocationSource,
  NearbyPlaceItem,
  RouteSummary,
  TravelModeKey,
} from './types/places';
import {
  calculateHaversineMeters,
  checkAndDispatchQuotaError,
  computeIsPlaceOpen,
  formatDistanceUz,
  getTodayHoursSummary,
} from './utils/geo';

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

const PLACE_FIELDS = [
  'id',
  'displayName',
  'location',
  'formattedAddress',
  'businessStatus',
  'regularOpeningHours',
  'utcOffsetMinutes',
  'rating',
  'userRatingCount',
  'nationalPhoneNumber',
  'primaryTypeDisplayName',
  'googleMapsURI',
];

function mapGooglePlaceToItem(
  place: google.maps.places.Place,
  origin: LatLngLiteral
): NearbyPlaceItem | null {
  if (!place.location) return null;
  const coords: LatLngLiteral = {
    lat: place.location.lat(),
    lng: place.location.lng(),
  };

  return {
    id: place.id,
    displayName: place.displayName || 'Nomsiz manzil',
    formattedAddress: place.formattedAddress || '',
    location: coords,
    distanceMeters: calculateHaversineMeters(origin, coords),
    businessStatus: place.businessStatus ?? null,
    isOpenNow: computeIsPlaceOpen(
      place.regularOpeningHours,
      place.utcOffsetMinutes
    ),
    todayHoursText: getTodayHoursSummary(place.regularOpeningHours),
    rating: place.rating ?? null,
    userRatingCount: place.userRatingCount ?? null,
    nationalPhoneNumber: place.nationalPhoneNumber ?? null,
    primaryTypeDisplayName: place.primaryTypeDisplayName ?? null,
    googleMapsURI: place.googleMapsURI ?? null,
    attributions: (place.attributions ?? []).map((a) => ({
      provider: a.provider || '',
      providerURI: a.providerURI ?? null,
    })),
  };
}

function OsonYWorkspace() {
  const placesLib = useMapsLibrary('places');
  const apiStatus = useApiLoadingStatus();

  const [userLocation, setUserLocation] = useState<LatLngLiteral>(
    DEFAULT_FALLBACK_CENTER
  );
  const [locationLabel, setLocationLabel] = useState<string>(
    DEFAULT_FALLBACK_LABEL
  );
  const [locationSource, setLocationSource] =
    useState<LocationSource>('default');
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [geolocationNotice, setGeolocationNotice] = useState<string | null>(
    null
  );
  const [focusTrigger, setFocusTrigger] = useState<number>(0);

  const [activeCategory, setActiveCategory] = useState<CategoryId>('pharmacy');
  const [searchInput, setSearchInput] = useState<string>('');
  const [submittedSearch, setSubmittedSearch] = useState<string>('');
  const [radiusMeters, setRadiusMeters] = useState<number>(2500);
  const [onlyOpenNow, setOnlyOpenNow] = useState<boolean>(false);

  const [places, setPlaces] = useState<NearbyPlaceItem[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [selectedPlace, setSelectedPlace] = useState<NearbyPlaceItem | null>(
    null
  );
  const [activeDestination, setActiveDestination] =
    useState<NearbyPlaceItem | null>(null);
  const [travelMode, setTravelMode] = useState<TravelModeKey>('WALKING');
  const [routeSummary, setRouteSummary] = useState<RouteSummary | null>(null);
  const [isRouteLoading, setIsRouteLoading] = useState<boolean>(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  const [isLocationModalOpen, setIsLocationModalOpen] =
    useState<boolean>(false);
  const [isPickingLocation, setIsPickingLocation] = useState<boolean>(false);
  const [mobileSheetExpanded, setMobileSheetExpanded] =
    useState<boolean>(true);

  const requestCounterRef = useRef<number>(0);

  useEffect(() => {
    if (apiStatus === APILoadingStatus.AUTH_FAILURE) {
      window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
    }
  }, [apiStatus]);

  const requestGeolocation = useCallback((silentFallback = false) => {
    if (!('geolocation' in navigator)) {
      if (!silentFallback) {
        setGeolocationNotice(
          "Brauzeringiz joylashuvni aniqlashni qo'llab-quvvatlamaydi. Manzilni qo'lda tanlang."
        );
      }
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationSource('gps');
        setLocationLabel('Sizning joriy joylashuvingiz');
        setGeolocationNotice(null);
        setActiveDestination(null);
        setRouteSummary(null);
        setFocusTrigger((n) => n + 1);
      },
      () => {
        setIsLocating(false);
        setGeolocationNotice(
          "Joylashuvga ruxsat berilmagani sababli boshlang‘ich nuqta ko‘rsatilmoqda. «O'zgartirish» tugmasi yoki xaritadan o‘z joyingizni belgilang."
        );
      },
      {enableHighAccuracy: true, timeout: 8000, maximumAge: 30000}
    );
  }, []);

  // Attempt automatic geolocation on first mount
  useEffect(() => {
    requestGeolocation(true);
  }, [requestGeolocation]);

  // Execute Nearby Search or Text Search whenever parameters change
  useEffect(() => {
    if (!placesLib) return;

    const currentRequestId = ++requestCounterRef.current;
    setIsSearching(true);
    setSearchError(null);

    const runSearch = async () => {
      try {
        const queryText = submittedSearch.trim();
        let rawPlaces: google.maps.places.Place[] = [];

        if (queryText) {
          const response = await placesLib.Place.searchByText({
            textQuery: queryText,
            fields: PLACE_FIELDS,
            locationBias: {
              center: userLocation,
              radius: Math.min(radiusMeters, 50000),
            },
            rankPreference: placesLib.SearchByTextRankPreference.DISTANCE,
            maxResultCount: 15,
            ...(onlyOpenNow ? {isOpenNow: true} : {}),
            language: 'uz',
            internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio'],
          });
          rawPlaces = response.places || [];
        } else {
          const category =
            PLACE_CATEGORIES.find((c) => c.id === activeCategory) ||
            PLACE_CATEGORIES[0];

          const response = await placesLib.Place.searchNearby({
            fields: PLACE_FIELDS,
            locationRestriction: {
              center: userLocation,
              radius: Math.min(radiusMeters, 50000),
            },
            includedPrimaryTypes: category.primaryTypes,
            maxResultCount: 15,
            rankPreference: placesLib.SearchNearbyRankPreference.DISTANCE,
            language: 'uz',
            internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio'],
          });
          rawPlaces = response.places || [];
        }

        if (requestCounterRef.current !== currentRequestId) return;

        let items = rawPlaces
          .map((p) => mapGooglePlaceToItem(p, userLocation))
          .filter((item): item is NearbyPlaceItem => item !== null)
          .filter((item) => item.businessStatus !== 'CLOSED_PERMANENTLY')
          .sort((a, b) => a.distanceMeters - b.distanceMeters);

        if (onlyOpenNow && !queryText) {
          items = items.filter((item) => item.isOpenNow === true);
        }

        setPlaces(items);
        setSelectedPlace((prev) =>
          prev && items.some((i) => i.id === prev.id) ? prev : items[0] ?? null
        );
      } catch (err) {
        if (requestCounterRef.current !== currentRequestId) return;
        checkAndDispatchQuotaError(err);
        setSearchError(
          "Yaqin atrofdagi joylarni yuklashda xatolik yuz berdi. Qayta urinib ko'ring."
        );
        setPlaces([]);
      } finally {
        if (requestCounterRef.current === currentRequestId) {
          setIsSearching(false);
        }
      }
    };

    void runSearch();
  }, [
    placesLib,
    userLocation,
    activeCategory,
    submittedSearch,
    radiusMeters,
    onlyOpenNow,
  ]);

  const handleSelectCategory = useCallback((cat: CategoryId) => {
    setActiveCategory(cat);
    setSearchInput('');
    setSubmittedSearch('');
    setActiveDestination(null);
    setRouteSummary(null);
  }, []);

  const handleSubmitTextSearch = useCallback((query: string) => {
    setSubmittedSearch(query);
    setActiveDestination(null);
    setRouteSummary(null);
  }, []);

  const handleClearTextSearch = useCallback(() => {
    setSearchInput('');
    setSubmittedSearch('');
  }, []);

  const handleManualLocationSelect = useCallback(
    (coords: LatLngLiteral, label: string) => {
      setUserLocation(coords);
      setLocationSource('manual');
      setLocationLabel(label);
      setGeolocationNotice(null);
      setActiveDestination(null);
      setRouteSummary(null);
      setIsPickingLocation(false);
      setFocusTrigger((n) => n + 1);
    },
    []
  );

  const handlePickLocationOnMap = useCallback(
    (coords: LatLngLiteral) => {
      handleManualLocationSelect(
        coords,
        `Xaritadagi nuqta (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`
      );
    },
    [handleManualLocationSelect]
  );

  const handleStartRoute = useCallback((place: NearbyPlaceItem) => {
    setSelectedPlace(place);
    setActiveDestination(place);
    setMobileSheetExpanded(true);
  }, []);

  const handleClearRoute = useCallback(() => {
    setActiveDestination(null);
    setRouteSummary(null);
    setRouteError(null);
  }, []);

  const handleVoiceTranscribed = useCallback((text: string) => {
    setSearchInput(text);
    setSubmittedSearch(text);
    setActiveDestination(null);
    setRouteSummary(null);
  }, []);

  const {
    voiceStatus,
    voiceError,
    audioLevel,
    toggleRecording,
    clearVoiceError,
  } = useVoiceSearch({
    onTranscribed: handleVoiceTranscribed,
  });

  const nearestPlace = places[0] ?? null;

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <TopBar
        activeCategory={activeCategory}
        onSelectCategory={handleSelectCategory}
        onOpenLocationPicker={() => setIsLocationModalOpen(true)}
        onLocateMe={() => requestGeolocation(false)}
        isLocating={isLocating}
      />

      {/* Main Split Workspace (Desktop 2-col, Mobile Map + Thumb Bottom Sheet) */}
      <main className="relative flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-[420px] xl:w-[450px] shrink-0 h-full border-r border-[#38161D] z-10">
          <PlacesSidebar
            locationLabel={locationLabel}
            locationSource={locationSource}
            geolocationNotice={geolocationNotice}
            activeCategory={activeCategory}
            searchQuery={searchInput}
            radiusMeters={radiusMeters}
            onlyOpenNow={onlyOpenNow}
            places={places}
            isSearching={isSearching}
            searchError={searchError}
            selectedPlace={selectedPlace}
            activeDestination={activeDestination}
            travelMode={travelMode}
            routeSummary={routeSummary}
            isRouteLoading={isRouteLoading}
            routeError={routeError}
            voiceStatus={voiceStatus}
            voiceError={voiceError}
            audioLevel={audioLevel}
            onSelectCategory={handleSelectCategory}
            onSearchQueryChange={setSearchInput}
            onSubmitTextSearch={handleSubmitTextSearch}
            onClearTextSearch={handleClearTextSearch}
            onToggleVoiceSearch={toggleRecording}
            onClearVoiceError={clearVoiceError}
            onChangeRadius={setRadiusMeters}
            onToggleOpenNow={() => setOnlyOpenNow((v) => !v)}
            onOpenLocationPicker={() => setIsLocationModalOpen(true)}
            onSelectPlace={setSelectedPlace}
            onStartRoute={handleStartRoute}
            onClearRoute={handleClearRoute}
            onChangeTravelMode={setTravelMode}
          />
        </aside>

        {/* Map Canvas */}
        <div className="relative flex-1 h-full min-w-0">
          <MapViewport
            userLocation={userLocation}
            places={places}
            selectedPlace={selectedPlace}
            activeDestination={activeDestination}
            travelMode={travelMode}
            isPickingLocation={isPickingLocation}
            focusTrigger={focusTrigger}
            onSelectPlace={setSelectedPlace}
            onStartRoute={handleStartRoute}
            onPickLocationOnMap={handlePickLocationOnMap}
            onStartMapPick={() => setIsPickingLocation(true)}
            onCancelMapPick={() => setIsPickingLocation(false)}
            onLocateMe={() => requestGeolocation(false)}
            onRouteComputed={setRouteSummary}
            onRouteLoadingChange={setIsRouteLoading}
            onRouteError={setRouteError}
          />
        </div>

        {/* Mobile Bottom Sheet (Thumb-zone ergonomic drawer) */}
        <div
          className={`lg:hidden fixed inset-x-0 bottom-0 z-30 flex flex-col bg-[#16090B] border-t border-[#4A1C26] rounded-t-3xl shadow-2xl transition-[height] duration-200 ease-out ${
            mobileSheetExpanded ? 'h-[62vh]' : 'h-auto'
          }`}
        >
          {/* Sheet Handle & Compact Summary Bar (<= 15% viewport height when collapsed) */}
          <div className="px-4 pt-2.5 pb-3 border-b border-[#33131A] shrink-0">
            <div className="w-10 h-1 rounded-full bg-[#5B212E] mx-auto mb-2" />
            <div className="w-full flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setMobileSheetExpanded((prev) => !prev)}
                aria-label={
                  mobileSheetExpanded
                    ? "Ro'yxatni yig'ish"
                    : "Ro'yxatni ochish"
                }
                className="min-w-0 flex-1 text-left cursor-pointer"
              >
                <p className="font-display text-sm font-bold text-white truncate">
                  {activeDestination
                    ? activeDestination.displayName
                    : nearestPlace
                      ? `Eng yaqin: ${nearestPlace.displayName}`
                      : 'Yaqin manzillar'}
                </p>
                <p className="text-xs text-[#C9A8AE] truncate">
                  {routeSummary
                    ? `${routeSummary.durationText} · ${routeSummary.distanceText}`
                    : places.length > 0
                      ? `${places.length} ta joy topildi · ${formatDistanceUz(places[0].distanceMeters)}`
                      : isSearching
                        ? 'Qidirilmoqda...'
                        : locationLabel}
                </p>
              </button>
              <div className="flex items-center gap-2 shrink-0">
                {!mobileSheetExpanded && nearestPlace && !activeDestination && (
                  <button
                    type="button"
                    onClick={() => handleStartRoute(nearestPlace)}
                    className="inline-flex items-center gap-1 min-h-[38px] px-3 py-1.5 rounded-lg bg-[#B91C1C] hover:bg-[#DC2626] text-white text-xs font-semibold cursor-pointer"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Yo&apos;l</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setMobileSheetExpanded((prev) => !prev)}
                  aria-label={
                    mobileSheetExpanded
                      ? "Ro'yxatni yig'ish"
                      : "Ro'yxatni ochish"
                  }
                  className="w-9 h-9 rounded-lg bg-[#240E13] text-[#FCA5A5] flex items-center justify-center cursor-pointer"
                >
                  {mobileSheetExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronUp className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {mobileSheetExpanded && (
            <div className="flex-1 min-h-0 overflow-hidden">
              <PlacesSidebar
                locationLabel={locationLabel}
                locationSource={locationSource}
                geolocationNotice={geolocationNotice}
                activeCategory={activeCategory}
                searchQuery={searchInput}
                radiusMeters={radiusMeters}
                onlyOpenNow={onlyOpenNow}
                places={places}
                isSearching={isSearching}
                searchError={searchError}
                selectedPlace={selectedPlace}
                activeDestination={activeDestination}
                travelMode={travelMode}
                routeSummary={routeSummary}
                isRouteLoading={isRouteLoading}
                routeError={routeError}
                voiceStatus={voiceStatus}
                voiceError={voiceError}
                audioLevel={audioLevel}
                onSelectCategory={handleSelectCategory}
                onSearchQueryChange={setSearchInput}
                onSubmitTextSearch={handleSubmitTextSearch}
                onClearTextSearch={handleClearTextSearch}
                onToggleVoiceSearch={toggleRecording}
                onClearVoiceError={clearVoiceError}
                onChangeRadius={setRadiusMeters}
                onToggleOpenNow={() => setOnlyOpenNow((v) => !v)}
                onOpenLocationPicker={() => setIsLocationModalOpen(true)}
                onSelectPlace={setSelectedPlace}
                onStartRoute={handleStartRoute}
                onClearRoute={handleClearRoute}
                onChangeTravelMode={setTravelMode}
              />
            </div>
          )}
        </div>
      </main>

      <LocationPickerModal
        isOpen={isLocationModalOpen}
        currentLocation={userLocation}
        onClose={() => setIsLocationModalOpen(false)}
        onSelectLocation={handleManualLocationSelect}
        onStartMapPick={() => {
          setIsPickingLocation(true);
          setMobileSheetExpanded(false);
        }}
      />
    </div>
  );
}

export default function App() {
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  useEffect(() => {
    const handleQuota = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuota);
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col bg-[#110709] text-[#F9F2F3] overflow-hidden">
      {quotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {!MAPS_API_KEY ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md rounded-2xl bg-[#190A0D] border border-[#5B1B27] p-6 text-center space-y-3">
            <h1 className="font-display text-xl font-bold text-white">
              oson<span className="text-[#EF4444]">.Y</span>
            </h1>
            <p className="text-sm text-[#E5C6CB] leading-relaxed">
              Google Maps API kaliti topilmadi. Xaritani ishga tushirish uchun
              sozlamalardan Google Maps kalitini ulang.
            </p>
          </div>
        </div>
      ) : (
        <APIProvider
          apiKey={MAPS_API_KEY}
          libraries={['places', 'routes', 'marker', 'geometry']}
          language="uz"
          region="UZ"
        >
          <OsonYWorkspace />
        </APIProvider>
      )}
    </div>
  );
}
