import { PageType, PageTypeAssessment, ConfidenceLevel, SchemaItem, HeadingItem } from '@/types';

interface ClassifierInput {
  url: string;
  title: string;
  metaDescription: string;
  headings: HeadingItem[];
  schemas: SchemaItem[];
  mainContentText: string;
  html?: string;
}

/**
 * Classifies webpage type deterministically based on structural signals, schema markup, URL path, and text features.
 * Adheres strictly to conservative classification: returns UNKNOWN / LOW confidence when evidence is insufficient.
 */
export function classifyPageType(input: ClassifierInput): PageTypeAssessment {
  const { url, title, metaDescription, headings, schemas, mainContentText } = input;
  const lowerUrl = (url || '').toLowerCase();
  const lowerTitle = (title || '').toLowerCase();
  const lowerDesc = (metaDescription || '').toLowerCase();
  const lowerContent = (mainContentText || '').toLowerCase();
  const headingTexts = (headings || []).map((h) => h.text.toLowerCase());
  const allHeadings = headingTexts.join(' ');
  const schemaTypes = (schemas || []).map((s) => s.type.toLowerCase());

  const signalScores: Record<PageType, { score: number; signals: string[] }> = {
    ARTICLE: { score: 0, signals: [] },
    PRODUCT: { score: 0, signals: [] },
    SERVICE: { score: 0, signals: [] },
    LOCAL_BUSINESS: { score: 0, signals: [] },
    DOCUMENTATION: { score: 0, signals: [] },
    FAQ: { score: 0, signals: [] },
    CONTACT: { score: 0, signals: [] },
    CATEGORY_PAGE: { score: 0, signals: [] },
    HOMEPAGE: { score: 0, signals: [] },
    LANDING_PAGE: { score: 0, signals: [] },
    UNKNOWN: { score: 0, signals: [] },
  };

  // 1. Homepage Detection
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    if (parsed.pathname === '/' || parsed.pathname === '' || parsed.pathname === '/index.html') {
      signalScores.HOMEPAGE.score += 8;
      signalScores.HOMEPAGE.signals.push('Root domain / landing path');
    }
  } catch {
    if (url === '/' || url === '') {
      signalScores.HOMEPAGE.score += 8;
      signalScores.HOMEPAGE.signals.push('Root domain path');
    }
  }

  // 2. Schema Markup Signals
  if (schemaTypes.some((t) => t.includes('article') || t.includes('blogposting') || t.includes('newsarticle'))) {
    signalScores.ARTICLE.score += 10;
    signalScores.ARTICLE.signals.push('Article / BlogPosting Schema.org metadata detected');
  }
  if (schemaTypes.some((t) => t.includes('product') || t.includes('individualproduct'))) {
    signalScores.PRODUCT.score += 10;
    signalScores.PRODUCT.signals.push('Product Schema.org metadata detected');
  }
  if (schemaTypes.some((t) => t.includes('service') || t.includes('professionalservice'))) {
    signalScores.SERVICE.score += 10;
    signalScores.SERVICE.signals.push('Service Schema.org metadata detected');
  }
  if (schemaTypes.some((t) => t.includes('localbusiness') || t.includes('restaurant') || t.includes('store') || t.includes('medicalbusiness'))) {
    signalScores.LOCAL_BUSINESS.score += 10;
    signalScores.LOCAL_BUSINESS.signals.push('LocalBusiness Schema.org metadata detected');
  }
  if (schemaTypes.some((t) => t.includes('faqpage'))) {
    signalScores.FAQ.score += 10;
    signalScores.FAQ.signals.push('FAQPage Schema.org metadata detected');
  }
  if (schemaTypes.some((t) => t.includes('techarticle') || t.includes('apireference'))) {
    signalScores.DOCUMENTATION.score += 10;
    signalScores.DOCUMENTATION.signals.push('Technical documentation Schema.org metadata detected');
  }
  if (schemaTypes.some((t) => t.includes('collectionpage') || t.includes('itemlist'))) {
    signalScores.CATEGORY_PAGE.score += 8;
    signalScores.CATEGORY_PAGE.signals.push('CollectionPage / ItemList Schema.org metadata detected');
  }

  // 3. URL Path Signals
  if (lowerUrl.includes('/blog/') || lowerUrl.includes('/posts/') || lowerUrl.includes('/article/') || lowerUrl.includes('/news/')) {
    signalScores.ARTICLE.score += 6;
    signalScores.ARTICLE.signals.push('Editorial URL structure (/blog/, /article/, /news/)');
  }
  if (lowerUrl.includes('/product/') || lowerUrl.includes('/item/') || lowerUrl.includes('/p/')) {
    signalScores.PRODUCT.score += 6;
    signalScores.PRODUCT.signals.push('E-commerce product URL structure (/product/, /item/)');
  }
  if (lowerUrl.includes('/services/') || lowerUrl.includes('/service/')) {
    signalScores.SERVICE.score += 6;
    signalScores.SERVICE.signals.push('Service URL structure (/services/)');
  }
  if (lowerUrl.includes('/docs') || lowerUrl.includes('/documentation') || lowerUrl.includes('/api-ref') || lowerUrl.includes('/manual')) {
    signalScores.DOCUMENTATION.score += 6;
    signalScores.DOCUMENTATION.signals.push('Documentation URL path (/docs, /api-ref)');
  }
  if (lowerUrl.includes('/faq') || lowerUrl.includes('/frequently-asked-questions')) {
    signalScores.FAQ.score += 6;
    signalScores.FAQ.signals.push('FAQ URL path (/faq)');
  }
  if (lowerUrl.includes('/contact') || lowerUrl.includes('/get-in-touch') || lowerUrl.includes('/reach-us')) {
    signalScores.CONTACT.score += 8;
    signalScores.CONTACT.signals.push('Contact URL path (/contact)');
  }
  if (lowerUrl.includes('/category/') || lowerUrl.includes('/collections/') || lowerUrl.includes('/shop/') || lowerUrl.includes('/catalog/')) {
    signalScores.CATEGORY_PAGE.score += 6;
    signalScores.CATEGORY_PAGE.signals.push('Category/Catalog URL path (/category/, /collections/)');
  }

  // 4. Heading & Title Structural Signals
  if (lowerTitle.includes('contact') || allHeadings.includes('contact us') || allHeadings.includes('get in touch') || allHeadings.includes('send a message')) {
    signalScores.CONTACT.score += 6;
    signalScores.CONTACT.signals.push('Contact headings/title detected ("Contact Us", "Get in Touch")');
  }
  if (lowerTitle.includes('faq') || lowerTitle.includes('frequently asked') || allHeadings.includes('frequently asked questions') || allHeadings.includes('faq')) {
    signalScores.FAQ.score += 6;
    signalScores.FAQ.signals.push('FAQ title or heading markers detected');
  }
  if (allHeadings.includes('pricing') || allHeadings.includes('features') || allHeadings.includes('what we offer') || allHeadings.includes('our services')) {
    signalScores.SERVICE.score += 4;
    signalScores.SERVICE.signals.push('Service offering section headings');
  }
  if (allHeadings.includes('specifications') || allHeadings.includes('tech specs') || allHeadings.includes('customer reviews') || allHeadings.includes('add to cart')) {
    signalScores.PRODUCT.score += 5;
    signalScores.PRODUCT.signals.push('Product specification or e-commerce interaction headings');
  }

  // 5. Content Keyword & Entity Markers
  // Product signals
  const priceMatches = lowerContent.match(/(\$\d+|\€\d+|\£\d+|in stock|add to cart|buy now|sku:)/g);
  if (priceMatches && priceMatches.length >= 2) {
    signalScores.PRODUCT.score += 5;
    signalScores.PRODUCT.signals.push(`E-commerce transactional elements (${priceMatches.slice(0, 3).join(', ')})`);
  }

  // Contact signals
  if (
    (lowerContent.includes('phone:') || lowerContent.includes('email:') || lowerContent.includes('address:') || lowerContent.includes('office hours')) &&
    (lowerContent.includes('send message') || lowerContent.includes('submit form') || lowerContent.includes('contact'))
  ) {
    signalScores.CONTACT.score += 5;
    signalScores.CONTACT.signals.push('Direct contact coordinates (phone, email, office address, contact form)');
  }

  // Documentation signals
  if (lowerContent.includes('syntax') || lowerContent.includes('parameters') || lowerContent.includes('returns') || lowerContent.includes('code example') || lowerContent.includes('curl ') || lowerContent.includes('npm install')) {
    signalScores.DOCUMENTATION.score += 5;
    signalScores.DOCUMENTATION.signals.push('Developer/Technical documentation syntax indicators');
  }

  // Local Business signals
  if ((lowerContent.includes('opening hours') || lowerContent.includes('mon-fri') || lowerContent.includes('directions')) && (lowerContent.includes('street') || lowerContent.includes('suite') || lowerContent.includes('avenue') || lowerContent.includes('tel:'))) {
    signalScores.LOCAL_BUSINESS.score += 5;
    signalScores.LOCAL_BUSINESS.signals.push('Physical location and business operating hours found');
  }

  // 6. Evaluate Winner
  let bestType: PageType = 'UNKNOWN';
  let maxScore = 0;
  const secondaryTypes: PageType[] = [];

  for (const [typeKey, val] of Object.entries(signalScores) as [PageType, { score: number; signals: string[] }][]) {
    if (typeKey === 'UNKNOWN') continue;
    if (val.score > maxScore) {
      if (bestType !== 'UNKNOWN' && maxScore >= 4) {
        secondaryTypes.push(bestType);
      }
      maxScore = val.score;
      bestType = typeKey;
    } else if (val.score >= 4 && val.score >= maxScore - 3) {
      secondaryTypes.push(typeKey);
    }
  }

  // Conservative confidence thresholds
  let confidence: ConfidenceLevel = 'LOW';
  if (maxScore >= 12) {
    confidence = 'HIGH';
  } else if (maxScore >= 6) {
    confidence = 'MEDIUM';
  } else if (maxScore >= 3) {
    confidence = 'LOW';
  } else {
    bestType = 'UNKNOWN';
    confidence = 'UNKNOWN';
  }

  const detectedSignals = bestType !== 'UNKNOWN' ? signalScores[bestType].signals : ['Insufficient distinctive structural signals to determine page type'];
  
  let explanation = '';
  if (bestType === 'UNKNOWN') {
    explanation = 'Page lacks sufficient specialized markup or structural indicators. Evaluated with general content standards.';
  } else {
    explanation = `Classified as ${bestType} with ${confidence} confidence based on: ${detectedSignals.join('; ')}.`;
  }

  return {
    detectedType: bestType,
    confidence,
    detectedSignals,
    secondaryTypes: secondaryTypes.length > 0 ? secondaryTypes : undefined,
    explanation,
  };
}
