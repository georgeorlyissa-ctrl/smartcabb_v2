import { useState } from "react";
import { projectId, publicAnonKey } from "/utils/supabase/info";

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52`;

interface DriverDebugInfo {
  id: string;
  name: string;
  status: string;
  isOnline: boolean;
  is_online: boolean;
  status_online: string;
  is_available: boolean;
  available: boolean;
  hasFcmToken: boolean;
  fcmTokenPreview: string | null;
  vehicleCategory: string;
  vehicle_category: string;
  vehicle_type: string;
  vehicleType: string;
  vehicleFromObj: string;
  balance: number;
  creditBalance: number;
  eligible: boolean;
}

export default function App() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [testRideCategory, setTestRideCategory] = useState("smart_standard");
  const [notifResult, setNotifResult] = useState<any>(null);
  const [notifLoading, setNotifLoading] = useState(false);

  const fetchDebugDrivers = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${BASE_URL}/rides/debug-drivers`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
      const data = await res.json();
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const testNotification = async () => {
    setNotifLoading(true);
    setNotifResult(null);
    try {
      const res = await fetch(`${BASE_URL}/rides/check-drivers-availability`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ vehicleCategory: testRideCategory }),
      });
      const data = await res.json();
      setNotifResult(data);
    } catch (e: any) {
      setNotifResult({ error: e.message });
    } finally {
      setNotifLoading(false);
    }
  };

  const getStatusColor = (driver: DriverDebugInfo) => {
    if (driver.eligible) return "bg-green-100 border-green-400";
    if (driver.hasFcmToken === false) return "bg-red-100 border-red-400";
    if (!driver.isOnline && !driver.is_online) return "bg-yellow-100 border-yellow-400";
    return "bg-gray-100 border-gray-300";
  };

  const getVehicleCategory = (driver: DriverDebugInfo) =>
    driver.vehicleCategory || driver.vehicle_category || driver.vehicleType || driver.vehicle_type || driver.vehicleFromObj || "❌ MANQUANT";

  const isDriverOnline = (driver: DriverDebugInfo) =>
    driver.isOnline === true || driver.is_online === true || driver.status_online === "online";

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-yellow-400 rounded-2xl p-6 mb-6 shadow">
          <h1 className="text-2xl font-bold text-black">🔍 SmartCabb — Diagnostic Push Notifications</h1>
          <p className="text-black/70 mt-1 text-sm">
            Projet : <code className="bg-black/10 px-1 rounded">{projectId}</code>
          </p>
        </div>

        {/* Section 1 : Diagnostic drivers */}
        <div className="bg-white rounded-2xl p-6 shadow mb-6">
          <h2 className="text-lg font-bold mb-4">1. État des chauffeurs dans la base KV</h2>
          <button
            onClick={fetchDebugDrivers}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "⏳ Chargement..." : "🔍 Analyser les chauffeurs"}
          </button>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-300 rounded-xl p-4 text-red-700">
              ❌ Erreur : {error}
            </div>
          )}

          {result && (
            <div className="mt-4">
              {/* Résumé */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-blue-600">{result.totalDrivers}</div>
                  <div className="text-sm text-gray-600">Total chauffeurs</div>
                </div>
                <div className={`rounded-xl p-4 text-center ${result.onlineCount > 0 ? "bg-green-50" : "bg-red-50"}`}>
                  <div className={`text-3xl font-bold ${result.onlineCount > 0 ? "text-green-600" : "text-red-600"}`}>
                    {result.onlineCount}
                  </div>
                  <div className="text-sm text-gray-600">En ligne</div>
                </div>
                <div className={`rounded-xl p-4 text-center ${result.eligibleCount > 0 ? "bg-green-50" : "bg-red-50"}`}>
                  <div className={`text-3xl font-bold ${result.eligibleCount > 0 ? "text-green-600" : "text-red-600"}`}>
                    {result.eligibleCount}
                  </div>
                  <div className="text-sm text-gray-600">Éligibles (reçoivent notifs)</div>
                </div>
              </div>

              {/* Diagnostic global */}
              {result.eligibleCount === 0 && (
                <div className="bg-red-50 border border-red-300 rounded-xl p-4 mb-4">
                  <p className="font-bold text-red-700">🚨 PROBLÈME DÉTECTÉ : 0 chauffeur éligible</p>
                  <p className="text-red-600 text-sm mt-1">
                    Aucune notification push ne peut être envoyée. Voir le détail de chaque chauffeur ci-dessous.
                  </p>
                </div>
              )}

              {/* Détail par chauffeur */}
              <div className="space-y-3">
                {result.drivers?.map((driver: DriverDebugInfo) => (
                  <div
                    key={driver.id}
                    className={`border-2 rounded-xl p-4 ${getStatusColor(driver)}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-bold text-gray-800">
                        {driver.eligible ? "✅" : "❌"} {driver.name}
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        driver.eligible ? "bg-green-500 text-white" : "bg-red-500 text-white"
                      }`}>
                        {driver.eligible ? "ÉLIGIBLE" : "NON ÉLIGIBLE"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">Status approbation :</span>{" "}
                        <span className={`font-medium ${driver.status === "approved" ? "text-green-600" : "text-red-600"}`}>
                          {driver.status || "❌ MANQUANT"}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">En ligne :</span>{" "}
                        <span className={`font-medium ${isDriverOnline(driver) ? "text-green-600" : "text-red-600"}`}>
                          {isDriverOnline(driver)
                            ? `✅ OUI (isOnline=${String(driver.isOnline)}, is_online=${String(driver.is_online)})`
                            : `❌ NON (isOnline=${String(driver.isOnline)}, is_online=${String(driver.is_online)})`}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">FCM Token :</span>{" "}
                        <span className={`font-medium ${driver.hasFcmToken ? "text-green-600" : "text-red-600"}`}>
                          {driver.hasFcmToken
                            ? `✅ Présent (${driver.fcmTokenPreview})`
                            : "❌ MANQUANT — notifications impossibles !"}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Catégorie véhicule :</span>{" "}
                        <span className={`font-medium ${getVehicleCategory(driver) !== "❌ MANQUANT" ? "text-green-600" : "text-red-600"}`}>
                          {getVehicleCategory(driver)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Disponible :</span>{" "}
                        <span className={`font-medium ${(driver.available || driver.is_available) ? "text-green-600" : "text-red-600"}`}>
                          {(driver.available || driver.is_available) ? "✅ OUI" : "❌ NON"}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Solde :</span>{" "}
                        <span className="font-medium">
                          {(driver.balance ?? driver.creditBalance ?? 0).toLocaleString()} CDF
                        </span>
                      </div>
                    </div>

                    {/* Diagnostic du problème */}
                    {!driver.eligible && (
                      <div className="mt-2 text-xs bg-white/70 rounded-lg p-2 text-red-700">
                        <strong>Problème :</strong>{" "}
                        {!driver.hasFcmToken && "❌ FCM Token manquant (le driver doit ouvrir l'app et autoriser les notifications). "}
                        {!isDriverOnline(driver) && "❌ Driver hors ligne (isOnline=false). "}
                        {!(driver.available || driver.is_available) && "❌ is_available=false. "}
                        {getVehicleCategory(driver) === "❌ MANQUANT" && "❌ vehicleCategory manquant. "}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Section 2 : Test disponibilité */}
        <div className="bg-white rounded-2xl p-6 shadow mb-6">
          <h2 className="text-lg font-bold mb-4">2. Tester la disponibilité par catégorie</h2>
          <div className="flex gap-3 items-center flex-wrap">
            <select
              value={testRideCategory}
              onChange={(e) => setTestRideCategory(e.target.value)}
              className="border rounded-xl px-4 py-2 text-sm"
            >
              <option value="smart_standard">Smart Standard</option>
              <option value="smart_comfort">Smart Confort</option>
              <option value="smart_plus">Smart Plus</option>
              <option value="smart_van">Smart Van</option>
              <option value="economic">economic</option>
              <option value="comfort">comfort</option>
              <option value="van">van</option>
            </select>
            <button
              onClick={testNotification}
              disabled={notifLoading}
              className="bg-purple-600 text-white px-6 py-2 rounded-xl font-semibold hover:bg-purple-700 disabled:opacity-50"
            >
              {notifLoading ? "⏳..." : "🚗 Tester"}
            </button>
          </div>

          {notifResult && (
            <div className={`mt-4 rounded-xl p-4 border-2 ${notifResult.available ? "bg-green-50 border-green-400" : "bg-red-50 border-red-400"}`}>
              <p className={`font-bold ${notifResult.available ? "text-green-700" : "text-red-700"}`}>
                {notifResult.available
                  ? `✅ ${notifResult.driversCount} chauffeur(s) disponible(s) pour ${testRideCategory}`
                  : `❌ Aucun chauffeur pour ${testRideCategory} (${notifResult.totalOnline ?? 0} en ligne au total)`}
              </p>
              {notifResult.alternatives?.length > 0 && (
                <p className="text-sm text-gray-600 mt-1">
                  Alternatives : {notifResult.alternatives.map((a: any) => `${a.category} (${a.count})`).join(", ")}
                </p>
              )}
              {notifResult.error && (
                <pre className="text-xs text-red-600 mt-2 overflow-auto">{JSON.stringify(notifResult, null, 2)}</pre>
              )}
            </div>
          )}
        </div>

        {/* Section 3 : Guide de résolution */}
        <div className="bg-white rounded-2xl p-6 shadow">
          <h2 className="text-lg font-bold mb-4">3. Guide de résolution</h2>
          <div className="space-y-3 text-sm">
            <div className="bg-red-50 rounded-xl p-4">
              <p className="font-bold text-red-700">❌ FCM Token manquant</p>
              <p className="text-gray-700 mt-1">
                Le driver doit <strong>ouvrir l'app driver</strong>, autoriser les notifications push,
                et se connecter. Le token se sauvegarde automatiquement au login.
              </p>
            </div>
            <div className="bg-yellow-50 rounded-xl p-4">
              <p className="font-bold text-yellow-700">⚠️ isOnline = false même après toggle</p>
              <p className="text-gray-700 mt-1">
                Déployez le nouveau <code className="bg-gray-100 px-1 rounded">driver-routes.ts</code> dans Supabase.
                L'ancien code utilisait <code className="bg-gray-100 px-1 rounded">status = 'online'</code> au lieu de <code className="bg-gray-100 px-1 rounded">isOnline = true</code>.
              </p>
            </div>
            <div className="bg-blue-50 rounded-xl p-4">
              <p className="font-bold text-blue-700">ℹ️ vehicleCategory manquant</p>
              <p className="text-gray-700 mt-1">
                Le profil du driver a été créé sans catégorie de véhicule. Mettre à jour via
                le panel admin ou appeler <code className="bg-gray-100 px-1 rounded">POST /drivers/:id/update</code> avec <code className="bg-gray-100 px-1 rounded">{"{ vehicleCategory: 'smart_standard' }"}</code>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
