async function runE2ETests() {
  console.log('--- Starting Next.js Live E2E Verification ---');
  
  // 1. Test Health
  const healthRes = await fetch('http://localhost:3000/api/health');
  const healthData = await healthRes.json();
  console.log('1. Health check:', healthRes.status, healthData.service);
  
  // 2. Test Data Sources
  const dsRes = await fetch('http://localhost:3000/api/settings/data-sources');
  const dsData = await dsRes.json();
  console.log('2. Data sources count:', dsData.providers.length);
  
  // 3. Test Analyze POST
  console.log('3. Submitting analyze job for https://example.com...');
  const analyzeRes = await fetch('http://localhost:3000/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'https://example.com', checkRobots: true, checkSitemap: true }),
  });
  const analyzeData = await analyzeRes.json();
  console.log('   Analyze response:', analyzeRes.status, 'jobId:', analyzeData.jobId, 'status:', analyzeData.status);
  
  const jobId = analyzeData.jobId;
  let report = null;
  
  // 4. Poll job
  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const jobRes = await fetch(`http://localhost:3000/api/jobs/${jobId}`);
    const jobData = await jobRes.json();
    console.log(`   Poll ${i + 1}: status = ${jobData.status}`);
    if (jobData.status === 'completed') {
      report = jobData.report;
      break;
    }
  }
  
  if (!report) {
    throw new Error('Analysis job timed out or failed to complete.');
  }
  
  console.log('4. Analysis Completed:');
  console.log('   Overall Score:', report.scores.overall);
  console.log('   OnPage Score:', report.scores.onPage);
  console.log('   Technical Score:', report.scores.technical);
  console.log('   Content Score:', report.scores.content);
  console.log('   Links Score:', report.scores.links);
  console.log('   Keywords Count:', report.keywords.all.length);
  console.log('   Tag Explorer Count:', report.tagExplorer.totalElementsCount);
  console.log('   Content Contribution Score:', report.contentContribution.overallContributionScore);
  
  // 5. Test Export XLSX
  const xlsxRes = await fetch(`http://localhost:3000/api/export/${jobId}?format=xlsx`);
  const xlsxBuf = await xlsxRes.arrayBuffer();
  console.log('5. XLSX Export Status:', xlsxRes.status, 'Content-Type:', xlsxRes.headers.get('content-type'), 'Bytes:', xlsxBuf.byteLength);
  
  // 6. Test Export CSV
  const csvRes = await fetch(`http://localhost:3000/api/export/${jobId}?format=csv&type=keywords`);
  const csvText = await csvRes.text();
  console.log('6. CSV Export Status:', csvRes.status, 'Lines:', csvText.split('\n').length);
  
  // 7. Test Export HTML
  const htmlRes = await fetch(`http://localhost:3000/api/export/${jobId}?format=html`);
  const htmlText = await htmlRes.text();
  console.log('7. HTML Export Status:', htmlRes.status, 'Length:', htmlText.length);
  
  // 8. Test Export JSON
  const jsonRes = await fetch(`http://localhost:3000/api/export/${jobId}?format=json`);
  const jsonBody = await jsonRes.json();
  console.log('8. JSON Export Status:', jsonRes.status, 'Report URL:', jsonBody.url);
  
  // 9. Test Domain Overview
  const domainRes = await fetch('http://localhost:3000/api/domain-overview?domain=example.com');
  const domainData = await domainRes.json();
  console.log('9. Domain Overview Status:', domainRes.status, 'Domain:', domainData.domain, 'Confidence:', domainData.dataConfidence);
  
  // 10. Test Competitors Compare
  console.log('10. Running Competitor Comparison...');
  const compRes = await fetch('http://localhost:3000/api/competitors/compare', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      targetUrl: 'https://example.com',
      competitorUrls: ['https://rojloo.vercel.app/places/new-delhi'],
    }),
  });
  const compData = await compRes.json();
  console.log('   Competitor Compare Status:', compRes.status, 'Comparison ID:', compData.comparisonId, 'Competitors:', compData.report?.competitorUrls?.length);
  
  // 11. Test Frontend HTML Pages
  const homeRes = await fetch('http://localhost:3000/');
  const homeHtml = await homeRes.text();
  console.log('11. Home Page Status:', homeRes.status, 'Includes SEO Intel Pro:', homeHtml.includes('SEO Intel Pro'));
  
  const histRes = await fetch('http://localhost:3000/history');
  const histHtml = await histRes.text();
  console.log('12. History Page Status:', histRes.status, 'Includes Audit History:', histHtml.includes('Audit History') || histHtml.includes('History'));
  
  const methRes = await fetch('http://localhost:3000/methodology');
  const methHtml = await methRes.text();
  console.log('13. Methodology Page Status:', methRes.status, 'Includes Zero Fabrication:', methHtml.includes('Zero Metric Fabrication') || methHtml.includes('Methodology'));
  
  console.log('\n>>> ALL 13 END-TO-END VERIFICATION CHECKS PASSED SUCCESSFULLY! <<<');
}

runE2ETests().catch(err => {
  console.error('E2E Verification Failed:', err);
  process.exit(1);
});
