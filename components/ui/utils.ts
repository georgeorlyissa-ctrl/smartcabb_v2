// ✅ VERSION STANDALONE - Pas de dépendance externe
export type ClassValue = string | number | boolean | undefined | null | ClassValue[] | { [key: string]: any };

export function cn(...inputs: ClassValue[]): string {
  const classes: string[] = [];
  
  for (const input of inputs) {
    if (!input) continue;
    
    if (typeof input === 'string' || typeof input === 'number') {
      classes.push(String(input));
    } else if (Array.isArray(input)) {
      const result = cn(...input);
      if (result) classes.push(result);
    } else if (typeof input === 'object') {
      for (const key in input) {
        if (input[key]) classes.push(key);
      }
    }
  }
  
  // Simple merge - retire les doublons en gardant les derniers
  const merged = classes.join(' ').trim();
  return merged
    .split(' ')
    .filter((v, i, arr) => arr.lastIndexOf(v) === i)
    .join(' ');
}
