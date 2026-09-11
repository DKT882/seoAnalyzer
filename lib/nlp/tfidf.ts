/**
 * Computes single-document Term Frequency - Inverse Section Frequency (TF-ISF).
 * For a single page analysis, this measures how distinctive a term is across the page's
 * structural zones (Headings, Lead Paragraphs, Main Body, Lists/Tables, Metadata).
 */
export function calculateInternalTfIdf(
  termFrequency: number,
  totalWordsInDoc: number,
  sectionsWithTerm: number,
  totalSections: number
): number {
  if (totalWordsInDoc === 0 || termFrequency === 0) return 0;

  // Augmented Term Frequency to prevent bias towards long documents
  const tf = 0.5 + 0.5 * (termFrequency / Math.max(1, totalWordsInDoc));

  // Inverse Section Frequency (smooth IDF across structural sections)
  const idf = Math.log(1 + (totalSections / Math.max(1, sectionsWithTerm)));

  return parseFloat((tf * idf).toFixed(4));
}
