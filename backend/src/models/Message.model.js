import mongoose from 'mongoose';

export const MESSAGE_ROLE = {
  USER: 'user',
  ASSISTANT: 'assistant',
  SYSTEM: 'system',
};

// Lightweight citation stored alongside each assistant message
const sourceSchema = new mongoose.Schema(
  {
    chunkId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chunk',
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
    },
    documentName: { type: String },
    excerpt: { type: String, maxlength: 300 },
    score: { type: Number },          // cosine similarity score
    page: { type: Number, default: null },
    url: { type: String, default: null },
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: Object.values(MESSAGE_ROLE),
      required: true,
    },
    content: {
      type: String,
      required: [true, 'Message content is required'],
      maxlength: [32000, 'Message content exceeds maximum length'],
    },
    // Citations returned with assistant messages
    sources: {
      type: [sourceSchema],
      default: [],
    },
    // Token counts for cost tracking and analytics
    tokensUsed: {
      prompt: { type: Number, default: 0 },
      completion: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
    // Wall-clock time from question received to first token (ms)
    responseTimeMs: {
      type: Number,
      default: null,
    },
    // Whether the answer came from the RAG context or the fallback
    answeredFromContext: {
      type: Boolean,
      default: null,
    },
    // Reference to any user feedback on this message
    feedbackId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Feedback',
      default: null,
    },
    // True while the message is streaming; false once complete
    isStreaming: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// ── Compound Indexes ─────────────────────────────────────────
messageSchema.index({ conversationId: 1, createdAt: 1 });
messageSchema.index({ companyId: 1, role: 1, createdAt: -1 });
messageSchema.index({ companyId: 1, answeredFromContext: 1 });

// ── Statics ─────────────────────────────────────────────────
messageSchema.statics.getConversationHistory = function (conversationId, limit = 20) {
  return this.find({ conversationId, role: { $ne: MESSAGE_ROLE.SYSTEM } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .then((msgs) => msgs.reverse());
};

const Message = mongoose.model('Message', messageSchema);
export default Message;
