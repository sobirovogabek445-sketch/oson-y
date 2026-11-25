import {FormEvent, useState} from 'react';
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  MapPin,
  Mic,
  Navigation,
  Phone,
  Search,
  Square,
  Star,
  X,
} from 'lucide-react';
import {VoiceStatus} from '../hooks/useVoiceSearch';
import {PLACE_CATEGORIES, RADIUS_OPTIONS, TRAVEL_MODES} from '../constants/categories';
import {
  CategoryId,
  LocationSource,
  NearbyPlaceItem,
  RouteSummary,
  TravelModeKey,
} from '../types/places';
import {formatDistanceUz} from '../utils/geo';

interface PlacesSidebarProps {
  locationLabel: string;
  locationSource: LocationSource;
  geolocationNotice: string | null;
  activeCategory: CategoryId;
  searchQuery: string;
  radiusMeters: number;
  onlyOpenNow: boolean;
  places: NearbyPlaceItem[];
  isSearching: boolean;
  searchError: string | null;
  selectedPlace: NearbyPlaceItem | null;
  activeDestination: NearbyPlaceItem | null;
  travelMode: TravelModeKey;
  routeSummary: RouteSummary | null;
  isRouteLoading: boolean;
  routeError: string | null;
  voiceStatus: VoiceStatus;
  voiceError: string | null;
  audioLevel: number;
  onSelectCategory: (category: CategoryId) => void;
  onSearchQueryChange: (value: string) => void;
  onSubmitTextSearch: (query: string) => void;
  onClearTextSearch: () => void;
  onToggleVoiceSearch: () => void;
  onClearVoiceError: () => void;
  onChangeRadius: (radius: number) => void;
  onToggleOpenNow: () => void;
  onOpenLocationPicker: () => void;
  onSelectPlace: (place: NearbyPlaceItem) => void;
  onStartRoute: (place: NearbyPlaceItem) => void;
  onClearRoute: () => void;
  onChangeTravelMode: (mode: TravelModeKey) => void;
}

export function PlacesSidebar({
  locationLabel,
  locationSource,
  geolocationNotice,
  activeCategory,
  searchQuery,
  radiusMeters,
  onlyOpenNow,
  places,
  isSearching,
  searchError,
  selectedPlace,
  activeDestination,
  travelMode,
  routeSummary,
  isRouteLoading,
  routeError,
  voiceStatus,
  voiceError,
  audioLevel,
  onSelectCategory,
  onSearchQueryChange,
  onSubmitTextSearch,
  onClearTextSearch,
  onToggleVoiceSearch,
  onClearVoiceError,
  onChangeRadius,
  onToggleOpenNow,
  onOpenLocationPicker,
  onSelectPlace,
  onStartRoute,
  onClearRoute,
  onChangeTravelMode,
}: PlacesSidebarProps) {
  const [stepsExpanded, setStepsExpanded] = useState(true);

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSubmitTextSearch(searchQuery.trim());
    }
  };

  const nearestPlace = places[0] ?? null;

  // Collect unique attributions required by Google Maps Platform ToS
  const uniqueAttributions: {provider: string; providerURI?: string | null}[] = [];
  const seenProviders: Record<string, boolean> = {};
  places.forEach((p) => {
    p.attributions.forEach((attr) => {
      if (attr.provider && !seenProviders[attr.provider]) {
        seenProviders[attr.provider] = true;
        uniqueAttributions.push(attr);
      }
    });
  });

  return (
    <div className="flex flex-col h-full bg-[#16090B] text-[#F9F2F3]">
      {/* Top Location & Search Header */}
      <div className="p-4 border-b border-[#38161D] space-y-3 shrink-0">
        {/* Current Origin Row */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#EF4444] shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-[#B38E95]">
                {locationSource === 'gps'
                  ? 'GPS joylashuv'
                  : locationSource === 'manual'
                    ? 'Tanlangan manzil'
                    : 'Boshlang‘ich nuqta'}
              </p>
              <p className="text-sm font-semibold text-white truncate">
                {locationLabel}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenLocationPicker}
            className="min-h-[36px] px-3 py-1.5 rounded-lg bg-[#240F13] hover:bg-[#34151B] border border-[#4A1C26] text-xs font-medium text-[#FCA5A5] whitespace-nowrap shrink-0 transition-colors cursor-pointer"
          >
            O&apos;zgartirish
          </button>
        </div>

        {geolocationNotice && (
          <p className="text-xs text-[#FCA5A5] bg-[#2B0E14] border border-[#5B1B27] rounded-lg px-3 py-2 leading-relaxed">
            {geolocationNotice}
          </p>
        )}

        {/* Search Input + Microphone Voice-to-Text */}
        <form onSubmit={handleFormSubmit} className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#A5848B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                if (voiceError) onClearVoiceError();
                onSearchQueryChange(e.target.value);
              }}
              placeholder={
                voiceStatus === 'recording'
                  ? 'Gapiring...'
                  : voiceStatus === 'transcribing'
                    ? 'Matnga aylantirilmoqda...'
                    : 'Masalan: 24 soat dorixona, stomatologiya...'
              }
              className="w-full h-11 pl-10 pr-9 rounded-xl bg-[#100608] border border-[#451A22] text-sm text-white placeholder:text-[#7D5D64] focus:outline-none focus:border-[#EF4444] transition-colors"
            />
            {searchQuery && voiceStatus === 'idle' && (
              <button
                type="button"
                onClick={onClearTextSearch}
                aria-label="Qidiruvni tozalash"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-md flex items-center justify-center text-[#B38E95] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onToggleVoiceSearch}
            disabled={voiceStatus === 'transcribing'}
            title={
              voiceStatus === 'recording'
                ? "Yozishni to'xtatish"
                : 'Ovoz bilan qidirish'
            }
            aria-label={
              voiceStatus === 'recording'
                ? "Ovoz yozishni to'xtatish"
                : 'Ovoz bilan qidirish'
            }
            className={`min-h-[44px] min-w-[44px] px-3 rounded-xl border flex items-center justify-center shrink-0 transition-all duration-150 cursor-pointer ${
              voiceStatus === 'recording'
                ? 'bg-[#DC2626] border-[#FCA5A5] text-white shadow-md shadow-[#991B1B]/60'
                : voiceStatus === 'transcribing'
                  ? 'bg-[#2A1015] border-[#4A1C26] text-[#FCA5A5] opacity-75 cursor-wait'
                  : 'bg-[#220E12] hover:bg-[#311319] border-[#451A22] text-[#FCA5A5] hover:text-white'
            }`}
          >
            {voiceStatus === 'recording' ? (
              <Square className="w-4 h-4 fill-current" />
            ) : voiceStatus === 'transcribing' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </button>

          <button
            type="submit"
            className="h-11 px-4 rounded-xl bg-[#991B1B] hover:bg-[#B91C1C] text-white text-sm font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer"
          >
            Topish
          </button>
        </form>

        {/* Live Voice Status Feedback */}
        {voiceStatus === 'recording' && (
          <div className="flex items-center justify-between gap-3 rounded-lg bg-[#2B0E14] border border-[#991B1B] px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-medium text-[#FCA5A5] truncate">
                Mikrofon yoqilgan — gapiring, tugatish uchun to&apos;xtating
              </span>
            </div>
            <div className="w-16 h-1.5 rounded-full bg-[#14070A] overflow-hidden shrink-0">
              <div
                className="h-full bg-[#EF4444] transition-transform duration-75 origin-left"
                style={{
                  transform: `scaleX(${Math.max(0.15, audioLevel)})`,
                }}
              />
            </div>
          </div>
        )}

        {voiceStatus === 'transcribing' && (
          <div className="rounded-lg bg-[#240F13] border border-[#4A1C26] px-3 py-2 text-xs text-[#E5C6CB]">
            Ovoz matnga aylantirilmoqda...
          </div>
        )}

        {voiceError && voiceStatus === 'idle' && (
          <div className="flex items-center justify-between gap-2 rounded-lg bg-[#2B0E14] border border-[#7F1D1D] px-3 py-2 text-xs text-[#FCA5A5]">
            <span>{voiceError}</span>
            <button
              type="button"
              onClick={onClearVoiceError}
              aria-label="Xabarni yopish"
              className="text-[#FCA5A5] hover:text-white shrink-0 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Category Segmented Buttons */}
        <div
          className="flex items-center gap-1.5 overflow-x-auto pb-1 crimson-scroll"
          role="tablist"
          aria-label="Manzil turlari"
        >
          {PLACE_CATEGORIES.map((cat) => {
            const active = activeCategory === cat.id && !searchQuery.trim();
            return (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onSelectCategory(cat.id)}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors duration-150 cursor-pointer ${
                  active
                    ? 'bg-[#B91C1C] text-white shadow-sm shadow-[#7F1D1D]/50'
                    : 'bg-[#220E12] text-[#D7B9BF] hover:bg-[#311319] hover:text-white border border-[#38161D]'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Radius & Open Filter Strip */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <div className="flex items-center gap-1 bg-[#100608] p-1 rounded-lg border border-[#33131A]">
            {RADIUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChangeRadius(opt.value)}
                className={`min-h-[30px] px-2.5 py-1 rounded-md font-mono text-[11px] font-medium tabular-nums whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  radiusMeters === opt.value
                    ? 'bg-[#7F1D1D] text-white'
                    : 'text-[#B38E95] hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onToggleOpenNow}
            className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 border transition-colors cursor-pointer ${
              onlyOpenNow
                ? 'bg-[#7F1D1D] border-[#EF4444] text-white'
                : 'bg-[#220E12] border-[#38161D] text-[#C9A8AE] hover:text-white'
            }`}
          >
            Faqat ochiq
          </button>
        </div>
      </div>

      {/* Scrollable Results & Active Route Area */}
      <div className="flex-1 overflow-y-auto crimson-scroll p-4 space-y-4">
        {/* Quick Nearest Action CTA when places exist and no active route */}
        {!activeDestination && nearestPlace && !isSearching && (
          <button
            type="button"
            onClick={() => onStartRoute(nearestPlace)}
            className="w-full min-h-[52px] px-4 py-3 rounded-xl bg-[#B91C1C] hover:bg-[#DC2626] active:scale-[0.99] text-white flex items-center justify-between gap-3 shadow-lg shadow-black/40 transition-all duration-150 cursor-pointer"
          >
            <div className="min-w-0 text-left">
              <p className="text-xs font-medium text-[#FECACA]">
                Eng yaqiniga tezkor yo&apos;l · {formatDistanceUz(nearestPlace.distanceMeters)}
              </p>
              <p className="font-display text-sm font-bold text-white truncate">
                {nearestPlace.displayName}
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 text-xs font-semibold whitespace-nowrap shrink-0">
              <Navigation className="w-3.5 h-3.5" />
              Olib borish
            </span>
          </button>
        )}

        {/* Active Route Card */}
        {activeDestination && (
          <section
            aria-label="Faol yo'nalish"
            className="rounded-xl bg-[#220D11] border border-[#7F1D1D] p-4 space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-[#FCA5A5]">
                  Tanlangan manzilga yo&apos;nalish
                </p>
                <h2 className="font-display text-base font-bold text-white leading-snug mt-0.5">
                  {activeDestination.displayName}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClearRoute}
                aria-label="Yo'nalishni yopish"
                className="min-h-[36px] min-w-[36px] rounded-lg bg-[#311319] hover:bg-[#4A1C26] text-[#FCA5A5] flex items-center justify-center shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Travel Mode Selector */}
            <div className="grid grid-cols-4 gap-1 bg-[#120609] p-1 rounded-lg border border-[#38161D]">
              {TRAVEL_MODES.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => onChangeTravelMode(mode.id)}
                  className={`min-h-[34px] px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    travelMode === mode.id
                      ? 'bg-[#B91C1C] text-white'
                      : 'text-[#B38E95] hover:text-white'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            {isRouteLoading && (
              <p className="text-xs text-[#E5C6CB] py-2">
                Eng qisqa yo&apos;l hisoblanmoqda...
              </p>
            )}

            {routeError && (
              <p className="text-xs text-[#FCA5A5] bg-[#450A0A]/70 border border-[#991B1B] rounded-lg px-3 py-2">
                {routeError}
              </p>
            )}

            {routeSummary && !isRouteLoading && (
              <div className="space-y-3">
                <div className="flex items-baseline justify-between gap-4 py-2 border-y border-[#3D1820]">
                  <div>
                    <span className="font-mono text-xl font-semibold text-white tabular-nums">
                      {routeSummary.durationText}
                    </span>
                    <span className="text-xs text-[#B38E95] ml-2 font-mono tabular-nums">
                      ({routeSummary.distanceText})
                    </span>
                  </div>
                  <a
                    href={routeSummary.googleMapsDirUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[#FCA5A5] hover:text-white underline underline-offset-4 whitespace-nowrap shrink-0"
                  >
                    <span>Google Maps&apos;da ochish</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                {routeSummary.steps.length > 0 && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setStepsExpanded((prev) => !prev)}
                      className="w-full flex items-center justify-between text-xs font-medium text-[#E5C6CB] hover:text-white py-1 cursor-pointer"
                    >
                      <span>
                        Yo&apos;l ko&apos;rsatmalari ({routeSummary.steps.length} qadam)
                      </span>
                      {stepsExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>

                    {stepsExpanded && (
                      <ol className="mt-2 space-y-2 max-h-48 overflow-y-auto crimson-scroll pr-1">
                        {routeSummary.steps.map((step) => (
                          <li
                            key={step.index}
                            className="flex items-start gap-2.5 text-xs text-[#E5C6CB] pb-2 border-b border-[#311319] last:border-b-0"
                          >
                            <span className="font-mono text-[11px] font-semibold text-[#FCA5A5] tabular-nums mt-0.5 shrink-0">
                              {step.index}.
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="leading-relaxed text-[#F9F2F3]">
                                {step.instruction}
                              </p>
                              <p className="font-mono text-[11px] text-[#A5848B] tabular-nums mt-0.5">
                                {step.distanceText} · {step.durationText}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Loading State */}
        {isSearching && (
          <div className="space-y-3" aria-busy="true">
            {[1, 2, 3, 4].map((skeleton) => (
              <div
                key={skeleton}
                className="rounded-xl bg-[#1D0B0E] border border-[#33131A] p-4 space-y-2.5 animate-pulse"
              >
                <div className="h-4 w-2/3 bg-[#33131A] rounded" />
                <div className="h-3 w-1/2 bg-[#2B1015] rounded" />
                <div className="h-3 w-5/6 bg-[#240D11] rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {!isSearching && searchError && (
          <div className="rounded-xl bg-[#2A0D12] border border-[#7F1D1D] p-4 text-sm text-[#FCA5A5]">
            {searchError}
          </div>
        )}

        {/* Empty State */}
        {!isSearching && !searchError && places.length === 0 && (
          <div className="rounded-xl bg-[#1D0B0E] border border-[#38161D] p-6 text-center space-y-2">
            <p className="font-display text-sm font-bold text-white">
              Bu hududda mos joy topilmadi
            </p>
            <p className="text-xs text-[#B38E95] leading-relaxed">
              Qidiruv radiusini kattalashtiring, &quot;Faqat ochiq&quot; filtrini o&apos;chiring
              yoki xaritadan boshqa nuqta tanlang.
            </p>
          </div>
        )}

        {/* Nearest Places List */}
        {!isSearching && places.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs text-[#B38E95] px-0.5">
              <span>Eng yaqin natijalar ({places.length})</span>
              <span>Masofa bo&apos;yicha tartiblangan</span>
            </div>

            {places.map((place, index) => {
              const rank = index + 1;
              const isSelected = selectedPlace?.id === place.id;
              const isRoutingHere = activeDestination?.id === place.id;

              return (
                <article
                  key={place.id}
                  onClick={() => onSelectPlace(place)}
                  className={`rounded-xl p-4 border transition-colors duration-150 cursor-pointer space-y-2.5 ${
                    isRoutingHere || isSelected
                      ? 'bg-[#281015] border-[#DC2626]'
                      : 'bg-[#1C0B0E] border-[#38161D] hover:bg-[#240E13] hover:border-[#63222E]'
                  }`}
                >
                  {/* Lead directly with clean unboxed metadata kicker or title */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs text-[#B38E95] mb-1">
                        <span className="font-mono font-semibold text-[#FCA5A5] tabular-nums">
                          #{rank}
                        </span>
                        {rank === 1 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-medium text-[#EF4444]">
                              Eng yaqin
                            </span>
                          </>
                        )}
                        {place.isOpenNow !== undefined && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span
                              className={
                                place.isOpenNow
                                  ? 'text-[#86EFAC]'
                                  : 'text-[#FCA5A5]'
                              }
                            >
                              {place.isOpenNow ? 'Ochiq' : 'Yopiq'}
                            </span>
                          </>
                        )}
                      </div>

                      <h3 className="font-display text-base font-bold text-white leading-snug">
                        {place.displayName}
                      </h3>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-mono text-sm font-semibold text-white tabular-nums">
                        {formatDistanceUz(place.distanceMeters)}
                      </span>
                    </div>
                  </div>

                  {place.formattedAddress && (
                    <p className="text-xs text-[#C9A8AE] leading-relaxed">
                      {place.formattedAddress}
                    </p>
                  )}

                  {/* Unboxed secondary details */}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#A5848B]">
                    {place.rating != null && (
                      <span className="inline-flex items-center gap-1 text-[#FDE68A] font-mono tabular-nums">
                        <Star className="w-3.5 h-3.5 fill-[#FDE68A] text-[#FDE68A]" />
                        {place.rating.toFixed(1)}
                        {place.userRatingCount ? ` (${place.userRatingCount})` : ''}
                      </span>
                    )}
                    {place.rating != null && place.todayHoursText && (
                      <span aria-hidden="true">·</span>
                    )}
                    {place.todayHoursText && <span>{place.todayHoursText}</span>}
                  </div>

                  {/* Card Footer Actions */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-3 min-w-0">
                      {place.nationalPhoneNumber && (
                        <a
                          href={`tel:${place.nationalPhoneNumber}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 text-xs text-[#E5C6CB] hover:text-white truncate"
                        >
                          <Phone className="w-3.5 h-3.5 text-[#EF4444] shrink-0" />
                          <span className="font-mono tabular-nums truncate">
                            {place.nationalPhoneNumber}
                          </span>
                        </a>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onStartRoute(place);
                      }}
                      className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                        isRoutingHere
                          ? 'bg-[#EF4444] text-white'
                          : 'bg-[#991B1B] hover:bg-[#B91C1C] text-white'
                      }`}
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>{isRoutingHere ? "Yo'l faol" : 'Olib borish'}</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Required Places API Attributions (ToS compliance) */}
        {uniqueAttributions.length > 0 && (
          <div className="pt-2 border-t border-[#2E1117] text-[11px] text-[#8E6B72] flex flex-wrap gap-x-3 gap-y-1">
            {uniqueAttributions.map((attr) =>
              attr.providerURI ? (
                <a
                  key={attr.provider}
                  href={attr.providerURI}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-[#C9A8AE]"
                >
                  {attr.provider}
                </a>
              ) : (
                <span key={attr.provider}>{attr.provider}</span>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
