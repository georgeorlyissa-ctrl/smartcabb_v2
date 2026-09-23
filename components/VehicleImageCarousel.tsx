import { useState, useEffect, useCallback, useMemo } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight } from '../lib/icons';

interface VehicleImageCarouselProps {
  images: string[];
  alt: string;
  isSelected: boolean;
  autoPlay?: boolean;
  interval?: number;
}

export function VehicleImageCarousel({
  images,
  alt,
  isSelected,
  autoPlay = true,
  interval = 3200
}: VehicleImageCarouselProps) {
  const options = useMemo(() => ({ loop: true as const }), []);
  const [emblaRef, emblaApi] = useEmblaCarousel(options);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const scrollPrev = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    emblaApi && emblaApi.scrollPrev();
  }, [emblaApi]);
  const scrollNext = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    emblaApi && emblaApi.scrollNext();
  }, [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    const idx = emblaApi.selectedScrollSnap();
    setCurrentIndex(prev => prev === idx ? prev : idx);
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    onSelect();
    return () => { emblaApi.off('select', onSelect); };
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (!autoPlay || isHovered || images.length <= 1 || !emblaApi) return;
    const id = setInterval(() => emblaApi.scrollNext(), interval);
    return () => clearInterval(id);
  }, [autoPlay, interval, isHovered, images.length, emblaApi]);

  if (images.length === 0) return null;

  if (images.length === 1) {
    return (
      <div className="relative h-16 bg-gradient-to-br from-gray-50 to-white overflow-hidden rounded-t-xl">
        <img src={images[0]} alt={alt} className="w-full h-full object-cover" loading="eager" />
        {isSelected && (
          <div className="absolute top-2 right-2 w-6 h-6 bg-secondary rounded-full flex items-center justify-center shadow-lg animate-scale-in">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="relative h-16 bg-white overflow-hidden rounded-t-xl"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="overflow-hidden h-full" ref={emblaRef}>
        <div className="flex h-full">
          {images.map((src, idx) => (
            <div key={idx} className="flex-[0_0_100%] min-w-0 h-full relative">
              <img src={src} alt={`${alt} - ${idx + 1}`} className="w-full h-full object-cover" loading={idx === 0 ? 'eager' : 'lazy'} />
            </div>
          ))}
        </div>
      </div>

      {isSelected && (
        <div className="absolute top-2 right-2 w-6 h-6 bg-secondary rounded-full flex items-center justify-center shadow-lg z-10">
          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
        </div>
      )}

      <button
        onClick={scrollPrev}
        className={`absolute left-1 top-1/2 -translate-y-1/2 w-6 h-6 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md border border-white/60 transition-all duration-200 z-10 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
        aria-label="Précédent"
      >
        <ChevronLeft className="w-3.5 h-3.5 text-gray-700" />
      </button>
      <button
        onClick={scrollNext}
        className={`absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md border border-white/60 transition-all duration-200 z-10 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
        aria-label="Suivant"
      >
        <ChevronRight className="w-3.5 h-3.5 text-gray-700" />
      </button>

      <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/30 backdrop-blur-md px-2 py-1 rounded-full">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={(e) => { e.stopPropagation(); emblaApi && emblaApi.scrollTo(i); }}
            className={`rounded-full transition-all duration-300 ${i === currentIndex ? 'bg-white w-3 h-1' : 'bg-white/60 w-1 h-1'}`}
            aria-label={`Image ${i + 1}`}
          />
        ))}
      </div>

      <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-black/60 backdrop-blur-sm rounded text-[9px] text-white font-medium">
        {currentIndex + 1}/{images.length}
      </div>
    </div>
  );
}
