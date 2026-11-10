// The ONE place to update for each release. tools/build.mjs bakes these links (and the version / size text) into the HTML so
// they work without JS; assets/js/download.js re-reads the URLs at runtime, so a re-uploaded config.js updates the links alone.
// After changing VERSION / size / MAC, run `node tools/build.mjs` so the visible text matches too.
//
// VERSION / WINDOWS / ANDROID: the files testers download today (GitHub release assets).
// MAC: null = "coming soon" ("בקרוב"); set { url: '…', size: '…' } when there is a Mac build to offer.
// LAUNCHED: false = the GitHub *source code* links stay hidden; true = they show (when the source repo goes public).
window.KAVERET_CONFIG = Object.freeze({
  VERSION: '2.30.1',
  WINDOWS: { url: 'https://github.com/OrielGer/kaveret-download/releases/download/v2.30.1/Kaveret-Setup-2.30.1.exe', size: '128 MB' },
  ANDROID: { url: 'https://github.com/OrielGer/kaveret-download/releases/download/v2.30.1/Kaveret-2.30.1-android.apk' },
  MAC: null,
  LAUNCHED: false,
  REPO: 'https://github.com/OrielGer/kaveret',
});
