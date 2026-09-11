/**
 * SEO Intel Pro - Production-Quality Keyword Extraction & Intelligence Engine
 * Extracts genuine SEO keywords from clean DOM content, generates sentence-bounded candidates,
 * detects primary keywords with evidence, produces actionable recommendations and opportunities,
 * and strictly separates EXTRACTED vs RECOMMENDED vs EXTERNAL data sources.
 */

import { generateCleanCandidates, CandidatePhrase } from './candidateGenerator';
import { detectPrimaryKeyword } from './primaryKeywordDetector';
import { generateRecommendedKeywords } from './recommendedKeywords';
import { calculateProminenceScore } from './prominence';
import { calculateInternalTfIdf } from '../nlp/tfidf';
import { calculateKeywordScore } from './scoring';
import { clusterKeywords, extractEntities } from '../nlp/clusterer';
import { extractCleanContent, ExtractedPageContent } from '../parser/contentExtractor';
import { cleanRawText, segmentSentences } from '../nlp/textCleaner';
import { isArtifactOrGarbage } from '../nlp/artifactFilter';
import { QUESTION_STARTERS } from '../nlp/stopwords';
import {
  KeywordItem,
  NGramType,
  KeywordOpportunityItem,
  OnPageData,
  LinksAnalysis,
  ImagesAnalysis,
  TopicCluster,
  EntityItem,
  SearchIntent,
} from '@/types';
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
  recommended: KeywordItem[];
  recommendationNotice?: string;
  primaryKeywordDetails: {
    keyword: string;
    confidenceScore: number;
    evidence: string[];
  };
  totalWords: number;
  uniqueWords: number;
}

/**
 * Main entry point for single-page and multi-page keyword intelligence extraction.
 */
export function extractAndScoreKeywords(
  visibleText: string,
  onPage: OnPageData,
  links: LinksAnalysis,
  images: ImagesAnalysis,
  pageUrl: string,
  rawHtml?: string
): ExtractedKeywordsResult {
  // 1. Prepare Clean Content & Sentence Segments
  let cleanContent: ExtractedPageContent;
  if (rawHtml && typeof rawHtml === 'string' && rawHtml.length > 0) {
    cleanContent = extractCleanContent(rawHtml);
  } else {
    const cleaned = cleanRawText(visibleText);
    const sentences = segmentSentences(cleaned);
    const h1Items = onPage.headings?.items?.filter((h) => h.level === 1).map((h) => h.text) || [];
    const h2H6Items = onPage.headings?.items?.filter((h) => h.level >= 2).map((h) => h.text) || [];
    const altList = images.images.map((img) => img.alt).filter(Boolean);
    const anchorList = (links.internalLinks || []).concat(links.externalLinks || []).map((l) => l.text).filter(Boolean);

    cleanContent = {
      cleanVisibleText: cleaned,
      cleanFullText: cleaned,
      mainContentText: cleaned,
      title: onPage.title || '',
      metaDescription: onPage.metaDescription || '',
      h1List: h1Items,
      h2H6List: h2H6Items,
      navText: '',
      footerText: '',
      altTexts: altList,
      anchorTexts: anchorList,
      sentences,
    };
  }

  // Count clean words
  const wordsArray = cleanContent.cleanVisibleText
    .toLowerCase()
    .match(/[a-zA-Z0-9]+(?:[-'][a-zA-Z0-9]+)*/g) || [];
  const totalWords = wordsArray.length;
  const uniqueWords = new Set(wordsArray).size;

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
      recommended: [],
      primaryKeywordDetails: {
        keyword: onPage.title || 'General Topic',
        confidenceScore: 50,
        evidence: ['No text content found on page'],
      },
      totalWords: 0,
      uniqueWords: 0,
    };
  }

  // 2. Generate Candidate Phrases (Sentence-Bounded, strictly filtered)
  const candidateMap = generateCleanCandidates({
    sentences: cleanContent.sentences,
    title: cleanContent.title,
    metaDescription: cleanContent.metaDescription,
    h1List: cleanContent.h1List,
    h2H6List: cleanContent.h2H6List,
    mainContentText: cleanContent.mainContentText,
    altTexts: cleanContent.altTexts,
    anchorTexts: cleanContent.anchorTexts,
    pageUrl,
    navText: cleanContent.navText,
    footerText: cleanContent.footerText,
  });

  const candidatesList: CandidatePhrase[] = Array.from(candidateMap.values());

  // 3. Detect Primary Keyword with Multi-Signal Evidence
  const primaryResult = detectPrimaryKeyword({
    candidates: candidatesList,
    title: cleanContent.title,
    h1: cleanContent.h1List[0] || '',
    metaDescription: cleanContent.metaDescription,
    totalWords,
  });

  // 4. Score and Format all Valid Candidates
  const allKeywordItems: KeywordItem[] = [];

  for (const cand of candidatesList) {
    const phrase = cand.phrase;
    const wordCountInPhrase = cand.words.length;

    // Reject candidates with quality below 60
    if (cand.qualityScore < 60 || isArtifactOrGarbage(phrase)) {
      continue;
    }

    // Minimum frequency filter to avoid noisy 1-off phrases unless present in title or H1
    if (cand.frequency === 1 && wordCountInPhrase >= 2 && !cand.inTitle && !cand.inH1) {
      continue;
    }

    // Density calculation
    const density = parseFloat(
      (((cand.frequency * wordCountInPhrase) / totalWords) * 100).toFixed(2)
    );

    // Prominence score
    const prominenceScore = calculateProminenceScore(cand.firstPosition, totalWords);

    // Section hits
    let sectionsHit = 1;
    if (cand.inTitle) sectionsHit++;
    if (cand.inH1) sectionsHit++;
    if (cand.inH2H6) sectionsHit++;
    if (cand.inMeta) sectionsHit++;
    if (cand.inAlt) sectionsHit++;
    const internalTfIdf = calculateInternalTfIdf(cand.frequency, totalWords, sectionsHit, 6);

    const scoringResult = calculateKeywordScore({
      frequency: cand.frequency,
      density,
      prominenceScore,
      internalTfIdf,
      inTitle: cand.inTitle,
      inH1: cand.inH1,
      inH2H6: cand.inH2H6,
      inMeta: cand.inMeta,
      inUrl: cand.inUrl,
      inAnchor: cand.inAnchor,
      inAlt: cand.inAlt,
      inBody: true,
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

    // Estimate Search Intent
    let searchIntent: SearchIntent = 'Informational';
    const firstWord = cand.words[0].toLowerCase();
    if (QUESTION_STARTERS.has(firstWord) || phrase.startsWith('how to') || phrase.startsWith('what is')) {
      searchIntent = 'Informational';
    } else if (phrase.includes('buy') || phrase.includes('price') || phrase.includes('download') || phrase.includes('coupon') || phrase.includes('order')) {
      searchIntent = 'Transactional';
    } else if (phrase.includes('best') || phrase.includes('review') || phrase.includes('top') || phrase.includes('vs') || phrase.includes('software') || phrase.includes('tool')) {
      searchIntent = 'Commercial';
    }

    const isQuestion =
      QUESTION_STARTERS.has(firstWord) ||
      phrase.startsWith('how ') ||
      phrase.startsWith('what ') ||
      phrase.startsWith('why ') ||
      phrase.startsWith('when ') ||
      phrase.startsWith('where ') ||
      phrase.startsWith('which ') ||
      phrase.startsWith('can ') ||
      phrase.startsWith('should ') ||
      phrase.endsWith('?');

    allKeywordItems.push({
      id: `kw-${crypto.randomUUID().slice(0, 8)}`,
      keyword: phrase,
      nGramType,
      category: 'secondary', // Refined below
      source: 'EXTRACTED',
      frequency: cand.frequency,
      density,
      prominenceScore,
      overallScore: scoringResult.overallScore,
      inTitle: cand.inTitle,
      inH1: cand.inH1,
      inH2H6: cand.inH2H6,
      inMeta: cand.inMeta,
      inUrl: cand.inUrl,
      inAnchor: cand.inAnchor,
      inAlt: cand.inAlt,
      inBody: true,
      wordCount: wordCountInPhrase,
      qualityScore: cand.qualityScore,
      searchIntent,
      semanticCategory: isQuestion ? 'Question Query' : wordCountInPhrase >= 3 ? 'Long-Tail Query' : 'Core Keyword',
      topicCluster: cand.words[0],
      isQuestion,
      confidence: cand.qualityScore,
      reason: `Extracted from visible content (occurred ${cand.frequency}x)`,
      externalSearchVolume: 'External SEO data unavailable',
      externalDifficulty: 'Requires SEO data provider',
      externalCpc: 'External SEO data unavailable',
      externalIntent: 'Requires SEO data provider',
    });
  }

  // Sort all extracted keywords by overall score descending
  allKeywordItems.sort((a, b) => b.overallScore - a.overallScore || b.frequency - a.frequency);

  // 5. Categorize Extracted Keywords
  const primary: KeywordItem[] = [];
  const secondary: KeywordItem[] = [];
  const shortTail: KeywordItem[] = [];
  const longTail: KeywordItem[] = [];
  const related: KeywordItem[] = [];
  const questions: KeywordItem[] = [];

  const primaryLower = primaryResult.keyword.toLowerCase();

  for (const item of allKeywordItems) {
    // Question classification
    if (item.isQuestion) {
      item.category = 'question';
      if (questions.length < 20) questions.push(item);
    }

    // Short-tail vs Long-tail
    if (item.nGramType === '1-gram' || item.nGramType === '2-gram') {
      if (shortTail.length < 25) shortTail.push({ ...item, category: 'short-tail' });
    } else {
      if (longTail.length < 25) longTail.push({ ...item, category: 'long-tail' });
    }

    // Primary Keyword Assignment
    const isExactPrimary = item.keyword.toLowerCase() === primaryLower;
    if (
      (isExactPrimary || (primary.length === 0 && (item.inTitle || item.inH1))) &&
      primary.length < 3 &&
      !item.isQuestion
    ) {
      item.category = 'primary';
      item.confidence = primaryResult.confidenceScore;
      item.evidence = primaryResult.evidence;
      primary.push(item);
    } else if (item.overallScore >= 35 && secondary.length < 25 && !item.isQuestion) {
      item.category = 'secondary';
      secondary.push(item);
    } else if (related.length < 25 && !item.isQuestion) {
      item.category = 'related';
      related.push(item);
    }
  }

  // If primary keyword is not yet in primary array, add it
  if (primary.length === 0 && allKeywordItems.length > 0) {
    const topItem = allKeywordItems[0];
    topItem.category = 'primary';
    topItem.confidence = primaryResult.confidenceScore;
    topItem.evidence = primaryResult.evidence;
    primary.push(topItem);
  }

  // 6. Generate Entities & Topic Clusters
  const clusters = clusterKeywords(allKeywordItems);
  const entities = extractEntities(cleanContent.cleanVisibleText, allKeywordItems);

  // 7. Generate Keyword Opportunities
  const opportunities: KeywordOpportunityItem[] = [];
  for (const item of allKeywordItems) {
    if (opportunities.length >= 15) break;

    const missingFromTitle = !item.inTitle;
    const missingFromH1 = !item.inH1;
    const missingFromMeta = !item.inMeta;
    const missingFromAlt = !item.inAlt;

    const missingHighValueZone = (missingFromTitle || missingFromH1) && item.frequency >= 2;

    if (missingHighValueZone || (item.overallScore >= 40 && missingFromTitle)) {
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

  opportunities.sort((a, b) => b.opportunityScore - a.opportunityScore);

  // 8. Generate Context-Grounded Recommended Keywords (Category: RECOMMENDED)
  const headingsList = [...cleanContent.h1List, ...cleanContent.h2H6List];
  const recommended = generateRecommendedKeywords({
    primaryKeyword: primaryResult.keyword,
    extractedKeywords: allKeywordItems,
    title: cleanContent.title,
    h1: cleanContent.h1List[0] || '',
    metaDescription: cleanContent.metaDescription,
    headingsList,
    pageUrl,
    totalWords,
    uniqueWords,
  });

  const recommendationNotice =
    recommended.length === 0
      ? totalWords < 80
        ? 'Page contains insufficient topical content to infer additional SEO targets reliably.'
        : 'No strong keyword recommendations found from the available page/site content.'
      : undefined;

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
    recommended,
    recommendationNotice,
    primaryKeywordDetails: primaryResult,
    totalWords,
    uniqueWords,
  };
}
