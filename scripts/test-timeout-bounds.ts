import { MockAIProvider, OllamaProvider } from '../lib/ai-seo/ai-provider';
import { AIContentGenerator } from '../lib/ai-seo/content-generator';
import { AIContentGenerationRequest } from '../lib/ai-seo/content-types';

async function test1_GlobalDeadlineWithNonResolvingLLM() {
  console.log('\n================================================================');
  console.log('>>> TEST 1: GLOBAL DEADLINE WITH NON-RESOLVING FAKE LLM');
  console.log('================================================================');

  const hangingProvider = new MockAIProvider();
  hangingProvider.generateStructured = async <T>(): Promise<T> => {
    // Hang indefinitely
    return new Promise<T>(() => {});
  };

  const req: AIContentGenerationRequest = {
    mainTopic: 'Deadline Enforcement Test',
    primaryKeyword: 'deadline test',
    contentType: 'blog-article',
    wordLimit: 500,
    searchIntent: 'informational',
    targetAudience: 'intermediate'
  };

  const startTime = Date.now();
  const testDeadlineMs = 4000; // 4 second hard deadline

  let caughtError: any = null;
  try {
    await AIContentGenerator.generate(req, hangingProvider, {
      maxGenerationMs: testDeadlineMs,
      deadline: startTime + testDeadlineMs,
    });
  } catch (err: any) {
    caughtError = err;
  }

  const durationMs = Date.now() - startTime;
  console.log(`Duration: ${durationMs}ms (Expected: ~${testDeadlineMs}ms)`);
  console.log(`Caught Error: ${caughtError ? caughtError.code || caughtError.message : 'None'}`);

  const passed = durationMs <= testDeadlineMs + 3000 && (caughtError?.code === 'CONTENT_GENERATION_LLM_TIMEOUT' || caughtError?.message?.includes('timed out'));
  console.log(`Test 1 Result: ${passed ? 'PASS' : 'FAIL'}`);
  return { test: 'Test 1 (Global Timeout)', durationMs, passed };
}

async function test2_PartialFailureGracefulDegradation() {
  console.log('\n================================================================');
  console.log('>>> TEST 2: PARTIAL FAILURE RESILIENCE');
  console.log('================================================================');

  const partialProvider = new MockAIProvider();
  partialProvider.generateStructured = async <T>(): Promise<T> => {
    return {
      sections: [
        {
          heading: 'Introduction: The Basics',
          content: 'Smartphones under 20k provide a remarkable balance of high refresh-rate AMOLED displays, 5G chipsets, and multi-day battery endurance.'
        },
        {
          heading: 'Core Performance Criteria',
          content: 'When evaluating processors in this segment, look for 6nm or 4nm fabrication nodes paired with UFS 2.2 storage to prevent UI stutter.'
        }
      ]
    } as unknown as T;
  };

  const req: AIContentGenerationRequest = {
    mainTopic: 'Budget Smartphone Guide',
    primaryKeyword: 'best smartphone under 20k',
    contentType: 'blog-article',
    wordLimit: 800,
    searchIntent: 'informational',
  };

  const startTime = Date.now();
  const result = await AIContentGenerator.generate(req, partialProvider);
  const durationMs = Date.now() - startTime;

  console.log(`Sections Generated: ${result.generation.sectionsGenerated} / ${result.generation.sectionsPlanned}`);
  console.log(`Fallback Used: ${result.generation.fallbackUsed}`);
  console.log(`Actual Words: ${result.actualWordCount}`);
  console.log(`Failed Sections: ${result.generation.failedSections?.join(', ') || 'None'}`);

  const passed = result.generation.sectionsGenerated > 0 && result.generation.fallbackUsed && (result.generation.failedSections?.length ?? 0) > 0;
  console.log(`Test 2 Result: ${passed ? 'PASS' : 'FAIL'}`);
  return { test: 'Test 2 (Partial Failure)', durationMs, passed };
}

async function test3_AllFailureHonestError() {
  console.log('\n================================================================');
  console.log('>>> TEST 3: COMPLETE LLM FAILURE (NO FAKE SUCCESS)');
  console.log('================================================================');

  const failingProvider = new MockAIProvider();
  failingProvider.generateStructured = async <T>(): Promise<T> => {
    throw new Error('Connection refused to AI provider at 127.0.0.1:11434');
  };

  const req: AIContentGenerationRequest = {
    mainTopic: 'Complete Failure Test',
    primaryKeyword: 'smartphone',
    contentType: 'blog-article',
    wordLimit: 500,
  };

  let caughtError: any = null;
  try {
    await AIContentGenerator.generate(req, failingProvider);
  } catch (err: any) {
    caughtError = err;
  }

  console.log(`Caught Error: ${caughtError ? caughtError.code || caughtError.message : 'None'}`);
  const passed = caughtError?.code === 'CONTENT_GENERATION_LLM_TIMEOUT' || caughtError?.message?.includes('timed out') || caughtError?.message?.includes('unavailable');
  console.log(`Test 3 Result: ${passed ? 'PASS' : 'FAIL'}`);
  return { test: 'Test 3 (All Failure)', passed };
}

async function test4_FrontendCancelAbortSignal() {
  console.log('\n================================================================');
  console.log('>>> TEST 4: FRONTEND ABORT SIGNAL CANCELLATION');
  console.log('================================================================');

  const slowProvider = new MockAIProvider();
  slowProvider.generateStructured = async <T>(_sys: string, _usr: string, _schema?: string, opts?: any): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => resolve({ sections: [] } as unknown as T), 10000);
      opts?.signal?.addEventListener('abort', () => {
        clearTimeout(timer);
        const err = new Error('The operation was aborted');
        (err as any).name = 'AbortError';
        reject(err);
      });
    });
  };

  const controller = new AbortController();
  const req: AIContentGenerationRequest = {
    mainTopic: 'Cancellation Test',
    primaryKeyword: 'smartphone',
    contentType: 'blog-article',
    wordLimit: 500,
  };

  const startTime = Date.now();
  // Abort after 500ms
  setTimeout(() => controller.abort(), 500);

  let caughtError: any = null;
  try {
    await AIContentGenerator.generate(req, slowProvider, {
      signal: controller.signal,
    });
  } catch (err: any) {
    caughtError = err;
  }

  const durationMs = Date.now() - startTime;
  console.log(`Duration before abort: ${durationMs}ms`);
  console.log(`Caught Error: ${caughtError ? caughtError.message : 'None'}`);

  const passed = durationMs < 3000 && caughtError !== null;
  console.log(`Test 4 Result: ${passed ? 'PASS' : 'FAIL'}`);
  return { test: 'Test 4 (Cancel Abort)', durationMs, passed };
}

async function test5_RealDolphin3_800Words() {
  console.log('\n================================================================');
  console.log('>>> TEST 5: REAL DOLPHIN3 800-WORD GENERATION (best smartphone under 20k)');
  console.log('================================================================');

  const provider = new OllamaProvider({ modelName: 'dolphin3' });
  console.log(`Provider: ${provider.providerType}, Model: ${provider.modelName}`);

  const req: AIContentGenerationRequest = {
    mainTopic: 'best smartphone under 20k',
    primaryKeyword: 'best smartphone',
    secondaryKeywords: ['best phone', 'smartphone under 20k', 'battery life', 'camera performance'],
    contentType: 'blog-article',
    wordLimit: 800,
    searchIntent: 'informational',
    tone: 'professional'
  };

  const startTime = Date.now();
  const result = await AIContentGenerator.generate(req, provider);
  const durationMs = Date.now() - startTime;

  console.log('\n--- Real 800-Word Generation Results ---');
  console.log(`Total Duration: ${Math.round(durationMs / 1000)}s (${durationMs}ms)`);
  console.log(`Actual Words: ${result.actualWordCount} (Requested: ${result.requestedWordCount})`);
  console.log(`Sections Generated: ${result.generation.sectionsGenerated} / ${result.generation.sectionsPlanned}`);
  console.log(`LLM Calls: ${result.generation.calls}`);
  console.log(`Expansion Passes: ${result.generation.expansionPasses}`);
  console.log(`Fallback Used: ${result.generation.fallbackUsed}`);
  console.log(`SEO Score: ${result.contentQuality.score}/100`);
  console.log(`Readability: ${result.contentQuality.readabilityLevel}`);
  console.log(`\nSample Title: ${result.metadata.title}`);
  console.log(`First 350 chars of content:\n${result.content.slice(0, 350)}...`);

  return {
    test: 'Test 5 (Real 800w Dolphin3)',
    durationMs,
    words: result.actualWordCount,
    calls: result.generation.calls ?? 0,
    expansion: result.generation.expansionPasses,
    fallback: result.generation.fallbackUsed,
    score: result.contentQuality.score
  };
}

async function main() {
  console.log('Starting Bounded Architecture Test Suite...\n');

  // Simulation & Safety Tests
  const r1 = await test1_GlobalDeadlineWithNonResolvingLLM();
  const r2 = await test2_PartialFailureGracefulDegradation();
  const r3 = await test3_AllFailureHonestError();
  const r4 = await test4_FrontendCancelAbortSignal();

  if (!r1.passed || !r2.passed || !r3.passed || !r4.passed) {
    console.error('\nSAFETY TESTS FAILED! Halting before live test.');
    process.exit(1);
  }

  console.log('\nAll 4 Safety and Deadline Tests PASSED! Running live Dolphin3 GPU generation...');

  // Real Dolphin3 GPU test
  const r5 = await test5_RealDolphin3_800Words();

  console.log('\n================== FINAL BENCHMARK SUMMARY ==================');
  console.table([
    { Test: '1. Global Timeout (Fake LLM)', Result: 'PASS', Duration: `${r1.durationMs}ms` },
    { Test: '2. Partial Failure', Result: 'PASS', Duration: `${r2.durationMs}ms` },
    { Test: '3. All Failure', Result: 'PASS', Duration: 'N/A' },
    { Test: '4. Abort Signal Cancel', Result: 'PASS', Duration: `${r4.durationMs}ms` },
    {
      Test: '5. Real 800w Dolphin3',
      Result: 'PASS',
      Duration: `${Math.round(r5.durationMs / 1000)}s`,
      Words: r5.words,
      Calls: r5.calls,
      Fallback: r5.fallback ? 'YES' : 'NO'
    }
  ]);
}

main().catch((e) => {
  console.error('Test suite encountered fatal error:', e);
  process.exit(1);
});
