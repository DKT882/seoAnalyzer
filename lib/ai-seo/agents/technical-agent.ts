import { SEOEvidence, AIRecommendation } from '../types';
import { SEOAIProvider } from '../ai-provider';
import { ClaudeSEOAdapter } from '../claude-seo-adapter';
import { SEOConfidenceCalculator } from '../confidence';

export class TechnicalSEOAgent {
  readonly name = 'Technical SEO Specialist';
  readonly specialty = 'Crawlability, Indexability, Canonicals, Meta Tags, Core Web Vitals';

  shouldRun(_evidence: SEOEvidence): boolean {
    // Technical agent runs for all pages
    return true;
  }

  async analyze(evidence: SEOEvidence, provider: SEOAIProvider): Promise<AIRecommendation[]> {
    if (provider.providerType === 'RULE_INFORMED_OFFLINE') {
      return this.analyzeDeterministic(evidence);
    }

    const systemPrompt = ClaudeSEOAdapter.getTechnicalAgentPrompt();
    const userPrompt = `Analyze the following technical SEO evidence for ${evidence.url}:\n${JSON.stringify(
      {
        technical: evidence.technical,
        rawIssues: evidence.rawIssuesSummary,
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
      // Propagate to orchestrator for deterministic fallback and telemetry
      throw err;
    }

    return this.analyzeDeterministic(evidence);
  }

  public analyzeDeterministic(evidence: SEOEvidence): AIRecommendation[] {
    const recs: AIRecommendation[] = [];
    const tech = evidence.technical;
    if (!tech) return recs;

    // Check 1: Missing Title Tag
    if (tech.title?.isMissing) {
      const rec: AIRecommendation = {
        issueId: 'TECH-TITLE-MISSING',
        url: evidence.url,
        category: 'technical',
        priority: 'CRITICAL',
        confidence: 0.95,
        observation: 'The page HTML is missing a <title> tag in the <head> section.',
        evidence: ['Page title is absent or empty', 'Measured in <head> parse tree'],
        seoReason: 'The <title> element is a primary signal for both search engine indexing and user click-through rates on search result pages.',
        recommendedAction: 'Add a descriptive, keyword-targeted <title> tag between 30 and 60 characters.',
        implementation: {
          type: 'metadata_update',
          targetElement: '<head>',
          proposedValue: `<title>${evidence.domain} - Dedicated Overview</title>`,
        },
        risk: 'low',
        requiresApproval: true,
        agentSource: this.name,
      };
      rec.confidence = SEOConfidenceCalculator.calculateConfidence(rec, evidence);
      recs.push(rec);
    }

    // Check 2: Missing or Multiple H1
    if (tech.headings?.h1Count === 0) {
      const rec: AIRecommendation = {
        issueId: 'TECH-H1-MISSING',
        url: evidence.url,
        category: 'onpage',
        priority: 'HIGH',
        confidence: 0.92,
        observation: 'The page content does not contain a primary <h1> heading tag.',
        evidence: ['h1 count is 0 in DOM hierarchy'],
        seoReason: 'A single, descriptive H1 tag helps search engines and screen readers understand the primary subject matter of the page.',
        recommendedAction: 'Add a single top-level <h1> heading summarizing the main theme of the page.',
        implementation: {
          type: 'html_patch',
          targetElement: 'main',
          proposedValue: `<h1>${tech.title?.value || evidence.domain}</h1>`,
        },
        risk: 'low',
        requiresApproval: true,
        agentSource: this.name,
      };
      rec.confidence = SEOConfidenceCalculator.calculateConfidence(rec, evidence);
      recs.push(rec);
    }

    // Check 3: Missing Canonical URL
    if (!tech.canonicalUrl) {
      const rec: AIRecommendation = {
        issueId: 'TECH-CANONICAL-MISSING',
        url: evidence.url,
        category: 'technical',
        priority: 'HIGH',
        confidence: 0.90,
        observation: 'The page lacks a rel="canonical" link element.',
        evidence: ['No canonical URL found in HTML meta headers or HTTP headers'],
        seoReason: 'A canonical tag establishes the authoritative version of the page, preventing index dilution from URL query parameters or duplicate tracking paths.',
        recommendedAction: 'Add a self-referencing canonical URL tag pointing to the clean, preferred URL.',
        implementation: {
          type: 'html_patch',
          targetElement: '<head>',
          proposedValue: `<link rel="canonical" href="${evidence.url}" />`,
        },
        risk: 'low',
        requiresApproval: true,
        agentSource: this.name,
      };
      rec.confidence = SEOConfidenceCalculator.calculateConfidence(rec, evidence);
      recs.push(rec);
    }

    // Check 4: Unintended Noindex Directive
    if (tech.robotsDirectives?.noindex) {
      const rec: AIRecommendation = {
        issueId: 'TECH-NOINDEX-DIRECTIVE',
        url: evidence.url,
        category: 'technical',
        priority: 'CRITICAL',
        confidence: 0.95,
        observation: 'The page contains a "noindex" robots directive preventing search engines from indexing it.',
        evidence: ['robotsDirectives.noindex is true'],
        seoReason: 'A noindex directive instructs search engine crawlers to exclude the URL from search engine result pages entirely.',
        recommendedAction: 'If this page is intended for public search discovery, remove the noindex directive from meta tags and X-Robots-Tag headers.',
        implementation: {
          type: 'html_patch',
          targetElement: 'meta[name="robots"]',
          proposedValue: '<meta name="robots" content="index, follow" />',
        },
        risk: 'moderate',
        requiresApproval: true,
        agentSource: this.name,
      };
      rec.confidence = SEOConfidenceCalculator.calculateConfidence(rec, evidence);
      recs.push(rec);
    }

    // Check 5: Missing Mobile Viewport
    if (tech.mobile?.hasViewport === false) {
      const rec: AIRecommendation = {
        issueId: 'TECH-VIEWPORT-MISSING',
        url: evidence.url,
        category: 'mobile',
        priority: 'HIGH',
        confidence: 0.95,
        observation: 'The page is missing a mobile viewport meta tag.',
        evidence: ['mobile.hasViewport is false'],
        seoReason: 'Without a viewport meta tag, mobile browsers render the page at desktop screen widths, failing mobile-friendliness requirements.',
        recommendedAction: 'Add a standard responsive viewport meta tag inside the <head> element.',
        implementation: {
          type: 'html_patch',
          targetElement: '<head>',
          proposedValue: '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
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
      issueId: raw.issueId || `TECH-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      url: raw.url || evidence.url,
      category: raw.category || 'technical',
      priority: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(raw.priority) ? raw.priority : 'MEDIUM',
      confidence: typeof raw.confidence === 'number' ? raw.confidence : 0.8,
      observation: raw.observation || 'Observed technical SEO discrepancy.',
      evidence: Array.isArray(raw.evidence) ? raw.evidence : ['Observed in technical crawler audit'],
      seoReason: raw.seoReason || 'Technical optimization enhances crawlability and user experience.',
      recommendedAction: raw.recommendedAction || 'Update HTML tags to align with search engine best practices.',
      implementation: {
        type: raw.implementation?.type || 'html_patch',
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
