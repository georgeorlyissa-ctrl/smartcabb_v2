import { useState, useEffect } from 'react';
import { useAppState } from '../../hooks/useAppState';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { toast } from '../../lib/toast';

// ── Étoile SVG inline (fill direct, pas de conflit Tailwind) ─────────────────
function StarIcon({ filled, size = 40 }: { filled: boolean; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? '#FBBF24' : 'none'}
      stroke={filled ? '#FBBF24' : '#D1D5DB'}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  );
}

const LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Très mauvais',  color: 'text-red-500' },
  2: { label: 'Mauvais',       color: 'text-orange-500' },
  3: { label: 'Moyen',         color: 'text-yellow-500' },
  4: { label: 'Bien',          color: 'text-green-500' },
  5: { label: 'Excellent !',   color: 'text-green-600' },
};

const QUICK_COMMENTS = [
  { emoji: '👍', text: 'Excellent conducteur' },
  { emoji: '✨', text: 'Véhicule propre' },
  { emoji: '🛡️', text: 'Conduite sécuritaire' },
  { emoji: '⏰', text: 'Très ponctuel' },
  { emoji: '😊', text: 'Très sympathique' },
  { emoji: '🗺️', text: 'Bonne connaissance des routes' },
];

export function RatingScreen() {
  const { state, setCurrentScreen, updateRide } = useAppState();
  const currentRide = state.currentRide;

  const [rating, setRating]         = useState(0);
  const [hovered, setHovered]       = useState(0);
  const [comment, setComment]       = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [driverData, setDriverData] = useState<any>(null);

  // Charger les données du conducteur (photo incluse)
  useEffect(() => {
    if (!currentRide?.driverId) return;
    fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/drivers/${currentRide.driverId}`,
      { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
    )
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.driver) setDriverData(data.driver); })
      .catch(() => {});
  }, [currentRide?.driverId]);

  if (!currentRide) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 text-center shadow">
          <p className="text-gray-500">Aucune course à évaluer</p>
          <button
            onClick={() => setCurrentScreen('map')}
            className="mt-4 px-6 py-2 bg-primary text-white rounded-xl font-medium"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  const driverName  = driverData?.full_name || driverData?.name || currentRide.driverName || 'Votre chauffeur';
  const photoUrl    = driverData?.photo_url  || driverData?.photo || driverData?.profile_photo || null;
  const initials    = driverName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
  const finalPrice  = currentRide.finalPrice || currentRide.actualPrice || currentRide.estimatedPrice || 0;
  const activeStars = hovered > 0 ? hovered : rating;

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Veuillez choisir une note (1 à 5 étoiles)');
      return;
    }
    setIsSubmitting(true);
    try {
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/rate`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${publicAnonKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rideId:      currentRide.id,
            driverId:    currentRide.driverId,
            passengerId: state.currentUser?.id,
            rating,
            comment,
          }),
        }
      );

      // Mettre à jour l'historique local
      if (updateRide && currentRide.id) {
        updateRide(currentRide.id, { passengerRating: rating, passengerComment: comment, paymentStatus: 'paid' });
      }

      toast.success('⭐ Merci pour votre évaluation !', {
        description: `Vous avez attribué ${rating} étoile${rating > 1 ? 's' : ''} à ${driverName}.`,
        duration: 4000,
      });

      setTimeout(() => setCurrentScreen('map'), 1800);
    } catch {
      toast.error('Impossible d\'enregistrer l\'évaluation. Réessayez.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex flex-col">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-green-600 to-emerald-600 text-white pt-8 pb-6 px-6 text-center">
        <div className="text-4xl mb-2">🏁</div>
        <h1 className="text-2xl font-bold">Course terminée !</h1>
        <p className="text-green-100 text-sm mt-1">Évaluez votre expérience</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-md mx-auto p-4 space-y-4">

          {/* ── Résumé du prix ─────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Montant total</p>
              <p className="text-2xl font-bold text-gray-900">{finalPrice.toLocaleString()} <span className="text-sm font-normal text-gray-500">CDF</span></p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          {/* ── Conducteur ─────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-4">
            {/* Photo */}
            <div className="w-16 h-16 rounded-full overflow-hidden bg-blue-100 flex-shrink-0 border-2 border-blue-200">
              {photoUrl ? (
                <img src={photoUrl} alt={driverName} className="w-full h-full object-cover" onError={e => { e.currentTarget.style.display = 'none'; }} />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold text-xl">
                  {initials}
                </div>
              )}
            </div>
            {/* Infos */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">{driverName}</p>
              {(driverData?.vehicle?.make || driverData?.vehicle?.model) && (
                <p className="text-sm text-gray-500 truncate">
                  {driverData.vehicle.color && `${driverData.vehicle.color} · `}
                  {driverData.vehicle.make} {driverData.vehicle.model}
                </p>
              )}
              {(driverData?.vehicle?.license_plate || driverData?.vehicle?.plate) && (
                <p className="text-xs font-mono text-primary bg-blue-50 px-2 py-0.5 rounded-md inline-block mt-1">
                  {driverData.vehicle.license_plate || driverData.vehicle.plate}
                </p>
              )}
            </div>
          </div>

          {/* ── Étoiles ────────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <p className="text-center font-semibold text-gray-800 mb-4">Comment s'est passée votre course ?</p>

            {/* Stars row */}
            <div
              className="flex justify-center gap-3 mb-3"
              onMouseLeave={() => setHovered(0)}
            >
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHovered(star)}
                  onClick={() => setRating(star)}
                  style={{
                    transform: activeStars >= star ? 'scale(1.15)' : 'scale(1)',
                    transition: 'transform 0.15s ease',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 4,
                    lineHeight: 0,
                  }}
                >
                  <StarIcon filled={activeStars >= star} size={44} />
                </button>
              ))}
            </div>

            {/* Label */}
            <div className="text-center min-h-[24px]">
              {rating > 0 ? (
                <p className={`font-semibold ${LABELS[rating].color}`}>{LABELS[rating].label}</p>
              ) : (
                <p className="text-gray-400 text-sm">Appuyez sur une étoile pour noter</p>
              )}
            </div>
          </div>

          {/* ── Commentaires rapides (visible uniquement après notation) ───── */}
          {rating > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2 px-1">Commentaire rapide (optionnel)</p>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_COMMENTS.map(q => (
                  <button
                    key={q.text}
                    type="button"
                    onClick={() => setComment(prev => prev === q.text ? '' : q.text)}
                    className={`text-left p-2.5 rounded-xl border text-xs font-medium transition-all ${
                      comment === q.text
                        ? 'bg-green-50 border-green-400 text-green-800'
                        : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span className="mr-1">{q.emoji}</span>{q.text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Commentaire libre ───────────────────────────────────────────── */}
          {rating > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Commentaire libre (optionnel)
              </label>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Partagez votre expérience..."
                rows={3}
                maxLength={500}
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-transparent resize-none text-sm outline-none"
              />
              <p className="text-right text-xs text-gray-400 mt-1">{comment.length}/500</p>
            </div>
          )}

          {/* ── Bouton Envoyer ──────────────────────────────────────────────── */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || rating === 0}
            className={`w-full py-4 rounded-2xl font-bold text-base transition-all ${
              rating > 0 && !isSubmitting
                ? 'bg-green-600 text-white hover:bg-green-700 active:scale-95 shadow-lg shadow-green-200'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Envoi en cours...
              </span>
            ) : (
              `Envoyer mon évaluation ${rating > 0 ? `(${rating}★)` : ''}`
            )}
          </button>

          {/* ── Passer l'évaluation ─────────────────────────────────────────── */}
          <button
            type="button"
            onClick={() => setCurrentScreen('map')}
            className="w-full py-3 text-gray-500 text-sm hover:text-gray-700 transition-colors"
          >
            Passer pour l'instant
          </button>

        </div>
      </div>
    </div>
  );
}
