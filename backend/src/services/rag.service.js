/**
 * RAG (Retrieval-Augmented Generation) Service
 *
 * Stateless pipeline — it knows nothing about conversations or HTTP.
 * The chat service (Module 7) owns session state and calls this.
 *
 * Pipeline (both streaming and non-streaming):
 *   1. Sanitize question (prompt injection defence)
 *   2. Embed question  →  1536-dim vector
 *   3. Atlas Vector Search  →  top-K chunks (scoped to companyId)
 *   4. Filter by similarity threshold
 *   5. Enrich chunks with document names
 *   6. Build system prompt + context
 *   7. Call GPT-4.1
 *   8. Return { answer, sources, answeredFromContext, tokensUsed, responseTimeMs }
 */

import { embeddingService } from './embedding.service.js';
import { chunkRepository } from '../repositories/chunk.repository.js';
import { documentRepository } from '../repositories/document.repository.js';
import openaiClient from '../config/openai.js';
import { env } from '../config/env.js';
import { sanitizeChatMessage } from '../utils/sanitizer.js';
import {
  FALLBACK_RESPONSE,
  buildContextSections,
  buildSystemPrompt,
  buildMessages,
} from '../utils/promptBuilder.js';
import logger from '../utils/logger.js';

// LLM parameters — low temperature for factual, reproducible answers
const LLM_PARAMS = {
  max_tokens: 1024,
  temperature: 0.1,
  presence_penalty: 0,
  frequency_penalty: 0,
};

// ── Public API ────────────────────────────────────────────────

export const ragService = {
  /**
   * Non-streaming query. Returns the full answer as a string.
   * Used by REST fallback and background processing.
   *
   * @param {{ question, companyId, company, conversationHistory? }} opts
   */
  async query({ question, companyId, company, conversationHistory = [] }) {
    const start = Date.now();

    const sanitized = sanitizeChatMessage(question);
    const { contextSections, hasContext } = await _retrieveContext(sanitized, companyId);

    if (!hasContext) {
      return _buildFallbackResult(start);
    }

    const messages = _buildPromptMessages(company, contextSections, conversationHistory, sanitized);

    const completion = await openaiClient.chat.completions.create({
      model: env.chatModel,
      messages,
      ...LLM_PARAMS,
    });

    const answer = completion.choices[0]?.message?.content?.trim() ?? FALLBACK_RESPONSE;
    const answeredFromContext = !answer.includes(FALLBACK_RESPONSE);

    return {
      answer,
      sources: answeredFromContext ? contextSections : [],
      answeredFromContext,
      tokensUsed: {
        prompt:     completion.usage?.prompt_tokens     ?? 0,
        completion: completion.usage?.completion_tokens ?? 0,
        total:      completion.usage?.total_tokens      ?? 0,
      },
      responseTimeMs: Date.now() - start,
    };
  },

  /**
   * Streaming query. Tokens are emitted one-by-one via onChunk().
   * onComplete() receives the full result once the stream ends.
   * onError() receives any thrown error.
   *
   * Used by the Socket.io chat handler for real-time token delivery.
   *
   * @param {{ question, companyId, company, conversationHistory?,
   *            onChunk, onComplete, onError }} opts
   */
  async queryStream({
    question,
    companyId,
    company,
    conversationHistory = [],
    onChunk,
    onComplete,
    onError,
  }) {
    const start = Date.now();

    try {
      const sanitized = sanitizeChatMessage(question);
      const { contextSections, hasContext } = await _retrieveContext(sanitized, companyId);

      if (!hasContext) {
        onChunk?.(FALLBACK_RESPONSE);
        onComplete?.(_buildFallbackResult(start));
        return;
      }

      const messages = _buildPromptMessages(
        company,
        contextSections,
        conversationHistory,
        sanitized
      );

      // ── OpenAI streaming ─────────────────────────────────────
      const stream = await openaiClient.chat.completions.create({
        model: env.chatModel,
        messages,
        ...LLM_PARAMS,
        stream: true,
        stream_options: { include_usage: true },
      });

      let fullContent = '';
      let usage = null;

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content ?? '';
        if (delta) {
          fullContent += delta;
          onChunk?.(delta);
        }
        // Usage arrives in the final chunk when stream_options.include_usage is set
        if (chunk.usage) {
          usage = chunk.usage;
        }
      }

      const answeredFromContext = !fullContent.includes(FALLBACK_RESPONSE);

      onComplete?.({
        answer: fullContent,
        sources: answeredFromContext ? contextSections : [],
        answeredFromContext,
        tokensUsed: {
          prompt:     usage?.prompt_tokens     ?? 0,
          completion: usage?.completion_tokens ?? 0,
          total:      usage?.total_tokens      ?? 0,
        },
        responseTimeMs: Date.now() - start,
      });
    } catch (err) {
      logger.error(`[RAG] Stream error: ${err.message}`);
      onError?.(err);
    }
  },
};

// ── Private helpers ───────────────────────────────────────────

/**
 * Embeds the question, runs vector search, filters by similarity threshold,
 * and enriches results with document names.
 * Returns { contextSections, hasContext }.
 */
async function _retrieveContext(sanitizedQuestion, companyId) {
  // Step 1: embed the question
  const queryEmbedding = await embeddingService.embedOne(sanitizedQuestion);

  // Step 2: vector search (scoped to company — cross-tenant leakage impossible)
  const rawChunks = await chunkRepository.vectorSearch(queryEmbedding, companyId);

  // Step 3: filter by similarity threshold
  const relevant = rawChunks.filter((c) => c.score >= env.similarityThreshold);

  if (!relevant.length) {
    logger.info(
      `[RAG] No chunks above threshold ${env.similarityThreshold} ` +
        `(best: ${rawChunks[0]?.score?.toFixed(3) ?? 'none'}) for company ${companyId}`
    );
    return { contextSections: [], hasContext: false };
  }

  // Step 4: enrich with document names (single batched DB query)
  const enriched = await _enrichWithDocNames(relevant, companyId);
  const contextSections = buildContextSections(enriched);

  logger.info(
    `[RAG] ${relevant.length} chunks from ` +
      `${new Set(relevant.map((c) => c.documentId?.toString())).size} doc(s) ` +
      `(top score: ${relevant[0].score.toFixed(3)})`
  );

  return { contextSections, hasContext: true };
}

/**
 * Fetches document names for each unique documentId in the chunk array,
 * then injects documentName onto each chunk object.
 */
async function _enrichWithDocNames(chunks, companyId) {
  const uniqueDocIds = [...new Set(chunks.map((c) => c.documentId?.toString()))].filter(Boolean);

  const docs = await documentRepository.findNamesByIds(uniqueDocIds, companyId);
  const nameMap = new Map(docs.map((d) => [d._id.toString(), d.name]));

  return chunks.map((c) => ({
    ...c,
    documentName: nameMap.get(c.documentId?.toString()) ?? 'Knowledge Base',
  }));
}

/**
 * Builds the OpenAI messages array from company context + history + question.
 */
function _buildPromptMessages(company, contextSections, history, question) {
  const botName = company.widgetSettings?.botName ?? 'Support Assistant';
  const systemPrompt = buildSystemPrompt(company.name, botName, contextSections);
  return buildMessages(systemPrompt, history, question);
}

function _buildFallbackResult(startTime) {
  return {
    answer: FALLBACK_RESPONSE,
    sources: [],
    answeredFromContext: false,
    tokensUsed: { prompt: 0, completion: 0, total: 0 },
    responseTimeMs: Date.now() - startTime,
  };
}
