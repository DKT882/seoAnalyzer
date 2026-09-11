import { describe, it } from 'node:test';
import assert from 'node:assert';
import { NextRequest } from 'next/server';
import { POST as crawlPost } from '../app/api/crawl/route';
import { GET as crawlGet } from '../app/api/crawl/[id]/route';
import { POST as cancelPost } from '../app/api/crawl/[id]/cancel/route';
import { GET as pagesGet } from '../app/api/crawl/[id]/pages/route';
import { GET as strategyGet } from '../app/api/keywords/strategy/route';
import { GET as recommendationsGet } from '../app/api/recommendations/route';
import { GET as contentStrategyGet } from '../app/api/content-strategy/route';
import { GET as cannibalizationGet } from '../app/api/cannibalization/route';
import { crawlRepository } from '../lib/db/repository';

describe('Crawl and Strategy Route Handlers', () => {
  it('POST /api/crawl blocks SSRF addresses and invalid payloads', async () => {
    const ssrfReq = new NextRequest('http://localhost:3000/api/crawl', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startUrl: 'http://127.0.0.1:9000/dashboard' }),
    });
    const ssrfRes = await crawlPost(ssrfReq);
    assert.strictEqual(ssrfRes.status, 422);

    const emptyReq = new NextRequest('http://localhost:3000/api/crawl', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const emptyRes = await crawlPost(emptyReq);
    assert.strictEqual(emptyRes.status, 400);
  });

  it('GET /api/crawl/[id] returns 404 for unknown session', async () => {
    const req = new NextRequest('http://localhost:3000/api/crawl/unknown-session-id');
    const res = await crawlGet(req, { params: Promise.resolve({ id: 'unknown-session-id' }) });
    assert.strictEqual(res.status, 404);
  });

  it('POST /api/crawl/[id]/cancel gracefully handles cancelling a session', async () => {
    const session = crawlRepository.createCrawlSession('https://example.com', 'example.com', 5);
    const req = new NextRequest(`http://localhost:3000/api/crawl/${session.id}/cancel`, {
      method: 'POST',
    });
    const res = await cancelPost(req, { params: Promise.resolve({ id: session.id }) });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.status, 'cancelled');
  });

  it('GET /api/crawl/[id]/pages returns empty array or 404 for unknown session', async () => {
    const req = new NextRequest('http://localhost:3000/api/crawl/unknown-session-id/pages');
    const res = await pagesGet(req, { params: Promise.resolve({ id: 'unknown-session-id' }) });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(Array.isArray(data.pages), true);
  });

  it('GET /api/keywords/strategy handles missing or invalid session gracefully', async () => {
    const req = new NextRequest('http://localhost:3000/api/keywords/strategy?crawlId=unknown-id');
    const res = await strategyGet(req);
    assert.strictEqual(res.status, 400);
  });

  it('GET /api/recommendations handles missing or invalid session gracefully', async () => {
    const req = new NextRequest('http://localhost:3000/api/recommendations?crawlId=unknown-id');
    const res = await recommendationsGet(req);
    assert.strictEqual(res.status, 400);
  });

  it('GET /api/content-strategy handles missing or invalid session gracefully', async () => {
    const req = new NextRequest('http://localhost:3000/api/content-strategy?crawlId=unknown-id');
    const res = await contentStrategyGet(req);
    assert.strictEqual(res.status, 400);
  });

  it('GET /api/cannibalization handles missing crawlId parameter with 400', async () => {
    const req = new NextRequest('http://localhost:3000/api/cannibalization');
    const res = await cannibalizationGet(req);
    assert.strictEqual(res.status, 400);
  });
});
