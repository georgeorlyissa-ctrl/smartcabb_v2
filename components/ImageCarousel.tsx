import { useState, useEffect, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { SmartCabbLogo } from './SmartCabbLogo';

interface ImageCarouselProps {
  images: string[];
  serviceName: string;
}

export function ImageCarousel({ images, serviceName }: ImageCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'start' });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((i: number) => emblaApi && emblaApi.scrollTo(i), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCurrentIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    onSelect();
    return () => { emblaApi.off('select', onSelect); };
  }, [emblaApi, onSelect]);

  // Autoplay 3.5s, pause on hover
  useEffect(() => {
    if (!emblaApi || images.length <= 1 || isHovered) return;
    const id = setInterval(() => emblaApi.scrollNext(), 3500);
    return () => clearInterval(id);
  }, [emblaApi, images.length, isHovered]);

  if (images.length === 0) return null;

  return (
    <div
      className="relative h-72 md:h-80 bg-white overflow-hidden group rounded-2xl shadow-xl border border-gray-100"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="overflow-hidden h-full" ref={emblaRef}>
        <div className="flex h-full">
          {images.map((src, idx) => (
            <div key={idx} className="flex-[0_0_100%] min-w-0 h-full relative">
              <img
                src={src}
                alt={`${serviceName} - ${idx + 1}`}
                className="w-full h-full object-cover"
                loading={idx === 0 ? 'eager' : 'lazy'}
                onError={(e) => {
                  e.currentTarget.src =
                    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="600"%3E%3Crect fill="%23f3f4f6" width="800" height="600"/%3E%3Ctext fill="%239ca3af" x="50%25" y="50%25" text-anchor="middle" dy=".3em" font-family="Inter,sans-serif" font-size="16"%3EImage non disponible%3C/text%3E%3C/svg%3E';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
            </div>
          ))}
        </div>
      </div>

      {/* Navigation */}
      {images.length > 1 && (
        <>
          <button
            onClick={scrollPrev}
            className={`absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur-md hover:bg-white text-gray-800 rounded-full flex items-center justify-center shadow-lg border border-white/50 transition-all duration-200 ${isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 md:opacity-0'}`}
            aria-label="Précédent"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <button
            onClick={scrollNext}
            className={`absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur-md hover:bg-white text-gray-800 rounded-full flex items-center justify-center shadow-lg border border-white/50 transition-all duration-200 ${isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2 md:opacity-0'}`}
            aria-label="Suivant"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
          </button>
        </>
      )}

      {/* Dots */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-full">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => scrollTo(i)}
              className={`rounded-full transition-all duration-300 ${i === currentIndex ? 'bg-white w-6 h-1.5' : 'bg-white/60 hover:bg-white/90 w-1.5 h-1.5'}`}
              aria-label={`Aller à ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* Logo */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg border border-white/50">
        <SmartCabbLogo plain className="w-6 h-6" />
        <span className="text-xs font-bold text-gray-900 pr-1">{serviceName.includes(' ') ? serviceName.split(' ').slice(1).join(' ') : serviceName}</span>
      </div>

      {/* Counter */}
      {images.length > 1 && (
        <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md text-white px-2.5 py-1 rounded-full text-xs font-semibold">
          {currentIndex + 1} / {images.length}
        </div>
      )}
    </div>
  );
}
