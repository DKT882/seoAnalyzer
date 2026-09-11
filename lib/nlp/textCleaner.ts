/**
 * SEO Intel Pro - Text Normalization & Cleaning Module
 * Provides HTML entity decoding, Unicode normalization, control character stripping,
 * and clean sentence segmentation to prevent phrase boundary corruption.
 */

// Common HTML entity map for rapid decoding
const HTML_ENTITY_MAP: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#34;': '"',
  '&apos;': "'",
  '&#39;': "'",
  '&#x27;': "'",
  '&#x2F;': '/',
  '&nbsp;': ' ',
  '&#160;': ' ',
  '&copy;': ' ',
  '&#169;': ' ',
  '&reg;': ' ',
  '&#174;': ' ',
  '&trade;': ' ',
  '&#8482;': ' ',
  '&ndash;': '-',
  '&#8211;': '-',
  '&mdash;': ' ',
  '&#8212;': ' ',
  '&lsquo;': "'",
  '&#8216;': "'",
  '&rsquo;': "'",
  '&#8217;': "'",
  '&ldquo;': '"',
  '&#8220;': '"',
  '&rdquo;': '"',
  '&#8221;': '"',
  '&bull;': ' ',
  '&#8226;': ' ',
  '&hellip;': '...',
  '&#8230;': '...',
  '&middot;': ' ',
  '&#183;': ' ',
};

/**
 * Decodes standard and numeric HTML entities.
 */
export function decodeHtmlEntities(text: string): string {
  if (!text || typeof text !== 'string') return '';

  let result = text;
  // Replace named & common numeric entities
  for (const [entity, replacement] of Object.entries(HTML_ENTITY_MAP)) {
    if (result.includes(entity)) {
      result = result.replaceAll(entity, replacement);
    }
  }

  // Replace remaining decimal entities &#123;
  result = result.replace(/&#(\d+);/g, (_, dec) => {
    const code = parseInt(dec, 10);
    if (!isNaN(code) && code >= 32 && code <= 65535) {
      try {
        return String.fromCharCode(code);
      } catch {
        return ' ';
      }
    }
    return ' ';
  });

  // Replace remaining hex entities &#x1F;
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
    const code = parseInt(hex, 16);
    if (!isNaN(code) && code >= 32 && code <= 65535) {
      try {
        return String.fromCharCode(code);
      } catch {
        return ' ';
      }
    }
    return ' ';
  });

  return result;
}

/**
 * Normalizes Unicode characters: non-breaking spaces, zero-width spaces,
 * smart quotes, curly dashes, and soft hyphens.
 */
export function normalizeUnicode(text: string): string {
  if (!text || typeof text !== 'string') return '';

  return text
    // Replace zero-width characters and soft hyphens with empty string
    .replace(/[\u200B-\u200D\uFEFF\u00AD\u2060]/g, '')
    // Replace non-breaking spaces & uncommon whitespace with standard space
    .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
    // Normalize smart/curly quotes
    .replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F\u2033]/g, '"')
    // Normalize dashes and bullets
    .replace(/[\u2013\u2014\u2015]/g, ' - ')
    .replace(/[\u2022\u2023\u25E6\u2043\u2219]/g, ' ')
    // Normalize backticks and tildes
    .replace(/[\u0060\u00B4]/g, "'")
    // Remove control characters (except tab & newline)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ' ');
}

/**
 * Full clean normalization of raw visible text.
 */
export function cleanRawText(text: string): string {
  if (!text || typeof text !== 'string') return '';

  const decoded = decodeHtmlEntities(text);
  const normalized = normalizeUnicode(decoded);

  return normalized
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Segments cleaned text into coherent sentences without leaking across boundaries.
 */
export function segmentSentences(text: string): string[] {
  if (!text || typeof text !== 'string') return [];

  const cleaned = cleanRawText(text);
  if (!cleaned) return [];

  // Split on strong punctuation followed by whitespace or end of line
  // e.g. . ! ? | • — or multi-line breaks
  const rawSegments = cleaned.split(/(?<=[.!?|])\s+|\s+[-—–]{2,}\s+/);

  const validSentences: string[] = [];
  for (const seg of rawSegments) {
    const trimmed = seg.replace(/^[^\w]+|[^\w]+$/g, '').trim();
    // Keep segments that have at least 2 words and reasonable length
    if (trimmed.length >= 6 && trimmed.includes(' ')) {
      validSentences.push(trimmed);
    }
  }

  return validSentences;
}
