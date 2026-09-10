import * as cheerio from 'cheerio';

export interface SocialMetadata {
  ogTags: Record<string, string>;
  twitterTags: Record<string, string>;
}

export function extractSocialMetadata($: cheerio.CheerioAPI): SocialMetadata {
  const ogTags: Record<string, string> = {};
  const twitterTags: Record<string, string> = {};

  // Extract OpenGraph tags
  $('meta[property^="og:"]').each((_, el) => {
    const property = $(el).attr('property');
    const content = $(el).attr('content');
    if (property && content !== undefined) {
      ogTags[property.toLowerCase()] = content.trim();
    }
  });

  // Extract Twitter / X tags
  $('meta[name^="twitter:"], meta[property^="twitter:"]').each((_, el) => {
    const name = $(el).attr('name') || $(el).attr('property');
    const content = $(el).attr('content');
    if (name && content !== undefined) {
      twitterTags[name.toLowerCase()] = content.trim();
    }
  });

  return { ogTags, twitterTags };
}
