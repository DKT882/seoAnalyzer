import { isStopWord, isAllStopWords, trimStopWordsFromEdges } from './stopwords.js';
import { stemWord } from './stemmer.js';

export interface TokenPosition {
  token: string;
  original: string;
  stem: string;
  index: number;
}

export interface NGramCandidate {
  phrase: string;
  stemmedPhrase: string;
  words: string[];
  nGramSize: 1 | 2 | 3 | 4;
  frequency: number;
  firstPosition: number;
}

/**
 * Robust tokenizer that preserves original casing representation while returning cleaned lowercase tokens.
 */
export function tokenizeText(text: string): TokenPosition[] {
  if (!text || typeof text !== 'string') return [];

  // Match words, hyphenated compounds, and alphanumeric terms
  const regex = /[a-zA-Z0-9]+(?:[-'][a-zA-Z0-9]+)*/g;
  const tokens: TokenPosition[] = [];
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = regex.exec(text)) !== null) {
    const original = match[0];
    const cleaned = original.toLowerCase();

    // Skip pure numbers or 1-character tokens unless meaningful
    if (cleaned.length > 1 && !/^\d+$/.test(cleaned)) {
      tokens.push({
        token: cleaned,
        original,
        stem: stemWord(cleaned),
        index,
      });
    }
    index++;
  }

  return tokens;
}

/**
 * Extracts N-gram phrases (1, 2, 3, 4 words) from tokens while applying SEO phrase filters.
 */
export function extractNGrams(tokens: TokenPosition[]): Map<string, NGramCandidate> {
  const candidates = new Map<string, NGramCandidate>();
  const totalTokens = tokens.length;

  for (let n = 1; n <= 4; n++) {
    for (let i = 0; i <= totalTokens - n; i++) {
      const windowTokens = tokens.slice(i, i + n);
      const words = windowTokens.map((t) => t.token);

      // Rule 1: Skip if all words in n-gram are stopwords
      if (isAllStopWords(words)) continue;

      // Rule 2: For 1-grams, strictly discard standalone stop words
      if (n === 1 && isStopWord(words[0])) continue;

      // Rule 3: For multi-grams (n >= 2), do not allow starting or ending with stop words
      const trimmedWords = trimStopWordsFromEdges(words);
      if (trimmedWords.length === 0) continue;

      const phrase = trimmedWords.join(' ');
      if (phrase.length < 3) continue;

      const stemmedPhrase = trimmedWords.map((w) => stemWord(w)).join(' ');
      const nGramSize = trimmedWords.length as 1 | 2 | 3 | 4;
      const firstPosition = windowTokens[0].index;

      const existing = candidates.get(phrase);
      if (existing) {
        existing.frequency++;
        if (firstPosition < existing.firstPosition) {
          existing.firstPosition = firstPosition;
        }
      } else {
        candidates.set(phrase, {
          phrase,
          stemmedPhrase,
          words: trimmedWords,
          nGramSize,
          frequency: 1,
          firstPosition,
        });
      }
    }
  }

  return candidates;
}
