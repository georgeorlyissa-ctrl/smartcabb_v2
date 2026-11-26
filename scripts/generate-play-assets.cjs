const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const root = 'C:/Users/smart/OneDrive/Desktop/smartcabb_v2';
const logoPath = path.join(root, 'public/logo-smartcabb.jpeg');
const outDir = path.join(root, 'docs/play-store');

fs.mkdirSync(outDir, { recursive: true });

const logoB64 = fs.readFileSync(logoPath).toString('base64');

const NAVY = '#001B3D';
const BLUE = '#007AFF';
const YELLOW = '#FFCC00';
const ICE = '#7CC4FF';

/* -------------------------------------------------------------------------- */
/*  Icône 512 × 512                                                          */
/* -------------------------------------------------------------------------- */

const iconSvg = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#000E1F"/>
      <stop offset="0.45" stop-color="${NAVY}"/>
      <stop offset="1" stop-color="#004A8F"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.82" cy="0.12" r="0.75">
      <stop offset="0" stop-color="${BLUE}" stop-opacity="0.55"/>
      <stop offset="1" stop-color="${BLUE}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowy" cx="0.12" cy="0.92" r="0.65">
      <stop offset="0" stop-color="${YELLOW}" stop-opacity="0.20"/>
      <stop offset="1" stop-color="${YELLOW}" stop-opacity="0"/>
    </radialGradient>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#000000" flood-opacity="0.45"/>
    </filter>
    <clipPath id="tile">
      <rect x="86" y="86" width="340" height="340" rx="80"/>
    </clipPath>
  </defs>

  <rect width="512" height="512" fill="url(#bg)"/>
  <rect width="512" height="512" fill="url(#glow)"/>
  <rect width="512" height="512" fill="url(#glowy)"/>

  <g filter="url(#shadow)">
    <rect x="86" y="86" width="340" height="340" rx="80" fill="#ffffff"/>
    <!-- l'image remplit la tuile : ses bords blancs se fondent dans la tuile -->
    <image x="86" y="86" width="340" height="340" preserveAspectRatio="xMidYMid slice"
           clip-path="url(#tile)" xlink:href="data:image/jpeg;base64,${logoB64}"/>
  </g>
</svg>`;

/* -------------------------------------------------------------------------- */
/*  Bannière 1024 × 500                                                      */
/* -------------------------------------------------------------------------- */

const featureSvg = `
<svg width="1024" height="500" viewBox="0 0 1024 500" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <linearGradient id="fbg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#000E1F"/>
      <stop offset="0.4" stop-color="${NAVY}"/>
      <stop offset="0.75" stop-color="#00305E"/>
      <stop offset="1" stop-color="#004A8F"/>
    </linearGradient>
    <radialGradient id="fglow" cx="0.88" cy="0.1" r="0.75">
      <stop offset="0" stop-color="${BLUE}" stop-opacity="0.45"/>
      <stop offset="1" stop-color="${BLUE}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="fglowy" cx="0.08" cy="1" r="0.7">
      <stop offset="0" stop-color="${YELLOW}" stop-opacity="0.20"/>
      <stop offset="1" stop-color="${YELLOW}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="line" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${BLUE}"/>
      <stop offset="0.6" stop-color="${BLUE}"/>
      <stop offset="1" stop-color="${YELLOW}"/>
    </linearGradient>
    <filter id="fshadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#000000" flood-opacity="0.5"/>
    </filter>
    <clipPath id="ftile">
      <rect x="76" y="78" width="96" height="96" rx="24"/>
    </clipPath>
  </defs>

  <rect width="1024" height="500" fill="url(#fbg)"/>
  <rect width="1024" height="500" fill="url(#fglow)"/>
  <rect width="1024" height="500" fill="url(#fglowy)"/>

  <!-- trame discrète -->
  <g opacity="0.05" stroke="#ffffff" stroke-width="1">
    ${Array.from({ length: 17 }, (_, i) => `<line x1="${i * 64}" y1="0" x2="${i * 64}" y2="500"/>`).join('')}
    ${Array.from({ length: 8 }, (_, i) => `<line x1="0" y1="${i * 64}" x2="1024" y2="${i * 64}"/>`).join('')}
  </g>

  <!-- motif itinéraire (droite) -->
  <g opacity="0.9">
    <circle cx="846" cy="252" r="150" fill="none" stroke="${ICE}" stroke-opacity="0.10" stroke-width="1.5"/>
    <circle cx="846" cy="252" r="112" fill="none" stroke="${ICE}" stroke-opacity="0.07" stroke-width="1.5"/>
    <path d="M 742 168 C 812 150, 892 216, 884 286 S 918 356, 952 372"
          fill="none" stroke="${ICE}" stroke-opacity="0.45" stroke-width="3"
          stroke-linecap="round" stroke-dasharray="9 10"/>
    <!-- départ -->
    <circle cx="742" cy="168" r="13" fill="${YELLOW}" fill-opacity="0.18"/>
    <circle cx="742" cy="168" r="7" fill="${YELLOW}"/>
    <!-- arrivée -->
    <circle cx="952" cy="372" r="16" fill="${BLUE}" fill-opacity="0.18"/>
    <circle cx="952" cy="372" r="9" fill="${BLUE}"/>
    <circle cx="952" cy="372" r="3.5" fill="#ffffff"/>
  </g>

  <!-- logo -->
  <g filter="url(#fshadow)">
    <rect x="76" y="78" width="96" height="96" rx="24" fill="#ffffff"/>
    <image x="76" y="78" width="96" height="96" preserveAspectRatio="xMidYMid slice"
           clip-path="url(#ftile)" xlink:href="data:image/jpeg;base64,${logoB64}"/>
  </g>

  <!-- marque -->
  <text x="196" y="128" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="34" font-weight="700" letter-spacing="-0.5">
    <tspan fill="#ffffff">Smart</tspan><tspan fill="${YELLOW}">Cabb</tspan>
  </text>
  <text x="198" y="154" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="11" font-weight="600"
        letter-spacing="4.2" fill="${ICE}" opacity="0.85">RIDE SMART · LIVE SMART</text>

  <!-- accroche -->
  <text x="76" y="268" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="46" font-weight="800"
        letter-spacing="-1.2" fill="#ffffff">Votre chauffeur privé</text>
  <text x="76" y="322" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="46" font-weight="800"
        letter-spacing="-1.2" fill="#ffffff">à <tspan fill="${YELLOW}">Kinshasa</tspan></text>

  <!-- arguments -->
  <text x="76" y="376" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="17" font-weight="500"
        fill="#ffffff" opacity="0.75">Prix affiché à l'avance  ·  Chauffeurs vérifiés  ·  Suivi en direct  ·  SOS 24/7</text>

  <!-- signature adresse -->
  <text x="76" y="426" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="13" font-weight="600"
        fill="${ICE}" opacity="0.6">63, Avenue Colonel MONDJIBA · C/ Ngaliema · Kinshasa</text>

  <!-- liseré bas -->
  <rect x="0" y="494" width="1024" height="6" fill="url(#line)"/>
</svg>`;

(async () => {
  const iconOut = path.join(outDir, 'icon-512.png');
  const featureOut = path.join(outDir, 'feature-graphic-1024x500.png');

  await sharp(Buffer.from(iconSvg)).png({ compressionLevel: 9 }).toFile(iconOut);
  await sharp(Buffer.from(featureSvg)).png({ compressionLevel: 9 }).toFile(featureOut);

  const i = await sharp(iconOut).metadata();
  const f = await sharp(featureOut).metadata();
  console.log('icône:', i.width + 'x' + i.height, fs.statSync(iconOut).size, 'octets');
  console.log('bannière:', f.width + 'x' + f.height, fs.statSync(featureOut).size, 'octets');
})();
