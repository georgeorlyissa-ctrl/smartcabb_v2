# Export des documents en PDF — SmartCabb

> **Réf.** : SEC-DOC-001 · **Date** : 28 novembre 2026
> **But** : produire des PDF propres (A4) des politiques, procédures et chartes
> pour signature, diffusion interne ou archivage.

## 1. Méthode recommandée (script fourni)

Le script `scripts/export-docs-pdf.mjs` convertit le Markdown en HTML stylé puis
utilise **Chrome ou Edge en mode headless** pour imprimer en PDF. Aucune
dépendance npm n'est nécessaire.

### Prérequis

- Node.js 18 ou plus (déjà installé pour le projet).
- Google Chrome ou Microsoft Edge installé.
- Les documents Markdown du dossier `docs/security` et `docs/quality`.

### Exporter tous les documents

```powershell
cd C:\Users\smart\OneDrive\Desktop\smartcabb_v2
node scripts/export-docs-pdf.mjs
```

Les PDF sont créés dans :

```
docs/exports/pdf/
```

### Exporter un seul document

```powershell
node scripts/export-docs-pdf.mjs docs/security/POLITIQUE_SECURITE.md
```

### Exporter plusieurs documents

```powershell
node scripts/export-docs-pdf.mjs docs/security/POLITIQUE_SECURITE.md docs/security/PLAN_GESTION_CRISE.md docs/quality/CHARTE_QUALITE_SERVICE.md
```

### Choix du navigateur

Le script détecte automatiquement Chrome ou Edge. Pour forcer un chemin :

```powershell
$env:CHROME_PATH = "C:\Program Files\Google\Chrome\Application\chrome.exe"
node scripts/export-docs-pdf.mjs
```

## 2. Vérifications après export

1. Ouvrir le PDF et vérifier la première page (titre, date, source).
2. Vérifier qu'un tableau long ne déborde pas (les lignes ne sont pas coupées).
3. Vérifier les cases à cocher (`☐` / `☑`) dans la check-list.
4. Vérifier le nombre de pages (les documents de 5–7 pages sont normaux).
5. Ne pas diffuser un PDF contenant des informations non validées.

## 3. Signature et archivage

- Imprimer, signer, scanner ; ou utiliser un outil de signature PDF
  (Adobe Acrobat, DocuSign, etc.).
- Archiver le PDF signé **hors dépôt** (OneDrive sécurisé, coffre-fort
  documentaire).
- Conserver la source Markdown dans le dépôt pour les mises à jour.
- Reporter la version et la date d'approbation dans
  `docs/security/REGISTRE_APPROBATIONS.md`.

## 4. Alternative sans script

### Option A — VS Code

1. Installer l'extension **Markdown PDF**.
2. Ouvrir le fichier `.md`.
3. `Ctrl+Shift+P` → **Markdown PDF: Export (pdf)**.
4. Choisir le dossier de sortie.

### Option B — Navigateur

1. Ouvrir le fichier HTML généré dans `docs/exports/html/` (ou convertir le
   Markdown avec un aperçu Markdown).
2. `Ctrl+P` → **Enregistrer au format PDF**.
3. Format A4, marges par défaut, graphiques d'arrière-plan activés.

### Option C — Pandoc (si installé)

```powershell
pandoc docs/security/POLITIQUE_SECURITE.md -o politique.pdf `
  --pdf-engine=wkhtmltopdf `
  -V geometry:a4paper -V geometry:margin=2cm
```

> Pandoc n'est pas installé par défaut sur ce poste ; le script Chrome reste la
> méthode la plus simple.

## 5. Sécurité

- Les PDF générés sont dans `docs/exports/`, **ignoré par Git**.
- Ne jamais inclure de mot de passe, clé API, jeton ou donnée personnelle dans
  un document destiné à la diffusion.
- Diffuser uniquement la version approuvée ; les brouillons portent la mention
  « Projet ».
- En cas de perte d'un PDF signé, régénérer depuis la source et faire
  re-signer.

## 6. Dépannage

| Symptôme | Cause | Solution |
|---|---|---|
| `PDF non généré` | Chrome/Edge introuvable | Installer Chrome/Edge ou définir `CHROME_PATH` |
| PDF vide / 1 page | Fichier Markdown vide ou chemin incorrect | Vérifier le fichier source |
| Caractères bizarres | Encodage non UTF-8 | Enregistrer le `.md` en UTF-8 |
| Tableau coupé | Ligne trop longue | Réduire le texte de la cellule ou la largeur de colonne |
| Le script échoue | Espace disque insuffisant | Libérer de l'espace (Chrome crée un profil temporaire) |
