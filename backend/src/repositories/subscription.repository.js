import { Subscription } from '../models/index.js';
import { PLAN_LIMITS } from '../models/Subscription.model.js';

export const subscriptionRepository = {
  async findByCompany(companyId) {
    return Subscription.findOne({ companyId });
  },

  async create(companyId, plan = 'free') {
    return Subscription.create({
      companyId,
      plan,
      features: { ...PLAN_LIMITS[plan] },
    });
  },

  async updatePlan(companyId, plan) {
    return Subscription.findOneAndUpdate(
      { companyId },
      {
        plan,
        features: { ...PLAN_LIMITS[plan] },
        status: 'active',
      },
      { new: true, upsert: true }
    );
  },

  async incrementChatUsage(companyId) {
    return Subscription.findOneAndUpdate(
      { companyId },
      { $inc: { 'usage.chatsThisMonth': 1 } },
      { new: true }
    );
  },

  async resetMonthlyUsage(companyId) {
    return Subscription.findOneAndUpdate(
      { companyId },
      { 'usage.chatsThisMonth': 0, 'usage.lastResetDate': new Date() },
      { new: true }
    );
  },

  async isWithinChatLimit(companyId) {
    const sub = await this.findByCompany(companyId);
    if (!sub) return false;
    return sub.isWithinChatLimit();
  },
};
