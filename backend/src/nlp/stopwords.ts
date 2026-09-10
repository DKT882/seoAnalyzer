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
  // Common HTML/Web noise terms
  'click', 'here', 'read', 'more', 'view', 'page', 'site', 'website', 'home', 'menu', 'button',
  'contact', 'us', 'privacy', 'policy', 'terms', 'rights', 'reserved', 'copyright', 'login', 'sign'
]);

export function isStopWord(word: string): boolean {
  return STOP_WORDS.has(word.toLowerCase().trim());
}

/**
 * Checks if a phrase is made entirely of stop words.
 */
export function isAllStopWords(words: string[]): boolean {
  return words.every((w) => isStopWord(w));
}

/**
 * Checks if a multi-word phrase begins or ends with a stop word (e.g. "the web development of" -> trim edge stopwords).
 */
export function trimStopWordsFromEdges(words: string[]): string[] {
  let start = 0;
  let end = words.length - 1;

  while (start <= end && isStopWord(words[start])) {
    start++;
  }
  while (end >= start && isStopWord(words[end])) {
    end--;
  }

  return words.slice(start, end + 1);
}
