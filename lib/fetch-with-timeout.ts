/**
 * Fetch avec timeout automatique
 * Évite les timeouts de 30+ secondes
 */

export interface FetchWithTimeoutOptions extends RequestInit {
  timeout?: number; // En millisecondes (défaut: 5000ms = 5s)
}

/**
 * Fait un fetch avec timeout automatique
 * @param url - URL à appeler
 * @param options - Options de fetch + timeout optionnel
 * @returns Promise<Response>
 */
export async function fetchWithTimeout(
  url: string,
  options: FetchWithTimeoutOptions = {}
): Promise<Response> {
  const { timeout = 5000, ...fetchOptions } = options;

  // Créer un AbortController pour gérer le timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);

    // Si c'est une erreur d'abort, c'est un timeout
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(
        `Request timeout after ${timeout}ms. The server is not responding. Please check your connection or try again later.`
      );
    }

    // Sinon, relancer l'erreur originale
    throw error;
  }
}

/**
 * Fait un fetch avec retry automatique
 * @param url - URL à appeler
 * @param options - Options de fetch
 * @param maxRetries - Nombre maximum de tentatives (défaut: 3)
 * @returns Promise<Response>
 */
export async function fetchWithRetry(
  url: string,
  options: FetchWithTimeoutOptions = {},
  maxRetries: number = 3
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Attempt ${attempt}/${maxRetries} for ${url}`);
      const response = await fetchWithTimeout(url, options);

      // Si succès, retourner
      if (response.ok) {
        console.log(`✅ Success on attempt ${attempt}`);
        return response;
      }

      // Si erreur serveur (5xx), réessayer
      if (response.status >= 500) {
        console.warn(`⚠️ Server error ${response.status}, retrying...`);
        lastError = new Error(`Server error: ${response.status}`);
        
        // Attendre un peu avant de réessayer (exponential backoff)
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        continue;
      }

      // Si erreur client (4xx), ne pas réessayer
      console.error(`❌ Client error ${response.status}, not retrying`);
      return response;
    } catch (error) {
      console.error(`❌ Attempt ${attempt} failed:`, error);
      lastError = error instanceof Error ? error : new Error('Unknown error');

      // Si c'est un timeout et qu'il reste des tentatives, réessayer
      if (attempt < maxRetries && lastError.message.includes('timeout')) {
        console.log(`⏳ Timeout, retrying...`);
        continue;
      }

      // Si c'est une autre erreur ou plus de tentatives, arrêter
      if (attempt >= maxRetries) {
        break;
      }
    }
  }

  // Si on arrive ici, toutes les tentatives ont échoué
  throw lastError || new Error('All retry attempts failed');
}

/**
 * Exemple d'utilisation :
 * 
 * // Avec timeout personnalisé
 * const response = await fetchWithTimeout('https://api.example.com/data', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify(data),
 *   timeout: 10000 // 10 secondes
 * });
 * 
 * // Avec retry
 * const response = await fetchWithRetry('https://api.example.com/data', {
 *   method: 'GET',
 *   timeout: 3000
 * }, 3); // 3 tentatives max
 */
