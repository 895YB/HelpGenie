import mongoose from 'mongoose';

export const FEEDBACK_RATING = {
  THUMBS_UP: 'thumbs_up',
  THUMBS_DOWN: 'thumbs_down',
};

const feedbackSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      required: true,
      index: true,
    },
    rating: {
      type: String,
      enum: Object.values(FEEDBACK_RATING),
      required: [true, 'Feedback rating is required'],
    },
    // Optional free-text comment (shown when thumbs_down)
    comment: {
      type: String,
      trim: true,
      maxlength: [1000, 'Comment cannot exceed 1000 characters'],
      default: null,
    },
    // The question that was asked (denormalized for quick analytics)
    question: {
      type: String,
      maxlength: [2000],
      default: null,
    },
    // The assistant answer that was rated (denormalized)
    answer: {
      type: String,
      maxlength: [8000],
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ── Indexes ─────────────────────────────────────────────────
feedbackSchema.index({ companyId: 1, rating: 1 });
feedbackSchema.index({ companyId: 1, createdAt: -1 });
// One feedback record per message
feedbackSchema.index({ messageId: 1 }, { unique: true });

// ── Statics ─────────────────────────────────────────────────
feedbackSchema.statics.getSatisfactionRate = async function (companyId, startDate, endDate) {
  const result = await this.aggregate([
    {
      $match: {
        companyId,
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: '$rating',
        count: { $sum: 1 },
      },
    },
  ]);

  const counts = { thumbs_up: 0, thumbs_down: 0 };
  result.forEach(({ _id, count }) => { counts[_id] = count; });

  const total = counts.thumbs_up + counts.thumbs_down;
  const rate = total > 0 ? Math.round((counts.thumbs_up / total) * 100) : null;

  return { thumbsUp: counts.thumbs_up, thumbsDown: counts.thumbs_down, total, satisfactionRate: rate };
};

const Feedback = mongoose.model('Feedback', feedbackSchema);
export default Feedback;
