// Apply the language before paint; boot-theme.js owns the theme.
// i18n.js replaces this. Boot must still render if that script fails to load.
window.lfT = window.lfT || ((zh) => zh);
(() => {
  const root = document.documentElement;
  // Vietnamese is the default interface language of this edition. Chinese and
  // English stay available from the language switch.
  const LANGS = ['vi', 'en', 'zh'];
  const TAGS = { vi: 'vi-VN', en: 'en', zh: 'zh-CN' };
  let lang = 'vi';
  try {
    const stored = localStorage.getItem('loopforge.lang');
    if (LANGS.includes(stored)) lang = stored;
  } catch (_) { /* Restricted storage still permits the default interface. */ }
  root.dataset.lang = lang;
  root.lang = TAGS[lang];
  try {
    if (sessionStorage.getItem('loopforge.lang.motion') === 'in') {
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) sessionStorage.removeItem('loopforge.lang.motion');
      else root.classList.add('lang-enter');
    }
  } catch (_) { /* Enter animation is optional when storage is blocked. */ }
})();
