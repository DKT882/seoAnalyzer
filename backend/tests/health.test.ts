import { describe, it } from 'node:test';
import assert from 'node:assert';
import { config } from '../src/config.js';

describe('Backend Environment Configuration', () => {
  it('loads valid default configuration parameters', () => {
    assert.strictEqual(typeof config.port, 'number');
    assert.strictEqual(config.port, 4000);
    assert.strictEqual(typeof config.crawlerTimeoutMs, 'number');
    assert.strictEqual(config.crawlerTimeoutMs, 15000);
    assert.strictEqual(typeof config.crawlerMaxRedirects, 'number');
    assert.strictEqual(config.crawlerMaxRedirects, 5);
    assert.strictEqual(typeof config.crawlerMaxSizeBytes, 'number');
    assert.strictEqual(config.crawlerMaxSizeBytes, 10485760);
  });
});
