/*
 * First-visit splash (node 78:956): shown once per browser (tracked via
 * localStorage), stays up for 2s, then fades out and removes itself,
 * revealing the home screen underneath. A repeat visit/refresh never
 * shows it again — the inline script right after #splashScreen in
 * index.html already hides it synchronously before paint in that case,
 * so this file only has to handle the first-visit path.
 */
(function () {
  var STORAGE_KEY = 'splashShown';
  var VISIBLE_MS = 2000;

  var splash = document.getElementById('splashScreen');
  if (!splash || splash.style.display === 'none') return;
  if (localStorage.getItem(STORAGE_KEY)) return;

  localStorage.setItem(STORAGE_KEY, '1');

  setTimeout(function () {
    splash.classList.add('is-hidden');
    splash.addEventListener('transitionend', function () {
      splash.remove();
    }, { once: true });
  }, VISIBLE_MS);
})();
