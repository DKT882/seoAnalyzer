import { describe, it } from 'node:test';
import assert from 'node:assert';
import { NextRequest } from 'next/server';
import { GET as healthGet } from '../app/api/health/route';
import { GET as historyGet } from '../app/api/history/route';
import { GET as dataSourcesGet } from '../app/api/settings/data-sources/route';
import { GET as domainOverviewGet } from '../app/api/domain-overview/route';
import { GET as jobGet } from '../app/api/jobs/[id]/route';
import { POST as analyzePost } from '../app/api/analyze/route';

describe('Next.js 15 App Router Route Handlers', () => {
  it('GET /api/health returns 200 OK with service metadata', async () => {
    const res = await healthGet();
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.status, 'ok');
    assert.strictEqual(data.service, 'SEO Keyword & Website Analyzer API (Next.js Unified)');
  });

  it('GET /api/history returns history array', async () => {
    const req = new NextRequest('http://localhost:3000/api/history');
    const res = await historyGet(req);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(Array.isArray(data.history), true);
  });

  it('GET /api/settings/data-sources returns provider list', async () => {
    const res = await dataSourcesGet();
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(Array.isArray(data.providers), true);
    assert.strictEqual(data.disclaimer !== undefined, true);
  });

  it('GET /api/domain-overview validates domain query param', async () => {
    const reqEmpty = new NextRequest('http://localhost:3000/api/domain-overview');
    const resEmpty = await domainOverviewGet(reqEmpty);
    assert.strictEqual(resEmpty.status, 400);

    const reqValid = new NextRequest('http://localhost:3000/api/domain-overview?domain=example.com');
    const resValid = await domainOverviewGet(reqValid);
    assert.ok(resValid.status === 200 || resValid.status === 422, 'Expected 200 or 422 status');
    const data = await resValid.json();
    if (resValid.status === 200) {
      assert.strictEqual(data.domain, 'example.com');
      assert.strictEqual(data.dataConfidence, 'HIGH (On-Page Data)');
    } else {
      assert.ok(data.error !== undefined, 'Expected error object in 422');
    }
  });

  it('GET /api/jobs/[id] returns 404 for unknown job ID', async () => {
    const req = new NextRequest('http://localhost:3000/api/jobs/non-existent-uuid');
    const res = await jobGet(req, { params: Promise.resolve({ id: 'non-existent-uuid' }) });
    assert.strictEqual(res.status, 404);
  });

  it('POST /api/analyze validates URL and blocks SSRF addresses', async () => {
    // 1. SSRF block test
    const ssrfReq = new NextRequest('http://localhost:3000/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'http://127.0.0.1:8080/admin' }),
    });
    const ssrfRes = await analyzePost(ssrfReq);
    assert.strictEqual(ssrfRes.status, 422);
    const ssrfData = await ssrfRes.json();
    assert.strictEqual(ssrfData.status, 'failed');
    assert.strictEqual(ssrfData.error.includes('SSRF') || ssrfData.error.includes('disallowed'), true);

    // 2. Unsupported protocol test
    const protoReq = new NextRequest('http://localhost:3000/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'file:///etc/passwd' }),
    });
    const protoRes = await analyzePost(protoReq);
    assert.strictEqual(protoRes.status, 400);
  });
});
