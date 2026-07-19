import mongoose from 'mongoose';

export const DOCUMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  READY: 'ready',
  FAILED: 'failed',
};

export const FILE_TYPES = {
  PDF: 'pdf',
  DOCX: 'docx',
  TXT: 'txt',
  URL: 'url',
};

const documentSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'companyId is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Document name is required'],
      trim: true,
      maxlength: [500, 'Document name cannot exceed 500 characters'],
    },
    // Original filename as uploaded (before sanitization)
    originalName: {
      type: String,
      trim: true,
      default: null,
    },
    fileType: {
      type: String,
      enum: Object.values(FILE_TYPES),
      required: [true, 'File type is required'],
    },
    // File size in bytes (null for URL type)
    fileSize: {
      type: Number,
      default: null,
    },
    // Temp path on disk — cleared after ingestion completes
    filePath: {
      type: String,
      default: null,
      select: false, // internal only; never exposed via API
    },
    // Used when fileType === 'url'
    sourceUrl: {
      type: String,
      trim: true,
      default: null,
    },
    status: {
      type: String,
      enum: Object.values(DOCUMENT_STATUS),
      default: DOCUMENT_STATUS.PENDING,
      index: true,
    },
    // Populated after ingestion
    chunkCount: {
      type: Number,
      default: 0,
    },
    wordCount: {
      type: Number,
      default: 0,
    },
    characterCount: {
      type: Number,
      default: 0,
    },
    // Error details if status === 'failed'
    errorMessage: {
      type: String,
      default: null,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Arbitrary key-value pairs for file metadata (author, title, page count, etc.)
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: () => new Map(),
    },
    // Set to true when the user explicitly deletes; chunks are deleted in background
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, getters: true },
    toObject: { virtuals: true },
  }
);

// ── Compound Indexes ─────────────────────────────────────────
documentSchema.index({ companyId: 1, status: 1 });
documentSchema.index({ companyId: 1, isDeleted: 1, createdAt: -1 });
documentSchema.index({ companyId: 1, fileType: 1 });

// ── Virtuals ────────────────────────────────────────────────
documentSchema.virtual('fileSizeMB').get(function () {
  if (!this.fileSize) {return null;}
  return (this.fileSize / (1024 * 1024)).toFixed(2);
});

documentSchema.virtual('isReady').get(function () {
  return this.status === DOCUMENT_STATUS.READY;
});

// ── Statics ─────────────────────────────────────────────────
documentSchema.statics.findByCompany = function (companyId, filters = {}) {
  return this.find({ companyId, isDeleted: false, ...filters });
};

documentSchema.statics.countByCompany = function (companyId) {
  return this.countDocuments({ companyId, isDeleted: false });
};

const Document = mongoose.model('Document', documentSchema);
export default Document;
