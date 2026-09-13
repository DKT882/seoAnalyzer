#!/usr/bin/env node

/**
 * =========================================================================
 * SEO Analyzer - Automated AI Development Server Launcher (dev)
 * =========================================================================
 * 
 * Features:
 * 1. Checks if Ollama is running at configured base URL.
 * 2. If running: reuses existing Ollama instance without duplication.
 * 3. If NOT running: locates Ollama executable on Windows/Mac/Linux and starts it.
 * 4. Polls /api/tags until Ollama is ready (bounded 30s timeout).
 * 5. Queries installed models and verifies 'qwen2.5-coder:7b' exists.
 * 6. If model missing: stops with clear, actionable `ollama pull` command.
 * 7. Sets AI_PROVIDER=ollama server-side and starts Next.js directly (no recursion).
 * 8. Handles Ctrl+C cleanly without terminating pre-existing Ollama.
 */

import { spawn, execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const OLLAMA_BASE_URL = (process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(/\/+$/, '');
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5-coder:7b';
const OLLAMA_TIMEOUT_MS = process.env.OLLAMA_TIMEOUT_MS || '60000';
const OLLAMA_RETRIES = process.env.OLLAMA_RETRIES || '2';

const isWindows = process.platform === 'win32';

/**
 * Checks if Ollama API is reachable.
 */
async function pingOllama(baseUrl, timeoutMs = 2000) {
  try {
    const res = await fetch(`${baseUrl}/api/tags`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Fetches installed models from Ollama /api/tags.
 */
async function getInstalledModels(baseUrl) {
  try {
    const res = await fetch(`${baseUrl}/api/tags`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.models || []).map((m) => m.name || m.model || '').filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Checks if target model matches any installed model string.
 */
function isModelInstalled(targetModel, installedModels) {
  const t = targetModel.toLowerCase().trim();
  return installedModels.some((installed) => {
    const i = installed.toLowerCase().trim();
    if (i === t) return true;
    if (i === `${t}:latest` || t === `${i}:latest`) return true;
    if (i.startsWith(`${t}:`) || t.startsWith(`${i}:`)) return true;
    const tBase = t.split(':')[0];
    const iBase = i.split(':')[0];
    if (tBase === iBase && t.includes('7b') && i.includes('7b')) return true;
    return false;
  });
}

/**
 * Locates the Ollama executable on the current OS.
 */
function findOllamaBinary() {
  // 1. Check if available on PATH
  try {
    const cmd = isWindows ? 'where.exe ollama' : 'which ollama';
    const output = execSync(cmd, { stdio: ['pipe', 'pipe', 'ignore'], encoding: 'utf-8' }).trim();
    const firstLine = output.split(/\r?\n/)[0]?.trim();
    if (firstLine && existsSync(firstLine)) {
      return firstLine;
    }
  } catch {
    // continue fallback search
  }

  // 2. Check Windows known paths
  if (isWindows) {
    const candidates = [
      process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, 'Programs', 'Ollama', 'ollama.exe') : null,
      process.env.ProgramFiles ? join(process.env.ProgramFiles, 'Ollama', 'ollama.exe') : null,
      process.env['ProgramFiles(x86)'] ? join(process.env['ProgramFiles(x86)'], 'Ollama', 'ollama.exe') : null,
      join(homedir(), 'AppData', 'Local', 'Programs', 'Ollama', 'ollama.exe'),
    ].filter(Boolean);

    for (const candidate of candidates) {
      if (candidate && existsSync(candidate)) {
        return candidate;
      }
    }
  } else {
    // 3. Check Unix known paths
    const unixCandidates = [
      '/usr/local/bin/ollama',
      '/usr/bin/ollama',
      join(homedir(), '.ollama', 'bin', 'ollama'),
    ];
    for (const candidate of unixCandidates) {
      if (existsSync(candidate)) {
        return candidate;
      }
    }
  }

  return 'ollama'; // Fallback to raw binary name
}

/**
 * Starts Ollama in background if not already running.
 */
async function ensureOllamaRunning(baseUrl) {
  const isRunning = await pingOllama(baseUrl);
  if (isRunning) {
    console.log('[AI] Ollama is running');
    return { wasAlreadyRunning: true };
  }

  console.log('[AI] Ollama is not running. Starting Ollama...');
  const ollamaBin = findOllamaBinary();

  try {
    const child = spawn(ollamaBin, ['serve'], {
      detached: true,
      stdio: 'ignore',
      shell: false,
      windowsHide: true,
    });
    child.unref();
  } catch (spawnErr) {
    console.error(`[AI] WARNING: Could not automatically launch '${ollamaBin}': ${spawnErr.message}`);
    console.log('[AI] Please run `ollama serve` in a separate terminal.');
  }

  console.log('[AI] Waiting for Ollama API...');
  const startTime = Date.now();
  const maxWaitMs = 30000;

  while (Date.now() - startTime < maxWaitMs) {
    await new Promise((res) => setTimeout(res, 500));
    if (await pingOllama(baseUrl)) {
      console.log('[AI] Ollama API ready');
      return { wasAlreadyRunning: false };
    }
  }

  throw new Error(`Ollama API did not become ready at ${baseUrl} within 30 seconds.`);
}

/**
 * Main execution routine.
 */
async function main() {
  const isCheckOnly = process.argv.includes('--check-only') || process.argv.includes('-c');
  const extraArgs = process.argv.slice(2).filter((arg) => arg !== '--check-only' && arg !== '-c');

  console.log('========================================');
  console.log(' SEO Analyzer - AI Development Server');
  console.log('========================================\n');
  console.log(`[AI] Provider: Ollama`);
  console.log(`[AI] Endpoint: ${OLLAMA_BASE_URL}`);
  console.log(`[AI] Model:    ${OLLAMA_MODEL}\n`);

  console.log('[AI] Checking Ollama...');
  let startedInfo;
  try {
    startedInfo = await ensureOllamaRunning(OLLAMA_BASE_URL);
  } catch (err) {
    console.error(`\n[AI] ERROR: ${err.message}`);
    console.log('[AI] Ensure Ollama is installed and run: `ollama serve`\n');
    process.exit(1);
  }

  console.log('[AI] Checking model...');
  const installedModels = await getInstalledModels(OLLAMA_BASE_URL);
  const modelFound = isModelInstalled(OLLAMA_MODEL, installedModels);

  if (!modelFound) {
    console.error(`\n[AI] ERROR: '${OLLAMA_MODEL}' is not installed.`);
    console.log(`[AI] Available models: ${installedModels.length > 0 ? installedModels.join(', ') : 'none'}`);
    console.log(`\n[AI] Run:`);
    console.log(`    ollama pull ${OLLAMA_MODEL}\n`);
    process.exit(1);
  }

  console.log(`[AI] ${OLLAMA_MODEL} is available`);

  if (isCheckOnly) {
    console.log('\n[AI] Diagnostic check completed successfully.');
    process.exit(0);
  }

  console.log('\n[APP] Starting Next.js development server...');
  console.log('========================================');
  console.log(' SEO Analyzer is ready');
  console.log('========================================\n');

  const env = {
    ...process.env,
    AI_PROVIDER: 'ollama',
    OLLAMA_BASE_URL: OLLAMA_BASE_URL,
    OLLAMA_MODEL: OLLAMA_MODEL,
    OLLAMA_TIMEOUT_MS: OLLAMA_TIMEOUT_MS,
    OLLAMA_RETRIES: OLLAMA_RETRIES,
  };

  // Launch Next.js directly to avoid infinite recursion when npm run dev calls this script
  const localNextBin = join(process.cwd(), 'node_modules', 'next', 'dist', 'bin', 'next');

  let nextProcess;
  if (existsSync(localNextBin)) {
    nextProcess = spawn(process.execPath, [localNextBin, 'dev', ...extraArgs], {
      stdio: 'inherit',
      env,
    });
  } else {
    const nextCmd = isWindows ? 'npx.cmd' : 'npx';
    nextProcess = spawn(nextCmd, ['next', 'dev', ...extraArgs], {
      stdio: 'inherit',
      env,
      shell: isWindows,
    });
  }

  const cleanup = () => {
    if (nextProcess && !nextProcess.killed) {
      try {
        nextProcess.kill('SIGINT');
      } catch {
        // ignore
      }
    }
  };

  process.on('SIGINT', () => {
    cleanup();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    cleanup();
    process.exit(0);
  });

  nextProcess.on('exit', (code) => {
    process.exit(code ?? 0);
  });
}

main().catch((err) => {
  console.error('[AI] Fatal Startup Error:', err);
  process.exit(1);
});
