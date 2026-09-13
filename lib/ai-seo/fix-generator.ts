import { SEOFix, SEOFixRequest, FixPatchType } from './types';

export class SEOFixGenerator {
  /**
   * Generates a concrete, verifiable code/HTML/metadata patch for an AI recommendation.
   */
  public static generateFix(request: SEOFixRequest): SEOFix {
    const { recommendation: rec, evidence, currentCodeSnippet } = request;
    const fixId = `fix-${rec.issueId.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Math.random().toString(36).substring(2, 7)}`;

    const patchType = this.determinePatchType(rec);
    const targetLocation = rec.implementation.targetElement || this.inferTargetLocation(patchType);

    const before = currentCodeSnippet || this.inferBeforeSnippet(rec, evidence);
    const after = rec.implementation.proposedValue || this.generateAfterSnippet(rec, evidence);

    const diffSummary = this.createDiffSummary(before, after);
    const isDestructive = rec.risk === 'high' || rec.category === 'indexability';

    const safetyCautions: string[] = [];
    if (isDestructive) {
      safetyCautions.push('Potentially high impact change. Review carefully before deploying.');
    }
    if (rec.caution) {
      safetyCautions.push(rec.caution);
    }
    if (patchType === 'metadata_patch' && rec.observation.includes('noindex')) {
      safetyCautions.push('Removing noindex directive will permit search crawlers to index this page.');
    }

    return {
      fixId,
      issueId: rec.issueId,
      url: rec.url,
      patchType,
      title: `Fix: ${rec.recommendedAction}`,
      explanation: rec.seoReason,
      targetLocation,
      before,
      after,
      diffSummary,
      isDestructive,
      generatedAt: new Date().toISOString(),
      safetyCautions,
      appliedStatus: 'PENDING_APPROVAL', // Constraint 9: Always PENDING_APPROVAL by default
    };
  }

  private static determinePatchType(rec: any): FixPatchType {
    if (rec.implementation.type === 'schema_jsonld') return 'schema_patch';
    if (rec.implementation.type === 'metadata_update') return 'metadata_patch';
    if (rec.implementation.type === 'content_edit') return 'content_patch';
    if (rec.implementation.type === 'internal_link') return 'link_patch';
    return 'html_patch';
  }

  private static inferTargetLocation(patchType: FixPatchType): string {
    switch (patchType) {
      case 'schema_patch':
      case 'metadata_patch':
        return '<head>';
      case 'content_patch':
        return '<main>';
      case 'link_patch':
        return 'footer, nav, or contextual body paragraph';
      case 'html_patch':
      default:
        return 'body';
    }
  }

  private static inferBeforeSnippet(rec: any, evidence: any): string {
    if (rec.issueId.includes('TITLE')) {
      return evidence.technical?.title?.value ? `<title>${evidence.technical.title.value}</title>` : '<!-- No <title> tag -->';
    }
    if (rec.issueId.includes('CANONICAL')) {
      return evidence.technical?.canonicalUrl ? `<link rel="canonical" href="${evidence.technical.canonicalUrl}" />` : '<!-- No canonical tag -->';
    }
    if (rec.issueId.includes('NOINDEX')) {
      return '<meta name="robots" content="noindex, follow" />';
    }
    if (rec.issueId.includes('H1')) {
      return '<!-- No <h1> tag found -->';
    }
    return '';
  }

  private static generateAfterSnippet(rec: any, evidence: any): string {
    if (rec.issueId.includes('TITLE')) {
      return `<title>${evidence.domain} - Primary Subject</title>`;
    }
    if (rec.issueId.includes('CANONICAL')) {
      return `<link rel="canonical" href="${evidence.url}" />`;
    }
    if (rec.issueId.includes('VIEWPORT')) {
      return '<meta name="viewport" content="width=device-width, initial-scale=1.0" />';
    }
    if (rec.issueId.includes('H1')) {
      return `<h1>${evidence.technical?.title?.value || 'Page Heading'}</h1>`;
    }
    return rec.recommendedAction;
  }

  private static createDiffSummary(before: string, after: string): string {
    if (!before) {
      return `+ ${after.split('\n').join('\n+ ')}`;
    }
    const beforeLines = before.split('\n').map((l) => `- ${l}`).join('\n');
    const afterLines = after.split('\n').map((l) => `+ ${l}`).join('\n');
    return `${beforeLines}\n${afterLines}`;
  }
}
