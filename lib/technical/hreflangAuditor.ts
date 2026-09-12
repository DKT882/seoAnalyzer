import * as cheerio from 'cheerio';
import { HreflangAssessment, HreflangEntry } from '@/types';
import { resolveAbsoluteUrl } from '../utils/urlUtils';

// Common standard ISO 639-1 language prefixes
const VALID_ISO_LANG_REGEX = /^[a-z]{2,3}(-[a-z0-9]{2,4})?$/i;

export interface HreflangAuditInput {
  $: cheerio.CheerioAPI;
  finalUrl: string;
}

/**
 * Audits hreflang internationalization alternates, x-default presence, duplicate codes,
 * self-reference integrity, and <html lang="..."> alignment.
 */
export function auditHreflang(input: HreflangAuditInput): HreflangAssessment {
  const { $, finalUrl } = input;
  const entries: HreflangEntry[] = [];
  const seenLangs = new Set<string>();
  const duplicateLanguages: string[] = [];
  const invalidCodes: string[] = [];
  let hasXDefault = false;
  let hasSelfReference = false;

  const normalizedFinalUrl = finalUrl.toLowerCase().replace(/\/$/, '');

  $('link[rel="alternate" i][hreflang]').each((_, el) => {
    const rawLang = ($(el).attr('hreflang') || '').trim();
    const rawHref = ($(el).attr('href') || '').trim();
    if (!rawLang || !rawHref) return;

    const absHref = resolveAbsoluteUrl(rawHref, finalUrl) || rawHref;
    const langLower = rawLang.toLowerCase();

    if (langLower === 'x-default') {
      hasXDefault = true;
    }

    // Validate ISO code format
    const isValidCode = langLower === 'x-default' || VALID_ISO_LANG_REGEX.test(rawLang);
    if (!isValidCode) {
      invalidCodes.push(rawLang);
    }

    // Check duplicates
    if (seenLangs.has(langLower)) {
      if (!duplicateLanguages.includes(langLower)) {
        duplicateLanguages.push(langLower);
      }
    }
    seenLangs.add(langLower);

    // Check self-reference
    const normalizedHref = absHref.toLowerCase().replace(/\/$/, '');
    const isSelf = normalizedHref === normalizedFinalUrl;
    if (isSelf) {
      hasSelfReference = true;
    }

    entries.push({
      lang: rawLang,
      href: absHref,
      isValidCode,
      isSelfReference: isSelf,
    });
  });

  const totalEntries = entries.length;
  const hasHreflang = totalEntries > 0;
  const hasDuplicates = duplicateLanguages.length > 0;
  const hasInvalidLanguageCodes = invalidCodes.length > 0;

  // Language attribute on <html>
  const rawHtmlLang = ($('html').attr('lang') || '').trim();
  const isHtmlLangValid = Boolean(rawHtmlLang && VALID_ISO_LANG_REGEX.test(rawHtmlLang));

  let isHtmlLangMatched = true;
  if (hasHreflang && rawHtmlLang) {
    const matchingEntry = entries.find(
      (e) => e.lang.toLowerCase() === rawHtmlLang.toLowerCase() || e.lang.toLowerCase().startsWith(rawHtmlLang.toLowerCase().slice(0, 2))
    );
    if (!matchingEntry) {
      isHtmlLangMatched = false;
    }
  }

  let summary = 'No hreflang internationalization tags configured on this single-language page.';
  if (hasHreflang) {
    if (hasInvalidLanguageCodes) {
      summary = `Hreflang cluster has ${totalEntries} entries with invalid language/region tags (${invalidCodes.join(', ')}).`;
    } else if (!hasSelfReference) {
      summary = `Hreflang cluster has ${totalEntries} entries but lacks a self-referencing alternate link.`;
    } else if (hasDuplicates) {
      summary = `Hreflang cluster contains duplicate entries for language code(s) ${duplicateLanguages.join(', ')}.`;
    } else {
      summary = `Valid hreflang configuration with ${totalEntries} language/region alternates${hasXDefault ? ' including x-default' : ''}.`;
    }
  }

  return {
    hasHreflang,
    totalEntries,
    entries,
    hasXDefault,
    hasDuplicates,
    duplicateLanguages,
    hasSelfReference,
    hasInvalidLanguageCodes,
    invalidCodes,
    htmlLang: rawHtmlLang,
    isHtmlLangValid,
    isHtmlLangMatched,
    summary,
  };
}
