import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validateAndNormalizeUrl, resolveAbsoluteUrl, isSameOrigin } from '../lib/utils/urlUtils';

describe('URL Utilities', () => {
  it('validates and normalizes HTTP/HTTPS URLs', () => {
    const r1 = validateAndNormalizeUrl('https://example.com/blog');
    assert.strictEqual(r1.isValid, true);
    assert.strictEqual(r1.normalizedUrl, 'https://example.com/blog');

    const r2 = validateAndNormalizeUrl('example.com/page');
    assert.strictEqual(r2.isValid, true);
    assert.strictEqual(r2.normalizedUrl, 'https://example.com/page');
  });

  it('rejects unsupported and dangerous protocols', () => {
    const rFile = validateAndNormalizeUrl('file:///etc/passwd');
    assert.strictEqual(rFile.isValid, false);

    const rJs = validateAndNormalizeUrl('javascript:alert(1)');
    assert.strictEqual(rJs.isValid, false);

    const rFtp = validateAndNormalizeUrl('ftp://ftp.example.com');
    assert.strictEqual(rFtp.isValid, false);
  });

  it('safely resolves relative URLs to absolute URLs', () => {
    const base = 'https://example.com/articles/post-1';
    assert.strictEqual(resolveAbsoluteUrl('/about', base), 'https://example.com/about');
    assert.strictEqual(resolveAbsoluteUrl('sub-page', base), 'https://example.com/articles/sub-page');
    assert.strictEqual(resolveAbsoluteUrl('https://other.com/help', base), 'https://other.com/help');
    assert.strictEqual(resolveAbsoluteUrl('javascript:void(0)', base), null);
    assert.strictEqual(resolveAbsoluteUrl('#section', base), null);
  });

  it('correctly identifies same-origin URLs', () => {
    assert.strictEqual(isSameOrigin('https://example.com/a', 'https://example.com/b'), true);
    assert.strictEqual(isSameOrigin('https://example.com/a', 'https://other.com/a'), false);
  });
});
