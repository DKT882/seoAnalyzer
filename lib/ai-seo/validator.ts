import { SEOValidationRequest, SEOValidationResult, SEOValidationCheckItem } from './types';

export class SEOValidator {
  /**
   * Performs deep safety and syntax validation on an SEO fix patch before preview/approval.
   */
  public static validateFix(request: SEOValidationRequest): SEOValidationResult {
    const { fix, evidence } = request;
    const checks: SEOValidationCheckItem[] = [];
    const issuesFound: string[] = [];
    const warningMessages: string[] = [];

    // 1. HTML Syntax & Structure Check
    const htmlCheck = this.validateHtmlSyntax(fix.after);
    checks.push({
      checkName: 'HTML Syntax Well-Formedness',
      passed: htmlCheck.isValid,
      details: htmlCheck.message,
    });
    if (!htmlCheck.isValid) {
      issuesFound.push(`HTML syntax error: ${htmlCheck.message}`);
    }

    // 2. Schema JSON-LD Validation
    let schemaValid = true;
    if (fix.patchType === 'schema_patch' || fix.after.includes('@context') || fix.after.includes('application/ld+json')) {
      const schemaCheck = this.validateJsonLdSchema(fix.after);
      schemaValid = schemaCheck.isValid;
      checks.push({
        checkName: 'Schema JSON-LD Validation',
        passed: schemaCheck.isValid,
        details: schemaCheck.message,
      });
      if (!schemaCheck.isValid) {
        issuesFound.push(`Schema validation failed: ${schemaCheck.message}`);
      }
    } else {
      checks.push({
        checkName: 'Schema JSON-LD Validation',
        passed: true,
        details: 'Not applicable for this patch type',
      });
    }

    // 3. Canonical URL Safety Check
    let canonicalValid = true;
    if (fix.after.includes('rel="canonical"') || fix.patchType === 'metadata_patch' && fix.after.includes('canonical')) {
      const canonicalCheck = this.validateCanonicalHref(fix.after, evidence.url);
      canonicalValid = canonicalCheck.isValid;
      checks.push({
        checkName: 'Canonical URL Target Safety',
        passed: canonicalCheck.isValid,
        details: canonicalCheck.message,
      });
      if (!canonicalCheck.isValid) {
        issuesFound.push(`Canonical check failed: ${canonicalCheck.message}`);
      }
    } else {
      checks.push({
        checkName: 'Canonical URL Target Safety',
        passed: true,
        details: 'No canonical modifications present',
      });
    }

    // 4. Noindex Accidental Introduction Check
    let noIndexSafe = true;
    if (fix.after.includes('noindex') && evidence.technical?.isIndexable !== false) {
      noIndexSafe = false;
      const msg = 'Patch contains a "noindex" directive which would remove an indexable page from search results.';
      issuesFound.push(msg);
      checks.push({
        checkName: 'Noindex Safety Guard',
        passed: false,
        details: msg,
      });
    } else {
      checks.push({
        checkName: 'Noindex Safety Guard',
        passed: true,
        details: 'No harmful noindex directives introduced',
      });
    }

    // 5. Destructive Regression Absence Check
    let regressionsFree = true;
    if (fix.after.trim().length === 0 && fix.before.trim().length > 0) {
      regressionsFree = false;
      const msg = 'Patch deletes content without replacement.';
      issuesFound.push(msg);
      checks.push({
        checkName: 'Regression & Deletion Check',
        passed: false,
        details: msg,
      });
    } else {
      checks.push({
        checkName: 'Regression & Deletion Check',
        passed: true,
        details: 'No destructive deletions detected',
      });
    }

    const isValid = htmlCheck.isValid && schemaValid && canonicalValid && noIndexSafe && regressionsFree;

    return {
      fixId: fix.fixId,
      isValid,
      status: isValid ? 'passed' : 'validation_failed',
      checks: {
        htmlValid: htmlCheck.isValid,
        schemaValid,
        canonicalValid,
        noIndexSafe,
        regressionsFree,
      },
      individualChecks: checks,
      issuesFound,
      warningMessages,
      validatedAt: new Date().toISOString(),
    };
  }

  private static validateHtmlSyntax(snippet: string): { isValid: boolean; message: string } {
    if (!snippet || snippet.trim().length === 0) {
      return { isValid: true, message: 'Empty snippet is syntactically valid' };
    }

    // Check for unbalanced tags (simple balance scanner)
    const openTags: string[] = [];
    const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
    const tagRegex = /<\/?([a-zA-Z0-9\-]+)(?:\s+[^>]*?)?(\/?)>/g;

    let match;
    while ((match = tagRegex.exec(snippet)) !== null) {
      const isClosing = match[0].startsWith('</');
      const isSelfClosing = match[2] === '/' || voidTags.has(match[1].toLowerCase());
      const tagName = match[1].toLowerCase();

      if (isClosing) {
        if (openTags.length === 0 || openTags[openTags.length - 1] !== tagName) {
          // If mismatch, check if it was void
          if (!voidTags.has(tagName)) {
            return { isValid: false, message: `Unbalanced closing tag: </${tagName}>` };
          }
        } else {
          openTags.pop();
        }
      } else if (!isSelfClosing) {
        openTags.push(tagName);
      }
    }

    if (openTags.length > 0) {
      return { isValid: false, message: `Unclosed HTML tag(s): <${openTags.join('>, <')}>` };
    }

    return { isValid: true, message: 'HTML tags are balanced and well-formed' };
  }

  private static validateJsonLdSchema(snippet: string): { isValid: boolean; message: string } {
    try {
      let jsonStr = snippet;
      // Extract from script tags if wrapped
      const scriptMatch = snippet.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
      if (scriptMatch) {
        jsonStr = scriptMatch[1];
      }

      const parsed = JSON.parse(jsonStr.trim());
      if (!parsed['@context'] || !parsed['@type']) {
        return { isValid: false, message: 'Schema JSON-LD must contain "@context" and "@type" properties.' };
      }
      return { isValid: true, message: `Valid Schema.org ${parsed['@type']} JSON-LD object.` };
    } catch (err: any) {
      return { isValid: false, message: `Invalid JSON syntax: ${err.message}` };
    }
  }

  private static validateCanonicalHref(snippet: string, pageUrl: string): { isValid: boolean; message: string } {
    const hrefMatch = snippet.match(/href=["']([^"']+)["']/i);
    if (!hrefMatch) {
      return { isValid: false, message: 'Canonical tag missing href attribute' };
    }
    const href = hrefMatch[1];
    try {
      const url = new URL(href, pageUrl);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return { isValid: false, message: `Invalid protocol in canonical URL: ${url.protocol}` };
      }
      return { isValid: true, message: `Valid absolute canonical URL: ${url.href}` };
    } catch {
      return { isValid: false, message: `Malformed canonical URL: ${href}` };
    }
  }
}
