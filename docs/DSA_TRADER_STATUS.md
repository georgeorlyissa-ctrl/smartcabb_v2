# DSA — Déclaration du statut « trader » (Google Play)

> **Échéance : 1er février 2027** (tous les comptes développeur, partout dans le monde).
> **Rappel conseillé : 1er janvier 2027** → mettre un événement dans Google Agenda dès maintenant.
> Document créé le 18/11/2026 — commit `chore(docs): checklist DSA trader status`.

---

## 1. Pourquoi c'est obligatoire

Le règlement européen **DSA** (Digital Services Act) impose aux stores d'afficher les
coordonnées des développeurs **professionnels**. Google a étendu l'obligation :

- **Tous** les comptes développeur Google Play actifs doivent déclarer leur statut
  (`trader` = professionnel / `non-trader` = particulier), **où que l'app soit distribuée**.
- **Date limite : 1er février 2027.**
- Si la déclaration n'est pas faite : **blocage des mises à jour de l'app**, puis
  **retrait possible du Play Store au niveau mondial**.
- À partir du **1er mars 2027**, les coordonnées déclarées sont **publiques** sur la fiche
  Play Store (e-mail, téléphone, adresse ; D-U-N-S dans « Assistance app », lien CGU).

Référence officielle :
https://support.google.com/googleplay/android-developer/answer/17594752

---

## 2. Statut retenu pour SmartCabb : **TRADER (professionnel)**

SmartCabb est une activité commerciale (transport/VTC payant, structure d'entreprise).
Une app gratuite peut être commerciale : Google regarde **l'activité** (but lucratif,
volume de transactions, organisation en entreprise, statut juridique).

> ⚠️ **Ne jamais déclarer « non-trader ».** Se déclarer particulier pour éviter l'affichage
> des coordonnées est une fausse déclaration → suspension possible du compte **mondialement**.

---

## 3. Informations à préparer

| Élément | Valeur à utiliser |
|---|---|
| Nom légal | Nom de la société (ou nom du propriétaire si compte individuel) |
| E-mail professionnel | `support@smartcabb.com` (pas un Gmail personnel) |
| Téléphone professionnel | `0960624008` (ligne support) |
| Adresse postale | Adresse **professionnelle réelle** à Kinshasa (bureau, pas le domicile) |
| D-U-N-S | Uniquement si le compte est une **organisation** (le numéro sera affiché) |
| CGU / ToS | `https://www.smartcabb.com/terms` (pages `/legal` et `/privacy` également en ligne) |

Ces informations doivent être **exactes et joignables** : Google peut les vérifier, et une
adresse fictive expose au retrait de l'app.

---

## 4. Procédure (≈ 10 min, aucun document à téléverser)

### Étape A — niveau compte (obligatoire, propriétaire du compte uniquement)

1. Se connecter au Play Console avec le **compte propriétaire** (le bouton reste grisé pour les autres).
2. Bannière **« Declare your trader status » → View details**
   *(ou : **Manage account → Account details → About you**)*.
3. Section « Trader status » → **Declare your trader status**.
4. Choisir **« Yes, I am a trader »** (« Il s'agit d'un compte professionnel ») → **Next**.
5. Vérifier / compléter les coordonnées affichées.
6. Cocher les **deux cases** d'auto-certification :
   - engagement à ne proposer que des produits/services conformes aux lois applicables ;
   - exactitude des informations.
7. **Save** → message « Trader status saved », la bannière disparaît.

### Étape B — niveau application (SmartCabb)

1. Sélectionner l'app **SmartCabb**.
2. **Monitor and improve → Policy and programs → App content**.
3. Section **« Trader status and Terms of Service » → Start declaration**.
4. Confirmer que le statut trader s'applique à cette app.
5. Coller l'URL des CGU : `https://www.smartcabb.com/terms` → **Save**.
6. En haut à droite : **Save / Submit**.

> ❌ Ne pas cliquer « Enable managed publishing » sur cet écran : cela retarderait les publications.

---

## 5. Checklist

- [ ] Événement « Déclarer le statut trader Google Play » au **1er janvier 2027** dans l'agenda
- [ ] Vérifier que l'adresse e-mail du compte propriétaire est toujours accessible (Google envoie des rappels)
- [ ] Confirmer les coordonnées professionnelles (e-mail, téléphone, adresse)
- [ ] Étape A (compte) — statut = **Trader**
- [ ] Étape B (app SmartCabb) — confirmation + URL des CGU
- [ ] Vérifier que la bannière a disparu du Play Console

---

## 6. Notes

- Cette déclaration est **indépendante** du test interne et de la diffusion en RDC : elle
  n'affecte pas la publication de la version 1.6 (versionCode 9) ni les correctifs web.
- Le statut est **modifiable** à tout moment si la situation change.
- Ce document n'est pas un avis juridique ; en cas de doute sur la qualification, consulter un juriste.
