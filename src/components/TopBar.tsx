import {LocateFixed} from 'lucide-react';
import {CategoryId} from '../types/places';

interface TopBarProps {
  activeCategory: CategoryId;
  onSelectCategory: (category: CategoryId) => void;
  onOpenLocationPicker: () => void;
  onLocateMe: () => void;
  isLocating: boolean;
}

export function TopBar({
  activeCategory,
  onSelectCategory,
  onOpenLocationPicker,
  onLocateMe,
  isLocating,
}: TopBarProps) {
  return (
    <header className="h-14 shrink-0 bg-[#14070A] border-b border-[#38161D] px-4 lg:px-6 flex items-center justify-between gap-8 z-30">
      {/* Zone 1: Brand Wordmark */}
      <a
        href="#top"
        onClick={(e) => {
          e.preventDefault();
          onSelectCategory('pharmacy');
        }}
        className="font-display text-xl font-extrabold tracking-tight text-[#F9F2F3] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#EF4444] rounded"
      >
        oson<span className="text-[#EF4444]">.Y</span>
      </a>

      {/* Zone 2: Concise single-line navigation links */}
      <nav
        aria-label="Tezkor bo'limlar"
        className="hidden md:flex items-center gap-6 text-sm font-medium text-[#C9A8AE]"
      >
        <button
          type="button"
          onClick={() => onSelectCategory('pharmacy')}
          className={`whitespace-nowrap shrink-0 transition-colors duration-150 hover:text-white cursor-pointer py-1 border-b-2 ${
            activeCategory === 'pharmacy'
              ? 'text-white border-[#EF4444]'
              : 'border-transparent'
          }`}
        >
          Dorixonalar
        </button>
        <button
          type="button"
          onClick={() => onSelectCategory('hospital')}
          className={`whitespace-nowrap shrink-0 transition-colors duration-150 hover:text-white cursor-pointer py-1 border-b-2 ${
            activeCategory === 'hospital'
              ? 'text-white border-[#EF4444]'
              : 'border-transparent'
          }`}
        >
          Shifoxonalar
        </button>
        <button
          type="button"
          onClick={() => onSelectCategory('supermarket')}
          className={`whitespace-nowrap shrink-0 transition-colors duration-150 hover:text-white cursor-pointer py-1 border-b-2 ${
            activeCategory === 'supermarket'
              ? 'text-white border-[#EF4444]'
              : 'border-transparent'
          }`}
        >
          Do&apos;konlar
        </button>
        <button
          type="button"
          onClick={onOpenLocationPicker}
          className="whitespace-nowrap shrink-0 transition-colors duration-150 hover:text-white cursor-pointer py-1 border-b-2 border-transparent"
        >
          Manzilni tanlash
        </button>
      </nav>

      {/* Zone 3: Single primary action */}
      <div className="flex items-center shrink-0">
        <button
          type="button"
          onClick={onLocateMe}
          disabled={isLocating}
          className="inline-flex items-center gap-2 min-h-[40px] px-4 py-2 rounded-lg bg-[#991B1B] hover:bg-[#B91C1C] active:scale-[0.98] disabled:opacity-60 text-white text-sm font-medium transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer shadow-sm shadow-black/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FCA5A5]"
        >
          <LocateFixed className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
          <span>{isLocating ? 'Aniqlanmoqda...' : 'Joylashuvim'}</span>
        </button>
      </div>
    </header>
  );
}
