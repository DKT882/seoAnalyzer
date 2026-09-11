export type AnalyzerErrorCode =
  | 'INVALID_URL'
  | 'SSRF_BLOCKED'
  | 'DNS_FAILED'
  | 'TARGET_FETCH_FAILED'
  | 'TARGET_TIMEOUT'
  | 'REDIRECT_BLOCKED'
  | 'RESPONSE_TOO_LARGE'
  | 'UNSUPPORTED_CONTENT_TYPE'
  | 'PARSE_FAILED'
  | 'INTERNAL_ANALYZER_ERROR';

export interface StructuredErrorResponse {
  error: true;
  code: AnalyzerErrorCode;
  message: string;
  details?: string;
  statusCode?: number;
}

export class AnalyzerError extends Error {
  readonly code: AnalyzerErrorCode;
  readonly statusCode: number;
  readonly details?: string;

  constructor(
    code: AnalyzerErrorCode,
    message: string,
    details?: string,
    statusCode: number = 422
  ) {
    super(message);
    this.name = 'AnalyzerError';
    this.code = code;
    this.details = details;
    this.statusCode = statusCode;
  }

  toJSON(): StructuredErrorResponse {
    return {
      error: true,
      code: this.code,
      message: this.message,
      details: this.details,
      statusCode: this.statusCode,
    };
  }
}

/**
 * Normalizes any caught runtime error, native Fetch error, DNS error, or AbortError into
 * a safe, structured AnalyzerError with descriptive messages and without leaking credentials.
 */
export function normalizeErrorToAnalyzerError(err: any): AnalyzerError {
  if (err instanceof AnalyzerError) {
    return err;
  }

  const rawMessage = typeof err === 'string' ? err : err?.message || '';
  const errorName = err?.name || '';
  const cause = err?.cause;
  const causeCode = cause?.code || err?.code || '';
  const causeMessage = cause?.message || '';

  // 1. SSRF Protection Blocked
  if (
    rawMessage.includes('SSRF Protection Blocked') ||
    rawMessage.includes('Direct private/reserved IP disallowed') ||
    rawMessage.includes('falls within a private or reserved network range') ||
    rawMessage.includes('Blocked internal/local hostname')
  ) {
    return new AnalyzerError(
      'SSRF_BLOCKED',
      'SSRF Protection Blocked: The target address is within a private, loopback, or reserved network range.',
      rawMessage,
      422
    );
  }

  // 2. Invalid URL Format
  if (
    rawMessage.startsWith('Invalid URL') ||
    rawMessage.includes('Cannot parse URL') ||
    rawMessage.includes('Invalid URL format') ||
    rawMessage.includes('Only http:// and https://')
  ) {
    return new AnalyzerError(
      'INVALID_URL',
      'The specified URL format is invalid. Please ensure it begins with http:// or https:// and has a valid hostname.',
      rawMessage,
      400
    );
  }

  // 3. Timeout Errors (AbortError / ETIMEDOUT / ConnectTimeoutError)
  if (
    errorName === 'AbortError' ||
    rawMessage.includes('timed out') ||
    rawMessage.includes('Timeout') ||
    causeCode === 'ETIMEDOUT' ||
    causeCode === 'UND_ERR_CONNECT_TIMEOUT' ||
    causeCode === 'UND_ERR_HEADERS_TIMEOUT' ||
    causeCode === 'UND_ERR_BODY_TIMEOUT' ||
    causeMessage.includes('timed out')
  ) {
    return new AnalyzerError(
      'TARGET_TIMEOUT',
      'Connection timed out while fetching the target URL.',
      'The target server did not respond within the allowable timeout period (15 seconds).',
      504
    );
  }

  // 4. DNS Resolution Errors (ENOTFOUND / EAI_AGAIN / NODATA)
  if (
    rawMessage.includes('DNS resolution failed') ||
    rawMessage.includes('DNS lookup error') ||
    causeCode === 'ENOTFOUND' ||
    causeCode === 'EAI_AGAIN' ||
    causeCode === 'ENODATA'
  ) {
    return new AnalyzerError(
      'DNS_FAILED',
      'DNS resolution failed for the target website.',
      `Unable to locate DNS records for the domain (${causeCode || 'Domain not found'}).`,
      422
    );
  }

  // 5. Redirect Issues
  if (
    rawMessage.includes('Redirect loop detected') ||
    rawMessage.includes('Exceeded maximum redirect limit') ||
    rawMessage.includes('Unsafe or unresolvable redirect') ||
    rawMessage.includes('missing Location header')
  ) {
    return new AnalyzerError(
      'REDIRECT_BLOCKED',
      'Failed while following webpage redirects.',
      rawMessage,
      422
    );
  }

  // 6. Response Too Large
  if (
    rawMessage.includes('exceeds maximum allowable limit') ||
    rawMessage.includes('size limit while downloading')
  ) {
    return new AnalyzerError(
      'RESPONSE_TOO_LARGE',
      'The target webpage size exceeds the maximum allowable download limit (10MB).',
      rawMessage,
      413
    );
  }

  // 7. Unsupported Content Type
  if (rawMessage.includes('Unsupported content type') || rawMessage.includes('Not an HTML document')) {
    return new AnalyzerError(
      'UNSUPPORTED_CONTENT_TYPE',
      'The target URL returned an unsupported content type. SEO analysis requires HTML content.',
      rawMessage,
      415
    );
  }

  // 8. HTML Parse Failed
  if (rawMessage.includes('Failed to parse HTML') || rawMessage.includes('Cheerio parse error')) {
    return new AnalyzerError(
      'PARSE_FAILED',
      'Failed to parse the target website HTML document.',
      rawMessage,
      422
    );
  }

  // 9. Generic Target Fetch Failed (Connection refused, TLS error, socket hang up)
  if (
    rawMessage.includes('fetch failed') ||
    causeCode === 'ECONNREFUSED' ||
    causeCode === 'ECONNRESET' ||
    causeCode === 'EHOSTUNREACH' ||
    causeCode === 'DEPTH_ZERO_SELF_SIGNED_CERT' ||
    causeCode === 'CERT_HAS_EXPIRED' ||
    causeCode === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE'
  ) {
    const detailMsg = causeCode
      ? `Network connection error (${causeCode}) while reaching the target host.`
      : causeMessage || 'Target server actively refused connection or failed TLS negotiation.';
    return new AnalyzerError(
      'TARGET_FETCH_FAILED',
      'Unable to fetch the target website.',
      detailMsg,
      502
    );
  }

  // 10. Fallback Internal Analyzer Error
  return new AnalyzerError(
    'INTERNAL_ANALYZER_ERROR',
    'An error occurred during analysis.',
    rawMessage || 'Unknown internal analysis error',
    500
  );
}
