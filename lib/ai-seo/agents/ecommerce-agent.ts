import { SEOEvidence, AIRecommendation } from '../types';
import { SEOAIProvider } from '../ai-provider';
import { ClaudeSEOAdapter } from '../claude-seo-adapter';
import { SEOConfidenceCalculator } from '../confidence';

export class EcommerceSEOAgent {
  readonly name = 'Ecommerce SEO Specialist';
  readonly specialty = 'Product Schema, Merchant Listings, Price/Availability, Image Alt, SKU/Brand';

  shouldRun(evidence: SEOEvidence): boolean {
    // Constraint 14: Only run if ecommerce page or product signals are present
    return (
      !!evidence.ecommerce?.isEcommercePage ||
      evidence.pageType === 'PRODUCT' ||
      evidence.pageType === 'CATEGORY' ||
      evidence.pageType === 'ECOMMERCE'
    );
  }

  async analyze(evidence: SEOEvidence, provider: SEOAIProvider): Promise<AIRecommendation[]> {
    if (!this.shouldRun(evidence)) {
      return [];
    }

    if (provider.providerType === 'RULE_INFORMED_OFFLINE') {
      return this.analyzeDeterministic(evidence);
    }

    const systemPrompt = ClaudeSEOAdapter.getEcommerceAgentPrompt();
    const userPrompt = `Analyze ecommerce SEO evidence for ${evidence.url}:\n${JSON.stringify(
      {
        ecommerce: evidence.ecommerce,
        technical: evidence.technical,
      },
      null,
      2
    )}`;

    try {
      const recs = await provider.generateStructured<AIRecommendation[]>(
        systemPrompt,
        userPrompt,
        'Array of AIRecommendation objects matching the 12 required fields.'
      );

      if (Array.isArray(recs) && recs.length > 0) {
        return recs.map((r) => this.sanitizeRecommendation(r, evidence));
      }
    } catch (err) {
      throw err;
    }

    return this.analyzeDeterministic(evidence);
  }

  public analyzeDeterministic(evidence: SEOEvidence): AIRecommendation[] {
    const recs: AIRecommendation[] = [];
    const ecom = evidence.ecommerce;
    if (!ecom || !this.shouldRun(evidence)) return recs;

    // Check 1: Missing Product Schema
    if (!ecom.hasProductSchema && (evidence.pageType === 'PRODUCT' || ecom.isEcommercePage)) {
      const rec: AIRecommendation = {
        issueId: 'ECOM-PRODUCT-SCHEMA-MISSING',
        url: evidence.url,
        category: 'schema',
        priority: 'HIGH',
        confidence: 0.90,
        observation: 'Product page is missing Schema.org Product structured data markup.',
        evidence: ['Page is classified as PRODUCT', 'No JSON-LD Product schema detected'],
        seoReason: 'Product schema enables Google rich results, price display, and availability badges in Google Search and Shopping.',
        recommendedAction: 'Implement standard Schema.org Product JSON-LD markup with name, offers, price, currency, and availability.',
        implementation: {
          type: 'schema_jsonld',
          targetElement: '<head>',
          proposedValue: JSON.stringify(
            {
              '@context': 'https://schema.org',
              '@type': 'Product',
              name: evidence.technical?.title?.value || 'Product Name',
              offers: {
                '@type': 'Offer',
                price: ecom.price || '0.00',
                priceCurrency: ecom.currency || 'USD',
                availability: 'https://schema.org/InStock',
              },
            },
            null,
            2
          ),
        },
        risk: 'low',
        requiresApproval: true,
        agentSource: this.name,
      };
      rec.confidence = SEOConfidenceCalculator.calculateConfidence(rec, evidence);
      recs.push(rec);
    }

    // Check 2: Missing Image Alt Tags on Product Page
    if ((ecom.imageAltMissingCount || 0) > 0) {
      const rec: AIRecommendation = {
        issueId: 'ECOM-IMAGE-ALT-MISSING',
        url: evidence.url,
        category: 'images',
        priority: 'MEDIUM',
        confidence: 0.85,
        observation: `Found ${ecom.imageAltMissingCount} product images missing descriptive alt text attributes.`,
        evidence: [`imageAltMissingCount: ${ecom.imageAltMissingCount}`],
        seoReason: 'Descriptive alt text improves image accessibility and allows product photos to rank in Google Images search results.',
        recommendedAction: 'Add clear, descriptive alt attributes containing product title and specific attributes.',
        implementation: {
          type: 'html_patch',
          targetElement: 'img',
          suggestedPattern: 'alt="[Product Name] - [Color/Angle/Detail]"',
        },
        risk: 'low',
        requiresApproval: true,
        agentSource: this.name,
      };
      rec.confidence = SEOConfidenceCalculator.calculateConfidence(rec, evidence);
      recs.push(rec);
    }

    return recs;
  }

  private sanitizeRecommendation(raw: any, evidence: SEOEvidence): AIRecommendation {
    const rec: AIRecommendation = {
      issueId: raw.issueId || `ECOM-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      url: raw.url || evidence.url,
      category: raw.category || 'ecommerce',
      priority: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(raw.priority) ? raw.priority : 'MEDIUM',
      confidence: typeof raw.confidence === 'number' ? raw.confidence : 0.8,
      observation: raw.observation || 'Observed ecommerce optimization opportunity.',
      evidence: Array.isArray(raw.evidence) ? raw.evidence : ['Observed in ecommerce audit'],
      seoReason: raw.seoReason || 'Ecommerce structured data improves merchant discovery and rich snippet eligibility.',
      recommendedAction: raw.recommendedAction || 'Update product metadata and structured data markup.',
      implementation: {
        type: raw.implementation?.type || 'schema_jsonld',
        targetElement: raw.implementation?.targetElement,
        proposedValue: raw.implementation?.proposedValue,
        suggestedPattern: raw.implementation?.suggestedPattern,
      },
      risk: ['low', 'moderate', 'high'].includes(raw.risk) ? raw.risk : 'low',
      requiresApproval: true,
      agentSource: this.name,
      expectedBenefit: raw.expectedBenefit,
      caution: raw.caution,
    };
    rec.confidence = SEOConfidenceCalculator.calculateConfidence(rec, evidence);
    return rec;
  }
}
