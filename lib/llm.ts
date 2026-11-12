import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import { env } from '@/lib/env';

export interface LLMCallResult<T> {
  data: T;
  latencyMs: number;
  promptTokens?: number;
  candidatesTokens?: number;
  totalTokens?: number;
  model: string;
}

export interface LLMCallOptions<T> {
  prompt: string;
  systemInstruction?: string;
  schema: z.ZodType<T>;
  maxRetries?: number;
  timeoutMs?: number;
  temperature?: number;
}

export async function callGeminiStructured<T>({
  prompt,
  systemInstruction,
  schema,
  maxRetries = 2,
  timeoutMs = 12000,
  temperature = 0.1,
}: LLMCallOptions<T>): Promise<LLMCallResult<T>> {
  const apiKey = env.GEMINI_API_KEY;
  const modelName = env.GEMINI_MODEL || 'gemini-1.5-flash';

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction,
    generationConfig: {
      temperature,
      responseMimeType: 'application/json',
    },
  });

  let attempt = 0;
  let lastError: unknown;

  while (attempt <= maxRetries) {
    const startTime = Date.now();
    try {
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);

      const response = await Promise.race([
        model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`LLM timeout after ${timeoutMs}ms`)), timeoutMs),
        ),
      ]);

      clearTimeout(timeoutId);
      const latencyMs = Date.now() - startTime;

      const responseText = response.response.text();
      const usageMetadata = response.response.usageMetadata;

      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Failed to parse LLM JSON output: ${(e as Error).message}\nRaw: ${responseText}`);
      }

      const validationResult = schema.safeParse(parsedJson);
      if (!validationResult.success) {
        throw new Error(
          `LLM output schema validation failed: ${validationResult.error.message}\nPayload: ${JSON.stringify(parsedJson)}`,
        );
      }

      return {
        data: validationResult.data,
        latencyMs,
        promptTokens: usageMetadata?.promptTokenCount,
        candidatesTokens: usageMetadata?.candidatesTokenCount,
        totalTokens: usageMetadata?.totalTokenCount,
        model: modelName,
      };
    } catch (err: unknown) {
      lastError = err;
      attempt++;
      if (attempt <= maxRetries) {
        const delay = Math.pow(2, attempt) * 500;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`LLM call failed after ${maxRetries} retries: ${String(lastError)}`);
}
