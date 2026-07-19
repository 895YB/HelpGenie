/**
 * Generates vector embeddings via the OpenAI Embeddings API.
 *
 * Key design decisions:
 * - Batch all chunks in a single API call when possible (up to BATCH_SIZE per request)
 * - Exponential backoff retry on rate-limit (429) and server errors (5xx)
 * - Truncate inputs that exceed the model's token limit
 * - Add a short inter-batch delay to stay within TPM limits on lower tiers
 */

import openaiClient from '../config/openai.js';
import { env } from '../config/env.js';
import logger from '../utils/logger.js';

const BATCH_SIZE    = 100;    // chunks per API call (OpenAI supports up to 2048)
const MAX_CHARS     = 32_000; // ~8,000 tokens — hard cap per input text
const BATCH_DELAY_MS = 250;   // ms between batch calls to stay within rate limits
const MAX_RETRIES   = 3;

// ── Helpers ──────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function truncate(text) {
  return text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) : text;
}

async function callWithRetry(texts, attempt = 0) {
  try {
    const response = await openaiClient.embeddings.create({
      model: env.embeddingModel,
      input: texts.map(truncate),
    });

    // The API returns results in the same order as input
    return response.data
      .sort((a, b) => a.index - b.index)
      .map((d) => d.embedding);
  } catch (err) {
    const isRetryable =
      err.status === 429 ||
      err.status === 500 ||
      err.status === 503 ||
      err.code === 'ETIMEDOUT';

    if (isRetryable && attempt < MAX_RETRIES - 1) {
      const delay = 1000 * 2 ** attempt;  // 1s, 2s, 4s
      logger.warn(
        `Embedding API error (${err.status ?? err.code}) — ` +
          `retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`
      );
      await sleep(delay);
      return callWithRetry(texts, attempt + 1);
    }

    throw err;
  }
}

// ── Service ──────────────────────────────────────────────────

export const embeddingService = {
  /**
   * Embeds a single text string.
   * Use for query-time embedding of the user's question.
   */
  async embedOne(text) {
    const [embedding] = await callWithRetry([text]);
    return embedding;
  },

  /**
   * Embeds an array of texts in batches.
   * Use during document ingestion to embed all chunks.
   *
   * @param {string[]} texts
   * @returns {Promise<number[][]>} Array of 1536-dim embeddings in input order
   */
  async embedBatch(texts) {
    if (!texts.length) return [];

    const allEmbeddings = [];

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);

      logger.info(
        `Embedding batch ${Math.floor(i / BATCH_SIZE) + 1}/` +
          `${Math.ceil(texts.length / BATCH_SIZE)} ` +
          `(${batch.length} chunks)`
      );

      const embeddings = await callWithRetry(batch);
      allEmbeddings.push(...embeddings);

      // Avoid hammering the API when there are multiple batches
      if (i + BATCH_SIZE < texts.length) {
        await sleep(BATCH_DELAY_MS);
      }
    }

    if (allEmbeddings.length !== texts.length) {
      throw new Error(
        `Embedding count mismatch: expected ${texts.length}, got ${allEmbeddings.length}`
      );
    }

    return allEmbeddings;
  },
};
