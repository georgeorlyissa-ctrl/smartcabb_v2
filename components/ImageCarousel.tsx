import { useState, useEffect } from 'react';

interface ImageCarouselProps {
  images: string[];
  serviceName: string;
}

export function ImageCarousel({ images, serviceName }: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Défilement automatique toutes les 3 secondes
  useEffect(() => {
    if (images.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [images.length]);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  return (
    <div className="relative h-64 bg-white overflow-hidden group">
      {/* Image actuelle */}
      <img
        src={images[currentIndex]}
        alt={`${serviceName} - Image ${currentIndex + 1}`}
        className="w-full h-full object-cover transition-opacity duration-500"
        onError={(e) => {
          e.currentTarget.src =
            'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f0f0f0" width="400" height="300"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EImage non disponible%3C/text%3E%3C/svg%3E';
        }}
      />

      {/* Boutons de navigation (visible au hover) */}
      {images.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 rounded-full w-10 h-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
            aria-label="Image précédente"
          >
            ←
          </button>
          <button
            onClick={goToNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 rounded-full w-10 h-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
            aria-label="Image suivante"
          >
            →
          </button>
        </>
      )}

      {/* Indicateurs de pagination */}
      {images.length > 1 && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-2">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex
                  ? 'bg-white w-6'
                  : 'bg-white/50 hover:bg-white/75'
              }`}
              aria-label={`Aller à l'image ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Logo SmartCabb dans l'image */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg shadow-md">
        <div className="w-6 h-6 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-lg flex items-center justify-center text-white font-black text-xs">
          SC
        </div>
        <span className="text-xs font-bold text-gray-900">
          {serviceName && serviceName.includes(' ') ? serviceName.split(' ')[1] : serviceName || 'SmartCabb'}
        </span>
      </div>

      {/* Compteur d'images */}
      {images.length > 1 && (
        <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-xs font-semibold">
          {currentIndex + 1} / {images.length}
        </div>
      )}
    </div>
  );
}