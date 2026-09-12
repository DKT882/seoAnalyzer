import { CheerioAPI } from 'cheerio';
import { PageSnapshot, HydrationDelta, HydrationDiscrepancy } from '@/types';

export interface SnapshotInput {
  url: string;
  $: CheerioAPI;
  wordCount: number;
  headings: { level: number; text: string }[];
  title: string;
  metaDescription: string;
  canonicalUrl: string;
  robotsMeta: string;
  internalLinksCount: number;
  externalLinksCount: number;
  totalLinksCount: number;
  imagesCount: number;
  missingAltCount: number;
  schemasCount: number;
  schemaTypes: string[];
}

/**
 * Builds a normalized PageSnapshot object from parsed page attributes.
 */
export function buildPageSnapshot(
  source: 'static' | 'rendered',
  data: SnapshotInput
): PageSnapshot {
  const h1Items = data.headings.filter((h) => h.level === 1);
  const h1Text = h1Items.map((h) => h.text.trim()).filter(Boolean).join(' | ') || undefined;

  return {
    source,
    url: data.url,
    timestamp: new Date().toISOString(),
    title: (data.title || '').trim(),
    titleLength: (data.title || '').trim().length,
    metaDescription: (data.metaDescription || '').trim(),
    metaDescriptionLength: (data.metaDescription || '').trim().length,
    canonicalUrl: (data.canonicalUrl || '').trim(),
    robotsMeta: (data.robotsMeta || '').trim(),
    wordCount: data.wordCount,
    h1Count: h1Items.length,
    h1Text,
    headingsCount: data.headings.length,
    internalLinksCount: data.internalLinksCount,
    externalLinksCount: data.externalLinksCount,
    totalLinksCount: data.totalLinksCount,
    imagesCount: data.imagesCount,
    missingAltCount: data.missingAltCount,
    schemasCount: data.schemasCount,
    schemaTypes: data.schemaTypes,
  };
}

/**
 * Compares static and rendered snapshots to produce a structured HydrationDelta
 * identifying SEO-relevant changes, dynamic content dependencies, and indexability discrepancies.
 */
export function calculateHydrationDelta(
  staticSnapshot: PageSnapshot,
  renderedSnapshot: PageSnapshot
): HydrationDelta {
  const discrepancies: HydrationDiscrepancy[] = [];
  let seoRelevantChangeCount = 0;

  // 1. Title Changes
  const titleChanged = staticSnapshot.title !== renderedSnapshot.title;
  let changedTitle: { static: string; rendered: string } | undefined;
  if (titleChanged) {
    seoRelevantChangeCount++;
    changedTitle = { static: staticSnapshot.title, rendered: renderedSnapshot.title };
    discrepancies.push({
      type: 'METADATA_CHANGED',
      severity: 'INFO',
      title: 'Page Title Modified in Rendered DOM',
      message: `Page title was updated during client-side rendering from "${staticSnapshot.title || '(Empty)'}" to "${renderedSnapshot.title || '(Empty)'}".`,
      staticValue: staticSnapshot.title,
      renderedValue: renderedSnapshot.title,
    });
  }

  // 2. Meta Description Changes
  const metaChanged = staticSnapshot.metaDescription !== renderedSnapshot.metaDescription;
  let changedMeta: { static: string; rendered: string } | undefined;
  if (metaChanged) {
    seoRelevantChangeCount++;
    changedMeta = {
      static: staticSnapshot.metaDescription,
      rendered: renderedSnapshot.metaDescription,
    };
    discrepancies.push({
      type: 'METADATA_CHANGED',
      severity: 'INFO',
      title: 'Meta Description Modified in Rendered DOM',
      message: `Meta description was updated during client-side rendering.`,
      staticValue: staticSnapshot.metaDescription,
      renderedValue: renderedSnapshot.metaDescription,
    });
  }

  // 3. Canonical Changes
  const canonicalChanged = staticSnapshot.canonicalUrl !== renderedSnapshot.canonicalUrl;
  let changedCanonical: { static: string; rendered: string } | undefined;
  if (canonicalChanged) {
    seoRelevantChangeCount++;
    changedCanonical = {
      static: staticSnapshot.canonicalUrl,
      rendered: renderedSnapshot.canonicalUrl,
    };
    discrepancies.push({
      type: 'METADATA_CHANGED',
      severity: 'WARNING',
      title: 'Canonical URL Modified in Rendered DOM',
      message: `Canonical link differs between static HTML ("${staticSnapshot.canonicalUrl || 'None'}") and rendered DOM ("${renderedSnapshot.canonicalUrl || 'None'}").`,
      staticValue: staticSnapshot.canonicalUrl,
      renderedValue: renderedSnapshot.canonicalUrl,
    });
  }

  // 4. Indexability / Robots Discrepancies (CRITICAL)
  const staticNoindex = staticSnapshot.robotsMeta.toLowerCase().includes('noindex');
  const renderedNoindex = renderedSnapshot.robotsMeta.toLowerCase().includes('noindex');
  let changedRobots: { static: string; rendered: string } | undefined;
  if (staticSnapshot.robotsMeta !== renderedSnapshot.robotsMeta) {
    changedRobots = {
      static: staticSnapshot.robotsMeta,
      rendered: renderedSnapshot.robotsMeta,
    };
  }

  if (staticNoindex !== renderedNoindex) {
    seoRelevantChangeCount += 2;
    discrepancies.push({
      type: 'INDEXABILITY_MISMATCH',
      severity: 'CRITICAL',
      title: 'Static vs. Rendered Indexability Directive Mismatch',
      message: staticNoindex
        ? 'Initial HTML specified "noindex", but rendered DOM specifies indexable directives. Search engine crawlers that do not execute full JavaScript may skip indexing this page.'
        : 'Initial HTML was indexable, but rendered DOM injected a "noindex" directive via client-side JavaScript. This page will be removed from search indexes after rendering.',
      staticValue: staticSnapshot.robotsMeta || 'index',
      renderedValue: renderedSnapshot.robotsMeta || 'index',
    });
  }

  // 5. H1 Discrepancies
  let h1TextChange: { static: string; rendered: string } | undefined;
  if (staticSnapshot.h1Count === 0 && renderedSnapshot.h1Count > 0) {
    seoRelevantChangeCount++;
    discrepancies.push({
      type: 'H1_INTRODUCED',
      severity: 'INFO',
      title: 'H1 Introduced During Client-Side Rendering',
      message: `An H1 heading ("${renderedSnapshot.h1Text || ''}") was injected dynamically by JavaScript.`,
      staticValue: 'Missing',
      renderedValue: renderedSnapshot.h1Text,
    });
  } else if (staticSnapshot.h1Count > 0 && renderedSnapshot.h1Count === 0) {
    seoRelevantChangeCount++;
    discrepancies.push({
      type: 'H1_REMOVED',
      severity: 'WARNING',
      title: 'Static H1 Removed After Client-Side Rendering',
      message: `Initial static H1 ("${staticSnapshot.h1Text || ''}") was unmounted or removed from the DOM after JavaScript execution.`,
      staticValue: staticSnapshot.h1Text,
      renderedValue: 'Missing',
    });
  } else if (
    staticSnapshot.h1Count > 0 &&
    renderedSnapshot.h1Count > 0 &&
    staticSnapshot.h1Text !== renderedSnapshot.h1Text
  ) {
    seoRelevantChangeCount++;
    h1TextChange = {
      static: staticSnapshot.h1Text || '',
      rendered: renderedSnapshot.h1Text || '',
    };
    discrepancies.push({
      type: 'H1_CHANGED',
      severity: 'INFO',
      title: 'H1 Heading Text Modified in Rendered DOM',
      message: `H1 text was updated during client-side hydration from "${staticSnapshot.h1Text}" to "${renderedSnapshot.h1Text}".`,
      staticValue: staticSnapshot.h1Text,
      renderedValue: renderedSnapshot.h1Text,
    });
  }

  // 6. Content Volume & JS Content Dependency
  const wordCountDelta = renderedSnapshot.wordCount - staticSnapshot.wordCount;
  if (
    (staticSnapshot.wordCount < 150 && renderedSnapshot.wordCount >= 250) ||
    (staticSnapshot.wordCount > 0 && wordCountDelta > staticSnapshot.wordCount * 1.5 && wordCountDelta >= 200)
  ) {
    seoRelevantChangeCount++;
    discrepancies.push({
      type: 'JS_CONTENT_DEPENDENCY',
      severity: 'WARNING',
      title: 'Primary Content Injected via Client-Side Rendering',
      message: `Page content expanded from ${staticSnapshot.wordCount} words in static HTML to ${renderedSnapshot.wordCount} words (+${wordCountDelta} words) after JavaScript execution. Crawlers without full JavaScript rendering may perceive this as thin content.`,
      staticValue: `${staticSnapshot.wordCount} words`,
      renderedValue: `${renderedSnapshot.wordCount} words`,
    });
  }

  // 7. Structured Data Changes
  const addedSchemas = renderedSnapshot.schemaTypes.filter(
    (t) => !staticSnapshot.schemaTypes.includes(t)
  );
  const removedSchemas = staticSnapshot.schemaTypes.filter(
    (t) => !renderedSnapshot.schemaTypes.includes(t)
  );

  if (addedSchemas.length > 0) {
    seoRelevantChangeCount++;
    discrepancies.push({
      type: 'SCHEMA_INTRODUCED',
      severity: 'INFO',
      title: 'Structured Data Injected by Client Components',
      message: `JSON-LD Schema types [${addedSchemas.join(', ')}] were added dynamically during client rendering.`,
      renderedValue: addedSchemas.join(', '),
    });
  }

  // 8. Links Changes
  const linksDelta = renderedSnapshot.totalLinksCount - staticSnapshot.totalLinksCount;
  if (linksDelta > 5) {
    seoRelevantChangeCount++;
    discrepancies.push({
      type: 'LINKS_INTRODUCED',
      severity: 'INFO',
      title: 'Navigation Links Injected Dynamically',
      message: `${linksDelta} additional navigation links appeared after client-side hydration.`,
      staticValue: staticSnapshot.totalLinksCount,
      renderedValue: renderedSnapshot.totalLinksCount,
    });
  }

  // 9. Images Changes
  const imagesDelta = renderedSnapshot.imagesCount - staticSnapshot.imagesCount;
  if (imagesDelta > 2) {
    seoRelevantChangeCount++;
    discrepancies.push({
      type: 'IMAGES_INTRODUCED',
      severity: 'INFO',
      title: 'Images Injected Dynamically',
      message: `${imagesDelta} additional images appeared in the DOM after rendering.`,
      staticValue: staticSnapshot.imagesCount,
      renderedValue: renderedSnapshot.imagesCount,
    });
  }

  const addedHeadings =
    renderedSnapshot.headingsCount > staticSnapshot.headingsCount
      ? [`+${renderedSnapshot.headingsCount - staticSnapshot.headingsCount} headings rendered`]
      : [];
  const removedHeadings =
    staticSnapshot.headingsCount > renderedSnapshot.headingsCount
      ? [`-${staticSnapshot.headingsCount - renderedSnapshot.headingsCount} headings removed`]
      : [];

  return {
    staticSnapshot,
    renderedSnapshot,
    seoRelevantChangeCount,
    hasSignificantChange: seoRelevantChangeCount > 0,
    added: {
      headings: addedHeadings,
      linksCount: Math.max(0, linksDelta),
      imagesCount: Math.max(0, imagesDelta),
      structuredData: addedSchemas,
    },
    removed: {
      headings: removedHeadings,
      linksCount: Math.max(0, -linksDelta),
      imagesCount: Math.max(0, -imagesDelta),
      structuredData: removedSchemas,
    },
    changed: {
      title: changedTitle,
      metaDescription: changedMeta,
      canonical: changedCanonical,
      robots: changedRobots,
      wordCountDelta,
      h1TextChange,
    },
    discrepancies,
  };
}
