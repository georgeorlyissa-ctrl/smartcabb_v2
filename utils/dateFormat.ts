/**
 * Utilitaire de formatage de dates simple pour remplacer date-fns
 * Compatible avec le build Figma Make
 */

export function format(date: Date | string, formatStr: string, options?: { locale?: any }): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) {
    return 'Date invalide';
  }

  const pad = (num: number) => num.toString().padStart(2, '0');
  
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const seconds = d.getSeconds();

  const monthNamesFr = [
    'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
    'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'
  ];

  const monthNamesFullFr = [
    'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
  ];

  // Remplacements courants
  const replacements: Record<string, string> = {
    'dd': pad(day),
    'd': day.toString(),
    'MM': pad(month),
    'M': month.toString(),
    'MMM': monthNamesFr[month - 1],
    'MMMM': monthNamesFullFr[month - 1],
    'yyyy': year.toString(),
    'yy': year.toString().slice(-2),
    'HH': pad(hours),
    'H': hours.toString(),
    'mm': pad(minutes),
    'm': minutes.toString(),
    'ss': pad(seconds),
    's': seconds.toString(),
  };

  let result = formatStr;
  
  // Ordre important : plus long d'abord
  const keys = Object.keys(replacements).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    result = result.replace(new RegExp(key, 'g'), replacements[key]);
  }

  return result;
}

export const fr = {}; // Pour compatibilité avec le code existant
