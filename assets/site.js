// kaveret.ai: links from assets/config.js, a header border once scrolled, and short reveal-on-scroll.
// No trackers, no network requests, no third-party code.
(function () {
  'use strict';
  var doc = document.documentElement;
  doc.classList.remove('no-js');

  // links: every [data-dl] gets its URL from the one constant in assets/config.js, but only once the launch
  // switch (KAVERET_SITE.launched) is on. Before that every link stays on #download (no 404 on a private repo),
  // the big buttons show their data-soon text and the download section shows the launch note.
  var cfg = window.KAVERET_SITE || {};
  var repo = cfg.releaseRepo || '';
  var live = cfg.launched === true;
  doc.setAttribute('data-launch', live ? 'live' : 'soon');
  var note = document.getElementById('launch-note');
  if (note) note.hidden = live;
  if (!live) {
    var soon = document.querySelectorAll('[data-soon]');
    for (var s = 0; s < soon.length; s++) soon[s].textContent = soon[s].getAttribute('data-soon');
  }
  var base = 'https://github.com/' + repo;
  var urls = {
    releases: base + '/releases/latest',
    repo: base,
    install: base + '/blob/main/docs/INSTALL.md',
    license: base + '/blob/main/LICENSE',
  };
  if (repo && live) {
    var links = document.querySelectorAll('[data-dl]');
    for (var i = 0; i < links.length; i++) {
      var u = urls[links[i].getAttribute('data-dl')];
      if (u) links[i].setAttribute('href', u);
    }
  }

  // header: a hairline once the page has scrolled
  var top = document.querySelector('.top');
  if (top) {
    var onScroll = function () { top.classList.toggle('scrolled', window.scrollY > 8); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // reveal: content is visible without JS and under reduced motion; otherwise a 240 ms fade-up when it enters
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var items = document.querySelectorAll('.reveal');
  if (reduce || !('IntersectionObserver' in window)) {
    for (var j = 0; j < items.length; j++) items[j].classList.add('in');
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
  for (var k = 0; k < items.length; k++) {
    // anything already on screen at load shows at once (no flash, no layout shift)
    var r = items[k].getBoundingClientRect();
    if (r.top < window.innerHeight) items[k].classList.add('in');
    else io.observe(items[k]);
  }
})();
