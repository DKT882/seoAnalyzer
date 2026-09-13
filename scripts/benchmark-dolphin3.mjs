import { execSync } from 'child_process';

async function getGpuStats() {
  try {
    const output = execSync('nvidia-smi --query-gpu=memory.used,memory.total,utilization.gpu --format=csv,noheader,nounits', { encoding: 'utf-8' });
    const [memUsed, memTotal, gpuUtil] = output.trim().split(',').map(s => s.trim());
    return { memUsed: `${memUsed} MiB`, memTotal: `${memTotal} MiB`, gpuUtil: `${gpuUtil}%` };
  } catch (e) {
    return { memUsed: 'N/A', memTotal: 'N/A', gpuUtil: 'N/A' };
  }
}

async function runBenchmark(numPredict, label) {
  const prompt = `Write a comprehensive, professional SEO guide section about: "Choosing the Best Wireless Gaming Mouse in 2026". Cover sensor latency, battery life, weight, and ergonomic grip styles.`;
  const system = `You are an expert SEO content specialist. Provide direct, informative, well-structured content. Return clean text.`;

  console.log(`\n================== Benchmark ${label}: requested num_predict = ${numPredict} ==================`);
  const gpuBefore = await getGpuStats();

  const startTime = Date.now();
  const res = await fetch('http://127.0.0.1:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'dolphin3',
      prompt: `${system}\n\n${prompt}`,
      stream: false,
      options: {
        num_predict: numPredict,
        temperature: 0.3
      }
    })
  });

  const durationMs = Date.now() - startTime;
  if (!res.ok) {
    throw new Error(`Ollama request failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const gpuAfter = await getGpuStats();

  const promptTokens = data.prompt_eval_count || 0;
  const evalTokens = data.eval_count || 0;
  const evalDurationMs = data.eval_duration ? Math.round(data.eval_duration / 1e6) : durationMs;
  const tokensPerSec = evalDurationMs > 0 ? (evalTokens / (evalDurationMs / 1000)).toFixed(2) : 0;

  const result = {
    test: label,
    model: 'dolphin3',
    promptSizeBytes: prompt.length + system.length,
    promptTokens: promptTokens,
    requestedOutputTokens: numPredict,
    actualOutputTokens: evalTokens,
    durationMs: durationMs,
    evalDurationMs: evalDurationMs,
    tokensPerSecond: parseFloat(tokensPerSec),
    vramUsed: gpuAfter.memUsed,
    gpuUtilization: gpuAfter.gpuUtil,
    sampleText: data.response ? data.response.slice(0, 100) + '...' : ''
  };

  console.log(JSON.stringify(result, null, 2));
  return result;
}

async function main() {
  console.log('Starting Dolphin3 controlled benchmarks...');
  const tests = [
    { num: 50, label: 'Test A (50 tokens)' },
    { num: 100, label: 'Test B (100 tokens)' },
    { num: 150, label: 'Test C (150 tokens)' },
    { num: 250, label: 'Test D (250 tokens)' }
  ];

  const results = [];
  for (const t of tests) {
    try {
      const res = await runBenchmark(t.num, t.label);
      results.push(res);
    } catch (e) {
      console.error(`Error in ${t.label}:`, e);
    }
  }

  console.log('\n================== BENCHMARK SUMMARY TABLE ==================');
  console.table(results.map(r => ({
    Test: r.test,
    Model: r.model,
    'Prompt Tokens': r.promptTokens,
    'Req Tokens': r.requestedOutputTokens,
    'Actual Tokens': r.actualOutputTokens,
    'Duration (ms)': r.durationMs,
    'Eval Tok/s': r.tokensPerSecond,
    VRAM: r.vramUsed,
    'GPU Util': r.gpuUtilization
  })));
}

main();
