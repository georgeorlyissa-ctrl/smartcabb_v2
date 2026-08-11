// Script de gestion du preloader
// Retiré dès que React a monté l'app (signal via window.__SMARTCABB_READY__),
// fallback : window.load + délai court si le signal n'arrive jamais.
(function () {
  function hidePreloader() {
    const preloader = document.getElementById('preloader');
    if (preloader && preloader.style.display !== 'none') {
      preloader.style.opacity = '0';
      preloader.style.transition = 'opacity 0.3s ease-out';
      setTimeout(function () {
        preloader.remove();
      }, 300);
    }
  }

  // L'app React appelle window.__SMARTCABB_READY__() dès son premier rendu
  window.__SMARTCABB_READY__ = hidePreloader;

  // Fallback : ne jamais laisser le preloader visible plus de 3s après le load
  window.addEventListener('load', function () {
    setTimeout(hidePreloader, 300);
  });
})();
