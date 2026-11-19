/**
 * 📍 Icônes des cartes OpenStreetMap (Leaflet) — source unique.
 *
 *  - passager / point de départ  → BONHOMME (silhouette de personne) ;
 *  - conducteur connecté         → voiture + prénom ;
 *  - destination                 → épingle rouge ;
 *  - véhicule suivi en course    → voiture sur fond vert ;
 *  - marqueur générique          → pastille neutre (jamais une voiture).
 *
 * Utilisé par `OpenStreetMapView` (repli quand Google Maps est indisponible)
 * et par `SearchingDriversMap` (écran de recherche de chauffeur).
 */

import L from 'leaflet';

const STYLE_ID = 'smartcabb-map-marker-styles';

const CSS = `
.smc-icon { background: transparent !important; border: 0 !important; }

/* ── Passager : bonhomme ─────────────────────────────────────── */
.smc-pax { position: relative; width: 46px; height: 46px; }
.smc-pax-halo {
  position: absolute; left: 50%; top: 50%; width: 46px; height: 46px;
  transform: translate(-50%, -50%); border-radius: 9999px;
  background: radial-gradient(circle, rgba(0,152,255,.45) 0%, rgba(0,152,255,0) 70%);
  animation: smc-pulse 2.6s ease-out infinite;
}
@keyframes smc-pulse {
  0%   { transform: translate(-50%, -50%) scale(.55); opacity: .85; }
  70%  { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
  100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
}
.smc-pax-pin {
  position: absolute; left: 50%; top: 50%; width: 32px; height: 32px;
  transform: translate(-50%, -50%); border-radius: 9999px;
  background: linear-gradient(160deg, #33A9FF 0%, #0077D6 100%);
  border: 3px solid #FFFFFF; box-shadow: 0 3px 10px rgba(0, 61, 122, .40);
  display: flex; align-items: center; justify-content: center;
}
.smc-pax-pin svg { display: block; }

/* ── Conducteur : voiture + prénom ───────────────────────────── */
.smc-drv { position: relative; width: 34px; height: 34px; }
.smc-drv-pin {
  width: 34px; height: 34px; border-radius: 9999px; background: #FFFFFF;
  border: 2px solid #0098FF; box-shadow: 0 3px 10px rgba(0, 61, 122, .30);
  display: flex; align-items: center; justify-content: center;
}
.smc-drv-pin svg { display: block; }
.smc-drv.is-busy .smc-drv-pin { border-color: #94A3B8; opacity: .85; }
.smc-drv-name {
  position: absolute; top: 37px; left: 50%; transform: translateX(-50%);
  white-space: nowrap; max-width: 96px; overflow: hidden; text-overflow: ellipsis;
  font: 600 10px/1.2 system-ui, -apple-system, "Segoe UI", sans-serif;
  color: #0B3B63; background: rgba(255,255,255,.95);
  padding: 2px 6px; border-radius: 9999px; box-shadow: 0 1px 4px rgba(0,0,0,.18);
}

/* ── Destination : épingle ───────────────────────────────────── */
.smc-dest { width: 30px; height: 40px; filter: drop-shadow(0 3px 4px rgba(0,0,0,.35)); }
.smc-dest svg { display: block; }

/* ── Véhicule suivi ──────────────────────────────────────────── */
.smc-veh {
  width: 40px; height: 40px; border-radius: 9999px;
  background: linear-gradient(160deg, #22C55E 0%, #15803D 100%);
  border: 3px solid #FFFFFF; box-shadow: 0 3px 10px rgba(0, 0, 0, .35);
  display: flex; align-items: center; justify-content: center;
}
.smc-veh svg { display: block; }

/* ── Générique ───────────────────────────────────────────────── */
.smc-dot {
  width: 14px; height: 14px; border-radius: 9999px; background: #64748B;
  border: 2px solid #FFFFFF; box-shadow: 0 1px 4px rgba(0,0,0,.4);
}
`;

/** Injecte la feuille de style des marqueurs (une seule fois). */
export function ensureMapMarkerStyles(): void {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = CSS;
  document.head.appendChild(el);
}

const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const PERSON_SVG = `
<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
  <circle cx="12" cy="7.5" r="3.9" fill="#FFFFFF"/>
  <path d="M4.2 21c0-4.3 3.5-7.8 7.8-7.8s7.8 3.5 7.8 7.8z" fill="#FFFFFF"/>
</svg>`;

const carSvg = (body: string, glass: string, wheel: string, size: number): string => `
<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true">
  <path d="M5 16.2V13l1.7-4.1c.3-.8 1-1.3 1.9-1.3h6.8c.9 0 1.6.5 1.9 1.3L19 13v3.2c0 .6-.4 1-1 1h-.4c-.6 0-1-.4-1-1v-.6H7.4v.6c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1z" fill="${body}"/>
  <path d="M7.4 12.2l1.2-2.9h6.8l1.2 2.9H7.4z" fill="${glass}"/>
  <circle cx="7.6" cy="14.2" r="1" fill="${wheel}"/>
  <circle cx="16.4" cy="14.2" r="1" fill="${wheel}"/>
</svg>`;

const PIN_SVG = `
<svg viewBox="0 0 30 40" width="30" height="40" aria-hidden="true">
  <path d="M15 1C7.8 1 2 6.7 2 13.8 2 23.4 15 39 15 39s13-15.6 13-25.2C28 6.7 22.2 1 15 1z" fill="#EF4444" stroke="#FFFFFF" stroke-width="2.5"/>
  <circle cx="15" cy="13.5" r="4.6" fill="#FFFFFF"/>
</svg>`;

const makeIcon = (html: string, size: [number, number], anchor: [number, number]): any => {
  const Leaflet: any = L as any;
  return Leaflet.divIcon({ html, className: 'smc-icon', iconSize: size, iconAnchor: anchor });
};

/** Passager / point de départ : BONHOMME. Ancre = centre du rond. */
export function passengerIcon(): any {
  ensureMapMarkerStyles();
  return makeIcon(
    `<div class="smc-pax"><span class="smc-pax-halo"></span><span class="smc-pax-pin">${PERSON_SVG}</span></div>`,
    [46, 46],
    [23, 23],
  );
}

/** Conducteur connecté : voiture + prénom ; grisé s'il est déjà en course. */
export function driverIcon(name?: string, available = true): any {
  ensureMapMarkerStyles();
  const firstName = escapeHtml(String(name || 'Chauffeur').trim().split(/\s+/)[0] || 'Chauffeur');
  return makeIcon(
    `<div class="smc-drv ${available ? '' : 'is-busy'}">` +
      `<div class="smc-drv-pin">${carSvg('#0098FF', '#EAF7FF', '#0B3B63', 22)}</div>` +
      `<div class="smc-drv-name">${firstName}</div>` +
    `</div>`,
    [34, 34],
    [17, 17],
  );
}

/** Destination : épingle rouge. Ancre = pointe de l'épingle. */
export function destinationIcon(): any {
  ensureMapMarkerStyles();
  return makeIcon(`<div class="smc-dest">${PIN_SVG}</div>`, [30, 40], [15, 38]);
}

/** Véhicule suivi pendant la course : voiture blanche sur fond vert. */
export function vehicleIcon(): any {
  ensureMapMarkerStyles();
  return makeIcon(
    `<div class="smc-veh">${carSvg('#FFFFFF', '#15803D', '#14532D', 26)}</div>`,
    [40, 40],
    [20, 20],
  );
}

/** Marqueur générique : simple pastille (jamais une voiture). */
export function genericIcon(): any {
  ensureMapMarkerStyles();
  return makeIcon('<div class="smc-dot"></div>', [14, 14], [7, 7]);
}
