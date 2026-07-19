import Document, { DOCUMENT_STATUS } from '../models/Document.model.js';

export const documentRepository = {
  async create(data) {
    return Document.create(data);
  },

  async findById(id) {
    return Document.findById(id);
  },

  async findByIdAndCompany(id, companyId) {
    return Document.findOne({ _id: id, companyId, isDeleted: false });
  },

  async findByCompany(companyId, { status, fileType, page = 1, limit = 20 } = {}) {
    const filter = { companyId, isDeleted: false };
    if (status) {filter.status = status;}
    if (fileType) {filter.fileType = fileType;}

    const skip = (page - 1) * limit;
    const [documents, total] = await Promise.all([
      Document.find(filter)
        .select('-filePath')   // never expose the server file path
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('uploadedBy', 'name email avatar'),
      Document.countDocuments(filter),
    ]);

    return { documents, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async updateStatus(id, status, extraFields = {}) {
    return Document.findByIdAndUpdate(
      id,
      { status, ...extraFields },
      { new: true }
    );
  },

  async softDelete(id, companyId) {
    return Document.findOneAndUpdate(
      { _id: id, companyId },
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    );
  },

  async countByCompany(companyId) {
    return Document.countDocuments({ companyId, isDeleted: false });
  },

  async countByStatus(companyId, status) {
    return Document.countDocuments({ companyId, status, isDeleted: false });
  },

  async findProcessingDocuments() {
    // Used at startup to re-process documents that were mid-flight when server restarted
    return Document.find({
      status: DOCUMENT_STATUS.PROCESSING,
      createdAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    }).select('+filePath');
  },

  /**
   * Fetches name + id for a set of document IDs.
   * Used by the RAG service to attach document names to citations.
   * Scoped to companyId to prevent cross-tenant name leakage.
   */
  async findNamesByIds(ids, companyId) {
    return Document.find(
      { _id: { $in: ids }, companyId },
      { name: 1 }
    );
  },

  async getStats(companyId) {
    const result = await Document.aggregate([
      { $match: { companyId, isDeleted: false } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalChunks: { $sum: '$chunkCount' },
          totalWords: { $sum: '$wordCount' },
        },
      },
    ]);

    const stats = { total: 0, ready: 0, processing: 0, failed: 0, totalChunks: 0, totalWords: 0 };
    for (const row of result) {
      stats[row._id] = row.count;
      stats.total += row.count;
      stats.totalChunks += row.totalChunks;
      stats.totalWords += row.totalWords;
    }
    return stats;
  },
};
