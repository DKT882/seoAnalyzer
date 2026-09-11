/**
 * SEO Intel Pro - Generalized Artifact & Noise Filter
 * Systematically detects and rejects technical artifacts, URL fragments,
 * code/DOM tokens, date/timestamp noise, tracking parameters, and boilerplate
 * while strictly preserving legitimate alphanumeric SEO keywords (e.g. "iphone 17 case", "windows 11", "top 10 seo tools", "xml sitemap").
 */

// Strict code, DOM, protocol, and tracking noise tokens that should never be in genuine content phrases
const STRICT_CODE_GARBAGE = new Set([
  'http', 'https', 'www', 'com', 'net', 'org',
  'href', 'src', 'onclick', 'onload', 'onerror', 'onchange', 'onsubmit',
  'doctype', 'tbody', 'thead', 'noscript', 'nbsp', 'quot', 'apos', 'middot', 'bull', 'hellip',
  'typeof', 'instanceof', 'void', 'undefined', 'nan', 'null',
  'utm', 'fbclid', 'gclid', 'msclkid', 'affiliate',
  'daily1', 'daily0', 'monthly1', 'weekly1',
]);

// 1-gram standalone words that are not useful standalone keywords
const STANDALONE_1GRAM_NOISE = new Set([
  'http', 'https', 'www', 'com', 'net', 'org', 'io', 'co', 'html', 'htm', 'php', 'asp', 'aspx', 'jsp', 'css', 'js',
  'div', 'span', 'class', 'id', 'style', 'img', 'br', 'hr', 'p', 'table', 'tr', 'td', 'th', 'ul', 'ol', 'li', 'form', 'input', 'button',
  'textarea', 'select', 'option', 'script', 'meta', 'link', 'head', 'body', 'svg', 'path', 'canvas', 'iframe',
  'target', 'rel', 'alt', 'width', 'height', 'align', 'valign', 'bgcolor', 'border',
  'url', 'uri', 'slug', 'ref', 'amp',
  'var', 'let', 'const', 'function', 'return',
  'true', 'false',
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
]);

// Boilerplate phrases that must never be considered primary or extracted SEO keywords
const BOILERPLATE_PHRASES = new Set([
  'all rights reserved',
  'rights reserved',
  'privacy policy',
  'terms of service',
  'terms and conditions',
  'terms of use',
  'cookie policy',
  'cookie settings',
  'cookies policy',
  'accept all cookies',
  'manage cookies',
  'skip to content',
  'skip to main content',
  'toggle navigation',
  'navigation menu',
  'read more',
  'click here',
  'learn more',
  'view all',
  'see more',
  'sign in',
  'sign up',
  'log in',
  'log out',
  'create account',
  'my account',
  'shopping cart',
  'cart items',
  'view cart',
  'checkout now',
  'share on facebook',
  'share on twitter',
  'share on linkedin',
  'follow us',
  'powered by wordpress',
  'back to top',
  'page not found',
  'error 404',
  'leave a comment',
  'leave a reply',
  'submit comment',
  'posted by',
  'published on',
  'last updated',
]);

/**
 * Evaluates whether an individual word token is a technical/structural artifact.
 */
export function isLikelyArtifactToken(token: string): boolean {
  if (!token || typeof token !== 'string') return true;
  const t = token.toLowerCase().trim();

  if (t.length <= 1) return true;
  if (STRICT_CODE_GARBAGE.has(t) || STANDALONE_1GRAM_NOISE.has(t)) return true;

  // Corrupted concatenation: Starts with digit followed immediately by letters (e.g. "0https", "2026daily", "0http")
  // Exception: legitimate alphanumeric units like "5g", "4k", "3d", "2fa", "24h"
  if (/^\d+[a-zA-Z]+/.test(t) && !/^(?:5g|4g|3g|4k|8k|3d|2d|2fa|24h|1080p|720p|64bit|32bit)$/i.test(t)) {
    return true;
  }

  // Corrupted concatenation: Contains date-like or timestamp fragment within word (e.g. "2026-09-11daily1", "2026-0-11daily1")
  if (/\d{4}[-_.]\d{1,2}[-_.]\d{1,2}/.test(t) || /\d{8}[a-zA-Z]/.test(t)) {
    return true;
  }

  // Hex color codes (e.g. "#ffffff", "0x123abc")
  if (/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(t) || /^0x[0-9a-f]+$/i.test(t)) {
    return true;
  }

  // Pure numbers or pure punctuation
  if (/^\d+$/.test(t) || /^[^\w\s]+$/.test(t)) {
    return true;
  }

  // Hash / UUID hex strings (e.g. "abc123def456", "e4d909c2-0d4a-4e34")
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t) ||
    (/^(?=[a-f0-9]*[0-9])(?=[a-f0-9]*[a-f])[a-f0-9]{8,}$/i.test(t) && !/^(?:windows|iphone|galaxy|pixel|intel|amd|nvidia|playstation|xbox)/i.test(t))
  ) {
    return true;
  }

  // IP address pattern (e.g. "192.168.1.1")
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(t)) {
    return true;
  }

  // URL fragment markers
  if (t.includes('http') || t.includes('www') || t.includes('://') || t.includes('.com') || t.includes('utm_') || t.includes('fbclid')) {
    return true;
  }

  return false;
}

/**
 * Master artifact and garbage filter for candidate phrases.
 * Returns true if the phrase represents an artifact, boilerplate, or noise.
 */
export function isArtifactOrGarbage(phrase: string): boolean {
  if (!phrase || typeof phrase !== 'string') return true;

  const p = phrase.toLowerCase().trim();
  if (p.length < 2 || p.length > 70) return true;

  // 1. Direct match with boilerplate phrases
  if (BOILERPLATE_PHRASES.has(p)) return true;

  // 2. Contains HTML tag leftovers (e.g. "<br>", "</div>", "class=", "href=", "style=")
  if (/<[a-zA-Z/][^>]*>/.test(p) || /<br\s*\/?>/i.test(p) || /=[ "']/.test(p)) {
    return true;
  }

  // 3. Contains URL protocol or domain signatures
  if (
    p.includes('://') ||
    p.includes('http:') ||
    p.includes('https:') ||
    p.includes('www.') ||
    /\.(?:com|org|net|io|co|edu|gov|html|php|aspx?)\b/i.test(p) ||
    p.includes('utm_') ||
    p.includes('fbclid') ||
    p.includes('gclid') ||
    p.includes('javascript:')
  ) {
    return true;
  }

  // 4. Date patterns and corrupt date-word concatenations (e.g. "2026-09-11", "2026-0-11daily1", "2026-09-11daily1", "12:45:33")
  if (
    /\b\d{4}[-/.]\d{1,2}[-/.]\d{1,2}\b/.test(p) ||
    /\d{4}[-/.]\d{1,2}[-/.]\d{1,2}[a-zA-Z0-9]+/.test(p) ||
    /\b\d{1,2}:\d{2}(?::\d{2})?\b/.test(p)
  ) {
    return true;
  }

  const words = p.split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;

  // 5. For 1-word candidates
  if (words.length === 1) {
    const w = words[0];
    if (isLikelyArtifactToken(w)) return true;
    if (STANDALONE_1GRAM_NOISE.has(w)) return true;
    // Reject single isolated numbers (e.g. "10", "2024", "100")
    if (/^\d+$/.test(w)) return true;
    // Reject pure symbols or currency
    if (/^[$\u20AC\u00A3\u00A5\u20B9%#@&*!^~_=+]+$/.test(w)) return true;
    // Reject if too short (unless legitimate 2-letter acronym like 'ai', 'ui', 'ux', 'qa', 'pr', 'hr', 'os', 'ip')
    if (w.length === 2 && !['ai', 'ui', 'ux', 'qa', 'pr', 'hr', 'os', 'ip', 'ar', 'vr', 'ml', 'bi'].includes(w)) {
      return true;
    }
    return false;
  }

  // 6. For multi-word candidates: check strict code garbage
  let strictGarbageCount = 0;
  for (const w of words) {
    if (STRICT_CODE_GARBAGE.has(w) || /^\d+[a-zA-Z]+/.test(w) || /^[0-9a-f]{8,}$/i.test(w)) {
      strictGarbageCount++;
    }
  }

  if (strictGarbageCount > 0) {
    return true;
  }

  // Check if every word in multi-word phrase is purely numeric
  if (words.every((w) => /^\d+$/.test(w))) {
    return true;
  }

  // Reject phrases that start or end with broken punctuation or hanging conjunctions
  if (/^[&/\\#@+*]/.test(p) || /[&/\\#@+*]$/.test(p)) {
    return true;
  }

  return false;
}
