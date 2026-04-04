// Script de gestion du preloader
window.addEventListener('load', function() {
  setTimeout(function() {
    const preloader = document.getElementById('preloader');
    if (preloader) {
      preloader.style.opacity = '0';
      preloader.style.transition = 'opacity 0.3s ease-out';
      setTimeout(function() {
        preloader.remove();
      }, 300);
    }
  }, 500);
});
