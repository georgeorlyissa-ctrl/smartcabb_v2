/**
 * Wrapper pour kv_store avec gestion améliorée des erreurs et retry automatique
 * Détecte les erreurs de service indisponible (Cloudflare SSL 525/520, etc.)
 * Retry automatique avec backoff exponentiel pour résilience maximale
 */

import * as kv from "./kv_store.tsx";

// Vérifier si une erreur est due à un service indisponible
function isServiceUnavailableError(error: any): boolean {
  if (!error) return false;
  
  const message = error.message || error.toString();
  return message.includes('<!DOCTYPE html>') ||

         message.includes('<html>') ||
         message.includes('Cloudflare') ||
         message.includes('SSL handshake failed') ||
         message.includes('Error code 525') ||
         message.includes('Error code 520') ||
         message.includes('500 Internal Server Error') ||
         message.includes('Temporarily unavailable') ||
         message.includes('Error 1105');
}

// Fonction de retry avec backoff exponentiel
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 500
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isLastAttempt = attempt === maxRetries;
      const isUnavailable = isServiceUnavailableError(error);
      
      if (!isUnavailable || isLastAttempt) {
        throw error;
      }
      
      // Backoff exponentiel : 500ms, 1000ms, 2000ms
      const delay = baseDelay * Math.pow(2, attempt);
      console.warn(`⚠️ Tentative ${attempt + 1}/${maxRetries + 1} échouée, nouvelle tentative dans ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('Nombre maximum de tentatives atteint');
}

// Wrapper pour get avec gestion des erreurs
export async function get(key: string): Promise<any> {
  return await retryWithBackoff(() => kv.get(key));
}

// Wrapper pour set avec gestion des erreurs
export async function set(key: string, value: any): Promise<void> {
  return await retryWithBackoff(() => kv.set(key, value));
}

// Wrapper pour del avec gestion des erreurs
export async function del(key: string): Promise<void> {
  return await retryWithBackoff(() => kv.del(key));
}

// Wrapper pour mget avec gestion des erreurs
export async function mget(keys: string[]): Promise<any[]> {
  return await retryWithBackoff(() => kv.mget(keys));
}

// Wrapper pour mset avec gestion des erreurs
export async function mset(keys: string[], values: any[]): Promise<void> {
  return await retryWithBackoff(() => kv.mset(keys, values));
}

// Wrapper pour mdel avec gestion des erreurs
export async function mdel(keys: string[]): Promise<void> {
  return await retryWithBackoff(() => kv.mdel(keys));
}

// Wrapper pour getByPrefix avec gestion des erreurs
export async function getByPrefix(prefix: string): Promise<any[]> {
  return await retryWithBackoff(() => kv.getByPrefix(prefix));
}