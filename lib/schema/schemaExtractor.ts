import * as cheerio from 'cheerio';
import { SchemaItem } from '@/types';

export function extractStructuredData($: cheerio.CheerioAPI): SchemaItem[] {
  const schemas: SchemaItem[] = [];

  // Extract JSON-LD scripts
  $('script[type="application/ld+json"]').each((_, el) => {
    const rawContent = $(el).html() || '';
    const trimmed = rawContent.trim();
    if (!trimmed) return;

    try {
      const parsed = JSON.parse(trimmed);

      // Support array of schemas or @graph container
      const itemsToProcess = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed['@graph'])
        ? parsed['@graph']
        : [parsed];

      for (const item of itemsToProcess) {
        if (!item || typeof item !== 'object') continue;

        const type = item['@type'] || 'UnknownSchema';
        const typeStr = Array.isArray(type) ? type.join(', ') : String(type);

        const schemaRecord: SchemaItem = {
          type: typeStr,
          rawJson: JSON.stringify(item, null, 2),
          isValid: Boolean(item['@context'] || item['@type']),
        };

        // Extract Breadcrumbs if BreadcrumbList
        if (typeStr.toLowerCase().includes('breadcrumblist') && Array.isArray(item.itemListElement)) {
          schemaRecord.breadcrumbs = item.itemListElement
            .map((b: any) => b?.item?.name || b?.name || '')
            .filter(Boolean);
        }

        // Extract FAQs if FAQPage
        if (typeStr.toLowerCase().includes('faqpage') && Array.isArray(item.mainEntity)) {
          schemaRecord.faqs = item.mainEntity
            .map((q: any) => ({
              question: q?.name || '',
              answer: q?.acceptedAnswer?.text || '',
            }))
            .filter((faq: any) => faq.question && faq.answer);
        }

        schemas.push(schemaRecord);
      }
    } catch {
      // Invalid JSON syntax in ld+json
      schemas.push({
        type: 'Invalid JSON-LD',
        rawJson: trimmed.slice(0, 500),
        isValid: false,
      });
    }
  });

  // Extract Microdata items (HTML attributes)
  $('[itemscope][itemtype]').each((_, el) => {
    const itemType = $(el).attr('itemtype') || '';
    if (itemType) {
      schemas.push({
        type: `Microdata: ${itemType.split('/').pop() || itemType}`,
        rawJson: `{"@type": "${itemType}", "source": "HTML Microdata attributes"}`,
        isValid: true,
      });
    }
  });

  return schemas;
}
