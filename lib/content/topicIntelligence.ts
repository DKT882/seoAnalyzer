import {
  TopicCoverageItem,
  TopicCoverageStatus,
  EntityItem,
  ContentBlock,
  HeadingItem,
} from '@/types';

const COMMON_STOPWORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren\'t', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'can', 'can\'t', 'cannot',
  'could', 'couldn\'t', 'did', 'didn\'t', 'do', 'does', 'doesn\'t', 'doing', 'don\'t', 'down', 'during', 'each',
  'few', 'for', 'from', 'further', 'had', 'hadn\'t', 'has', 'hasn\'t', 'have', 'haven\'t', 'having', 'he', 'he\'d',
  'he\'ll', 'he\'s', 'her', 'here', 'here\'s', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'how\'s', 'i',
  'i\'d', 'i\'ll', 'i\'m', 'i\'ve', 'if', 'in', 'into', 'is', 'isn\'t', 'it', 'it\'s', 'its', 'itself', 'let\'s',
  'me', 'more', 'most', 'mustn\'t', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or',
  'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'shan\'t', 'she', 'she\'d', 'she\'ll',
  'she\'s', 'should', 'shouldn\'t', 'so', 'some', 'such', 'than', 'that', 'that\'s', 'the', 'their', 'theirs', 'them',
  'themselves', 'then', 'there', 'there\'s', 'these', 'they', 'they\'d', 'they\'ll', 'they\'re', 'they\'ve', 'this',
  'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'wasn\'t', 'we', 'we\'d', 'we\'ll', 'we\'re',
  'we\'ve', 'were', 'weren\'t', 'what', 'what\'s', 'when', 'when\'s', 'where', 'where\'s', 'which', 'while', 'who',
  'who\'s', 'whom', 'why', 'why\'s', 'with', 'won\'t', 'would', 'wouldn\'t', 'you', 'you\'d', 'you\'ll', 'you\'re',
  'you\'ve', 'your', 'yours', 'yourself', 'yourselves', 'click', 'read', 'more', 'view', 'page', 'site', 'website',
  'menu', 'home', 'back', 'top', 'contact', 'privacy', 'terms', 'rights', 'reserved', 'copyright',
  // Time/Calendar terms
  'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december',
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  'today', 'yesterday', 'tomorrow', 'minute', 'minutes', 'hour', 'hours', 'day', 'days', 'month', 'months', 'year', 'years',
  'ago', 'updated', 'published', 'author', 'share', 'tweet', 'email', 'print', 'prev', 'next', 'previous',
  // Generic UI/Navigation actions
  'close', 'open', 'search', 'submit', 'login', 'signup', 'sign', 'cart', 'checkout', 'subscribe', 'newsletter',
  'cookie', 'cookies', 'accept', 'decline', 'settings', 'modal', 'popup', 'toggle', 'dropdown', 'button', 'link',
  'here', 'details', 'item', 'items', 'pages', 'policy', 'conditions', 'about', 'learn', 'check', 'explore'
]);

interface TopicIntelligenceInput {
  title: string;
  metaDescription: string;
  h1Text?: string;
  headings: HeadingItem[];
  blocks: ContentBlock[];
  mainContentText: string;
  targetKeywords?: string[];
}

export interface ExtractedTopicIntelligence {
  primaryTopics: TopicCoverageItem[];
  secondaryTopics: TopicCoverageItem[];
  entities: EntityItem[];
  overallTopicScore: number;
}

/**
 * Extracts and maps contextual topic coverage from parsed main content and structural headings.
 */
export function extractTopicIntelligence(input: TopicIntelligenceInput): ExtractedTopicIntelligence {
  const { title, metaDescription, h1Text, headings, blocks, mainContentText, targetKeywords } = input;
  const lowerTitle = (title || '').toLowerCase();
  const lowerMeta = (metaDescription || '').toLowerCase();
  const lowerH1 = (h1Text || '').toLowerCase();
  const lowerBody = (mainContentText || '').toLowerCase();

  // 1. Build word and phrase frequency map from main content
  const phraseCounts = new Map<string, { count: number; locations: Set<string>; sampleSnippet: string }>();

  function registerPhrase(phrase: string, location: string, snippet?: string) {
    const clean = phrase.trim().toLowerCase();
    if (!clean || clean.length < 3 || COMMON_STOPWORDS.has(clean)) return;

    // Reject all-number or symbol phrases
    if (/^[\d\s.,!?$-]+$/.test(clean)) return;

    let entry = phraseCounts.get(clean);
    if (!entry) {
      entry = { count: 0, locations: new Set<string>(), sampleSnippet: snippet || '' };
      phraseCounts.set(clean, entry);
    }
    entry.count += 1;
    entry.locations.add(location);
    if (!entry.sampleSnippet && snippet) {
      entry.sampleSnippet = snippet;
    }
  }

  // Register from Title, Meta, H1
  if (lowerTitle) {
    extractPhrasesFromText(lowerTitle).forEach((p) => registerPhrase(p, 'Title', title));
  }
  if (lowerH1) {
    extractPhrasesFromText(lowerH1).forEach((p) => registerPhrase(p, 'H1', h1Text));
  }
  if (lowerMeta) {
    extractPhrasesFromText(lowerMeta).forEach((p) => registerPhrase(p, 'Meta Description', metaDescription));
  }

  // Register from Headings
  headings.forEach((h) => {
    const loc = `H${h.level}`;
    extractPhrasesFromText(h.text.toLowerCase()).forEach((p) => registerPhrase(p, loc, h.text));
  });

  // Register from Content Blocks
  blocks.forEach((b) => {
    if (b.isMainContent) {
      const phrases = extractPhrasesFromText(b.text.toLowerCase());
      const snippet = b.text.length > 100 ? `${b.text.slice(0, 97)}...` : b.text;
      phrases.forEach((p) => registerPhrase(p, b.type === 'heading' ? `H${b.headingLevel || 2}` : 'Body Paragraphs', snippet));
    }
  });

  // Also include explicit target keywords if provided
  if (targetKeywords && targetKeywords.length > 0) {
    targetKeywords.forEach((tk) => {
      const cleanTk = tk.trim().toLowerCase();
      if (!cleanTk) return;
      const locations = new Set<string>();
      let count = 0;
      if (lowerTitle.includes(cleanTk)) { locations.add('Title'); count++; }
      if (lowerH1.includes(cleanTk)) { locations.add('H1'); count++; }
      if (lowerMeta.includes(cleanTk)) { locations.add('Meta Description'); count++; }
      headings.forEach((h) => {
        if (h.text.toLowerCase().includes(cleanTk)) {
          locations.add(`H${h.level}`);
          count++;
        }
      });
      const regex = new RegExp(`\\b${escapeRegExp(cleanTk)}\\b`, 'gi');
      const matches = lowerBody.match(regex);
      if (matches) {
        count += matches.length;
        locations.add('Body Paragraphs');
      }
      
      const snippetMatches = mainContentText.match(new RegExp(`([^.!?]*?\\b${escapeRegExp(cleanTk)}\\b[^.!?]*)`, 'i'));
      const sampleSnippet = snippetMatches ? snippetMatches[1].trim() : '';

      let entry = phraseCounts.get(cleanTk);
      if (!entry) {
        phraseCounts.set(cleanTk, { count, locations, sampleSnippet });
      } else {
        entry.count = Math.max(entry.count, count);
        locations.forEach((l) => entry!.locations.add(l));
      }
    });
  }

  // 2. Score and categorize topics
  const candidates: Array<{
    topic: string;
    count: number;
    locations: string[];
    score: number;
    snippet: string;
    isMain: boolean;
  }> = [];

  phraseCounts.forEach((val, topic) => {
    const locations = Array.from(val.locations);
    let prominence = 0;
    if (val.locations.has('H1')) prominence += 35;
    if (val.locations.has('Title')) prominence += 30;
    if (val.locations.has('H2') || val.locations.has('H3')) prominence += 20;
    if (val.locations.has('Body Paragraphs')) prominence += 15;
    if (val.locations.has('Meta Description')) prominence += 10;

    const frequencyScore = Math.min(30, val.count * 5);
    const score = prominence + frequencyScore;

    const isMain = val.locations.has('H1') || (val.locations.has('Title') && val.count >= 2);

    candidates.push({
      topic,
      count: val.count,
      locations,
      score,
      snippet: val.sampleSnippet,
      isMain,
    });
  });

  // Sort by score
  candidates.sort((a, b) => b.score - a.score);

  // Determine coverage status
  function resolveStatus(c: { count: number; locations: string[]; score: number }): TopicCoverageStatus {
    if (c.count >= 5 && c.locations.length >= 3) return 'DEEPLY_COVERED';
    if (c.count >= 3 && c.locations.length >= 2) return 'MEANINGFULLY_COVERED';
    if (c.count >= 2 || c.locations.length >= 2) return 'BRIEFLY_COVERED';
    if (c.count >= 1) return 'MENTIONED';
    return 'NOT_DETECTED';
  }

  const primaryTopics: TopicCoverageItem[] = [];
  const secondaryTopics: TopicCoverageItem[] = [];

  candidates.forEach((c) => {
    const item: TopicCoverageItem = {
      topic: c.topic,
      status: resolveStatus(c),
      occurrences: c.count,
      locationsFound: c.locations,
      contextSnippet: c.snippet,
      isMainTopic: c.isMain,
    };

    if (c.isMain || (primaryTopics.length < 4 && c.score >= 40)) {
      if (primaryTopics.length < 6) {
        primaryTopics.push(item);
      } else if (secondaryTopics.length < 10) {
        secondaryTopics.push(item);
      }
    } else if (secondaryTopics.length < 12 && c.score >= 20) {
      secondaryTopics.push(item);
    }
  });

  // 3. Extract simple entities (proper nouns, capitalized technical acronyms, multi-word terms)
  const entities: EntityItem[] = [];
  const entityMatches = mainContentText.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*|[A-Z]{2,6})\b/g);
  if (entityMatches) {
    const entityCounts = new Map<string, number>();
    entityMatches.forEach((em) => {
      const trimmed = em.trim();
      if (trimmed.length > 2 && !COMMON_STOPWORDS.has(trimmed.toLowerCase())) {
        entityCounts.set(trimmed, (entityCounts.get(trimmed) || 0) + 1);
      }
    });

    Array.from(entityCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([name, occurrences]) => {
        entities.push({
          name,
          type: /^[A-Z]{2,}$/.test(name) ? 'ACRONYM_ORGANIZATION' : 'ENTITY_CONCEPT',
          occurrences,
          relevance: Math.min(100, occurrences * 20),
        });
      });
  }

  // Calculate overall topic coverage score (0-100)
  let topicScoreTotal = 0;
  if (primaryTopics.length > 0) {
    const deepCount = primaryTopics.filter((t) => t.status === 'DEEPLY_COVERED').length;
    const meaningfulCount = primaryTopics.filter((t) => t.status === 'MEANINGFULLY_COVERED').length;
    const briefCount = primaryTopics.filter((t) => t.status === 'BRIEFLY_COVERED').length;

    topicScoreTotal = Math.min(
      100,
      deepCount * 30 + meaningfulCount * 22 + briefCount * 12 + secondaryTopics.length * 4
    );
  } else {
    topicScoreTotal = blocks.length > 0 ? 50 : 20;
  }

  return {
    primaryTopics,
    secondaryTopics,
    entities,
    overallTopicScore: Math.min(100, Math.max(10, Math.round(topicScoreTotal))),
  };
}

function extractPhrasesFromText(text: string): string[] {
  const words = text
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !COMMON_STOPWORDS.has(w.toLowerCase()));

  const phrases: string[] = [];
  // 1-grams
  words.forEach((w) => phrases.push(w));

  // 2-grams
  for (let i = 0; i < words.length - 1; i++) {
    phrases.push(`${words[i]} ${words[i + 1]}`);
  }

  // 3-grams
  for (let i = 0; i < words.length - 2; i++) {
    phrases.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
  }

  return phrases;
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
