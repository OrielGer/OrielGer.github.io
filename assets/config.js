// The ONE place that says where downloads and source links point, and whether they are live yet.
// releaseRepo: the repository named in package.json "releaseRepo". Change it here and every download, source,
// guide and licence link on every page (English and Hebrew) follows.
// files: the fixed download names every release carries next to the versioned ones (the release workflow uploads
// them). Each download button links straight to github.com/<releaseRepo>/releases/latest/download/<name>.
// launched: the launch switch. While it is false, no link to GitHub leaves the page: every download / source / guide
// button stays on #download, the big download buttons read "Coming Sunday 22.11" (the text is in each page's
// data-soon attribute), and the download section shows its launch note. The install help page (install/) and the
// What's new page (changelog/) are on this site, so they work before launch too.
// Set launched to true only when ALL of these exist:
//   1. github.com/<releaseRepo> is public, with docs/INSTALL.md and LICENSE on its main branch;
//   2. it has a FULL release (not "Pre-release": /releases/latest skips pre-releases);
//   3. that release carries the four files below, the versioned files and SHA256SUMS.
window.KAVERET_SITE = {
  releaseRepo: 'OrielGer/kaveret',
  launched: false,
  files: {
    win: 'Kaveret-Setup.exe',
    macArm: 'Kaveret-mac-arm64.dmg',
    macIntel: 'Kaveret-mac-x64.dmg',
    apk: 'Kaveret.apk',
  },
};
