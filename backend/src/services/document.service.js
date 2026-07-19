/**
 * Document ingestion service — orchestrates the full RAG pipeline:
 *
 *   Upload/URL  →  Extract text  →  Chunk  →  Embed (batch)
 *   →  Store chunks  →  Mark document ready
 *
 * Processing is non-blocking: the HTTP response returns immediately
 * with status "pending", while ingestion runs in the background via
 * setImmediate.  For multi-server deployments this would move to a
 * job queue (Bull/BullMQ), which is a straightforward drop-in swap.
 */

import path from 'path';
import { documentRepository } from '../repositories/document.repository.js';
import { chunkRepository } from '../repositories/chunk.repository.js';
import { subscriptionRepository } from '../repositories/subscription.repository.js';
import { extractText, mimeToFileType } from '../utils/textExtractor.js';
import { chunkText, chunkStats } from '../utils/textChunker.js';
import { embeddingService } from './embedding.service.js';
import { deleteUploadedFile } from '../middleware/upload.middleware.js';
import { AppError } from '../middleware/error.middleware.js';
import { DOCUMENT_STATUS } from '../models/Document.model.js';
import logger from '../utils/logger.js';

export const documentService = {
  // ── Public API ─────────────────────────────────────────────

  /**
   * Handles a file upload (PDF/DOCX/TXT).
   * Creates the Document record, returns it, then processes in background.
   */
  async ingestFile(companyId, userId, file, customName) {
    await _assertDocumentLimit(companyId);

    const fileType = mimeToFileType(file.mimetype);
    if (!fileType) {
      deleteUploadedFile(file.path);
      throw AppError.badRequest('Unsupported file type. Upload PDF, DOCX, or TXT files.');
    }

    const doc = await documentRepository.create({
      companyId,
      uploadedBy: userId,
      name: customName?.trim() || file.originalname,
      originalName: file.originalname,
      fileType,
      fileSize: file.size,
      filePath: file.path,
      status: DOCUMENT_STATUS.PENDING,
    });

    // Kick off background processing without blocking the response
    setImmediate(() => _processDocument(doc));

    return doc;
  },

  /**
   * Handles a website URL ingestion request.
   */
  async ingestUrl(companyId, userId, url, name) {
    await _assertDocumentLimit(companyId);

    const doc = await documentRepository.create({
      companyId,
      uploadedBy: userId,
      name: name?.trim() || url,
      fileType: 'url',
      sourceUrl: url,
      status: DOCUMENT_STATUS.PENDING,
    });

    setImmediate(() => _processDocument(doc));
    return doc;
  },

  /**
   * Retries a failed document.
   * For file-type docs the original file must still be on disk.
   */
  async retryDocument(companyId, documentId) {
    const doc = await documentRepository.findByIdAndCompany(documentId, companyId);
    if (!doc) throw AppError.notFound('Document not found');
    if (doc.status !== DOCUMENT_STATUS.FAILED) {
      throw AppError.badRequest('Only failed documents can be retried');
    }

    // Re-fetch with filePath (select: false field)
    const fullDoc = await documentRepository.findById(documentId);
    await documentRepository.updateStatus(documentId, DOCUMENT_STATUS.PENDING, {
      errorMessage: null,
    });
    // Delete old chunks before re-ingesting
    await chunkRepository.deleteByDocument(documentId);

    setImmediate(() => _processDocument(fullDoc));
    return documentRepository.findByIdAndCompany(documentId, companyId);
  },

  // ── Read operations ────────────────────────────────────────

  async listDocuments(companyId, filters) {
    return documentRepository.findByCompany(companyId, filters);
  },

  async getDocument(companyId, documentId) {
    const doc = await documentRepository.findByIdAndCompany(documentId, companyId);
    if (!doc) throw AppError.notFound('Document not found');
    return doc;
  },

  async getDocumentStats(companyId) {
    return documentRepository.getStats(companyId);
  },

  async getDocumentChunks(companyId, documentId) {
    const doc = await documentRepository.findByIdAndCompany(documentId, companyId);
    if (!doc) throw AppError.notFound('Document not found');
    return chunkRepository.findByDocument(documentId);
  },

  // ── Delete ─────────────────────────────────────────────────

  async deleteDocument(companyId, documentId) {
    const doc = await documentRepository.findByIdAndCompany(documentId, companyId);
    if (!doc) throw AppError.notFound('Document not found');

    await documentRepository.softDelete(documentId, companyId);

    // Delete chunks asynchronously — no need to block the HTTP response
    setImmediate(async () => {
      try {
        const deleted = await chunkRepository.deleteByDocument(documentId);
        logger.info(`Deleted ${deleted.deletedCount} chunks for document ${documentId}`);
      } catch (err) {
        logger.error(`Chunk deletion failed for document ${documentId}: ${err.message}`);
      }
    });
  },
};

// ── Private helpers ───────────────────────────────────────────

async function _assertDocumentLimit(companyId) {
  const sub = await subscriptionRepository.findByCompany(companyId);
  if (!sub) return;

  const limit = sub.features.maxDocuments;
  if (limit === -1) return; // unlimited

  const count = await documentRepository.countByCompany(companyId);
  if (count >= limit) {
    throw AppError.badRequest(
      `Your ${sub.plan} plan allows up to ${limit} document${limit === 1 ? '' : 's'}. ` +
        'Delete an existing document or upgrade your plan.'
    );
  }
}

/**
 * Background processor — runs outside the request/response cycle.
 * All errors are caught and persisted to the document record.
 */
async function _processDocument(doc) {
  const start = Date.now();

  try {
    logger.info(`[Ingestion] Starting: "${doc.name}" (${doc.fileType}) — id: ${doc._id}`);

    // ── Step 1: mark in progress ─────────────────────────────
    await documentRepository.updateStatus(doc._id, DOCUMENT_STATUS.PROCESSING);

    // ── Step 2: extract text ─────────────────────────────────
    const { text, metadata } = await extractText(
      doc.fileType,
      doc.filePath,
      doc.sourceUrl
    );

    if (!text || text.trim().length < 20) {
      throw new Error('Extraction produced insufficient text (< 20 characters).');
    }

    // ── Step 3: chunk ────────────────────────────────────────
    const chunkDatas = chunkText(text);
    if (!chunkDatas.length) {
      throw new Error('Chunking produced zero chunks from the extracted text.');
    }

    const stats = chunkStats(chunkDatas);
    logger.info(
      `[Ingestion] "${doc.name}": ${stats.chunkCount} chunks, ` +
        `${stats.totalWords} words, ~${stats.totalTokens} tokens`
    );

    // ── Step 4: generate embeddings ──────────────────────────
    const contents = chunkDatas.map((c) => c.content);
    const embeddings = await embeddingService.embedBatch(contents);

    // ── Step 5: build and insert chunk documents ─────────────
    const chunks = chunkDatas.map((cd, i) => ({
      companyId: doc.companyId,
      documentId: doc._id,
      content: cd.content,
      embedding: embeddings[i],
      chunkIndex: cd.chunkIndex,
      wordCount: cd.wordCount,
      tokenCount: cd.tokenCount,
      metadata: {
        url: doc.sourceUrl ?? null,
        // Page metadata only available for PDFs; future extractors can populate this
        page: cd.metadata?.page ?? null,
        section: cd.metadata?.section ?? null,
      },
    }));

    await chunkRepository.insertMany(chunks);

    // ── Step 6: mark document ready ──────────────────────────
    await documentRepository.updateStatus(doc._id, DOCUMENT_STATUS.READY, {
      chunkCount: stats.chunkCount,
      wordCount: stats.totalWords,
      characterCount: text.length,
      metadata: new Map(Object.entries(metadata)),
    });

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    logger.info(
      `[Ingestion] Done: "${doc.name}" — ` +
        `${stats.chunkCount} chunks stored in ${elapsed}s`
    );
  } catch (err) {
    logger.error(`[Ingestion] Failed: "${doc.name}" — ${err.message}`);
    await documentRepository.updateStatus(doc._id, DOCUMENT_STATUS.FAILED, {
      errorMessage: err.message,
    });
  } finally {
    // Always clean up temp files, regardless of success or failure
    if (doc.fileType !== 'url' && doc.filePath) {
      deleteUploadedFile(doc.filePath);
    }
  }
}
