import * as kv from "./kv-wrapper.ts";

export async function checkDriverAvailability(driverId: string): Promise<boolean> {
  const driver = await kv.get<any>(`driver:${driverId}`);
  if (!driver) return false;
  
  return driver.status === 'online' && (driver.balance || 0) >= 0;
}

export async function getOnlineDriversCount(vehicleCategory?: string): Promise<number> {
  const allDrivers = await kv.getByPrefix<any>('driver:');
  const online = allDrivers.filter(d => {
    if (d.status !== 'online') return false;
    if ((d.balance || 0) < 0) return false;
    if (vehicleCategory && d.vehicleCategory !== vehicleCategory) return false;
    return true;
  });
  return online.length;
}
