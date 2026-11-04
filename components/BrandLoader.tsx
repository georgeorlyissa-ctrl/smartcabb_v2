/**
 * BrandLoader — écran de chargement UNIQUE de SmartCabb.
 *
 * Reproduit exactement l'écran d'ouverture validé (fond bleu nuit + grille
 * blueprint + itinéraire pointillé + médaillon logo + SMARTCABB + slogan
 * « Ride Smart, Live Smart » et « Kinshasa · République Démocratique du Congo »).
 *
 * Une seule animation : la barre jaune de progression (`sc-boot-bar`).
 * Tout le reste est statique — pas de halo, pas de rivets, pas de fondu.
 *
 * ⚠️ Le markup est strictement identique à celui du preloader natif déclaré
 * dans `index.html` (mêmes classes `.sc-boot*`, mêmes styles critiques) :
 * la bascule preloader → React est invisible. Si vous modifiez ce composant,
 * mettez aussi à jour `index.html` (bloc `<style id="boot-loader-css">`).
 */
export function BrandLoader({ message }: { message?: string }) {
  return (
    <div
      className="sc-boot"
      role="status"
      aria-live="polite"
      aria-label="Chargement de SmartCabb"
    >
      <div className="sc-boot-grid" aria-hidden="true" />

      <svg
        className="sc-boot-route"
        viewBox="0 0 400 800"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <path
          d="M -20 640 C 80 620, 92 500, 182 486 S 300 386, 292 268 S 360 148, 420 128"
          fill="none"
          stroke="rgba(255,255,255,.2)"
          strokeWidth="3"
          strokeDasharray="10 10"
        />
        <circle cx="292" cy="268" r="7" fill="#FFCC00" />
        <circle cx="292" cy="268" r="13" fill="none" stroke="#FFCC00" strokeWidth="1.5" opacity="0.45" />
      </svg>

      <div className="sc-boot-vignette" aria-hidden="true" />

      <div className="sc-boot-inner">
        <div className="sc-boot-medal">
          <img src="/logo-smartcabb.jpeg" alt="" aria-hidden="true" />
        </div>
        <p className="sc-boot-brand">
          SMART<span>CABB</span>
        </p>
        <div className="sc-boot-track">
          <span className="sc-boot-bar" />
        </div>
        {message ? <p className="sc-boot-msg">{message}</p> : null}
      </div>

      <div className="sc-boot-footer">
        <p className="sc-boot-tagline">Ride Smart, Live Smart</p>
        <p className="sc-boot-place">Kinshasa · République Démocratique du Congo</p>
      </div>
    </div>
  );
}
