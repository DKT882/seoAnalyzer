import { describe, it } from 'node:test';
import assert from 'node:assert';
import { tokenizeText, extractNGrams } from '../src/nlp/tokenizer.js';
import { stemWord } from '../src/nlp/stemmer.js';
import { isStopWord, trimStopWordsFromEdges } from '../src/nlp/stopwords.js';
import { calculateProminenceScore } from '../src/keywords/prominence.js';
import { calculateInternalTfIdf } from '../src/nlp/tfidf.js';

describe('NLP & Keyword Processing Pipeline', () => {
  it('correctly stems English words with Porter Stemmer', () => {
    assert.strictEqual(stemWord('optimizing'), 'optim');
    assert.strictEqual(stemWord('optimization'), 'optim');
    assert.strictEqual(stemWord('developers'), 'develop');
    assert.strictEqual(stemWord('technologies'), 'technologi');
  });

  it('identifies stop words and prunes edges while preserving meaningful phrases', () => {
    assert.strictEqual(isStopWord('the'), true);
    assert.strictEqual(isStopWord('optimization'), false);

    const rawPhraseWords = ['the', 'best', 'seo', 'tools', 'for'];
    const trimmed = trimStopWordsFromEdges(rawPhraseWords);
    assert.deepStrictEqual(trimmed, ['best', 'seo', 'tools']);
  });

  it('tokenizes text and generates filtered N-grams (1-4 words)', () => {
    const text = 'Web development tools for modern engineers. Web development requires modern tools.';
    const tokens = tokenizeText(text);
    assert.strictEqual(tokens.length > 5, true);

    const nGrams = extractNGrams(tokens);
    assert.strictEqual(nGrams.has('web development'), true);
    assert.strictEqual(nGrams.has('modern tools'), true);
  });

  it('calculates decaying positional prominence score', () => {
    const pEarly = calculateProminenceScore(15, 500);
    const pMid = calculateProminenceScore(350, 500);
    const pLate = calculateProminenceScore(1200, 500);

    assert.strictEqual(pEarly, 15);
    assert.strictEqual(pEarly > pMid, true);
    assert.strictEqual(pMid > pLate, true);
  });

  it('computes TF-IDF based on structural section discrimination', () => {
    const tfidfHigh = calculateInternalTfIdf(5, 200, 1, 6);
    const tfidfLow = calculateInternalTfIdf(1, 200, 5, 6);
    assert.strictEqual(tfidfHigh > tfidfLow, true);
  });
});
