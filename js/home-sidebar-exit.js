/*
 * Home screen only: when a sidebar link (기록 시작, 캘린더) is clicked,
 * slide the sidebar out to the right first — same closing motion as
 * .sidenav--drawer uses on the other pages — then navigate once that's
 * done, instead of leaving it to just crossfade with the rest of the
 * page (css/style.css's @view-transition still handles that part).
 */
(function () {
  var sidenav = document.getElementById('homeSidenav');
  if (!sidenav) return;

  var EXIT_MS = 250;

  sidenav.addEventListener('click', function (e) {
    var link = e.target.closest('a[href]');
    if (!link) return;
    var href = link.getAttribute('href');
    if (!href || href.charAt(0) === '#') return;

    e.preventDefault();
    sidenav.classList.add('is-leaving');
    setTimeout(function () {
      window.location.href = href;
    }, EXIT_MS);
  });
})();
