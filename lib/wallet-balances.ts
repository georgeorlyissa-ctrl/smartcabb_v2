import { projectId, publicAnonKey } from '../utils/supabase/info';

/**
 * Soldes portefeuille réels (serveur). Ne JAMAIS lire smartcab_all_users :
 * sur l'appareil de l'admin cette clé est vide → soldes à 0 (données périmées).
 */
export async function getPassengerWalletBalance(passengerId: string): Promise<number> {
  try {
    const resp = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/passengers/${passengerId}/balance`,
      { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
    );
    const j = await resp.json();
    if (resp.ok && j.success) {
      return Number(j.walletBalance ?? j.balance ?? 0);
    }
  } catch (e) {
    console.warn('Solde passager:', passengerId, e);
  }
  return 0;
}

export async function getPassengerWalletBalances(passengerIds: string[]): Promise<Record<string, number>> {
  const entries = await Promise.all(
    passengerIds.map(async (id) => [id, await getPassengerWalletBalance(id)] as const)
  );
  const map: Record<string, number> = {};
  entries.forEach(([id, balance]) => { map[id] = balance; });
  return map;
}
