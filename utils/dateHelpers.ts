/**
 * 🔧 UTILITAIRES DE FORMATAGE DE DATES
 * Gestion robuste des dates avec protection contre les valeurs invalides
 */

/**
 * Formate une date en français de manière sécurisée
 * @param date - Date à formater (string, Date, ou undefined/null)
 * @param options - Options de formatage
 * @returns Date formatée ou 'N/A' si invalide
 */
export function safeFormatDate(
  date: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  try {
    // Vérifier si la date existe
    if (!date) {
      return 'N/A';
    }

    // Convertir en Date si c'est une chaîne
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    // Vérifier si la date est valide
    if (isNaN(dateObj.getTime())) {
      console.warn('Date invalide:', date);
      return 'N/A';
    }

    // Formater la date
    return dateObj.toLocaleDateString('fr-FR', options || {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch (error) {
    console.error('Erreur lors du formatage de la date:', error, 'Date:', date);
    return 'N/A';
  }
}

/**
 * Formate une date courte (JJ/MM/AAAA)
 */
export function safeFormatDateShort(date: string | Date | null | undefined): string {
  return safeFormatDate(date, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Formate une date avec le mois en lettres
 */
export function safeFormatDateLong(date: string | Date | null | undefined): string {
  return safeFormatDate(date, {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

/**
 * Formate une date avec jour de la semaine
 */
export function safeFormatDateWithWeekday(date: string | Date | null | undefined): string {
  return safeFormatDate(date, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

/**
 * Formate une date compacte (Mois Année)
 */
export function safeFormatDateCompact(date: string | Date | null | undefined): string {
  return safeFormatDate(date, {
    month: 'short',
    year: 'numeric'
  });
}

/**
 * Retourne le temps écoulé depuis une date
 */
export function timeAgo(date: string | Date | null | undefined): string {
  try {
    if (!date) return 'N/A';

    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return 'N/A';

    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;

    return safeFormatDate(dateObj, {
      day: 'numeric',
      month: 'short'
    });
  } catch (error) {
    console.error('Erreur timeAgo:', error);
    return 'N/A';
  }
}

/**
 * Vérifie si une date est valide
 */
export function isValidDate(date: any): boolean {
  if (!date) return false;
  const dateObj = date instanceof Date ? date : new Date(date);
  return !isNaN(dateObj.getTime());
}
