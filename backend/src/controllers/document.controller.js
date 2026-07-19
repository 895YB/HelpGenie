import { documentService } from '../services/document.service.js';
import ApiResponse from '../utils/apiResponse.js';
import { AppError } from '../middleware/error.middleware.js';

export async function uploadDocument(req, res, next) {
  try {
    if (!req.file) {
      return next(AppError.badRequest('No file uploaded. Include a file in the "file" field.'));
    }

    const doc = await documentService.ingestFile(
      req.companyId,
      req.userId,
      req.file,
      req.body.name
    );

    return ApiResponse.created(
      res,
      { document: doc },
      'Document uploaded. Processing will complete in the background.'
    );
  } catch (err) {
    next(err);
  }
}

export async function ingestUrl(req, res, next) {
  try {
    const doc = await documentService.ingestUrl(
      req.companyId,
      req.userId,
      req.body.url,
      req.body.name
    );

    return ApiResponse.created(
      res,
      { document: doc },
      'URL queued for processing.'
    );
  } catch (err) {
    next(err);
  }
}

export async function listDocuments(req, res, next) {
  try {
    const { page, limit, status, fileType } = req.query;
    const result = await documentService.listDocuments(req.companyId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      status,
      fileType,
    });

    return ApiResponse.paginated(
      res,
      result.documents,
      {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      }
    );
  } catch (err) {
    next(err);
  }
}

export async function getDocument(req, res, next) {
  try {
    const doc = await documentService.getDocument(req.companyId, req.params.id);
    return ApiResponse.success(res, { document: doc });
  } catch (err) {
    next(err);
  }
}

export async function getDocumentStats(req, res, next) {
  try {
    const stats = await documentService.getDocumentStats(req.companyId);
    return ApiResponse.success(res, { stats });
  } catch (err) {
    next(err);
  }
}

export async function getDocumentChunks(req, res, next) {
  try {
    const chunks = await documentService.getDocumentChunks(req.companyId, req.params.id);
    return ApiResponse.success(res, { chunks, total: chunks.length });
  } catch (err) {
    next(err);
  }
}

export async function deleteDocument(req, res, next) {
  try {
    await documentService.deleteDocument(req.companyId, req.params.id);
    return ApiResponse.success(res, null, 'Document deleted successfully');
  } catch (err) {
    next(err);
  }
}

export async function retryDocument(req, res, next) {
  try {
    const doc = await documentService.retryDocument(req.companyId, req.params.id);
    return ApiResponse.success(
      res,
      { document: doc },
      'Document re-queued for processing.'
    );
  } catch (err) {
    next(err);
  }
}
