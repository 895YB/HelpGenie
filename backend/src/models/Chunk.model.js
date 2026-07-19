import mongoose from 'mongoose';

/**
 * Stores text chunks and their vector embeddings.
 *
 * The Atlas Vector Search index named `vector_index` must be created
 * on this collection via the Atlas UI or Admin API — Mongoose cannot
 * define Atlas Search indexes. Index config:
 *
 *   {
 *     "fields": [{
 *       "type": "vector",
 *       "path": "embedding",
 *       "numDimensions": 1536,
 *       "similarity": "cosine"
 *     }, {
 *       "type": "filter",
 *       "path": "companyId"
 *     }]
 *   }
 */

const chunkSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true,
    },
    // The raw text content of this chunk
    content: {
      type: String,
      required: [true, 'Chunk content is required'],
      maxlength: [8000, 'Chunk content exceeds maximum length'],
    },
    // 1536-dimensional vector from text-embedding-3-small
    embedding: {
      type: [Number],
      required: true,
      validate: {
        validator: (arr) => arr.length === 1536,
        message: 'Embedding must have exactly 1536 dimensions',
      },
    },
    // Position of this chunk within its source document (0-indexed)
    chunkIndex: {
      type: Number,
      required: true,
      min: 0,
    },
    wordCount: {
      type: Number,
      default: 0,
    },
    // Approximate token count for cost tracking
    tokenCount: {
      type: Number,
      default: 0,
    },
    // Source location metadata for citation in answers
    metadata: {
      page: { type: Number, default: null },          // PDF page number
      section: { type: String, default: null },        // section heading
      url: { type: String, default: null },            // source URL
      startChar: { type: Number, default: null },
      endChar: { type: Number, default: null },
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // chunks are immutable
  }
);

// ── Compound Indexes ─────────────────────────────────────────
chunkSchema.index({ documentId: 1, chunkIndex: 1 });
chunkSchema.index({ companyId: 1, documentId: 1 });
// Note: the actual vector index is managed by Atlas, not Mongoose

// ── Statics ─────────────────────────────────────────────────
chunkSchema.statics.deleteByDocument = function (documentId) {
  return this.deleteMany({ documentId });
};

chunkSchema.statics.countByCompany = function (companyId) {
  return this.countDocuments({ companyId });
};

/**
 * Performs MongoDB Atlas Vector Search scoped to a single company.
 * Falls back gracefully when not running against Atlas.
 */
chunkSchema.statics.vectorSearch = async function ({
  embedding,
  companyId,
  limit = 5,
  numCandidates = 100,
  indexName = 'vector_index',
}) {
  const pipeline = [
    {
      $vectorSearch: {
        index: indexName,
        path: 'embedding',
        queryVector: embedding,
        numCandidates,
        limit,
        filter: { companyId: { $eq: companyId } },
      },
    },
    {
      $project: {
        _id: 1,
        content: 1,
        documentId: 1,
        chunkIndex: 1,
        metadata: 1,
        wordCount: 1,
        score: { $meta: 'vectorSearchScore' },
      },
    },
  ];

  return this.aggregate(pipeline);
};

const Chunk = mongoose.model('Chunk', chunkSchema);
export default Chunk;
