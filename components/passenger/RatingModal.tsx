import { useState } from 'react';
import { Button } from '../ui/button';
import { Star, X } from '../../lib/icons';
import { Card } from '../ui/card';

interface RatingModalProps {
  isOpen: boolean;
  driverName: string;
  onSubmit: (rating: number, comment: string) => void;
  onSkip: () => void;
}

export function RatingModal({ isOpen, driverName, onSubmit, onSkip }: RatingModalProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (rating > 0) {
      onSubmit(rating, comment);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
      >
        <Card className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Notez votre course</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onSkip}
              className="rounded-full"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="space-y-6">
            {/* Info conducteur */}
            <div className="text-center">
              <p className="text-gray-600 mb-2">Comment s'est passée votre course avec</p>
              <p className="text-xl font-semibold">{driverName} ?</p>
            </div>

            {/* Étoiles de notation */}
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110 focus:outline-none"
                >
                  <Star
                    className={`w-12 h-12 transition-all ${
                      star <= (hoveredRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'fill-none text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>

            {/* Message de feedback */}
            {rating > 0 && (
              <div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
              >
                <p className="text-lg font-semibold">
                  {rating === 5 && '⭐ Excellent !'}
                  {rating === 4 && '👍 Très bien !'}
                  {rating === 3 && '😊 Bien'}
                  {rating === 2 && '😐 Peut mieux faire'}
                  {rating === 1 && '😞 Décevant'}
                </p>
              </div>
            )}

            {/* Commentaire (optionnel) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Commentaire (optionnel)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Partagez votre expérience..."
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
              />
            </div>

            {/* Boutons d'action */}
            <div className="flex gap-3">
              <Button
                onClick={onSkip}
                variant="outline"
                className="flex-1"
              >
                Passer
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={rating === 0}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Envoyer
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}