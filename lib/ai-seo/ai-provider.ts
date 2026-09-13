import { AIProviderConfig, AIProviderType } from './types';

export interface SEOAIProvider {
  readonly providerType: AIProviderType;
  readonly modelName: string;

  generateCompletion(
    systemPrompt: string,
    userPrompt: string,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<string>;

  generateStructured<T>(
    systemPrompt: string,
    userPrompt: string,
    schemaDescription?: string
  ): Promise<T>;
}

// -------------------------------------------------------------
// 1. RULE-INFORMED DETERMINISTIC OFFLINE PROVIDER
// -------------------------------------------------------------
export class RuleInformedProvider implements SEOAIProvider {
  readonly providerType: AIProviderType = 'RULE_INFORMED_OFFLINE';
  readonly modelName: string = 'rule-informed-expert-engine';

  async generateCompletion(
    _systemPrompt: string,
    userPrompt: string,
    _options?: { temperature?: number; maxTokens?: number }
  ): Promise<string> {
    return `[Rule-Informed Offline Engine]: Synthesized evidence from structured crawl/SERP analysis.\n${userPrompt.slice(0, 500)}`;
  }

  async generateStructured<T>(
    _systemPrompt: string,
    userPrompt: string,
    _schemaDescription?: string
  ): Promise<T> {
    try {
      const jsonMatch = userPrompt.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as T;
      }
    } catch {
      // ignore
    }
    return {} as T;
  }
}

// -------------------------------------------------------------
// 2. OLLAMA LOCAL PROVIDER (Native /api/chat & /v1/chat/completions)
// -------------------------------------------------------------
export class OllamaProvider implements SEOAIProvider {
  readonly providerType: AIProviderType = 'OLLAMA';
  readonly modelName: string;
  private endpoint: string;
  private temperature: number;
  private maxTokens: number;
  private timeoutMs: number;
  private maxRetries: number;

  constructor(config?: {
    endpointUrl?: string;
    modelName?: string;
    temperature?: number;
    maxTokens?: number;
    timeoutMs?: number;
    maxRetries?: number;
  }) {
    this.endpoint = (
      config?.endpointUrl ||
      process.env.OLLAMA_BASE_URL ||
      process.env.LOCAL_LLM_URL ||
      'http://127.0.0.1:11434'
    ).replace(/\/+$/, '');

    this.modelName =
      config?.modelName ||
      process.env.OLLAMA_MODEL ||
      process.env.AI_SEO_MODEL ||
      'qwen2.5-coder:7b';

    this.temperature = config?.temperature ?? 0.1;
    this.maxTokens = config?.maxTokens ?? 3000;
    this.timeoutMs = config?.timeoutMs ?? (process.env.OLLAMA_TIMEOUT_MS ? parseInt(process.env.OLLAMA_TIMEOUT_MS, 10) : 60000);
    this.maxRetries = config?.maxRetries ?? (process.env.OLLAMA_RETRIES ? parseInt(process.env.OLLAMA_RETRIES, 10) : 2);
  }

  async generateCompletion(
    systemPrompt: string,
    userPrompt: string,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const isNativeOllama = !this.endpoint.endsWith('/v1');
        const url = isNativeOllama ? `${this.endpoint}/api/chat` : `${this.endpoint}/chat/completions`;

        const payload = isNativeOllama
          ? {
              model: this.modelName,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
              ],
              stream: false,
              options: {
                temperature: options?.temperature ?? this.temperature,
                num_predict: options?.maxTokens ?? this.maxTokens,
              },
            }
          : {
              model: this.modelName,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
              ],
              temperature: options?.temperature ?? this.temperature,
              max_tokens: options?.maxTokens ?? this.maxTokens,
            };

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(this.timeoutMs),
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Ollama request failed (${response.status}): ${errText}`);
        }

        const data = await response.json();
        if (isNativeOllama) {
          return data.message?.content || '';
        } else {
          return data.choices?.[0]?.message?.content || '';
        }
      } catch (err: any) {
        lastError = err;
        if (attempt < this.maxRetries) {
          // Wait 250ms * (attempt + 1) before retry
          await new Promise((res) => setTimeout(res, 250 * (attempt + 1)));
        }
      }
    }

    throw new Error(`Ollama LLM connection failed at ${this.endpoint} (${this.modelName}): ${lastError?.message || 'Unknown network error'}`);
  }

  async generateStructured<T>(
    systemPrompt: string,
    userPrompt: string,
    schemaDescription?: string
  ): Promise<T> {
    const isNativeOllama = !this.endpoint.endsWith('/v1');
    const formatInstructions = `\n\nCRITICAL INSTRUCTION: You MUST return a strictly valid JSON object or array matching the requested schema. No conversational preamble, no markdown codeblocks, no trailing explanations.\n${schemaDescription ? `Schema Contract:\n${schemaDescription}` : ''}`;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        if (isNativeOllama) {
          const url = `${this.endpoint}/api/chat`;
          const payload = {
            model: this.modelName,
            messages: [
              { role: 'system', content: systemPrompt + formatInstructions },
              { role: 'user', content: userPrompt }
            ],
            stream: false,
            format: 'json',
            options: {
              temperature: 0.1,
              num_predict: this.maxTokens,
            },
          };

          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(this.timeoutMs),
          });

          if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Ollama structured request failed (${response.status}): ${errText}`);
          }

          const data = await response.json();
          const content = data.message?.content || '';
          return parseJsonSafely<T>(content);
        } else {
          const rawOutput = await this.generateCompletion(systemPrompt, userPrompt + formatInstructions, { temperature: 0.1 });
          return parseJsonSafely<T>(rawOutput);
        }
      } catch (err: any) {
        lastError = err;
        if (attempt < this.maxRetries) {
          await new Promise((res) => setTimeout(res, 250 * (attempt + 1)));
        }
      }
    }

    throw new Error(`Ollama structured response failed at ${this.endpoint}: ${lastError?.message || 'JSON parsing error'}`);
  }
}

// -------------------------------------------------------------
// 3. OPENAI-COMPATIBLE PROVIDER (vLLM, Local OpenAI endpoints)
// -------------------------------------------------------------
export class OpenAICompatibleProvider implements SEOAIProvider {
  readonly providerType: AIProviderType = 'OPENAI_COMPATIBLE';
  readonly modelName: string;
  private endpoint: string;
  private apiKey?: string;
  private temperature: number;
  private maxTokens: number;
  private timeoutMs: number;

  constructor(config: {
    endpointUrl?: string;
    apiKey?: string;
    modelName?: string;
    temperature?: number;
    maxTokens?: number;
    timeoutMs?: number;
  }) {
    this.endpoint = (config.endpointUrl || process.env.OPENAI_BASE_URL || process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434/v1').replace(/\/+$/, '');
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY || process.env.LOCAL_LLM_API_KEY || '';
    this.modelName = config.modelName || process.env.AI_SEO_MODEL || 'qwen2.5-coder:7b';
    this.temperature = config.temperature ?? 0.2;
    this.maxTokens = config.maxTokens ?? 3000;
    this.timeoutMs = config.timeoutMs ?? 60000;
  }

  async generateCompletion(
    systemPrompt: string,
    userPrompt: string,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<string> {
    const url = `${this.endpoint}/chat/completions`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const payload = {
      model: this.modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: options?.temperature ?? this.temperature,
      max_tokens: options?.maxTokens ?? this.maxTokens,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI-compatible LLM request failed (${response.status}): ${errText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  async generateStructured<T>(
    systemPrompt: string,
    userPrompt: string,
    schemaDescription?: string
  ): Promise<T> {
    const formatInstructions = `\n\nCRITICAL: You MUST respond ONLY with a valid JSON object matching the requested schema. No markdown codeblocks, no surrounding text, no conversational preamble.\n${schemaDescription ? `Schema:\n${schemaDescription}` : ''}`;
    const rawOutput = await this.generateCompletion(systemPrompt, userPrompt + formatInstructions, { temperature: 0.1 });
    return parseJsonSafely<T>(rawOutput);
  }
}

// -------------------------------------------------------------
// 4. ANTHROPIC CLAUDE API PROVIDER
// -------------------------------------------------------------
export class ClaudeAIProvider implements SEOAIProvider {
  readonly providerType: AIProviderType = 'CLAUDE_API';
  readonly modelName: string;
  private apiKey: string;
  private temperature: number;
  private maxTokens: number;
  private timeoutMs: number;

  constructor(config: {
    apiKey?: string;
    modelName?: string;
    temperature?: number;
    maxTokens?: number;
    timeoutMs?: number;
  }) {
    this.apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY || '';
    this.modelName = config.modelName || process.env.ANTHROPIC_MODEL || 'claude-3-7-sonnet-20250219';
    this.temperature = config.temperature ?? 0.2;
    this.maxTokens = config.maxTokens ?? 4000;
    this.timeoutMs = config.timeoutMs ?? 60000;
  }

  async generateCompletion(
    systemPrompt: string,
    userPrompt: string,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Anthropic API key is not configured (ANTHROPIC_API_KEY missing)');
    }

    const url = 'https://api.anthropic.com/v1/messages';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
      'anthropic-version': '2023-06-01',
    };

    const payload = {
      model: this.modelName,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      temperature: options?.temperature ?? this.temperature,
      max_tokens: options?.maxTokens ?? this.maxTokens,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Claude API request failed (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const textBlock = data.content?.find((block: { type: string; text: string }) => block.type === 'text');
    return textBlock?.text || '';
  }

  async generateStructured<T>(
    systemPrompt: string,
    userPrompt: string,
    schemaDescription?: string
  ): Promise<T> {
    const formatInstructions = `\n\nCRITICAL: You MUST respond ONLY with a valid JSON object matching the requested schema. No markdown formatting, no conversational filler.\n${schemaDescription ? `Schema:\n${schemaDescription}` : ''}`;
    const rawOutput = await this.generateCompletion(systemPrompt, userPrompt + formatInstructions, { temperature: 0.1 });
    return parseJsonSafely<T>(rawOutput);
  }
}

// -------------------------------------------------------------
// 5. MOCK PROVIDER (FOR TESTING)
// -------------------------------------------------------------
export class MockAIProvider implements SEOAIProvider {
  readonly providerType: AIProviderType = 'MOCK_TEST';
  readonly modelName: string = 'mock-test-llm';
  public mockStructuredResponses: Map<string, unknown> = new Map();
  public mockCompletionResponses: Map<string, string> = new Map();
  public calls: Array<{ systemPrompt: string; userPrompt: string }> = [];
  public shouldSimulateError: boolean = false;
  public errorMessage: string = 'Simulated local LLM timeout/failure';

  async generateCompletion(systemPrompt: string, userPrompt: string): Promise<string> {
    if (this.shouldSimulateError) {
      throw new Error(this.errorMessage);
    }
    this.calls.push({ systemPrompt, userPrompt });
    for (const [key, val] of this.mockCompletionResponses.entries()) {
      if (userPrompt.includes(key) || systemPrompt.includes(key)) {
        return val;
      }
    }
    return 'Mock completion response';
  }

  async generateStructured<T>(systemPrompt: string, userPrompt: string): Promise<T> {
    if (this.shouldSimulateError) {
      throw new Error(this.errorMessage);
    }
    this.calls.push({ systemPrompt, userPrompt });
    for (const [key, val] of this.mockStructuredResponses.entries()) {
      if (userPrompt.includes(key) || systemPrompt.includes(key)) {
        return val as T;
      }
    }
    return {} as T;
  }
}

// -------------------------------------------------------------
// HELPER: SAFE JSON PARSER
// -------------------------------------------------------------
export function parseJsonSafely<T>(rawText: string): T {
  let cleaned = rawText.trim();
  // Strip markdown code fences if present
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Try to find the outermost JSON object or array based on which appears first
    const firstBrace = cleaned.indexOf('{');
    const firstBracket = cleaned.indexOf('[');

    if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
      const lastBracket = cleaned.lastIndexOf(']');
      if (lastBracket > firstBracket) {
        const jsonCandidate = cleaned.substring(firstBracket, lastBracket + 1);
        try {
          return JSON.parse(jsonCandidate) as T;
        } catch {
          // fallback
        }
      }
    }

    if (firstBrace !== -1) {
      const lastBrace = cleaned.lastIndexOf('}');
      if (lastBrace > firstBrace) {
        const jsonCandidate = cleaned.substring(firstBrace, lastBrace + 1);
        try {
          return JSON.parse(jsonCandidate) as T;
        } catch {
          // fallback
        }
      }
    }

    throw new Error(`Failed to parse valid JSON from AI output: ${rawText.slice(0, 200)}...`);
  }
}

// -------------------------------------------------------------
// PROVIDER FACTORY
// -------------------------------------------------------------
export function getAIProvider(config?: Partial<AIProviderConfig>): SEOAIProvider {
  const envProvider = (process.env.AI_PROVIDER || process.env.AI_SEO_PROVIDER || '').toUpperCase();
  
  const providerType: AIProviderType =
    config?.providerType ||
    (envProvider === 'OLLAMA' ? 'OLLAMA' : undefined) ||
    (envProvider === 'OPENAI' || envProvider === 'OPENAI_COMPATIBLE' ? 'OPENAI_COMPATIBLE' : undefined) ||
    (envProvider === 'CLAUDE' || envProvider === 'CLAUDE_API' ? 'CLAUDE_API' : undefined) ||
    (envProvider === 'OFFLINE' || envProvider === 'RULE_INFORMED_OFFLINE' ? 'RULE_INFORMED_OFFLINE' : undefined) ||
    (process.env.OLLAMA_BASE_URL || process.env.OLLAMA_MODEL ? 'OLLAMA' : undefined) ||
    (process.env.ANTHROPIC_API_KEY ? 'CLAUDE_API' : 'RULE_INFORMED_OFFLINE');

  switch (providerType) {
    case 'OLLAMA':
      return new OllamaProvider({
        endpointUrl: config?.endpointUrl,
        modelName: config?.modelName,
        temperature: config?.temperature,
        maxTokens: config?.maxTokens,
        timeoutMs: config?.timeoutMs,
        maxRetries: config?.maxRetries,
      });

    case 'CLAUDE_API':
      return new ClaudeAIProvider({
        apiKey: config?.apiKey,
        modelName: config?.modelName,
        temperature: config?.temperature,
        maxTokens: config?.maxTokens,
        timeoutMs: config?.timeoutMs,
      });

    case 'OPENAI_COMPATIBLE':
      return new OpenAICompatibleProvider({
        endpointUrl: config?.endpointUrl,
        apiKey: config?.apiKey,
        modelName: config?.modelName,
        temperature: config?.temperature,
        maxTokens: config?.maxTokens,
        timeoutMs: config?.timeoutMs,
      });

    case 'MOCK_TEST':
      return new MockAIProvider();

    case 'RULE_INFORMED_OFFLINE':
    default:
      return new RuleInformedProvider();
  }
}
