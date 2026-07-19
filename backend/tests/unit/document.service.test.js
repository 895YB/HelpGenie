import { jest } from '@jest/globals';

process.env.NODE_ENV = 'test';

// ── Mocks ────────────────────────────────────────────────────
jest.unstable_mockModule('../../src/repositories/document.repository.js', () => ({
  documentRepository: {
    create: jest.fn(),
    findById: jest.fn(),
    findByIdAndCompany: jest.fn(),
    updateStatus: jest.fn(),
    softDelete: jest.fn(),
    countByCompany: jest.fn(),
    getStats: jest.fn(),
    findByCompany: jest.fn(),
  },
}));

jest.unstable_mockModule('../../src/repositories/chunk.repository.js', () => ({
  chunkRepository: {
    insertMany: jest.fn(),
    deleteByDocument: jest.fn(),
    findByDocument: jest.fn(),
  },
}));

jest.unstable_mockModule('../../src/repositories/subscription.repository.js', () => ({
  subscriptionRepository: {
    findByCompany: jest.fn(),
  },
}));

jest.unstable_mockModule('../../src/utils/textExtractor.js', () => ({
  extractText: jest.fn(),
  mimeToFileType: jest.fn(),
}));

jest.unstable_mockModule('../../src/utils/textChunker.js', () => ({
  chunkText: jest.fn(),
  chunkStats: jest.fn(),
}));

jest.unstable_mockModule('../../src/services/embedding.service.js', () => ({
  embeddingService: {
    embedBatch: jest.fn(),
  },
}));

jest.unstable_mockModule('../../src/middleware/upload.middleware.js', () => ({
  deleteUploadedFile: jest.fn(),
}));

jest.unstable_mockModule('../../src/utils/logger.js', () => ({
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import mongoose from 'mongoose';
import { DOCUMENT_STATUS } from '../../src/models/Document.model.js';

function makeDoc(overrides = {}) {
  return {
    _id: new mongoose.Types.ObjectId(),
    companyId: new mongoose.Types.ObjectId(),
    name: 'test.pdf',
    fileType: 'pdf',
    filePath: '/uploads/doc_abc.pdf',
    sourceUrl: null,
    status: DOCUMENT_STATUS.PENDING,
    ...overrides,
  };
}

describe('documentService', () => {
  let documentService;
  let documentRepository;
  let chunkRepository;
  let subscriptionRepository;
  let extractText;
  let mimeToFileType;
  let chunkText;
  let chunkStats;
  let embeddingService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const mod  = await import('../../src/services/document.service.js');
    const docR = await import('../../src/repositories/document.repository.js');
    const chnR = await import('../../src/repositories/chunk.repository.js');
    const subR = await import('../../src/repositories/subscription.repository.js');
    const ext  = await import('../../src/utils/textExtractor.js');
    const chk  = await import('../../src/utils/textChunker.js');
    const emb  = await import('../../src/services/embedding.service.js');

    documentService = mod.documentService;
    documentRepository = docR.documentRepository;
    chunkRepository = chnR.chunkRepository;
    subscriptionRepository = subR.subscriptionRepository;
    extractText = ext.extractText;
    mimeToFileType = ext.mimeToFileType;
    chunkText = chk.chunkText;
    chunkStats = chk.chunkStats;
    embeddingService = emb.embeddingService;
  });

  // ── ingestFile ───────────────────────────────────────────────
  describe('ingestFile', () => {
    it('throws 400 for unsupported MIME type', async () => {
      subscriptionRepository.findByCompany.mockResolvedValue(null);
      mimeToFileType.mockReturnValue(null);

      await expect(
        documentService.ingestFile('company-id', 'user-id', {
          mimetype: 'image/png',
          originalname: 'image.png',
          path: '/tmp/img.png',
          size: 1000,
        })
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('throws 400 when document limit is reached', async () => {
      subscriptionRepository.findByCompany.mockResolvedValue({
        plan: 'free',
        features: { maxDocuments: 5 },
      });
      documentRepository.countByCompany.mockResolvedValue(5);
      mimeToFileType.mockReturnValue('pdf');

      await expect(
        documentService.ingestFile('company-id', 'user-id', {
          mimetype: 'application/pdf',
          originalname: 'test.pdf',
          path: '/tmp/test.pdf',
          size: 1000,
        })
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('creates document with status pending and returns it', async () => {
      subscriptionRepository.findByCompany.mockResolvedValue(null);
      mimeToFileType.mockReturnValue('pdf');
      const doc = makeDoc();
      documentRepository.create.mockResolvedValue(doc);

      const result = await documentService.ingestFile('company-id', 'user-id', {
        mimetype: 'application/pdf',
        originalname: 'doc.pdf',
        path: '/tmp/doc.pdf',
        size: 50000,
      });

      expect(documentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: DOCUMENT_STATUS.PENDING })
      );
      expect(result._id).toEqual(doc._id);
    });
  });

  // ── ingestUrl ────────────────────────────────────────────────
  describe('ingestUrl', () => {
    it('creates document with fileType url', async () => {
      subscriptionRepository.findByCompany.mockResolvedValue(null);
      const doc = makeDoc({ fileType: 'url', sourceUrl: 'https://example.com' });
      documentRepository.create.mockResolvedValue(doc);

      await documentService.ingestUrl(
        'company-id',
        'user-id',
        'https://example.com',
        'Example Page'
      );

      expect(documentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          fileType: 'url',
          sourceUrl: 'https://example.com',
          name: 'Example Page',
        })
      );
    });
  });

  // ── getDocument ──────────────────────────────────────────────
  describe('getDocument', () => {
    it('throws 404 when not found', async () => {
      documentRepository.findByIdAndCompany.mockResolvedValue(null);
      await expect(
        documentService.getDocument('company-id', 'bad-id')
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('returns document when found', async () => {
      const doc = makeDoc();
      documentRepository.findByIdAndCompany.mockResolvedValue(doc);
      const result = await documentService.getDocument('company-id', doc._id.toString());
      expect(result).toBe(doc);
    });
  });

  // ── deleteDocument ────────────────────────────────────────────
  describe('deleteDocument', () => {
    it('throws 404 when document not found', async () => {
      documentRepository.findByIdAndCompany.mockResolvedValue(null);
      await expect(
        documentService.deleteDocument('company-id', 'doc-id')
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('soft-deletes the document', async () => {
      const doc = makeDoc();
      documentRepository.findByIdAndCompany.mockResolvedValue(doc);
      documentRepository.softDelete.mockResolvedValue({ ...doc, isDeleted: true });

      await documentService.deleteDocument('company-id', doc._id.toString());
      expect(documentRepository.softDelete).toHaveBeenCalledWith(
        doc._id.toString(),
        'company-id'
      );
    });
  });

  // ── retryDocument ────────────────────────────────────────────
  describe('retryDocument', () => {
    it('throws 404 when document not found', async () => {
      documentRepository.findByIdAndCompany.mockResolvedValue(null);
      await expect(
        documentService.retryDocument('company-id', 'doc-id')
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('throws 400 when document is not in failed state', async () => {
      const doc = makeDoc({ status: DOCUMENT_STATUS.READY });
      documentRepository.findByIdAndCompany.mockResolvedValue(doc);
      await expect(
        documentService.retryDocument('company-id', doc._id.toString())
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('resets status to pending and clears old chunks on retry', async () => {
      const doc = makeDoc({ status: DOCUMENT_STATUS.FAILED });
      documentRepository.findByIdAndCompany.mockResolvedValue(doc);
      documentRepository.findById.mockResolvedValue(doc);
      documentRepository.updateStatus.mockResolvedValue({ ...doc, status: DOCUMENT_STATUS.PENDING });
      chunkRepository.deleteByDocument.mockResolvedValue({ deletedCount: 5 });

      await documentService.retryDocument('company-id', doc._id.toString());

      expect(documentRepository.updateStatus).toHaveBeenCalledWith(
        expect.anything(),
        DOCUMENT_STATUS.PENDING,
        expect.objectContaining({ errorMessage: null })
      );
      expect(chunkRepository.deleteByDocument).toHaveBeenCalledWith(doc._id.toString());
    });
  });

  // ── getDocumentStats ─────────────────────────────────────────
  describe('getDocumentStats', () => {
    it('returns stats from repository', async () => {
      const stats = { total: 3, ready: 2, failed: 1, totalChunks: 50 };
      documentRepository.getStats.mockResolvedValue(stats);
      const result = await documentService.getDocumentStats('company-id');
      expect(result).toEqual(stats);
    });
  });
});
