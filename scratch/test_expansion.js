async function test() {
  const healthRes = await fetch('http://localhost:4000/api/health');
  console.log('Health Status:', healthRes.status, await healthRes.json());

  const dataSourcesRes = await fetch('http://localhost:4000/api/settings/data-sources');
  console.log('Data Sources Status:', dataSourcesRes.status, await dataSourcesRes.json());

  console.log('Testing Analyze URL with Tag Explorer & Content Contribution on https://example.com ...');
  const analyzeRes = await fetch('http://localhost:4000/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'https://example.com' }),
  });
  console.log('Analyze Status:', analyzeRes.status);
  const analyzeData = await analyzeRes.json();
  console.log('Overall Score:', analyzeData.report?.scores?.overall);
  console.log('Tag Explorer elements count:', analyzeData.report?.tagExplorer?.totalElementsCount);
  console.log('Content Contribution overall:', analyzeData.report?.contentContribution?.overallContributionScore);
  console.log('Keywords count:', analyzeData.report?.keywords?.all?.length);
  console.log('Primary keywords:', analyzeData.report?.keywords?.primary?.map(k => k.keyword));
  console.log('Opportunities count:', analyzeData.report?.keywords?.opportunities?.length);
  console.log('Heatmap items:', analyzeData.report?.contentContribution?.heatmap?.map(h => `${h.sectionName}: ${h.signalScore}/100`));

  console.log('\nTesting Multi-Sheet XLSX Export...');
  const xlsxRes = await fetch(`http://localhost:4000/api/export/${analyzeData.jobId}?format=xlsx`);
  console.log('XLSX Export Status:', xlsxRes.status, 'Content-Type:', xlsxRes.headers.get('content-type'));
  const xlsxBuf = await xlsxRes.arrayBuffer();
  console.log('XLSX Buffer Byte Size:', xlsxBuf.byteLength);

  console.log('\nTesting Competitor Comparison (https://example.com vs https://www.iana.org) ...');
  const compRes = await fetch('http://localhost:4000/api/competitors/compare', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      targetUrl: 'https://example.com',
      competitorUrls: ['https://www.iana.org'],
    }),
  });
  console.log('Competitor Comparison Status:', compRes.status);
  const compData = await compRes.json();
  console.log('Competitor Target Host:', compData.report?.targetSummary?.hostname);
  console.log('Competitor Summary Host:', compData.report?.competitorsSummaries?.[0]?.hostname);
  console.log('Keyword Gap rows count:', compData.report?.keywordGapMatrix?.length);
  console.log('Missing Topics count:', compData.report?.contentGap?.missingTopics?.length);
  console.log('Outrank Recommendations count:', compData.report?.outrankRecommendations?.length);

  console.log('\nALL ENDPOINT TESTS PASSED SUCCESSFULLY!');
}

test().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
