import * as cheerio from 'cheerio';
import { HeadingHierarchy, HeadingItem } from '@/types';

export function extractHeadingsHierarchy($: cheerio.CheerioAPI): HeadingHierarchy {
  const items: HeadingItem[] = [];
  const counts = { h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0 };
  const issues: string[] = [];

  $('h1, h2, h3, h4, h5, h6').each((_, el) => {
    const tagName = (el.tagName || '').toLowerCase();
    const level = parseInt(tagName.replace('h', ''), 10);
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    const id = $(el).attr('id') || undefined;

    if (level >= 1 && level <= 6) {
      if (text.length > 0) {
        items.push({ level, text, id });
      }
      if (level === 1) counts.h1++;
      else if (level === 2) counts.h2++;
      else if (level === 3) counts.h3++;
      else if (level === 4) counts.h4++;
      else if (level === 5) counts.h5++;
      else if (level === 6) counts.h6++;
    }
  });

  const hasMissingH1 = counts.h1 === 0;
  const hasMultipleH1 = counts.h1 > 1;
  let hasSkippedLevels = false;

  if (hasMissingH1) {
    issues.push('Missing <h1> heading. Every SEO-optimized page should have exactly one main H1 tag.');
  } else if (hasMultipleH1) {
    issues.push(`Found ${counts.h1} <h1> headings. Multiple H1 tags can dilute primary topic signaling.`);
  }

  // Check for skipped heading levels (e.g. H1 -> H3 without H2)
  for (let i = 0; i < items.length - 1; i++) {
    const currentLevel = items[i].level;
    const nextLevel = items[i + 1].level;

    if (nextLevel > currentLevel + 1) {
      hasSkippedLevels = true;
      issues.push(
        `Heading hierarchy gap: <h${currentLevel}> ("${items[i].text.slice(0, 30)}...") is followed directly by <h${nextLevel}> ("${items[i + 1].text.slice(0, 30)}..."), skipping intermediate heading level(s).`
      );
    }
  }

  return {
    items,
    h1Count: counts.h1,
    h2Count: counts.h2,
    h3Count: counts.h3,
    h4Count: counts.h4,
    h5Count: counts.h5,
    h6Count: counts.h6,
    hasMissingH1,
    hasMultipleH1,
    hasSkippedLevels,
    issues,
  };
}
