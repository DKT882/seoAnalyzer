import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import app from '../src/index.js';

describe('End-to-End API Integration Tests', () => {
  let server: http.Server;
  let baseUrl: string;
  let testJobId: string;

  before(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const address = server.address() as any;
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('GET /api/health responds with 200 OK and environment metadata', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.strictEqual(res.status, 200);

    const data = await res.json();
    assert.strictEqual(data.status, 'ok');
    assert.strictEqual(data.service, 'SEO Keyword & Website Analyzer API');
  });

  it('POST /api/analyze validates URL and rejects private IP SSRF attacks', async () => {
    const res = await fetch(`${baseUrl}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'http://127.0.0.1:8080/admin' }),
    });

    assert.strictEqual(res.status, 422);
    const data = await res.json();
    assert.strictEqual(data.status, 'failed');
    assert.strictEqual(data.error.includes('SSRF') || data.error.includes('disallowed'), true);
  });

  it('POST /api/analyze rejects unsupported protocols like file://', async () => {
    const res = await fetch(`${baseUrl}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'file:///etc/hosts' }),
    });

    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.error.includes('Invalid URL'), true);
  });

  it('GET /api/history returns recent analyses', async () => {
    const res = await fetch(`${baseUrl}/api/history`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(Array.isArray(data.history), true);
  });

  it('GET /api/jobs/:id returns 404 for non-existent job', async () => {
    const res = await fetch(`${baseUrl}/api/jobs/non-existent-uuid`);
    assert.strictEqual(res.status, 404);
  });
});
