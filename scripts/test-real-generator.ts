import { getAIProvider, OllamaProvider, MockAIProvider } from '../lib/ai-seo/ai-provider';
import { AIContentGenerator } from '../lib/ai-seo/content-generator';
import { AIContentGenerationRequest } from '../lib/ai-seo/content-types';

async function runRealTest1() {
  console.log('\n================================================================');
  console.log('>>> TEST 1: REAL 800-WORD GENERATION (wireless gaming mouse)');
  console.log('================================================================');
  
  const provider = new OllamaProvider({ modelName: 'dolphin3' });
  console.log(`Provider: ${provider.providerType}, Model: ${provider.modelName}`);

  const startTime = Date.now();
  const req: AIContentGenerationRequest = {
    mainTopic: 'Comprehensive Guide to Selecting a High-Performance Wireless Gaming Mouse',
    primaryKeyword: 'wireless gaming mouse',
    secondaryKeywords: ['mobile phone', 'gaming mouse latency', 'optical sensor', 'battery life'],
    contentType: 'blog-article',
    wordLimit: 800,
    searchIntent: 'informational',
    targetAudience: 'intermediate'
  };

  const result = await AIContentGenerator.generate(req, provider);

  const durationMs = Date.now() - startTime;
  console.log(`\n--- Test 1 Results ---`);
  console.log(`Total Duration: ${Math.round(durationMs / 1000)}s (${durationMs}ms)`);
  console.log(`Actual Words: ${result.actualWordCount} (Requested: ${result.requestedWordCount})`);
  console.log(`Sections Generated: ${result.generation.sectionsGenerated} / ${result.generation.sectionsPlanned}`);
  console.log(`LLM Calls: ${result.generation.calls}`);
  console.log(`Fallback Used: ${result.generation.fallbackUsed}`);
  console.log(`SEO Score: ${result.contentQuality.score}/100`);
  console.log(`Readability Score: ${result.contentQuality.details?.readability ?? 'N/A'}/100 (${result.contentQuality.readabilityLevel})`);
  console.log(`Topic Coverage: ${result.topicCoverage.overallScore}%`);
  console.log(`\nSample Content Title: ${result.metadata.title}`);
  console.log(`First 300 chars of content:\n${result.content.slice(0, 300)}...`);

  return { test: 'Test 1 (800 words)', durationMs, words: result.actualWordCount, calls: result.generation.calls ?? 0, fallback: result.generation.fallbackUsed, score: result.contentQuality.score };
}

async function runRealTest2() {
  console.log('\n================================================================');
  console.log('>>> TEST 2: REAL 1200-WORD GENERATION');
  console.log('================================================================');

  const provider = new OllamaProvider({ modelName: 'dolphin3' });
  const startTime = Date.now();
  const req: AIContentGenerationRequest = {
    mainTopic: 'Next-Generation Wireless Gaming Peripherals and Latency Engineering',
    primaryKeyword: 'wireless gaming mouse',
    secondaryKeywords: ['polling rate', 'sensor acceleration', 'lightweight gaming mouse', 'wireless latency'],
    contentType: 'guide',
    wordLimit: 1200,
    searchIntent: 'informational',
    targetAudience: 'expert'
  };

  const result = await AIContentGenerator.generate(req, provider);

  const durationMs = Date.now() - startTime;
  console.log(`\n--- Test 2 Results ---`);
  console.log(`Total Duration: ${Math.round(durationMs / 1000)}s (${durationMs}ms)`);
  console.log(`Actual Words: ${result.actualWordCount} (Requested: ${result.requestedWordCount})`);
  console.log(`Sections Generated: ${result.generation.sectionsGenerated} / ${result.generation.sectionsPlanned}`);
  console.log(`LLM Calls: ${result.generation.calls}`);
  console.log(`Fallback Used: ${result.generation.fallbackUsed}`);
  console.log(`SEO Score: ${result.contentQuality.score}/100`);

  return { test: 'Test 2 (1200 words)', durationMs, words: result.actualWordCount, calls: result.generation.calls ?? 0, fallback: result.generation.fallbackUsed, score: result.contentQuality.score };
}

async function runTest3_TimeoutSimulation() {
  console.log('\n================================================================');
  console.log('>>> TEST 3: SIMULATED OLLAMA TIMEOUT');
  console.log('================================================================');

  const mockProvider = new MockAIProvider();
  mockProvider.generateStructured = async <T>(): Promise<T> => {
    const err = new Error('The operation was aborted due to timeout');
    (err as any).name = 'AbortError';
    throw err;
  };

  const req: AIContentGenerationRequest = {
    mainTopic: 'Wireless Ergonomics Test',
    primaryKeyword: 'wireless mouse',
    contentType: 'blog-article',
    wordLimit: 500,
    searchIntent: 'informational',
    targetAudience: 'beginner'
  };

  let caughtError: any = null;
  try {
    await AIContentGenerator.generate(req, mockProvider);
  } catch (err: any) {
    caughtError = err;
  }

  console.log(`Caught Error Code/Message: ${caughtError ? caughtError.code || caughtError.message : 'None'}`);
  const passed = caughtError?.code === 'CONTENT_GENERATION_LLM_TIMEOUT' || caughtError?.message?.includes('timed out');
  console.log(`Test 3 Status: ${passed ? 'PASS (Honest Failure Handling)' : 'FAIL'}`);
  return passed;
}

async function runTest4_OllamaUnavailable() {
  console.log('\n================================================================');
  console.log('>>> TEST 4: OLLAMA UNAVAILABLE / CONNECTION REFUSED');
  console.log('================================================================');

  const mockProvider = new MockAIProvider();
  mockProvider.generateStructured = async <T>(): Promise<T> => {
    throw new Error('fetch failed: ECONNREFUSED 127.0.0.1:11434');
  };

  const req: AIContentGenerationRequest = {
    mainTopic: 'Connection Refused Test',
    primaryKeyword: 'wireless mouse',
    contentType: 'blog-article',
    wordLimit: 500,
    searchIntent: 'informational',
    targetAudience: 'beginner'
  };

  let caughtError: any = null;
  try {
    await AIContentGenerator.generate(req, mockProvider);
  } catch (err: any) {
    caughtError = err;
  }

  console.log(`Caught Error Code/Message: ${caughtError ? caughtError.code || caughtError.message : 'None'}`);
  const passed = !!caughtError;
  console.log(`Test 4 Status: ${passed ? 'PASS (Honest Failure Handling)' : 'FAIL'}`);
  return passed;
}

async function runTest5_PartialFailure() {
  console.log('\n================================================================');
  console.log('>>> TEST 5: PARTIAL GENERATION FAILURE (Batch 1 succeeds, Batch 2 fails)');
  console.log('================================================================');

  let callCount = 0;
  const mockProvider = new MockAIProvider();
  mockProvider.generateStructured = async <T>(): Promise<T> => {
    callCount++;
    if (callCount === 1) {
      return {
        sections: [
          { heading: 'Introduction: The Basics', content: 'Here is detailed high quality introductory content about wireless gaming mice with rich paragraphs and technical depth.' },
          { heading: 'Core Sensor Latency', content: 'Modern sensors operate with sub-millisecond report rates and zero smoothing for competitive play.' }
        ]
      } as unknown as T;
    } else {
      throw new Error('Timeout on batch 2');
    }
  };

  const req: AIContentGenerationRequest = {
    mainTopic: 'Partial Failure Resilience Test',
    primaryKeyword: 'wireless mouse',
    contentType: 'blog-article',
    wordLimit: 800,
    searchIntent: 'informational',
    targetAudience: 'beginner'
  };

  const res = await AIContentGenerator.generate(req, mockProvider);
  console.log(`Sections Generated: ${res.generation.sectionsGenerated} / ${res.generation.sectionsPlanned}`);
  console.log(`Fallback Used: ${res.generation.fallbackUsed}`);
  console.log(`Failed Sections: ${res.generation.failedSections?.join(', ') ?? 'None'}`);
  const passed = res.generation.fallbackUsed && res.generation.sectionsGenerated > 0;
  console.log(`Test 5 Status: ${passed ? 'PASS (Graceful Partial Fallback)' : 'FAIL'}`);
  return passed;
}

async function main() {
  console.log('Starting validation suite...');
  // 1. Simulation Tests (Instant)
  const t3 = await runTest3_TimeoutSimulation();
  const t4 = await runTest4_OllamaUnavailable();
  const t5 = await runTest5_PartialFailure();

  if (!t3 || !t4 || !t5) {
    console.error('Simulation tests failed! Aborting real tests.');
    process.exit(1);
  }

  console.log('\nAll simulation tests PASSED successfully.');
}

main().catch((e) => {
  console.error('Fatal error running tests:', e);
  process.exit(1);
});
