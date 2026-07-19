import { Chunk } from '../models/index.js';
import { env } from '../config/env.js';

export const chunkRepository = {
  /**
   * Inserts all chunks for a document in one batched write.
   * ordered: false means a single bad chunk does not abort the rest.
   */
  async insertMany(chunks) {
    return Chunk.insertMany(chunks, { ordered: false });
  },

  async findById(id) {
    return Chunk.findById(id);
  },

  async findByDocument(documentId) {
    return Chunk.find({ documentId }).sort({ chunkIndex: 1 }).select('-embedding');
  },

  async deleteByDocument(documentId) {
    return Chunk.deleteMany({ documentId });
  },

  async deleteByCompany(companyId) {
    return Chunk.deleteMany({ companyId });
  },

  async countByCompany(companyId) {
    return Chunk.countDocuments({ companyId });
  },

  /**
   * Atlas Vector Search — finds the top-K most semantically similar
   * chunks for a given query embedding, scoped strictly to one company.
   *
   * Falls back to an empty array when not running against Atlas
   * (e.g. local MongoDB) so the rest of the RAG pipeline degrades gracefully.
   */
  async vectorSearch(queryEmbedding, companyId) {
    try {
      return await Chunk.vectorSearch({
        embedding: queryEmbedding,
        companyId,
        limit: env.vectorSearchLimit,
        numCandidates: env.vectorSearchNumCandidates,
        indexName: env.vectorSearchIndex,
      });
    } catch (err) {
      // $vectorSearch is only available on Atlas — don't crash in dev
      if (err.message?.includes('$vectorSearch')) {
        return [];
      }
      throw err;
    }
  },
};
