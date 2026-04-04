import * as kvStore from "./kv_store.tsx";

/**
 * Wrapper autour du KV store pour gérer les erreurs de connexion
 */

export async function get<T>(key: string): Promise<T | null> {
  try {
    return await kvStore.get<T>(key);
  } catch (error) {
    console.error(`KV get error for key ${key}:`, error);
    return null;
  }
}

export async function set<T>(key: string, value: T): Promise<void> {
  try {
    await kvStore.set(key, value);
  } catch (error) {
    console.error(`KV set error for key ${key}:`, error);
    throw error;
  }
}

export async function del(key: string): Promise<void> {
  try {
    await kvStore.del(key);
  } catch (error) {
    console.error(`KV del error for key ${key}:`, error);
    throw error;
  }
}

export async function mget<T>(keys: string[]): Promise<(T | null)[]> {
  try {
    return await kvStore.mget<T>(keys);
  } catch (error) {
    console.error(`KV mget error for keys ${keys}:`, error);
    return keys.map(() => null);
  }
}

export async function mset<T>(entries: Record<string, T>): Promise<void> {
  try {
    await kvStore.mset(entries);
  } catch (error) {
    console.error(`KV mset error:`, error);
    throw error;
  }
}

export async function mdel(keys: string[]): Promise<void> {
  try {
    await kvStore.mdel(keys);
  } catch (error) {
    console.error(`KV mdel error for keys ${keys}:`, error);
    throw error;
  }
}

export async function getByPrefix<T>(prefix: string): Promise<T[]> {
  try {
    return await kvStore.getByPrefix<T>(prefix);
  } catch (error) {
    console.error(`KV getByPrefix error for prefix ${prefix}:`, error);
    return [];
  }
}
