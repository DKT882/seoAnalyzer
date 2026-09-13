import { SEOEvidence, AIRecommendation } from '../types';
import { SEOAIProvider } from '../ai-provider';
import { ClaudeSEOAdapter } from '../claude-seo-adapter';
import { SEOConfidenceCalculator } from '../confidence';

export class SchemaSEOAgent {
  readonly name = 'Schema & Structured Data Specialist';
  readonly specialty = 'JSON-LD Generation, Schema.org Validation, Rich Snippet Eligibility';

  shouldRun(_evidence: SEOEvidence): boolean {
    return true; // Schema agent evaluates structured data for all pages
  }

  async analyze(evidence: SEOEvidence, provider: SEOAIProvider): Promise<AIRecommendation[]> {
    if (provider.providerType === 'RULE_INFORMED_OFFLINE') {
      return this.analyzeDeterministic(evidence);
    }

    const systemPrompt = ClaudeSEOAdapter.getSchemaAgentPrompt();
    const userPrompt = `Analyze schema markup for ${evidence.url}:\n${JSON.stringify(
      {
        schema: evidence.technical?.schema,
        pageType: evidence.pageType,
        title: evidence.technical?.title?.value,
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
    const schema = evidence.technical?.schema;

    // Check 1: Missing JSON-LD Schema on Informational Page
    if ((!schema || schema.schemaCount === 0) && (evidence.pageType === 'ARTICLE' || evidence.pageType === 'BLOG_POST')) {
      const rec: AIRecommendation = {
        issueId: 'SCHEMA-ARTICLE-MISSING',
        url: evidence.url,
        category: 'schema',
        priority: 'MEDIUM',
        confidence: 0.88,
        observation: 'Article page is missing Schema.org Article or BlogPosting JSON-LD structured data.',
        evidence: ['schemaCount is 0', 'pageType is ARTICLE'],
        seoReason: 'Article structured data helps search engines extract headline, publication dates, and author information for Google News and search rich features.',
        recommendedAction: 'Add Schema.org Article JSON-LD markup to page header.',
        implementation: {
          type: 'schema_jsonld',
          targetElement: '<head>',
          proposedValue: JSON.stringify(
            {
              '@context': 'https://schema.org',
              '@type': 'Article',
              headline: evidence.technical?.title?.value || 'Article Headline',
              datePublished: new Date().toISOString(),
              mainEntityOfPage: evidence.url,
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

    // Check 2: Missing BreadcrumbList Schema
    const hasBreadcrumbs = schema?.types?.includes('BreadcrumbList');
    if (!hasBreadcrumbs && evidence.url.split('/').filter(Boolean).length > 3) {
      const rec: AIRecommendation = {
        issueId: 'SCHEMA-BREADCRUMB-MISSING',
        url: evidence.url,
        category: 'schema',
        priority: 'LOW',
        confidence: 0.80,
        observation: 'Deep sub-page lacks BreadcrumbList structured data for search navigation trails.',
        evidence: ['URL path depth > 1', 'No BreadcrumbList schema found'],
        seoReason: 'BreadcrumbList structured data displays hierarchical breadcrumbs in Google search snippets instead of raw URLs.',
        recommendedAction: 'Add BreadcrumbList JSON-LD markup representing the site hierarchy.',
        implementation: {
          type: 'schema_jsonld',
          targetElement: '<head>',
          proposedValue: JSON.stringify(
            {
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                {
                  '@type': 'ListItem',
                  position: 1,
                  name: 'Home',
                  item: `https://${evidence.domain}`,
                },
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: evidence.technical?.title?.value || 'Current Page',
                  item: evidence.url,
                },
              ],
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

    return recs;
  }

  private sanitizeRecommendation(raw: any, evidence: SEOEvidence): AIRecommendation {
    const rec: AIRecommendation = {
      issueId: raw.issueId || `SCHEMA-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      url: raw.url || evidence.url,
      category: raw.category || 'schema',
      priority: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(raw.priority) ? raw.priority : 'MEDIUM',
      confidence: typeof raw.confidence === 'number' ? raw.confidence : 0.8,
      observation: raw.observation || 'Observed structured data enhancement opportunity.',
      evidence: Array.isArray(raw.evidence) ? raw.evidence : ['Observed in structured data audit'],
      seoReason: raw.seoReason || 'Valid JSON-LD schema markup assists search engine comprehension and enables rich snippets.',
      recommendedAction: raw.recommendedAction || 'Add or update Schema.org structured data markup.',
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
