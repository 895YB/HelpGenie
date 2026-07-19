import { Company } from '../models/index.js';

export const companyRepository = {
  async findById(id) {
    return Company.findById(id);
  },

  async findByIdWithApiKey(id) {
    return Company.findById(id).select('+apiKey');
  },

  async findByWidgetId(widgetId) {
    return Company.findOne({ widgetId, isActive: true });
  },

  async findBySlug(slug) {
    return Company.findOne({ slug, isActive: true });
  },

  async create(data) {
    return Company.create(data);
  },

  async updateById(id, updates) {
    return Company.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
  },

  async updateTheme(id, theme) {
    return Company.findByIdAndUpdate(
      id,
      { $set: { theme } },
      { new: true, runValidators: true }
    );
  },

  async updateWidgetSettings(id, widgetSettings) {
    return Company.findByIdAndUpdate(
      id,
      { $set: { widgetSettings } },
      { new: true, runValidators: true }
    );
  },

  async setLogo(id, logoUrl) {
    return Company.findByIdAndUpdate(id, { logo: logoUrl }, { new: true });
  },

  async deactivate(id) {
    return Company.findByIdAndUpdate(id, { isActive: false }, { new: true });
  },
};
