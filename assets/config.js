// The ONE place that says where downloads and source links point, and whether they are live yet.
// releaseRepo: the repository named in package.json "releaseRepo". Change it here and every download, source,
// install-guide and licence link on both pages (English and Hebrew) follows.
// launched: the launch switch. While it is false, no link leaves the page: every download / source / guide button
// stays on #download, the big download buttons read "Coming Sunday 15.11" (the text is in each page's data-soon
// attribute), and the download section shows its launch note. Set it to true only when ALL of these exist:
//   1. github.com/<releaseRepo> is public, with docs/INSTALL.md and LICENSE on its main branch;
//   2. it has a FULL release (not "Pre-release": /releases/latest skips pre-releases; the release job always makes
//      a pre-release, so promote it by hand: gh release edit vX --prerelease=false);
//   3. that release carries Kaveret-Setup-<v>.exe, both mac .dmg files, Kaveret-<v>-android.apk and SHA256SUMS.
window.KAVERET_SITE = {
  releaseRepo: 'OrielGer/kaveret',
  launched: false,
};
