// Gestion du preloader natif.
// Le preloader est retiré dès que React a peint son premier écran
// (signal window.__SMARTCABB_READY__ envoyé après un double requestAnimationFrame).
// Le retrait est instantané : l'écran React (BrandLoader) est visuellement
// identique, donc l'utilisateur ne perçoit aucune bascule ni double animation.
(function () {
  function hidePreloader() {
    const preloader = document.getElementById('preloader');
    if (preloader) preloader.remove();
  }

  window.__SMARTCABB_READY__ = hidePreloader;

  // Filet de sécurité : ne jamais laisser le preloader plus de 3 s après load.
  window.addEventListener('load', function () {
    setTimeout(hidePreloader, 3000);
  });
})();
