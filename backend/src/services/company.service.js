import path from 'path';
import { companyRepository } from '../repositories/company.repository.js';
import { subscriptionRepository } from '../repositories/subscription.repository.js';
import { AppError } from '../middleware/error.middleware.js';
import { deleteUploadedFile } from '../middleware/upload.middleware.js';
import logger from '../utils/logger.js';

export const companyService = {
  async getCompany(companyId) {
    const company = await companyRepository.findById(companyId);
    if (!company) throw AppError.notFound('Company not found');
    return company;
  },

  async updateCompany(companyId, updates) {
    // Slug is system-managed — never allow a client to change it
    delete updates.slug;
    delete updates.apiKey;
    delete updates.widgetId;
    delete updates.plan;
    delete updates.subscription;

    const company = await companyRepository.updateById(companyId, updates);
    if (!company) throw AppError.notFound('Company not found');
    return company;
  },

  async uploadLogo(companyId, file) {
    if (!file) throw AppError.badRequest('No image file provided');

    // Delete the old logo from disk if it was a local file
    const existing = await companyRepository.findById(companyId);
    if (existing?.logo && existing.logo.startsWith('/uploads/')) {
      const oldPath = path.resolve(existing.logo.slice(1)); // strip leading /
      deleteUploadedFile(oldPath);
    }

    const logoUrl = `/uploads/images/${file.filename}`;
    const company = await companyRepository.setLogo(companyId, logoUrl);
    logger.info(`Logo updated for company ${companyId}`);
    return company;
  },

  async getApiKey(companyId) {
    const company = await companyRepository.findByIdWithApiKey(companyId);
    if (!company) throw AppError.notFound('Company not found');
    return { apiKey: company.apiKey, widgetId: company.widgetId };
  },

  async regenerateApiKey(companyId) {
    const company = await companyRepository.findByIdWithApiKey(companyId);
    if (!company) throw AppError.notFound('Company not found');

    const newKey = company.regenerateApiKey();
    await company.save();

    logger.info(`API key regenerated for company ${companyId}`);
    return { apiKey: newKey };
  },

  async getTheme(companyId) {
    const company = await companyRepository.findById(companyId);
    if (!company) throw AppError.notFound('Company not found');
    return company.theme;
  },

  async updateTheme(companyId, themeUpdates) {
    // Merge updates with existing theme rather than replace entirely
    const company = await companyRepository.findById(companyId);
    if (!company) throw AppError.notFound('Company not found');

    const merged = { ...company.theme.toObject(), ...themeUpdates };
    const updated = await companyRepository.updateTheme(companyId, merged);
    return updated.theme;
  },

  async getWidgetSettings(companyId) {
    const company = await companyRepository.findById(companyId);
    if (!company) throw AppError.notFound('Company not found');
    return company.widgetSettings;
  },

  async updateWidgetSettings(companyId, settingsUpdates) {
    const company = await companyRepository.findById(companyId);
    if (!company) throw AppError.notFound('Company not found');

    const merged = { ...company.widgetSettings.toObject(), ...settingsUpdates };
    const updated = await companyRepository.updateWidgetSettings(companyId, merged);
    return updated.widgetSettings;
  },

  async getSettings(companyId) {
    const [company, subscription] = await Promise.all([
      companyRepository.findById(companyId),
      subscriptionRepository.findByCompany(companyId),
    ]);

    if (!company) throw AppError.notFound('Company not found');

    return {
      company: {
        id: company._id,
        name: company.name,
        slug: company.slug,
        email: company.email,
        website: company.website,
        logo: company.logo,
        phone: company.phone,
        industry: company.industry,
        widgetId: company.widgetId,
        plan: company.plan,
        isActive: company.isActive,
        createdAt: company.createdAt,
      },
      theme: company.theme,
      widgetSettings: company.widgetSettings,
      subscription: subscription
        ? {
            plan: subscription.plan,
            status: subscription.status,
            features: subscription.features,
            billing: subscription.billing,
            currentPeriodEnd: subscription.currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            usage: subscription.usage,
          }
        : null,
    };
  },

  async getSubscription(companyId) {
    const sub = await subscriptionRepository.findByCompany(companyId);
    if (!sub) throw AppError.notFound('Subscription not found');
    return sub;
  },

  /**
   * Generates the HTML embed snippet for the customer-facing widget.
   */
  getEmbedCode(company, apiBaseUrl) {
    return `<!-- AI Widget — paste before </body> -->
<script
  src="${apiBaseUrl}/widget.js"
  data-widget-id="${company.widgetId}"
  data-theme="${company.theme?.darkMode ? 'dark' : 'light'}"
  async
></script>`;
  },
};
