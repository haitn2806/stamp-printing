let I18N = {};
let CURRENT_LANG = localStorage.getItem('app_lang') || 'en';

async function loadLang(lang) {
  try {
    const res = await fetch(`./i18n/${lang}.json`, { cache: 'no-store' })
    if (!res.ok) throw new Error(`Cannot load lang: ${lang}`);
    I18N = await res.json();
    CURRENT_LANG = lang;
    localStorage.setItem('app_lang', lang);
  } catch (e) {
    console.error('[i18n] loadLang failed:', e);
  }
}

function t(key) {
  return I18N[key] || key;
}

window.i18n = { loadLang, t };
