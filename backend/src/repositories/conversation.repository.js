import Conversation, { CONVERSATION_STATUS } from '../models/Conversation.model.js';

export const conversationRepository = {
  async create(data) {
    return Conversation.create(data);
  },

  async findBySession(sessionId) {
    return Conversation.findOne({ sessionId });
  },

  async findByIdAndCompany(id, companyId) {
    return Conversation.findOne({ _id: id, companyId });
  },

  async updateById(id, updates) {
    return Conversation.findByIdAndUpdate(id, updates, { new: true });
  },

  async incrementMessages(id, count = 1) {
    return Conversation.findByIdAndUpdate(
      id,
      {
        $inc: { messageCount: count },
        lastMessageAt: new Date(),
      },
      { new: true }
    );
  },

  async findByCompany(companyId, { status, page = 1, limit = 20 } = {}) {
    const filter = { companyId };
    if (status) {filter.status = status;}

    const skip = (page - 1) * limit;
    const [conversations, total] = await Promise.all([
      Conversation.find(filter)
        .sort({ lastMessageAt: -1 })
        .skip(skip)
        .limit(limit),
      Conversation.countDocuments(filter),
    ]);

    return { conversations, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async close(id) {
    return Conversation.findByIdAndUpdate(
      id,
      { status: CONVERSATION_STATUS.CLOSED },
      { new: true }
    );
  },

  async countByCompany(companyId) {
    return Conversation.countDocuments({ companyId });
  },

  async countActiveToday(companyId) {
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    return Conversation.countDocuments({
      companyId,
      startedAt: { $gte: startOfDay },
    });
  },
};
