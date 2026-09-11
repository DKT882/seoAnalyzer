/**
 * SEO Intel Pro - Sentence-Bounded Candidate Phrase Generator
 * Generates 1 to 5-gram keyword candidates strictly within sentence units,
 * preventing cross-sentence and cross-tag artifact phrase generation.
 */

import { stemWord } from '../nlp/stemmer';
import { isStopWord, trimStopWordsFromEdges, isValidPhraseStructure } from '../nlp/stopwords';
import { isArtifactOrGarbage, isLikelyArtifactToken } from '../nlp/artifactFilter';
import { calculateKeywordQualityScore, QUALITY_THRESHOLD } from '../nlp/keywordQuality';

export interface CleanToken {
  token: string;
  original: string;
  stem: string;
  index: number;
}

export interface CandidatePhrase {
  phrase: string;
  stemmedPhrase: string;
  words: string[];
  nGramSize: 1 | 2 | 3 | 4 | 5;
  frequency: number;
  firstPosition: number;
  qualityScore: number;
  inTitle: boolean;
  inH1: boolean;
  inH2H6: boolean;
  inMeta: boolean;
  inMainContent: boolean;
  inAlt: boolean;
  inAnchor: boolean;
  inUrl: boolean;
}

export interface CandidateGenerationInput {
  sentences: string[];
  title: string;
  metaDescription: string;
  h1List: string[];
  h2H6List: string[];
  mainContentText: string;
  altTexts: string[];
  anchorTexts: string[];
  pageUrl: string;
  navText?: string;
  footerText?: string;
}

/**
 * Tokenizes a single sentence into clean alphanumeric tokens.
 */
export function tokenizeSentence(sentence: string, startIndex = 0): CleanToken[] {
  if (!sentence || typeof sentence !== 'string') return [];

  // Match words, hyphenated compounds, and alphanumeric terms
  const regex = /[a-zA-Z0-9]+(?:[-'][a-zA-Z0-9]+)*/g;
  const tokens: CleanToken[] = [];
  let match: RegExpExecArray | null;
  let idx = startIndex;

  while ((match = regex.exec(sentence)) !== null) {
    const original = match[0];
    const cleaned = original.toLowerCase();

    // Discard single-character noise or corrupted artifact tokens
    if (!isLikelyArtifactToken(cleaned)) {
      tokens.push({
        token: cleaned,
        original,
        stem: stemWord(cleaned),
        index: idx,
      });
    }
    idx++;
  }

  return tokens;
}

/**
 * Extracts candidate phrases from clean sentence units and calculates context signals.
 */
export function generateCleanCandidates(input: CandidateGenerationInput): Map<string, CandidatePhrase> {
  const candidateMap = new Map<string, CandidatePhrase>();

  const titleLower = (input.title || '').toLowerCase();
  const metaLower = (input.metaDescription || '').toLowerCase();
  const h1Lower = (input.h1List || []).map((h) => h.toLowerCase()).join(' ');
  const h2Lower = (input.h2H6List || []).map((h) => h.toLowerCase()).join(' ');
  const mainLower = (input.mainContentText || '').toLowerCase();
  const altLower = (input.altTexts || []).map((a) => a.toLowerCase()).join(' ');
  const anchorLower = (input.anchorTexts || []).map((a) => a.toLowerCase()).join(' ');
  const navLower = (input.navText || '').toLowerCase();
  const footerLower = (input.footerText || '').toLowerCase();

  let urlSlug = '';
  try {
    const parsed = new URL(input.pageUrl);
    const rawPath = `${parsed.pathname} ${parsed.search}`;
    let decodedPath = rawPath;
    try {
      decodedPath = decodeURIComponent(rawPath);
    } catch {
      // fallback
    }
    urlSlug = `${rawPath} ${decodedPath}`.replace(/[-_./]/g, ' ').toLowerCase();
  } catch {
    urlSlug = (input.pageUrl || '').toLowerCase();
  }

  let globalTokenIndex = 0;

  // Process sentence by sentence (prevents phrase generation across sentences)
  for (const sentence of input.sentences) {
    const tokens = tokenizeSentence(sentence, globalTokenIndex);
    globalTokenIndex += tokens.length;

    const sentenceTokenCount = tokens.length;
    if (sentenceTokenCount === 0) continue;

    // Generate N-grams (1 to 5) strictly within the sentence boundary
    for (let n = 1; n <= Math.min(5, sentenceTokenCount); n++) {
      for (let i = 0; i <= sentenceTokenCount - n; i++) {
        const windowTokens = tokens.slice(i, i + n);
        const rawWords = windowTokens.map((t) => t.token);

        // Discard 1-grams that are stopwords
        if (n === 1 && isStopWord(rawWords[0])) continue;

        // Trim edge stopwords
        const trimmedWords = trimStopWordsFromEdges(rawWords);
        if (trimmedWords.length === 0) continue;

        if (!isValidPhraseStructure(trimmedWords)) continue;

        const phrase = trimmedWords.join(' ');
        if (phrase.length < 2 || phrase.length > 60) continue;

        if (isArtifactOrGarbage(phrase)) continue;

        const firstPosition = windowTokens[0].index;

        const existing = candidateMap.get(phrase);
        if (existing) {
          existing.frequency++;
          if (firstPosition < existing.firstPosition) {
            existing.firstPosition = firstPosition;
          }
        } else {
          const stemmedPhrase = trimmedWords.map((w) => stemWord(w)).join(' ');
          const nGramSize = Math.min(5, Math.max(1, trimmedWords.length)) as 1 | 2 | 3 | 4 | 5;

          const inTitle = titleLower.includes(phrase);
          const inH1 = h1Lower.includes(phrase);
          const inH2H6 = h2Lower.includes(phrase);
          const inMeta = metaLower.includes(phrase);
          const inMainContent = mainLower.includes(phrase);
          const inAlt = altLower.includes(phrase);
          const inAnchor = anchorLower.includes(phrase);
          const inUrl = urlSlug.includes(phrase);

          const inNav = navLower.includes(phrase);
          const inFooter = footerLower.includes(phrase);
          const inNavOnly = inNav && !inMainContent && !inTitle && !inH1;
          const inFooterOnly = inFooter && !inMainContent && !inTitle && !inH1;

          const qualityScore = calculateKeywordQualityScore(phrase, {
            inTitle,
            inH1,
            inH2H6,
            inMeta,
            inMainContent,
            inNavOnly,
            inFooterOnly,
            frequency: 1,
            wordCount: trimmedWords.length,
          });

          // Only add candidate if it passes the quality threshold
          if (qualityScore >= QUALITY_THRESHOLD) {
            candidateMap.set(phrase, {
              phrase,
              stemmedPhrase,
              words: trimmedWords,
              nGramSize,
              frequency: 1,
              firstPosition,
              qualityScore,
              inTitle,
              inH1,
              inH2H6,
              inMeta,
              inMainContent,
              inAlt,
              inAnchor,
              inUrl,
            });
          }
        }
      }
    }
  }

  // Also extract explicit high-value heading phrases if not already caught
  const headingPhrases = [...(input.h1List || []), ...(input.h2H6List || [])];
  for (const hText of headingPhrases) {
    const hTokens = tokenizeSentence(hText, 0);
    if (hTokens.length >= 1 && hTokens.length <= 5) {
      const words = trimStopWordsFromEdges(hTokens.map((t) => t.token));
      if (words.length > 0 && isValidPhraseStructure(words)) {
        const phrase = words.join(' ');
        if (!candidateMap.has(phrase) && !isArtifactOrGarbage(phrase)) {
          const inTitle = titleLower.includes(phrase);
          const inH1 = h1Lower.includes(phrase);
          const inH2H6 = h2Lower.includes(phrase);
          const inMeta = metaLower.includes(phrase);
          const inMainContent = mainLower.includes(phrase);
          const inAlt = altLower.includes(phrase);
          const inAnchor = anchorLower.includes(phrase);
          const inUrl = urlSlug.includes(phrase);

          const qualityScore = calculateKeywordQualityScore(phrase, {
            inTitle,
            inH1,
            inH2H6,
            inMeta,
            inMainContent,
            frequency: 1,
            wordCount: words.length,
          });

          if (qualityScore >= QUALITY_THRESHOLD) {
            candidateMap.set(phrase, {
              phrase,
              stemmedPhrase: words.map((w) => stemWord(w)).join(' '),
              words,
              nGramSize: Math.min(5, Math.max(1, words.length)) as 1 | 2 | 3 | 4 | 5,
              frequency: 1,
              firstPosition: 0,
              qualityScore,
              inTitle,
              inH1,
              inH2H6,
              inMeta,
              inMainContent,
              inAlt,
              inAnchor,
              inUrl,
            });
          }
        }
      }
    }
  }

  return candidateMap;
}
