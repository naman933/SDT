// Tiny i18n layer: t(key, vars) for UI strings, tc(text) for corpus strings, money(n) for amounts.
// Missing Hindi strings fall back to English (tests check coverage).
import { inr } from '../engine/core.js';
import { CORPUS_HI } from './corpus.hi.js';
import { STRINGS } from './strings.js';

export const LANGS = { en: 'English', hi: 'हिंदी' };
const KEY = 'msmeNav.lang';

function initial() {
  try {
    const s = localStorage.getItem(KEY);
    if (s && LANGS[s]) return s;
  } catch { /* ignore */ }
  return typeof navigator !== 'undefined' && /^hi\b/i.test(navigator.language || '') ? 'hi' : 'en';
}
let lang = typeof window === 'undefined' ? 'en' : initial();

export const getLang = () => lang;
export function setLang(l) {
  if (!LANGS[l]) return;
  lang = l;
  try { localStorage.setItem(KEY, l); } catch { /* ignore */ }
  if (typeof document !== 'undefined') document.documentElement.lang = l;
}

export function t(key, vars) {
  let s = STRINGS[lang]?.[key] ?? STRINGS.en[key];
  if (s == null) return key;
  if (Array.isArray(s)) return s;
  if (vars) s = s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
  return s;
}

// Translation with an English default from the data itself (needs, questions, labels).
export const td = (key, fallback) => (lang === 'en' ? fallback : STRINGS[lang]?.[key] ?? fallback);

// Corpus / engine English text → current language.
export const tc = (s) => (lang === 'hi' ? CORPUS_HI[s] ?? s : s);

export function money(n) {
  const s = inr(n);
  return lang === 'hi' ? s.replace(' lakh', ' लाख').replace(' crore', ' करोड़') : s;
}

// Joins "a, b and c" in the current language.
export function joinList(items) {
  if (items.length <= 1) return items.join('');
  return items.slice(0, -1).join(', ') + t('and') + items[items.length - 1];
}

export { CORPUS_HI, STRINGS };
