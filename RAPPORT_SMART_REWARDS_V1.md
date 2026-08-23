# SMART REWARDS — Rapport Fidélité SmartCabb V1
**Comment fidéliser nos futurs clients tout en restant gagnant**

**Date :** 26 août 2026 — **Version :** V1 validée — **Commission :** 20% inchangée — **Grille tarifaire :** inchangée

---

## 1. Résumé exécutif

Smart Rewards est un programme de fidélité **indexé sur la dépense réelle** du passager, pas une bataille de prix. Chaque course rapproche le client de la suivante.

**V1 retenue :** 7500 points → 1 course Standard offerte (plafonnée à 6500 CDF). Sans toucher à la grille ni à la commission de 20%, le programme coûte **~9,5% du chiffre d'affaires** et laisse **~10,5% de commission nette** à SmartCabb sur chaque cycle. Il est rentable dès le premier client fidélisé.

La suite (statuts, missions, parrainage) arrivera en V2 une fois la V1 mesurée.

---

## 2. Le problème : pourquoi un programme maintenant ?

Yango, Bolt et Uber achètent la fidélité par des remises agressives. Sans raison de revenir, un client SmartCabb teste une fois puis repart. Une course gratuite promise après quelques trajets crée un **coût de sortie** : partir chez Yango, c'est perdre ses points.

En RDC, où le prix est le premier critère, « votre 10e course est offerte » est plus percutant qu'une nouvelle fonctionnalité.

---

## 3. Comment ça marche — simple pour le client

**Phrase d'accroche :** « Chaque course vous rapproche de votre prochaine course gratuite. »

### 3.1 Gagner des points

Formule unique, transparente :
`Points = (Prix payé en CDF / 10) × Multiplicateur catégorie × 1,1 si nuit (21h-06h)`

| Catégorie | Multiplicateur | Exemple : course à 7500 CDF | Exemple : course 1h jour (16 800 CDF Standard clim) |
|---|---|---|---|
| Standard sans clim | ×1,0 | 750 pts | 1 680 pts |
| Standard avec clim | ×1,1 | 825 pts | 1 848 pts |
| Confort | ×1,3 | 975 pts | 3 640 pts (28 000 CDF) |
| Plus / Familiale | ×1,5 | 1 125 pts | 5 040 pts (33 600 CDF) |
| Business | ×2,0 | 1 500 pts | 11 428 pts (160$ = 448 000 CDF → 1h Business est rare, moyenne plus basse) |

**Bonus :** 1ère course +1000 pts, 2e et 3e +500 pts. Bonus nuit +10%.

### 3.2 Paliers et récompenses V1

| Points | Récompense | Plafond SmartCabb |
|---|---|---|
| 3 000 | -15% sur 1 course | 2 000 CDF |
| 6 000 | -30% sur 1 course | 3 500 CDF |
| **7 500** | **Standard (avec/sans clim) gratuite** | **6 500 CDF (clim) / 4 000 CDF (sans clim)** |
| 12 000 | Confort gratuite | 9 000 CDF |
| 20 000 | Plus gratuite | 13 000 CDF |
| 35 000 | Business gratuite | 25 000 CDF |

Le client paie toujours le dépassement si son trajet dépasse le plafond (ex: Confort de 14 000 CDF avec cap 9 000 → il paie 5 000 CDF). Le chauffeur est toujours payé plein tarif, SmartCabb absorbe la différence.

### 3.3 Parcours type — Standard clim

*   1 course à 16 800 CDF (1h jour) = 1 848 pts
*   4 courses = 7 392 pts → **gratuite débloquée** (en moyenne 4 à 9 courses selon la durée)
*   Expiration : 12 mois d'inactivité seulement. Plafond anti-fraude : 3 000 pts / jour / compte.

---

## 4. Rentabilité — combien ça coûte vraiment ?

Hypothèse : commission SmartCabb = 20% (inchangée).

| Scénario Standard clim (1h jour à 16 800 CDF) | Chiffre d'affaires | Commission 20% | Coût récompense | **Marge restante** | Part du CA consacrée à la fidélité |
|---|---|---|---|---|---|
| Cycle 7500 pts → 4,1 courses → 1 gratuite cap 6500 | 68 200 CDF | 13 640 CDF | 6 500 CDF | **+7 140 CDF** | **9,5%** |
| Cycle 12 000 pts → 6,5 courses Confort → 1 Confort cap 9000 | 182 000 CDF | 36 400 CDF | 9 000 CDF | **+27 400 CDF** | 4,9% |

Même avec des petites courses (ex: Sans clim à 4 500 CDF = 450 pts → 16,6 courses pour 7500 pts → CA 74 700 → commission 14 940 → coût 4000 → **+10 940 CDF**).

**Conclusion financière :** à 20%, chaque cycle fidélité laisse **50 à 75% de la commission** en marge nette. Le programme n'est jamais à perte s'il est plafonné. À 10% il aurait été à 0 — d'où l'importance du plafond.

### Que finance la marge restante ?
Le coût fidélité (9,5% du CA) est un **investissement acquisition/rétention**, comme une campagne Facebook, mais avec un retour mesurable : un client fidélisé passe de 3 à 8 courses/mois. Le surplus de 5 courses × 3360 CDF de commission = 16 800 CDF supplémentaires, largement au-dessus des 6500 CDF investis.

---

## 5. Comment ça fidélise — et pourquoi le client revient

1.  **Effet cliquet :** à 5000 pts, partir chez Yango = perdre sa future gratuite. Le client reste pour « finir » son palier.
2.  **Récompense rapide :** 4 courses = 1 gratuite, c'est atteignable en 2 semaines pour un navetteur, pas en 6 mois. Il ne décroche pas.
3.  **Équité :** celui qui paie plus (Confort/Business) ou roule la nuit gagne plus vite — il se sent reconnu.
4.  **Relance automatique :** à J-30 avant expiration (12 mois), notification « 2350 pts expirent bientôt » → retour en app.

---

## 6. Garde-fous — ce qui empêche les dérives

*   Points uniquement en `completed/rated`, jamais sur annulée
*   Aucun point sur une course déjà payée en points (pas de boucle infinie)
*   Plafond quotidien 3000 pts (anti-fraude chauffeur/passager complices)
*   Bonus bienvenue lié au **numéro vérifié**, pas à l'ID
*   Chauffeur payé plein tarif même sur une gratuite — pas de friction côté offre
*   Suivi temps réel dans le panel admin : `Coût fidélité du mois` vs `Commission du mois`

---

## 7. Mise en œuvre V1 → V2

**V1 (actuel, en prod) :** Points + paliers plafonnés + bonus bienvenue + historique + expiration. Écran passager `Profil → Smart Rewards → Mes points` avec barre de progression et bouton « Utiliser » (code `SMART-XXXXXX` à usage unique). Suivi admin du coût.

**V2 (après 6 semaines de mesures) :** Statuts à vie (Start/Plus/Premium/Elite), missions hebdo, parrainage (+1500 pts), et seulement ensuite Roue Smart (après validation juridique loterie en RDC).

---

## 8. Indicateurs à suivre chaque semaine

*   Taux de rétention à 30 jours (clients avec ≥2 courses)
*   Nombre moyen de courses / client / mois (avant vs après inscription)
*   Coût fidélité / Commission totale (cible < 50%)
*   Taux d'utilisation des points et taux d'expiration

---

**Recommandation finale :** Laisser la V1 telle quelle. Elle est rentable à 20%, simple à expliquer (« 10 courses ≈ 1 offerte » reste vrai en moyenne), et protège la marge par le plafond. Mesurer 6 semaines avant d'ajouter la couche gamification.

*Rapport préparé pour présentation direction — SmartCabb, août 2026.*
