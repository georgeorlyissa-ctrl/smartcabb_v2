import { useEffect, useRef } from 'react';

interface SoundNotificationProps {
  shouldPlay: boolean;
  duration?: number; // en millisecondes
}

export function SoundNotification({ shouldPlay, duration = 15000 }: SoundNotificationProps) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasPlayedRef = useRef(false);

  useEffect(() => {
    if (shouldPlay && !hasPlayedRef.current) {
      hasPlayedRef.current = true;
      
      // Fonction simple pour jouer un son via API audio si disponible
      const playNotificationSound = async () => {
        try {
          // Tenter de créer un AudioContext simple
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          
          if (audioContext.state === 'suspended') {
            await audioContext.resume();
          }
          
          // Créer un oscillateur pour générer le son
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          // Connecter l'oscillateur au gain puis aux haut-parleurs
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          // Configurer le son (fréquence et type)
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
          oscillator.type = 'sine';
          
          // Volume faible
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
          
          // Jouer le son
          oscillator.start();
          
          // Arrêter après 500ms
          oscillator.stop(audioContext.currentTime + 0.5);
          
          // Nettoyer après utilisation
          setTimeout(() => {
            audioContext.close();
          }, 1000);
          
        } catch (error) {
          console.warn('Audio notification not supported:', error);
        }
      };

      playNotificationSound();
      
      // Reset après la durée spécifiée
      timeoutRef.current = setTimeout(() => {
        hasPlayedRef.current = false;
      }, duration);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [shouldPlay, duration]);

  // Reset quand shouldPlay devient false
  useEffect(() => {
    if (!shouldPlay) {
      hasPlayedRef.current = false;
    }
  }, [shouldPlay]);

  // Ce composant ne rend rien
  return null;
}