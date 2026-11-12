/**
 * 🚩 DRAPEAUX DE FONCTIONNALITÉS
 *
 * Un seul endroit pour activer / désactiver une fonctionnalité visible par
 * les utilisateurs, sans toucher au code des écrans.
 *
 * ⚠️ Ces valeurs sont figées au build : un changement ici nécessite un
 * déploiement (Vercel pour le web, rebuild pour l'APK).
 */

/**
 * 🎁 SMART REWARDS (points de fidélité)
 *
 * Désactivé temporairement à la demande du métier (2026-11-12) : les paliers
 * de récompenses ne sont pas encore validés (montants, plafonds, expiration).
 *
 * Quand `false` :
 *  - la rubrique « Smart Rewards » disparaît du profil ;
 *  - le bloc de remise fidélité disparaît de l'écran « Prix estimé » ;
 *  - l'écran `/loyalty` renvoie vers le profil ;
 *  - aucun appel réseau `/loyalty/*` n'est fait.
 *
 * Les données de points déjà accumulées restent en base : il suffira de
 * repasser ce drapeau à `true` pour tout réafficher.
 */
export const SMART_REWARDS_ENABLED = false;
