/**
 * Calculates positional prominence score (0 to 15 points) based on where the term first appears in the document stream.
 * Terms appearing in the first 100 words receive max prominence.
 */
export function calculateProminenceScore(firstPosition: number, totalWords: number): number {
  if (totalWords === 0 || firstPosition < 0) return 0;

  // Immediate bonus for the very first 100 words (lead paragraph)
  if (firstPosition <= 100) {
    return 15;
  }

  // Gradual decay from word 101 to word 1000
  if (firstPosition <= 1000) {
    const decay = 1 - (firstPosition - 100) / 900;
    return parseFloat((5 + 10 * decay).toFixed(2));
  }

  // Minimum base prominence if appearing later in the document
  return 2.5;
}
