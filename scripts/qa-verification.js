import assert from 'node:assert';

const BASE_URL = 'http://localhost:4000';

async function runQA() {
  console.log('=== STARTING AUTOMATED PHASE 3 BACKEND & SSRF QA ===\n');

  // 1. Health Endpoint
  console.log('1. Testing GET /api/health...');
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  assert.strictEqual(healthRes.status, 200, 'Health check should return 200');
  const healthData = await healthRes.json();
  assert.strictEqual(healthData.status, 'ok');
  assert.strictEqual(healthData.service, 'SEO Keyword & Website Analyzer API');
  console.log('✓ Health endpoint OK:', healthData);

  // 2. SSRF & Protocol Rejection Tests
  console.log('\n2. Testing SSRF & Invalid Protocol Protections...');
  const ssrfTargets = [
    'http://localhost',
    'http://localhost:8080',
    'http://127.0.0.1',
    'http://127.0.0.1:4000',
    'http://127.1.2.3',
    'http://0.0.0.0',
    'http://10.0.0.1',
    'http://172.16.0.1',
    'http://192.168.1.1',
    'http://169.254.169.254',
    'http://[::1]',
    'http://[::ffff:127.0.0.1]',
    'http://[::ffff:169.254.169.254]',
    'file:///etc/passwd',
    'ftp://example.com/file.txt',
    'javascript:alert(1)',
  ];

  for (const target of ssrfTargets) {
    const res = await fetch(`${BASE_URL}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: target }),
    });

    assert.ok(
      res.status === 400 || res.status === 422,
      `Target "${target}" should be rejected with 400 or 422, got ${res.status}`
    );
    const data = await res.json();
    console.log(`✓ Blocked unsafe target "${target}" -> Status ${res.status} (${data.error || 'Blocked'})`);
  }

  // 3. Empty & Malformed URL validation
  console.log('\n3. Testing URL Validation...');
  const badUrls = ['', '   ', 'not-a-valid-url-at-all'];
  for (const bad of badUrls) {
    const res = await fetch(`${BASE_URL}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: bad }),
    });
    assert.strictEqual(res.status, 400, `Bad input "${bad}" must return 400`);
    console.log(`✓ Rejected invalid input "${bad}" -> Status 400`);
  }

  // 4. Real-World Live Analysis Test (Controlled public URL: https://example.com)
  console.log('\n4. Testing Real-World Live Analysis (https://example.com)...');
  const analyzeRes = await fetch(`${BASE_URL}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'https://example.com' }),
  });

  assert.strictEqual(analyzeRes.status, 200, 'Analysis of example.com should succeed');
  const analyzeData = await analyzeRes.json();
  assert.strictEqual(analyzeData.status, 'completed');
  assert.ok(analyzeData.jobId, 'Must return a jobId');
  const report = analyzeData.report;
  assert.ok(report, 'Must return a complete report');

  console.log('✓ Analysis Completed in', report.durationMs, 'ms');
  console.log('✓ Scores:', report.scores);
  assert.ok(report.scores.overall >= 0 && report.scores.overall <= 100);
  assert.ok(report.scores.onPage >= 0 && report.scores.onPage <= 100);
  assert.ok(report.scores.technical >= 0 && report.scores.technical <= 100);
  assert.ok(report.scores.content >= 0 && report.scores.content <= 100);

  console.log('✓ Extracted Keywords:', report.keywords.all.length, 'keywords');
  assert.ok(report.keywords.all.length > 0, 'Should extract keywords');
  console.log('  Top keyword:', report.keywords.all[0]);

  console.log('✓ Headings extracted:', report.onPage.headings.items.length);
  console.log('✓ Issues found:', report.issues.length);
  console.log('✓ Disclaimer attached:', Boolean(report.externalSeoDisclaimer));

  // 5. Export Endpoints Testing
  console.log('\n5. Testing Export Endpoints...');
  const jobId = analyzeData.jobId;

  // JSON export
  const jsonRes = await fetch(`${BASE_URL}/api/export/${jobId}?format=json`);
  assert.strictEqual(jsonRes.status, 200);
  assert.ok(jsonRes.headers.get('content-type')?.includes('application/json'));
  const exportedJson = await jsonRes.json();
  assert.strictEqual(exportedJson.id, report.id);
  console.log('✓ JSON Export OK');

  // CSV keywords export
  const csvKwRes = await fetch(`${BASE_URL}/api/export/${jobId}?format=csv&type=keywords`);
  assert.strictEqual(csvKwRes.status, 200);
  assert.ok(csvKwRes.headers.get('content-type')?.includes('text/csv'));
  const exportedKwCsv = await csvKwRes.text();
  assert.ok(exportedKwCsv.startsWith('Keyword,N-Gram Type'));
  console.log('✓ CSV Keywords Export OK (Lines:', exportedKwCsv.split('\n').length, ')');

  // CSV issues export
  const csvIssRes = await fetch(`${BASE_URL}/api/export/${jobId}?format=csv&type=issues`);
  assert.strictEqual(csvIssRes.status, 200);
  assert.ok(csvIssRes.headers.get('content-type')?.includes('text/csv'));
  const exportedIssCsv = await csvIssRes.text();
  assert.ok(exportedIssCsv.startsWith('Severity,Category'));
  console.log('✓ CSV Issues Export OK (Lines:', exportedIssCsv.split('\n').length, ')');

  // HTML export
  const htmlRes = await fetch(`${BASE_URL}/api/export/${jobId}?format=html`);
  assert.strictEqual(htmlRes.status, 200);
  assert.ok(htmlRes.headers.get('content-type')?.includes('text/html'));
  const exportedHtml = await htmlRes.text();
  assert.ok(exportedHtml.includes('<!DOCTYPE html>'));
  assert.ok(exportedHtml.includes('SEO Analysis Report'));
  console.log('✓ HTML Export OK (Bytes:', exportedHtml.length, ')');

  // 6. Database Persistence & History
  console.log('\n6. Testing Database Persistence & History...');
  const historyRes = await fetch(`${BASE_URL}/api/history`);
  assert.strictEqual(historyRes.status, 200);
  const historyData = await historyRes.json();
  assert.ok(Array.isArray(historyData.history));
  assert.ok(historyData.history.some((h) => h.id === jobId));
  console.log('✓ History Endpoint returns', historyData.history.length, 'entries including current job');

  const getJobRes = await fetch(`${BASE_URL}/api/jobs/${jobId}`);
  assert.strictEqual(getJobRes.status, 200);
  const retrievedJob = await getJobRes.json();
  assert.strictEqual(retrievedJob.id, jobId);
  assert.strictEqual(retrievedJob.status, 'completed');
  assert.ok(retrievedJob.report);
  console.log('✓ Job retrieval by ID OK');

  console.log('\n=== ALL PHASE 3 BACKEND & SSRF QA CHECKS PASSED ===');
}

runQA().catch((err) => {
  console.error('\nQA FAILED:', err);
  process.exit(1);
});
