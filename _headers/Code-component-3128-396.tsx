# ✅ Headers pour SmartCabb en production
# Compatible avec Netlify et Vercel

/*
  # CORS Headers
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
  Access-Control-Allow-Headers: Content-Type, Authorization
  
  # Security Headers
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin
  
  # Permissions Policy
  Permissions-Policy: geolocation=*, camera=*, microphone=*, payment=*
  
  # Cache Control (pas de cache pour éviter les erreurs SSR)
  Cache-Control: no-cache, no-store, must-revalidate
  Pragma: no-cache
  Expires: 0
  
  # Content Security Policy
  Content-Security-Policy: default-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https: blob:; font-src 'self' data: https:; connect-src 'self' https: wss:; frame-src 'self' https:;

/admin/*
  # Headers spécifiques pour le panel admin
  X-Robots-Tag: noindex, nofollow
  Cache-Control: no-cache, no-store, must-revalidate, private

/api/*
  # Headers pour les routes API
  Content-Type: application/json
  Cache-Control: no-cache, no-store, must-revalidate
  
/*.js
  # Cache pour les fichiers JavaScript (1 heure)
  Cache-Control: public, max-age=3600, immutable
  
/*.css
  # Cache pour les fichiers CSS (1 heure)
  Cache-Control: public, max-age=3600, immutable
  
/*.png
  # Cache pour les images (7 jours)
  Cache-Control: public, max-age=604800, immutable
  
/*.jpg
  # Cache pour les images (7 jours)
  Cache-Control: public, max-age=604800, immutable
  
/*.svg
  # Cache pour les SVG (7 jours)
  Cache-Control: public, max-age=604800, immutable
  
/*.woff2
  # Cache pour les fonts (1 an)
  Cache-Control: public, max-age=31536000, immutable
