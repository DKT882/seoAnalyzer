import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  AnalyzerError,
  normalizeErrorToAnalyzerError,
  AnalyzerErrorCode,
} from '../lib/errors/analyzerErrors';
import { isPrivateOrReservedIp, validateHostnameSsrf } from '../lib/utils/ssrfGuard';
import { validateAndNormalizeUrl } from '../lib/utils/urlUtils';
import { safeFetch } from '../lib/crawler/safeFetcher';

describe('Error Handling and Failure Differentiation', () => {
  it('differentiates INVALID_URL errors', () => {
    const err = normalizeErrorToAnalyzerError(new Error('Invalid URL: Cannot parse URL'));
    assert.strictEqual(err.code, 'INVALID_URL');
    assert.strictEqual(err.statusCode, 400);
    const json = err.toJSON();
    assert.strictEqual(json.error, true);
    assert.strictEqual(json.code, 'INVALID_URL');
  });

  it('differentiates SSRF_BLOCKED errors', () => {
    const err = normalizeErrorToAnalyzerError(new Error('SSRF Protection Blocked: Direct private/reserved IP disallowed: 127.0.0.1'));
    assert.strictEqual(err.code, 'SSRF_BLOCKED');
    assert.strictEqual(err.statusCode, 422);
    assert.ok(err.message.includes('SSRF Protection Blocked'));
  });

  it('differentiates TARGET_TIMEOUT errors (AbortError & causes)', () => {
    const abortErr = new Error('The operation was aborted');
    abortErr.name = 'AbortError';
    const err1 = normalizeErrorToAnalyzerError(abortErr);
    assert.strictEqual(err1.code, 'TARGET_TIMEOUT');
    assert.strictEqual(err1.statusCode, 504);

    const timedOutErr = new Error('Request timed out after 15000ms.');
    const err2 = normalizeErrorToAnalyzerError(timedOutErr);
    assert.strictEqual(err2.code, 'TARGET_TIMEOUT');
    assert.strictEqual(err2.statusCode, 504);

    const undiciTimeout = new Error('fetch failed');
    (undiciTimeout as any).cause = { code: 'UND_ERR_CONNECT_TIMEOUT', message: 'Connect Timeout Error' };
    const err3 = normalizeErrorToAnalyzerError(undiciTimeout);
    assert.strictEqual(err3.code, 'TARGET_TIMEOUT');
  });

  it('differentiates DNS_FAILED errors', () => {
    const dnsErr = new Error('DNS resolution failed: no IP address returned for unknown-domain-xyz123.com');
    const err = normalizeErrorToAnalyzerError(dnsErr);
    assert.strictEqual(err.code, 'DNS_FAILED');
    assert.strictEqual(err.statusCode, 422);

    const nodeDnsErr = new Error('fetch failed');
    (nodeDnsErr as any).cause = { code: 'ENOTFOUND', message: 'getaddrinfo ENOTFOUND' };
    const err2 = normalizeErrorToAnalyzerError(nodeDnsErr);
    assert.strictEqual(err2.code, 'DNS_FAILED');
  });

  it('differentiates REDIRECT_BLOCKED errors', () => {
    const redirectErr = new Error('Redirect loop detected: https://example.com/loop');
    const err = normalizeErrorToAnalyzerError(redirectErr);
    assert.strictEqual(err.code, 'REDIRECT_BLOCKED');
    assert.strictEqual(err.statusCode, 422);
  });

  it('differentiates RESPONSE_TOO_LARGE errors', () => {
    const sizeErr = new Error('Page size exceeds maximum allowable limit of 10MB.');
    const err = normalizeErrorToAnalyzerError(sizeErr);
    assert.strictEqual(err.code, 'RESPONSE_TOO_LARGE');
    assert.strictEqual(err.statusCode, 413);
  });

  it('differentiates UNSUPPORTED_CONTENT_TYPE errors', () => {
    const ctErr = new Error('Unsupported content type: application/pdf');
    const err = normalizeErrorToAnalyzerError(ctErr);
    assert.strictEqual(err.code, 'UNSUPPORTED_CONTENT_TYPE');
    assert.strictEqual(err.statusCode, 415);
  });

  it('differentiates PARSE_FAILED errors', () => {
    const parseErr = new Error('Failed to parse HTML content');
    const err = normalizeErrorToAnalyzerError(parseErr);
    assert.strictEqual(err.code, 'PARSE_FAILED');
    assert.strictEqual(err.statusCode, 422);
  });

  it('differentiates TARGET_FETCH_FAILED errors with underlying network causes', () => {
    const fetchErr = new Error('fetch failed');
    (fetchErr as any).cause = { code: 'ECONNREFUSED', message: 'connect ECONNREFUSED 1.2.3.4:443' };
    const err = normalizeErrorToAnalyzerError(fetchErr);
    assert.strictEqual(err.code, 'TARGET_FETCH_FAILED');
    assert.strictEqual(err.statusCode, 502);
    assert.ok(err.details?.includes('ECONNREFUSED'));
  });

  it('differentiates INTERNAL_ANALYZER_ERROR for generic unclassified errors', () => {
    const err = normalizeErrorToAnalyzerError(new Error('Unexpected disk read fault'));
    assert.strictEqual(err.code, 'INTERNAL_ANALYZER_ERROR');
    assert.strictEqual(err.statusCode, 500);
  });
});

describe('SSRF Protection Security Regression', () => {
  it('blocks localhost in hostname check', async () => {
    const check = await validateHostnameSsrf('localhost');
    assert.strictEqual(check.isSafe, false);
    assert.ok(check.reason?.includes('Blocked internal/local hostname'));
  });

  it('blocks 127.0.0.1 and private IPv4', async () => {
    const check1 = await validateHostnameSsrf('127.0.0.1');
    assert.strictEqual(check1.isSafe, false);

    const check2 = await validateHostnameSsrf('10.200.0.1');
    assert.strictEqual(check2.isSafe, false);

    const check3 = await validateHostnameSsrf('192.168.1.254');
    assert.strictEqual(check3.isSafe, false);
  });

  it('blocks AWS/GCP/Azure cloud metadata IP 169.254.169.254', async () => {
    const check = await validateHostnameSsrf('169.254.169.254');
    assert.strictEqual(check.isSafe, false);
    assert.strictEqual(isPrivateOrReservedIp('169.254.169.254'), true);
  });

  it('blocks IPv6 loopback ::1 and link-local fe80::', async () => {
    assert.strictEqual(isPrivateOrReservedIp('::1'), true);
    assert.strictEqual(isPrivateOrReservedIp('fe80::1'), true);
    assert.strictEqual(isPrivateOrReservedIp('fd00::1'), true);
  });

  it('safeFetch rejects SSRF target with AnalyzerError SSRF_BLOCKED', async () => {
    await assert.rejects(
      async () => {
        await safeFetch('http://127.0.0.1:8080/admin');
      },
      (err: any) => {
        assert.ok(err instanceof AnalyzerError);
        assert.strictEqual(err.code, 'SSRF_BLOCKED');
        return true;
      }
    );
  });

  it('safeFetch rejects invalid URL format with AnalyzerError INVALID_URL', async () => {
    await assert.rejects(
      async () => {
        await safeFetch('not-a-valid-url');
      },
      (err: any) => {
        assert.ok(err instanceof AnalyzerError);
        assert.strictEqual(err.code, 'INVALID_URL');
        return true;
      }
    );
  });
});
