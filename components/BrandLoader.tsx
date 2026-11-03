/**
 * BrandLoader — écran de chargement UNIQUE de SmartCabb.
 *
 * Un seul élément est animé : la barre de progression (`sc-boot-bar`).
 * Le reste (médaillon logo, marque, fond acier) est statique.
 *
 * Le markup est strictement identique à celui du preloader natif déclaré
 * dans `index.html` (mêmes classes `.sc-boot*`), ce qui rend la bascule
 * preloader → React invisible : l'utilisateur ne voit qu'un seul écran
 * de chargement et une seule animation.
 */
export function BrandLoader({ message = 'Ride Smart · Live Smart' }: { message?: string }) {
  return (
    <div className="sc-boot" role="status" aria-live="polite" aria-label="Chargement de SmartCabb">
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
    </div>
  );
}
