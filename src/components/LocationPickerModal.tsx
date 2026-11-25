import {useEffect, useRef, useState} from 'react';
import {useMapsLibrary} from '@vis.gl/react-google-maps';
import {Crosshair, MapPin, Search, X} from 'lucide-react';
import {LatLngLiteral} from '../types/places';
import {checkAndDispatchQuotaError} from '../utils/geo';

interface LocationPickerModalProps {
  isOpen: boolean;
  currentLocation: LatLngLiteral;
  onClose: () => void;
  onSelectLocation: (coords: LatLngLiteral, label: string) => void;
  onStartMapPick: () => void;
}

interface SuggestionItem {
  id: string;
  mainText: string;
  secondaryText: string;
  prediction: google.maps.places.PlacePrediction;
}

export function LocationPickerModal({
  isOpen,
  currentLocation,
  onClose,
  onSelectLocation,
  onStartMapPick,
}: LocationPickerModalProps) {
  const placesLib = useMapsLibrary('places');
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionTokenRef =
    useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setSuggestions([]);
      setError(null);
      sessionTokenRef.current = null;
      return;
    }
    if (placesLib && !sessionTokenRef.current) {
      sessionTokenRef.current = new placesLib.AutocompleteSessionToken();
    }
  }, [isOpen, placesLib]);

  useEffect(() => {
    if (!isOpen || !placesLib) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setError(null);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (!sessionTokenRef.current) {
          sessionTokenRef.current = new placesLib.AutocompleteSessionToken();
        }
        const {suggestions: rawSuggestions} =
          await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: trimmed,
            sessionToken: sessionTokenRef.current,
            locationBias: {
              center: currentLocation,
              radius: 25000,
            },
            language: 'uz',
            internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio'],
          });

        if (cancelled) return;

        const mapped: SuggestionItem[] = [];
        for (const item of rawSuggestions) {
          if (item.placePrediction) {
            mapped.push({
              id: item.placePrediction.placeId,
              mainText:
                item.placePrediction.mainText?.text ||
                item.placePrediction.text.text,
              secondaryText: item.placePrediction.secondaryText?.text || '',
              prediction: item.placePrediction,
            });
          }
        }
        setSuggestions(mapped);
      } catch (err) {
        if (cancelled) return;
        checkAndDispatchQuotaError(err);
        setError("Manzillarni yuklashda xatolik yuz berdi. Qayta urinib ko'ring.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }, 260);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, isOpen, placesLib, currentLocation]);

  const handleChooseSuggestion = async (item: SuggestionItem) => {
    setIsLoading(true);
    setError(null);
    try {
      const place = item.prediction.toPlace();
      await place.fetchFields({
        fields: ['location', 'displayName', 'formattedAddress'],
      });
      // Reset session token after place details fetch completes the session
      if (placesLib) {
        sessionTokenRef.current = new placesLib.AutocompleteSessionToken();
      }
      if (place.location) {
        onSelectLocation(
          {lat: place.location.lat(), lng: place.location.lng()},
          place.displayName || item.mainText
        );
        onClose();
      } else {
        setError("Tanlangan manzil koordinatasi topilmadi.");
      }
    } catch (err) {
      checkAndDispatchQuotaError(err);
      setError("Manzil ma'lumotini olishda xatolik yuz berdi.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="location-modal-title"
    >
      <div className="w-full max-w-lg rounded-2xl bg-[#190A0D] border border-[#451A22] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#38161D]">
          <h2
            id="location-modal-title"
            className="font-display text-base font-bold text-white"
          >
            Turgan joyingizni belgilang
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Yopish"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-[#C9A8AE] hover:text-white hover:bg-[#2A1116] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-[#C9A8AE] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ko'cha, tuman yoki mo'ljal nomini yozing..."
              autoFocus
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-[#110709] border border-[#451A22] text-sm text-white placeholder:text-[#8E6B72] focus:outline-none focus:border-[#EF4444]"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              onStartMapPick();
              onClose();
            }}
            className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#260F14] hover:bg-[#34141B] border border-[#4A1C26] text-sm font-medium text-[#FCA5A5] flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Crosshair className="w-4 h-4" />
            <span>Xaritadan nuqta bosib tanlash</span>
          </button>

          {error && (
            <p className="text-xs text-[#FCA5A5] bg-[#450A0A]/60 border border-[#7F1D1D] rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="max-h-64 overflow-y-auto crimson-scroll divide-y divide-[#2F1218]">
            {isLoading && suggestions.length === 0 && (
              <p className="py-6 text-center text-sm text-[#B38E95]">
                Manzillar qidirilmoqda...
              </p>
            )}
            {!isLoading && query.trim().length >= 2 && suggestions.length === 0 && !error && (
              <p className="py-6 text-center text-sm text-[#B38E95]">
                Mos manzil topilmadi. Boshqa nom bilan urinib ko&apos;ring.
              </p>
            )}
            {suggestions.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleChooseSuggestion(item)}
                className="w-full min-h-[52px] py-3 px-2 flex items-start gap-3 text-left hover:bg-[#240E13] rounded-lg transition-colors cursor-pointer"
              >
                <MapPin className="w-4 h-4 text-[#EF4444] mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {item.mainText}
                  </p>
                  {item.secondaryText && (
                    <p className="text-xs text-[#B38E95] truncate mt-0.5">
                      {item.secondaryText}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
