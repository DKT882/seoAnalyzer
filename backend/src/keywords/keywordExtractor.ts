import { tokenizeText, extractNGrams } from '../nlp/tokenizer.js';
import { calculateProminenceScore } from './prominence.js';
import { calculateInternalTfIdf } from '../nlp/tfidf.js';
import { calculateKeywordScore } from './scoring.js';
import { clusterKeywords, extractEntities } from '../nlp/clusterer.js';
import {
  KeywordItem,
  NGramType,
  KeywordCategory,
  KeywordOpportunityItem,
  OnPageData,
  LinksAnalysis,
  ImagesAnalysis,
  TopicCluster,
  EntityItem,
  QUESTION_PREFIXES,
} from '@seo-analyzer/shared';
import crypto from 'node:crypto';

export interface ExtractedKeywordsResult {
  all: KeywordItem[];
  primary: KeywordItem[];
  secondary: KeywordItem[];
  shortTail: KeywordItem[];
  longTail: KeywordItem[];
  related: KeywordItem[];
  questions: KeywordItem[];
  entities: EntityItem[];
  clusters: TopicCluster[];
  opportunities: KeywordOpportunityItem[];
  totalWords: number;
  uniqueWords: number;
}

export function extractAndScoreKeywords(
  visibleText: string,
  onPage: OnPageData,
  links: LinksAnalysis,
  images: ImagesAnalysis,
  pageUrl: string
): ExtractedKeywordsResult {
  const tokens = tokenizeText(visibleText);
  const totalWords = tokens.length;
  const uniqueWords = new Set(tokens.map((t) => t.token)).size;

  if (totalWords === 0) {
    return {
      all: [],
      primary: [],
      secondary: [],
      shortTail: [],
      longTail: [],
      related: [],
      questions: [],
      entities: [],
      clusters: [],
      opportunities: [],
      totalWords: 0,
      uniqueWords: 0,
    };
  }

  // Pre-process comparison strings
  const titleLower = onPage.title.toLowerCase();
  const metaDescLower = onPage.metaDescription.toLowerCase();

  let urlSlug = '';
  try {
    const parsed = new URL(pageUrl);
    const rawPath = `${parsed.pathname} ${parsed.search}`;
    let decodedPath = rawPath;
    try {
      decodedPath = decodeURIComponent(rawPath);
    } catch {
      // fallback
    }
    urlSlug = `${rawPath} ${decodedPath}`.replace(/[-_./]/g, ' ').toLowerCase();
  } catch {
    urlSlug = pageUrl.toLowerCase();
  }

  const h1Texts = onPage.headings.items
    .filter((h) => h.level === 1)
    .map((h) => h.text.toLowerCase())
    .join(' ');

  const h2H6Texts = onPage.headings.items
    .filter((h) => h.level >= 2)
    .map((h) => h.text.toLowerCase())
    .join(' ');

  const anchorTexts = links.internalLinks
    .concat(links.externalLinks)
    .map((l) => l.text.toLowerCase())
    .join(' ');

  const altTexts = images.images.map((img) => img.alt.toLowerCase()).join(' ');

  // Extract N-gram candidates (1 to 4 words)
  const nGramCandidates = extractNGrams(tokens);
  const allKeywordItems: KeywordItem[] = [];

  for (const candidate of nGramCandidates.values()) {
    const phrase = candidate.phrase;
    const phraseLower = phrase.toLowerCase();
    const wordCountInPhrase = candidate.words.length;

    // Minimum frequency filter to avoid noisy 1-off phrases unless present in title or H1
    const inTitle = titleLower.includes(phraseLower);
    const inH1 = h1Texts.includes(phraseLower);
    if (candidate.frequency === 1 && wordCountInPhrase >= 2 && !inTitle && !inH1) {
      continue;
    }

    const inMeta = metaDescLower.includes(phraseLower);
    const inUrl = urlSlug.includes(phraseLower);
    const inH2H6 = h2H6Texts.includes(phraseLower);
    const inAnchor = anchorTexts.includes(phraseLower);
    const inAlt = altTexts.includes(phraseLower);
    const inBody = true;

    // Calculate keyword density
    const density = parseFloat(
      (((candidate.frequency * wordCountInPhrase) / totalWords) * 100).toFixed(2)
    );

    // Calculate positional prominence
    const prominenceScore = calculateProminenceScore(candidate.firstPosition, totalWords);

    // Calculate section-based TF-IDF
    let sectionsHit = 1; // body
    if (inTitle) sectionsHit++;
    if (inH1) sectionsHit++;
    if (inH2H6) sectionsHit++;
    if (inMeta) sectionsHit++;
    if (inAlt) sectionsHit++;
    const internalTfIdf = calculateInternalTfIdf(candidate.frequency, totalWords, sectionsHit, 6);

    // Calculate 0-100 score
    const scoringResult = calculateKeywordScore({
      frequency: candidate.frequency,
      density,
      prominenceScore,
      internalTfIdf,
      inTitle,
      inH1,
      inH2H6,
      inMeta,
      inUrl,
      inAnchor,
      inAlt,
      inBody,
      wordCountInPhrase,
    });

    const nGramType: NGramType =
      wordCountInPhrase === 1
        ? '1-gram'
        : wordCountInPhrase === 2
        ? '2-gram'
        : wordCountInPhrase === 3
        ? '3-gram'
        : 'long-tail';

    allKeywordItems.push({
      id: `kw-${crypto.randomUUID().slice(0, 8)}`,
      keyword: phrase,
      nGramType,
      category: 'secondary', // refined below
      frequency: candidate.frequency,
      density,
      prominenceScore,
      overallScore: scoringResult.overallScore,
      inTitle,
      inH1,
      inH2H6,
      inMeta,
      inUrl,
      inAnchor,
      inAlt,
      inBody,
      wordCount: wordCountInPhrase,
      semanticCategory: wordCountInPhrase >= 3 ? 'Long-Tail Query' : 'Core Keyword',
      topicCluster: candidate.words[0],
      externalSearchVolume: 'External SEO data unavailable',
      externalDifficulty: 'Requires SEO data provider',
      externalCpc: 'External SEO data unavailable',
      externalIntent: 'Requires SEO data provider',
    });
  }

  // Sort all keywords by overall score descending
  allKeywordItems.sort((a, b) => b.overallScore - a.overallScore || b.frequency - a.frequency);

  // Classify keywords into Primary, Secondary, Short-Tail, Long-Tail, Related, Questions
  const primary: KeywordItem[] = [];
  const secondary: KeywordItem[] = [];
  const shortTail: KeywordItem[] = [];
  const longTail: KeywordItem[] = [];
  const related: KeywordItem[] = [];
  const questions: KeywordItem[] = [];

  for (const item of allKeywordItems) {
    const isQuestion = QUESTION_PREFIXES.some((prefix) =>
      item.keyword.toLowerCase().startsWith(prefix + ' ')
    );

    if (isQuestion) {
      item.category = 'question';
      if (questions.length < 20) questions.push(item);
    }

    if (item.nGramType === '1-gram' || item.nGramType === '2-gram') {
      if (shortTail.length < 25) shortTail.push({ ...item, category: 'short-tail' });
    } else {
      if (longTail.length < 25) longTail.push({ ...item, category: 'long-tail' });
    }

    if (
      primary.length < 5 &&
      item.overallScore >= 45 &&
      (item.inTitle || item.inH1 || item.inUrl) &&
      !isQuestion
    ) {
      item.category = 'primary';
      primary.push(item);
    } else if (item.overallScore >= 30 && secondary.length < 25 && !isQuestion) {
      item.category = 'secondary';
      secondary.push(item);
    } else if (related.length < 25 && !isQuestion) {
      item.category = 'related';
      related.push(item);
    }
  }

  // Generate Topic Clusters and Entities
  const clusters = clusterKeywords(allKeywordItems);
  const entities = extractEntities(visibleText, allKeywordItems);

  // Generate Keyword Opportunities
  // High-frequency or high-score terms that are missing from Title or H1 or Meta
  const opportunities: KeywordOpportunityItem[] = [];
  for (const item of allKeywordItems) {
    if (opportunities.length >= 15) break;

    const missingFromTitle = !item.inTitle;
    const missingFromH1 = !item.inH1;
    const missingFromMeta = !item.inMeta;
    const missingFromAlt = !item.inAlt;

    const missingHighValueZone = (missingFromTitle || missingFromH1) && item.frequency >= 2;

    if (missingHighValueZone || (item.overallScore >= 35 && missingFromTitle)) {
      const locations: string[] = [];
      if (item.inTitle) locations.push('Title');
      if (item.inH1) locations.push('H1');
      if (item.inH2H6) locations.push('H2-H6');
      if (item.inMeta) locations.push('Meta Description');
      if (item.inAlt) locations.push('Image ALT');
      if (item.inBody) locations.push('Body');

      let targetPlacement = 'H2 Subsection & Meta Description';
      let action = `Incorporate "${item.keyword}" into an H2 heading and meta description to signal relevance.`;
      if (missingFromTitle && item.overallScore >= 50) {
        targetPlacement = 'Page Title & H1';
        action = `High semantic relevance: Consider including "${item.keyword}" in the <title> tag or primary H1.`;
      } else if (missingFromH1) {
        targetPlacement = 'Primary H1 / Lead Heading';
        action = `Add "${item.keyword}" to the main H1 or top introduction paragraph.`;
      }

      // Internal calculated opportunity score (0-100)
      const oppScore = Math.min(
        100,
        Math.round(
          item.overallScore * 0.5 +
            (missingFromTitle ? 25 : 0) +
            (missingFromH1 ? 20 : 0) +
            (item.frequency > 3 ? 15 : 5)
        )
      );

      const potential: 'HIGH' | 'MEDIUM' | 'LOW' =
        oppScore >= 70 ? 'HIGH' : oppScore >= 50 ? 'MEDIUM' : 'LOW';
      const difficultyEstimate: 'LOW' | 'MEDIUM' | 'HIGH' =
        item.wordCount && item.wordCount >= 3 ? 'LOW' : item.wordCount === 2 ? 'MEDIUM' : 'HIGH';

      opportunities.push({
        id: `opp-${crypto.randomUUID().slice(0, 8)}`,
        keyword: item.keyword,
        keywordType: item.category,
        wordCount: item.wordCount || 1,
        frequency: item.frequency,
        density: item.density,
        prominenceScore: item.prominenceScore,
        opportunityScore: oppScore,
        difficultyEstimate,
        potential,
        targetPlacement,
        recommendedAction: action,
        missingFromTitle,
        missingFromH1,
        missingFromMeta,
        missingFromAlt,
        currentLocations: locations,
      });
    }
  }

  // Sort opportunities by opportunity score descending
  opportunities.sort((a, b) => b.opportunityScore - a.opportunityScore);

  return {
    all: allKeywordItems.slice(0, 100),
    primary,
    secondary,
    shortTail,
    longTail,
    related,
    questions,
    entities,
    clusters,
    opportunities,
    totalWords,
    uniqueWords,
  };
}
