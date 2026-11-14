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
  var files = cfg.files || {};
  var file = function (name) { return name ? base + '/releases/latest/download/' + name : ''; };
  // install/ and changelog/ are pages on this site: their [data-dl="install"] links keep the href in the page
  var urls = {
    releases: base + '/releases/latest',
    repo: base,
    guide: base + '/blob/main/docs/INSTALL.md',
    license: base + '/blob/main/LICENSE',
    sums: file('SHA256SUMS'),
    win: file(files.win),
    'mac-arm': file(files.macArm),
    'mac-intel': file(files.macIntel),
    apk: file(files.apk),
  };

  // the main button: the file for this visitor's system. A Mac gets the Apple-chip file as the button and the Intel
  // file first in the line under it (the chip can't be told apart reliably). Anything else: the releases page.
  var nav = window.navigator || {};
  var sys = ((nav.userAgentData && nav.userAgentData.platform) || '') + ' ' + (nav.userAgent || '');
  var os = /android/i.test(sys) ? 'apk'
    : /iphone|ipad|ipod/i.test(sys) || (/mac/i.test(sys) && nav.maxTouchPoints > 1) ? ''
    : /mac/i.test(sys) ? 'mac-arm'
    : /win/i.test(sys) ? 'win' : '';
  var main = os && urls[os] ? os : 'releases';
  urls.auto = urls[main];

  if (repo && live) {
    var links = document.querySelectorAll('[data-dl]');
    for (var i = 0; i < links.length; i++) {
      var u = urls[links[i].getAttribute('data-dl')];
      if (u) links[i].setAttribute('href', u);
    }
    // the label says which file the button gives (each page holds its own words)
    var labels = document.querySelectorAll('[data-auto-label]');
    for (var l = 0; l < labels.length; l++) {
      var t = labels[l].getAttribute('data-label-' + main);
      if (t) labels[l].textContent = t;
    }
    // the small line under the button: every other file, without the one the button already gives
    var alts = document.querySelectorAll('[data-alt]');
    for (var a = 0; a < alts.length; a++) alts[a].hidden = false;
    var altItems = document.querySelectorAll('[data-alt-item]');
    for (var m = 0; m < altItems.length; m++) altItems[m].hidden = altItems[m].getAttribute('data-dl') === main;
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
