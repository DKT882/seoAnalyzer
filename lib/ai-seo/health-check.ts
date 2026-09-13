import { AIProviderConfig, AIProviderType } from './types';
import { getAIProvider, OllamaProvider, RuleInformedProvider } from './ai-provider';

export type AIHealthStatus =
  | 'OLLAMA_AVAILABLE'
  | 'OLLAMA_UNAVAILABLE'
  | 'MODEL_MISSING'
  | 'MODEL_READY'
  | 'PROVIDER_CONFIGURED'
  | 'FALLBACK_READY';

export interface AIHealthReport {
  provider: string;
  status: AIHealthStatus;
  available: boolean;
  model: string;
  endpoint?: string;
  fallbackAvailable: boolean;
  installedModels?: string[];
  latencyMs?: number;
  error?: string;
}

/**
 * Normalizes and matches model names from Ollama tags against target model.
 * Handles forms like 'dolphin3', 'dolphin3:latest', 'qwen2.5-coder:7b', etc.
 */
export function isModelNameMatch(targetModel: string, installedModel: string): boolean {
  if (!targetModel || !installedModel) return false;
  const t = targetModel.toLowerCase().trim();
  const i = installedModel.toLowerCase().trim();
  if (t === i) return true;
  if (i === `${t}:latest` || t === `${i}:latest`) return true;
  if (i.startsWith(`${t}:`) || t.startsWith(`${i}:`)) return true;
  const tBase = t.split(':')[0];
  const iBase = i.split(':')[0];
  if (tBase === iBase) {
    return true;
  }
  return false;
}

/**
 * Performs a safe, lightweight health check of the active or configured AI Provider.
 * Distinguishes OLLAMA_AVAILABLE, OLLAMA_UNAVAILABLE, MODEL_MISSING, MODEL_READY, and FALLBACK_READY.
 * Never leaks API keys, secrets, or filesystem paths.
 */
export async function checkAIHealth(customConfig?: Partial<AIProviderConfig>): Promise<AIHealthReport> {
  const envProvider = (process.env.AI_PROVIDER || process.env.AI_SEO_PROVIDER || '').toUpperCase();
  const providerType: AIProviderType =
    customConfig?.providerType ||
    (envProvider === 'OLLAMA' ? 'OLLAMA' : undefined) ||
    (envProvider === 'OPENAI' || envProvider === 'OPENAI_COMPATIBLE' ? 'OPENAI_COMPATIBLE' : undefined) ||
    (envProvider === 'CLAUDE' || envProvider === 'CLAUDE_API' ? 'CLAUDE_API' : undefined) ||
    (envProvider === 'OFFLINE' || envProvider === 'RULE_INFORMED_OFFLINE' ? 'RULE_INFORMED_OFFLINE' : undefined) ||
    (process.env.OLLAMA_BASE_URL || process.env.OLLAMA_MODEL ? 'OLLAMA' : 'RULE_INFORMED_OFFLINE');

  const configuredModel =
    customConfig?.modelName ||
    process.env.OLLAMA_MODEL ||
    process.env.AI_SEO_MODEL ||
    'dolphin3';

  // 1. OLLAMA HEALTH CHECK
  if (providerType === 'OLLAMA') {
    const rawEndpoint = (
      customConfig?.endpointUrl ||
      process.env.OLLAMA_BASE_URL ||
      'http://127.0.0.1:11434'
    ).replace(/\/+$/, '');

    // Normalize endpoint to host root for /api/tags
    const baseHost = rawEndpoint.endsWith('/v1') ? rawEndpoint.slice(0, -3) : rawEndpoint;
    const tagsUrl = `${baseHost}/api/tags`;

    const startTime = Date.now();
    try {
      const timeoutMs = customConfig?.timeoutMs ?? 3000;
      const response = await fetch(tagsUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(timeoutMs),
      });

      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        return {
          provider: 'ollama',
          status: 'OLLAMA_UNAVAILABLE',
          available: false,
          model: configuredModel,
          endpoint: baseHost,
          fallbackAvailable: true,
          error: `Ollama API returned HTTP ${response.status}`,
          latencyMs,
        };
      }

      const data = await response.json();
      const modelsList: Array<{ name?: string; model?: string }> = data?.models || [];
      const installedModelNames = modelsList
        .map((m) => m.name || m.model || '')
        .filter(Boolean);

      const hasTargetModel = installedModelNames.some((installed) =>
        isModelNameMatch(configuredModel, installed)
      );

      if (!hasTargetModel) {
        return {
          provider: 'ollama',
          status: 'MODEL_MISSING',
          available: false,
          model: configuredModel,
          endpoint: baseHost,
          fallbackAvailable: true,
          installedModels: installedModelNames,
          latencyMs,
          error: `Model '${configuredModel}' is not installed in Ollama. Run: ollama pull ${configuredModel}`,
        };
      }

      return {
        provider: 'ollama',
        status: 'MODEL_READY',
        available: true,
        model: configuredModel,
        endpoint: baseHost,
        fallbackAvailable: true,
        installedModels: installedModelNames,
        latencyMs,
      };
    } catch (err: any) {
      return {
        provider: 'ollama',
        status: 'OLLAMA_UNAVAILABLE',
        available: false,
        model: configuredModel,
        endpoint: baseHost,
        fallbackAvailable: true,
        error: `Ollama service unreachable at ${baseHost}: ${err.message || 'Connection refused'}`,
      };
    }
  }

  // 2. RULE-INFORMED DETERMINISTIC FALLBACK
  if (providerType === 'RULE_INFORMED_OFFLINE') {
    return {
      provider: 'rule-informed-offline',
      status: 'FALLBACK_READY',
      available: true,
      model: 'rule-informed-expert-engine',
      fallbackAvailable: true,
    };
  }

  // 3. OPENAI COMPATIBLE OR CLAUDE API
  return {
    provider: providerType.toLowerCase(),
    status: 'PROVIDER_CONFIGURED',
    available: true,
    model: configuredModel,
    fallbackAvailable: true,
  };
}

/**
 * Runs a fast, isolated AI completion test without requiring an expensive crawl.
 */
export async function runAIDiagnostic(testPrompt?: string, config?: Partial<AIProviderConfig>): Promise<{
  success: boolean;
  provider: string;
  model: string;
  output: string;
  durationMs: number;
  error?: string;
}> {
  const provider = getAIProvider(config);
  const prompt = testPrompt || 'Respond with the exact word: "READY". Do not include any other text.';
  const systemPrompt = 'You are a fast SEO diagnostic assistant. Reply concisely as requested.';

  const start = Date.now();
  try {
    const output = await provider.generateCompletion(systemPrompt, prompt, {
      temperature: 0.1,
      maxTokens: 50,
    });
    return {
      success: true,
      provider: provider.providerType,
      model: provider.modelName,
      output: output.trim(),
      durationMs: Date.now() - start,
    };
  } catch (err: any) {
    return {
      success: false,
      provider: provider.providerType,
      model: provider.modelName,
      output: '',
      durationMs: Date.now() - start,
      error: err.message || 'Diagnostic request failed',
    };
  }
}
