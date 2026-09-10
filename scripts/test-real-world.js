const BASE_URL = 'http://localhost:4000';

const targets = [
  { name: '1. Minimal HTML', url: 'https://example.com' },
  { name: '2. Python.org (Robots & Sitemap)', url: 'https://www.python.org/' },
  { name: '3. W3C Standards (Headings & Links)', url: 'https://www.w3.org/standards/' },
];

async function runRealWorldTests() {
  console.log('=== REAL-WORLD LIVE PAGE ANALYSIS TESTS ===\n');

  for (const target of targets) {
    console.log(`Analyzing: ${target.name} (${target.url})...`);
    try {
      const res = await fetch(`${BASE_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: target.url }),
      });

      const data = await res.json();
      if (!res.ok) {
        console.log(`  ⚠ Server returned ${res.status}: ${data.error}`);
        continue;
      }

      const report = data.report;
      console.log(`  ✓ Status: ${data.status} (Job: ${data.jobId})`);
      console.log(`  ✓ Duration: ${report.durationMs}ms`);
      console.log(`  ✓ Overall Health Score: ${report.scores.overall}/100 (OnPage: ${report.scores.onPage}, Tech: ${report.scores.technical}, Content: ${report.scores.content}, Links: ${report.scores.links}, Mobile: ${report.scores.mobile})`);
      console.log(`  ✓ Words: ${report.onPage.wordCount} | Headings: ${report.onPage.headings.items.length} (H1s: ${report.onPage.headings.h1Count})`);
      console.log(`  ✓ Total Keywords Extracted: ${report.keywords.all.length}`);
      console.log(`  ✓ Primary Keywords:`, report.keywords.primary.slice(0, 3).map(k => `${k.keyword} (${k.overallScore})`));
      console.log(`  ✓ Topic Clusters: ${report.keywords.clusters.length} | Entities: ${report.keywords.entities.length}`);
      console.log(`  ✓ Links: ${report.links.totalLinks} (Internal: ${report.links.internalLinksCount}, External: ${report.links.externalLinksCount})`);
      console.log(`  ✓ Images: ${report.images.totalImages} (ALT Coverage: ${report.images.altCoverageRatio}%)`);
      console.log(`  ✓ Schemas: ${report.schemas.length}`);
      console.log(`  ✓ Robots.txt: ${report.technical.robotsAnalysis.exists ? 'Detected' : 'Not Found'} | Bot Allowed: ${report.technical.robotsAnalysis.isBotAllowed}`);
      console.log(`  ✓ Sitemap: ${report.technical.sitemapAnalysis.exists ? `Found (${report.technical.sitemapAnalysis.totalUrls} URLs)` : 'Not Found'}`);
      console.log(`  ✓ Audit Issues: ${report.issues.length} (Critical: ${report.issues.filter(i => i.severity === 'CRITICAL').length}, Warnings: ${report.issues.filter(i => i.severity === 'WARNING').length})`);
      console.log('');
    } catch (err) {
      console.error(`  ✕ Request failed for ${target.url}:`, err.message);
    }
  }

  console.log('=== REAL-WORLD TESTS COMPLETED ===');
}

runRealWorldTests();
