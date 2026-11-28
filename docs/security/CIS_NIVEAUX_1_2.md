# CIS — niveaux 1 et 2 (Controls v8.1 & Benchmarks)

> **Réf.** : SEC-CIS-001 · **Version** : 1.0 · **Date** : 28 novembre 2026
> **Propriétaire** : Direction / Admin technique · **Classification** : Interne
> **Périmètre** : `smartcabb.com`, API Supabase, base PostgreSQL, application
> Android, comptes et accès, prestataires.
> **Documents liés** : `CIS_IG1_CHECKLIST.md`, `HARDENING_CHECKLIST.md`,
> `CHECKLIST_AUDIT.md`, `SECURITY.md`.

## 1. Objet et interprétation

Le compte rendu du 24 novembre 2026 demande l'implémentation des **niveaux 1 et
2** de « CIE » et du « Hardening ». Nous interprétons :

- **CIS Controls v8.1** : les 18 contrôles, avec les **Implementation Groups**
  IG1 (hygiène de base) et IG2 (structure en croissance).
- **CIS Benchmarks** : les guides de configuration sécurisée, avec les niveaux
  **L1** (base) et **L2** (durci).

> Si « CIE » désigne un référentiel interne distinct, remplacer la section 3 par
> la grille correspondante. La méthode et la feuille de route restent valables.

## 2. Résumé exécutif

| Niveau | État au 28/11/2026 | Commentaire |
|---|---|---|
| **CIS Controls IG1** | 🟡 **7/18 complets**, 5 partiels, 4 sans objet, 2 à faire | Base solide ; voir `CIS_IG1_CHECKLIST.md`. |
| **CIS Controls IG2** | 🟡 **partiel** | Les fondamentaux techniques existent ; l'automatisation, la gouvernance et les tests manquent. |
| **CIS Benchmarks L1** | 🟡 **majoritaire** | PostgreSQL, Android et HTTP largement durcis ; quelques points à finaliser. |
| **CIS Benchmarks L2** | ❌ **faible** | Peu de mesures avancées (pinning, PAM, WAF, scans authentifiés, PITR). |

**Priorités IG2** : inventaire automatisé, gestion des vulnérabilités planifiée,
centralisation des logs, sensibilisation, test d'intrusion, exercice de crise.

## 3. CIS Controls v8.1 — état IG1 / IG2

Légende : ✅ fait · 🟡 partiel · ❌ à faire · ➖ sans objet.

| # | Contrôle | IG1 | IG2 | Preuve / action |
|---|---|---|---|---|
| 1 | Inventaire des actifs | 🟡 | 🟡 | `ASSET_INVENTORY.md` manuel ; automatiser la découverte (Vercel/Supabase/Play). |
| 2 | Inventaire des logiciels | 🟡 | 🟡 | `package-lock.json`, Dependabot ; produire un SBOM daté. |
| 3 | Protection des données | ✅ | 🟡 | RLS, TLS, buckets privés ; classifier formellement les données et documenter la rétention. |
| 4 | Configuration sécurisée | ✅ | 🟡 | Secrets hors dépôt, pas de compte par défaut ; formaliser les baselines et le contrôle de dérive. |
| 5 | Gestion des comptes | 🟡 | 🟡 | Comptes nominatifs, 1 admin ; revue trimestrielle à instaurer. |
| 6 | Gestion des accès | ✅ | 🟡 | Moindre privilège, 2FA admin ; envisager un accès privilégié juste-à-temps. |
| 7 | Gestion des vulnérabilités | 🟡 | ❌ | `npm audit`, CodeQL, ZAP ; pas de scan authentifié ni de pentest. |
| 8 | Gestion des journaux | ✅ | 🟡 | `audit_logs` 90 j ; pas de SIEM/centralisation. |
| 9 | Protection email / navigateur | ➖ | 🟡 | Pas de messagerie hébergée ; admin Gmail à protéger (2FA, anti-phishing). |
| 10 | Défenses anti-malware | ➖ | ❌ | Pas de poste géré ; installer un EDR/antivirus sur les postes admin. |
| 11 | Récupération des données | ✅ | 🟡 | Backup quotidien + test ; PITR non activé, copie hors site à formaliser. |
| 12 | Gestion du réseau | ➖ | ➖ | PaaS (Vercel/Supabase) ; documenter l'architecture et les flux. |
| 13 | Surveillance réseau | ➖ | 🟡 | Alertes applicatives ; pas de supervision réseau propre. |
| 14 | Sensibilisation | ❌ | ❌ | Aucune formation formelle ; prévoir une session annuelle + onboarding. |
| 15 | Gestion des prestataires | 🟡 | 🟡 | `SUBPROCESSORS.md` ; DPA à archiver, revue annuelle. |
| 16 | Sécurité applicative | ✅ | 🟡 | Gardes, validation, CI ; ajouter threat modeling et revue de code ciblée. |
| 17 | Réponse aux incidents | ✅ | 🟡 | Procédure ISO 27035 + fiche ; exercice à réaliser. |
| 18 | Tests d'intrusion | ❌ | ❌ | Aucun test externe ; à budgéter avant ouverture B2B. |

### 3.1 Écarts IG2 prioritaires

| Priorité | Écart | Risque | Action | Délai |
|---|---|---|---|---|
| P1 | Pas de scan de vulnérabilités authentifié | Vulnérabilité non détectée | Scan mensuel + revue ; pentest annuel | 30 j |
| P1 | Sensibilisation absente | Erreur humaine, phishing | Session annuelle + onboarding | 30 j |
| P1 | Pas d'exercice de crise | Réponse désordonnée | Tabletop semestriel | 30 j |
| P2 | Logs non centralisés | Investigation lente | Export/collecte (Loki/Grafana ou équivalent) | 60 j |
| P2 | Inventaire non automatisé | Actif oublié | Script/asset discovery + revue trimestrielle | 60 j |
| P2 | DPA fournisseurs non archivés | Risque juridique | Collecter et classer les DPA | 60 j |
| P2 | Pas de PAM / juste-à-temps | Excès de privilège | Évaluer un gestionnaire de secrets/PAM | 90 j |
| P3 | Pas de SBOM | Dépendance inconnue | Générer un SBOM à chaque release | 90 j |
| P3 | Pas de PITR | Perte de données | Décider l'activation du plan Supabase Pro | 90 j |
| P3 | Pas de WAF | Attaques applicatives | Évaluer Cloudflare/Vercel WAF | 90 j |

## 4. CIS Benchmarks — L1 / L2

### 4.1 PostgreSQL / Supabase

| Mesure | L1 | L2 | État | Action |
|---|---|---|---|---|
| RLS activée sur les tables sensibles | ✅ | ✅ | ✅ | Maintenir et tester |
| Aucune fonction exécutable par `anon` | ✅ | ✅ | ✅ | Revue à chaque migration |
| `service_role` réservé au serveur | ✅ | ✅ | ✅ | Ne jamais exposer côté client |
| SSL obligatoire | ✅ | ✅ | ✅ | Fourni par Supabase |
| Rôles et privilèges minimaux | ✅ | ✅ | ✅ | Revue trimestrielle |
| Extensions non utilisées retirées | ✅ | ✅ | 🟡 | Vérifier `Database → Extensions` |
| Journalisation des actions sensibles | ✅ | ✅ | ✅ | `audit_logs`, purge 90 j |
| Limites de connexion / ressources | 🟡 | ✅ | 🟡 | Vérifier les réglages Supabase |
| Chiffrement au repos | ✅ | ✅ | ✅ | Fourni par Supabase |
| PITR / restauration à la minute | ➖ | ✅ | ❌ | Décider le plan Pro |
| Revue des rôles et des grants | ✅ | ✅ | 🟡 | Automatiser un contrôle mensuel |

### 4.2 Android / Play Store

| Mesure | L1 | L2 | État | Action |
|---|---|---|---|---|
| `allowBackup=false` | ✅ | ✅ | ✅ (source) | Embarquer dans la prochaine AAB |
| `usesCleartextTraffic=false` | ✅ | ✅ | ✅ (source) | Idem |
| Activités exportées limitées | ✅ | ✅ | ✅ | Maintenir |
| Permissions minimales | ✅ | ✅ | 🟡 | Justifier `READ_CONTACTS` |
| Signature release + keystore hors dépôt | ✅ | ✅ | ✅ | Sauvegarder le keystore |
| Débogage WebView désactivé | ✅ | ✅ | ✅ | Vérifier chaque release |
| Épinglage de certificat | ➖ | ✅ | ❌ | Évaluer (rotation contraignante) |
| Détection de root / intégrité | ➖ | ✅ | ❌ | Évaluer selon le risque |
| Obfuscation / R8 | 🟡 | ✅ | 🟡 | Vérifier la configuration release |
| Stockage sécurisé des jetons | ✅ | ✅ | 🟡 | Le jeton est en `localStorage` WebView ; envisager un stockage natif chiffré |

### 4.3 Web / HTTP (Vercel)

| Mesure | L1 | L2 | État | Action |
|---|---|---|---|---|
| HTTPS + HSTS | ✅ | ✅ | ✅ | Maintenir |
| CSP stricte | ✅ | ✅ | ✅ | Revue à chaque ajout de script |
| `X-Frame-Options: DENY` | ✅ | ✅ | ✅ | Maintenir |
| `nosniff`, `Referrer-Policy` | ✅ | ✅ | ✅ | Maintenir |
| `Permissions-Policy` | ✅ | ✅ | ✅ | Maintenir |
| TLS moderne | ✅ | ✅ | ✅ | Vercel |
| COOP/COEP/CORP | ➖ | ✅ | 🟡 | Évaluer |
| HSTS preload | ➖ | ✅ | ❌ | Soumettre le domaine |
| WAF / rate limiting edge | ➖ | ✅ | ❌ | Évaluer Cloudflare/Vercel WAF |
| Certificate Transparency | ➖ | ✅ | 🟡 | Surveiller les certificats |

### 4.4 Comptes et accès

| Mesure | L1 | L2 | État | Action |
|---|---|---|---|---|
| Comptes nominatifs | ✅ | ✅ | ✅ | Maintenir |
| 2FA admin applicative | ✅ | ✅ | ✅ | Maintenir |
| 2FA plateformes | ✅ | ✅ | ✅ | Supabase, Vercel, GitHub et Play Console protégés |
| Revue trimestrielle | ✅ | ✅ | 🟡 | Première revue formelle à faire |
| Gestionnaire de mots de passe | ✅ | ✅ | ❌ | Mettre en place |
| Accès privilégié juste-à-temps | ➖ | ✅ | ❌ | Évaluer |
| Clés matérielles (FIDO2) | ➖ | ✅ | ❌ | Recommandé pour l'admin unique |

## 5. Feuille de route

### 30 jours

1. Former l'équipe (sécurité, qualité, check-list terrain).
2. Réaliser un exercice de crise tabletop.
3. Lancer un scan de vulnérabilités (ZAP + revue des dépendances).
4. Archiver les DPA Supabase, Vercel, EJ SMS, Ejpay, Google.
5. Finaliser la restriction de la clé Google Maps.
6. Mettre à jour l'inventaire des actifs (AAB, comptes, fournisseurs).

### 60 jours

1. Centraliser les logs (collecte et rétention).
2. Automatiser l'inventaire (script de découverte).
3. Mettre en place la revue trimestrielle des accès.
4. Formaliser la classification des données et la rétention.
5. Mettre en place un gestionnaire de mots de passe.

### 90 jours

1. Pentest externe ou revue de code ciblée.
2. Décider PITR, WAF, PAM.
3. Générer un SBOM par release.
4. Audit interne blanc CIS IG2.
5. Revue de direction et mise à jour de la feuille de route.

## 6. Preuves et suivi

| Preuve | Emplacement |
|---|---|
| État IG1 | `CIS_IG1_CHECKLIST.md` |
| Durcissement détaillé | `HARDENING_CHECKLIST.md` |
| Audit sécurité | `CHECKLIST_AUDIT.md` |
| Journalisation | `LOG_POLICY.md` |
| Accès | `ACCESS_REVIEW.md` |
| Fournisseurs | `SUBPROCESSORS.md` |
| Incidents | `PROCEDURE_INCIDENTS_ISO_27035.md` |
| Exercices | Comptes rendus dans `docs/security/` |

## 7. Limites

- SmartCabb utilise des services managés : une partie des Benchmarks système
  (noyau, SSH, pare-feu) est gérée par Supabase/Vercel.
- Ce document n'est pas une certification CIS. Il décrit une démarche
  d'amélioration continue.
- Les statuts doivent être réévalués à chaque revue trimestrielle.

## 8. Approbation

| Rôle | Nom | Date | Signature |
|---|---|---|---|
| Rédigé par | Admin/Sécurité | 28/11/2026 | |
| Vérifié par | Direction | | |
| Approuvé par | Direction | | |
