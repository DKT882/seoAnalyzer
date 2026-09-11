/**
 * SEO Intel Pro - Stopwords & Function Word Processing
 * Handles English stopwords with contextual awareness so natural long-tail keywords
 * (e.g. "how to improve website seo", "best seo tools for small business") are preserved
 * while meaningless grammatical fragments ("and the", "of the", "in a") are eliminated.
 */

// Core English stopwords & grammatical function words
export const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are',
  'aren', "aren't", 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between',
  'both', 'but', 'by', 'can', "can't", 'cannot', 'could', "couldn't", 'did', "didn't", 'do',
  'does', "doesn't", 'doing', "don't", 'down', 'during', 'each', 'few', 'for', 'from', 'further',
  'had', "hadn't", 'has', "hasn't", 'have', "haven't", 'having', 'he', "he'd", "he'll", "he's",
  'her', 'here', "here's", 'hers', 'herself', 'him', 'himself', 'his', 'how', "how's", 'i',
  "i'd", "i'll", "i'm", "i've", 'if', 'in', 'into', 'is', "isn't", 'it', "it's", 'its',
  'itself', 'let', "let's", 'me', 'more', 'most', "mustn't", 'my', 'myself', 'no', 'nor', 'not',
  'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out',
  'over', 'own', 'same', "shan't", 'she', "she'd", "she'll", "she's", 'should', "shouldn't", 'so',
  'some', 'such', 'than', 'that', "that's", 'the', 'their', 'theirs', 'them', 'themselves', 'then',
  'there', "there's", 'these', 'they', "they'd", "they'll", "they're", "they've", 'this', 'those',
  'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', "wasn't", 'we', "we'd", "we'll",
  "we're", "we've", 'were', "weren't", 'what', "what's", 'when', "when's", 'where', "where's",
  'which', 'while', 'who', "who's", 'whom', 'why', "why's", 'with', "won't", 'would', "wouldn't",
  'you', "you'd", "you'll", "you're", "you've", 'your', 'yours', 'yourself', 'yourselves',
  // Common conversational fillers
  'also', 'really', 'just', 'etc', 'via', 'vs', 'versus', 'whose', 'shall',
]);

// Question / Informational prefixes that are allowed at the start of multi-word queries
export const QUESTION_STARTERS = new Set([
  'how', 'what', 'why', 'when', 'where', 'which', 'who', 'whom', 'whose',
  'can', 'does', 'do', 'should', 'is', 'are', 'will', 'best', 'top', 'guide'
]);

// Dangling prepositions & conjunctions that cannot legally end a keyword phrase
export const DANGLING_END_WORDS = new Set([
  'and', 'or', 'the', 'a', 'an', 'of', 'in', 'to', 'for', 'with', 'on', 'at', 'from', 'by',
  'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between',
  'under', 'since', 'without', 'near', 'as', 'that', 'than', 'because', 'while', 'if'
]);

/**
 * Checks if a single word is a stop word.
 */
export function isStopWord(word: string): boolean {
  if (!word) return false;
  return STOP_WORDS.has(word.toLowerCase().trim());
}

/**
 * Checks if a single word is a valid question starter.
 */
export function isQuestionStarter(word: string): boolean {
  if (!word) return false;
  return QUESTION_STARTERS.has(word.toLowerCase().trim());
}

/**
 * Checks if an entire phrase consists only of stop words.
 */
export function isAllStopWords(words: string[]): boolean {
  if (!words || words.length === 0) return true;
  return words.every((w) => isStopWord(w));
}

/**
 * Calculates the proportion of stop words in a phrase (0.0 to 1.0).
 */
export function calculateStopwordRatio(words: string[]): number {
  if (!words || words.length === 0) return 1.0;
  const stopCount = words.filter((w) => isStopWord(w)).length;
  return stopCount / words.length;
}

/**
 * Trims leading and trailing stop words from an array of tokens while preserving
 * meaningful question and intent words (e.g. "how to do keyword research" keeps "how to").
 */
export function trimStopWordsFromEdges(words: string[]): string[] {
  if (!words || words.length === 0) return [];

  let start = 0;
  let end = words.length - 1;

  // If the phrase starts with a question starter and has at least 3 words, preserve it
  const startsWithQuestion = words.length >= 3 && isQuestionStarter(words[0]);

  if (!startsWithQuestion) {
    while (start <= end && isStopWord(words[start])) {
      start++;
    }
  }

  // Always trim dangling prepositions and conjunctions from the end of the phrase
  while (end >= start && (DANGLING_END_WORDS.has(words[end].toLowerCase()) || isStopWord(words[end]))) {
    end--;
  }

  if (start > end) return [];
  return words.slice(start, end + 1);
}

/**
 * Validates if the phrase structure is coherent for an SEO keyword.
 */
export function isValidPhraseStructure(words: string[]): boolean {
  if (!words || words.length === 0) return false;

  // Single word: must NOT be a stop word
  if (words.length === 1) {
    return !isStopWord(words[0]);
  }

  // Multi-word: must not be all stop words
  if (isAllStopWords(words)) {
    return false;
  }

  // Must not end with a dangling preposition/conjunction (e.g. "technical seo for", "audit of")
  const lastWord = words[words.length - 1].toLowerCase();
  if (DANGLING_END_WORDS.has(lastWord)) {
    return false;
  }

  // Must have a stop word ratio less than 65% for phrases >= 3 words
  if (words.length >= 3 && calculateStopwordRatio(words) > 0.65) {
    return false;
  }

  return true;
}
