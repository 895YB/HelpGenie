import { Message } from '../models/index.js';

export const messageRepository = {
  async create(data) {
    return Message.create(data);
  },

  async findById(id) {
    return Message.findById(id);
  },

  async findByIdAndConversation(id, conversationId) {
    return Message.findOne({ _id: id, conversationId });
  },

  async findByConversation(conversationId) {
    return Message.find({ conversationId }).sort({ createdAt: 1 });
  },

  // Returns last `limit` messages formatted for conversation history
  async getConversationHistory(conversationId, limit = 10) {
    const messages = await Message.find({ conversationId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('role content');

    // Reverse to chronological order
    return messages.reverse().map((m) => ({ role: m.role, content: m.content }));
  },

  async countByConversation(conversationId) {
    return Message.countDocuments({ conversationId });
  },

  async findByCompany(companyId, { page = 1, limit = 50 } = {}) {
    const skip = (page - 1) * limit;
    return Message.find({ companyId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
  },
};
