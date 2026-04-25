import { useState, useEffect } from "react";
import { projectId, publicAnonKey } from "/utils/supabase/info";

const API = `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52`;

interface Stats { totalDrivers: number; totalPassengers: number; totalRides: number; completedRides: number; cancelledRides: number; activeRides: number; totalRevenueCDF: number; revenueTodayCDF: number; pendingDrivers: number; onlineDrivers: number; }
interface FeedEvent { id: string; type: string; data: any; timestamp: string; }

const EVENT_ICONS: Record<string, string> = { ride_completed:'✅', ride_cancelled:'❌', ride_started:'🚗', ride_accepted:'👍', ride_requested:'📍', config_updated:'⚙️', driver_approved:'✅', driver_rejected:'🚫' };
const EVENT_LABELS: Record<string, string> = { ride_completed:'Course terminée', ride_cancelled:'Course annulée', ride_started:'Course en cours', ride_accepted:'Course acceptée', ride_requested:'Nouvelle demande', config_updated:'Config mise à jour', driver_approved:'Conducteur approuvé', driver_rejected:'Conducteur rejeté' };
const EVENT_COLORS: Record<string, string> = { ride_completed:'#dcfce7', ride_cancelled:'#fee2e2', ride_started:'#dbeafe', ride_accepted:'#dbeafe', ride_requested:'#f3e8ff', config_updated:'#ffedd5', driver_approved:'#dcfce7', driver_rejected:'#fee2e2' };

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "À l'instant";
  if (m < 60) return `il y a ${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  return `il y a ${Math.floor(h/24)}j`;
}

function place(p: any): string {
  if (!p) return "—";
  if (typeof p === "string") return p;
  return p.name || p.address || "—";
}

function fc(n: any): string {
  const v = typeof n === "string" ? parseFloat(n) : Number(n);
  if (!v || isNaN(v)) return "—";
  return `${Math.round(v).toLocaleString("fr-FR")} FC`;
}

export default function App() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchAll = async () => {
    setError(null);
    try {
      const [sRes, fRes] = await Promise.all([
        fetch(`${API}/admin/stats`, { headers: { Authorization: `Bearer ${publicAnonKey}` } }),
        fetch(`${API}/admin/live-feed?limit=50&days=30`, { headers: { Authorization: `Bearer ${publicAnonKey}` } }),
      ]);
      const [sData, fData] = await Promise.all([sRes.json(), fRes.json()]);
      if (sData.success) setStats(sData.stats);
      else setError(`Stats: ${sData.error}`);
      if (fData.success) setEvents(fData.events || []);
      else setError(e => e ? `${e} | Feed: ${fData.error}` : `Feed: ${fData.error}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoadingStats(false);
      setLoadingFeed(false);
      setLastRefresh(new Date());
    }
  };

  useEffect(() => {
    fetchAll();
    const iv = setInterval(fetchAll, 15000);
    return () => clearInterval(iv);
  }, []);

  const KPI_CARDS = stats ? [
    { label: "Courses actives",       value: stats.activeRides,     color: "#2563EB" },
    { label: "Conducteurs en ligne",  value: `${stats.onlineDrivers}/${stats.totalDrivers}`, color: "#16A34A" },
    { label: "Revenus aujourd'hui",   value: fc(stats.revenueTodayCDF), color: "#059669" },
    { label: "Revenus totaux",        value: fc(stats.totalRevenueCDF), color: "#7C3AED" },
    { label: "Annulations auj.",      value: stats.cancelledRides,  color: "#DC2626" },
    { label: "Passagers inscrits",    value: stats.totalPassengers, color: "#0891B2" },
    { label: "Courses totales",       value: stats.totalRides,      color: "#4F46E5" },
    { label: "En attente appro.",     value: stats.pendingDrivers,  color: stats.pendingDrivers > 0 ? "#D97706" : "#9CA3AF" },
  ] : [];

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: "#F8FAFC", minHeight: "100vh", padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#111827" }}>🚖 SmartCabb — Admin Live</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6B7280" }}>
            Projet : {projectId} · Dernière MàJ : {lastRefresh.toLocaleTimeString("fr-FR")}
          </p>
        </div>
        <button onClick={fetchAll} style={{ background: "#2563EB", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          🔄 Actualiser
        </button>
      </div>

      {error && (
        <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 13, color: "#DC2626" }}>
          ⚠️ {error}
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
        {loadingStats
          ? Array(8).fill(0).map((_, i) => (
              <div key={i} style={{ background: "#E5E7EB", borderRadius: 10, height: 80, animation: "pulse 1.5s infinite" }} />
            ))
          : KPI_CARDS.map(card => (
              <div key={card.label} style={{ background: "#fff", borderRadius: 10, padding: "12px 14px", border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,.06)" }}>
                <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 4, lineHeight: 1.3 }}>{card.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: card.color }}>{card.value}</div>
              </div>
            ))
        }
      </div>

      {/* Flux activité */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB", padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#111827" }}>📡 Activité en direct</h2>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22C55E", display: "inline-block", animation: "pulse 1.5s infinite" }} />
          <span style={{ fontSize: 12, color: "#6B7280", marginLeft: "auto" }}>{events.length} événements • 30 derniers jours</span>
        </div>

        {loadingFeed && (
          <div style={{ textAlign: "center", padding: 32, color: "#9CA3AF" }}>⏳ Chargement du flux...</div>
        )}

        {!loadingFeed && events.length === 0 && (
          <div style={{ textAlign: "center", padding: 32, color: "#9CA3AF" }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📋</div>
            <div style={{ fontWeight: 600 }}>Aucune activité récente</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Les courses et annulations apparaîtront ici</div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 520, overflowY: "auto" }}>
          {events.map(ev => {
            const bg = EVENT_COLORS[ev.type] || "#F3F4F6";
            const icon = EVENT_ICONS[ev.type] || "📋";
            const label = EVENT_LABELS[ev.type] || ev.type;
            const d = ev.data || {};
            const price = fc(d.price);

            return (
              <div key={ev.id} style={{ background: bg, borderRadius: 8, padding: "10px 12px", border: `1px solid ${bg}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>{icon} {label}</span>

                    {/* Corps ride */}
                    {ev.type.startsWith("ride_") && (
                      <div style={{ marginTop: 4, fontSize: 12, color: "#4B5563" }}>
                        {(d.passengerName && d.passengerName !== "Passager") && (
                          <span style={{ fontWeight: 600, color: "#111827" }}>{d.passengerName}</span>
                        )}
                        {d.driverName && <span style={{ color: "#6B7280" }}> · {d.driverName}</span>}
                        {(d.pickup !== "—" || d.destination !== "—") && (
                          <div style={{ marginTop: 2, color: "#6B7280" }}>
                            📍 {d.pickup || "?"} → {d.destination || "?"}
                          </div>
                        )}
                        <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                          {price !== "—" && <span style={{ fontWeight: 700, color: "#111827" }}>{price}</span>}
                          {d.category && d.category !== "—" && (
                            <span style={{ background: "rgba(0,0,0,.06)", borderRadius: 4, padding: "0 6px", fontSize: 11 }}>{d.category}</span>
                          )}
                          {ev.type === "ride_cancelled" && d.cancelledBy && (
                            <span style={{ color: "#DC2626", fontSize: 11 }}>
                              annulé par {d.cancelledBy === "passenger" ? "le passager" : d.cancelledBy === "driver" ? "le conducteur" : d.cancelledBy}
                            </span>
                          )}
                          {d.cancelReason && d.cancelReason !== "Non spécifiée" && (
                            <span style={{ color: "#6B7280", fontStyle: "italic", fontSize: 11 }}>« {d.cancelReason} »</span>
                          )}
                          {d.hasPenalty && d.penaltyAmount > 0 && (
                            <span style={{ color: "#D97706", fontSize: 11, fontWeight: 600 }}>Pénalité: {fc(d.penaltyAmount)}</span>
                          )}
                          {d.distance && <span style={{ color: "#9CA3AF", fontSize: 11 }}>{typeof d.distance === "number" ? d.distance.toFixed(1) : d.distance} km</span>}
                        </div>
                      </div>
                    )}

                    {/* Config update */}
                    {ev.type === "config_updated" && (
                      <div style={{ marginTop: 4, fontSize: 12, color: "#92400E" }}>
                        {d.changedKeys?.length > 0 ? `Paramètres: ${d.changedKeys.join(", ")}` : "Configuration mise à jour"}
                        {d.configVersion && <span style={{ fontWeight: 700 }}> v{d.configVersion}</span>}
                      </div>
                    )}

                    {/* Driver events */}
                    {(ev.type === "driver_approved" || ev.type === "driver_rejected") && d.name && (
                      <div style={{ marginTop: 4, fontSize: 12, color: "#374151" }}>{d.name}{d.phone ? ` · ${d.phone}` : ""}</div>
                    )}
                  </div>
                  <span style={{ fontSize: 11, color: "#9CA3AF", whiteSpace: "nowrap", flexShrink: 0 }}>{timeAgo(ev.timestamp)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: 16, fontSize: 11, color: "#9CA3AF", textAlign: "center" }}>
        API: {API} · Rafraîchissement auto 15s
      </div>
    </div>
  );
}
