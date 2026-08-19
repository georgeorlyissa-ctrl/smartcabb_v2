# AGENTS.md

## Workflow de déploiement
- Après chaque correction ou modification de code dans ce projet, **commiter et pousser automatiquement** sur `origin/main` via : `git push origin fix/running-meter:main` (fast-forward).
- Le déploiement est automatique : Vercel (frontend) et Supabase Edge Functions (backend) se déploient depuis la branche `main`.
- Ne jamais demander confirmation à l'utilisateur pour le commit/push : c'est le comportement attendu.
- Commits en français, message descriptif du changement.

## Vérifications
- Toujours lancer `npx tsc --noEmit` avant de commiter (ignorer les erreurs pré-existantes dans `_headers/Code-component-*.tsx`).
- La branche de travail est `fix/running-meter` (toujours en avance de `origin/main`).

## Secrets / env vars Supabase
- Ne jamais commiter de secret dans le repo. Les secrets se configurent dans Supabase Dashboard → Settings → Edge Functions → Secrets.
- Secrets connus : `ADMIN_CREATION_SECRET`, `ADMIN_2FA_EMAIL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` (App Password Gmail), `AFRICAS_TALKING_WHATSAPP_WA_NUMBER`, `AFRICAS_TALKING_USERNAME`, `AFRICAS_TALKING_API_KEY`.