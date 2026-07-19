import { jest } from '@jest/globals';

process.env.NODE_ENV = 'test';
process.env.CLIENT_URL = 'http://localhost:5173';

// ── Mocks ────────────────────────────────────────────────────
jest.unstable_mockModule('../../src/repositories/company.repository.js', () => ({
  companyRepository: {
    findById: jest.fn(),
    findByIdWithApiKey: jest.fn(),
    updateById: jest.fn(),
    setLogo: jest.fn(),
    updateTheme: jest.fn(),
    updateWidgetSettings: jest.fn(),
  },
}));

jest.unstable_mockModule('../../src/repositories/subscription.repository.js', () => ({
  subscriptionRepository: {
    findByCompany: jest.fn(),
  },
}));

jest.unstable_mockModule('../../src/middleware/upload.middleware.js', () => ({
  deleteUploadedFile: jest.fn(),
  imagePublicPath: jest.fn((f) => `/uploads/images/${f}`),
}));

jest.unstable_mockModule('../../src/utils/logger.js', () => ({
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import mongoose from 'mongoose';

function makeCompany(overrides = {}) {
  return {
    _id: new mongoose.Types.ObjectId(),
    name: 'Acme Corp',
    slug: 'acme-corp',
    email: 'hi@acme.com',
    widgetId: 'wid_abc123',
    apiKey: 'ak_secret',
    logo: null,
    plan: 'free',
    isActive: true,
    theme: {
      primaryColor: '#0ea5e9',
      darkMode: false,
      toObject: () => ({ primaryColor: '#0ea5e9', darkMode: false }),
    },
    widgetSettings: {
      greeting: 'Hi!',
      position: 'bottom-right',
      toObject: () => ({ greeting: 'Hi!', position: 'bottom-right' }),
    },
    regenerateApiKey: jest.fn().mockReturnValue('ak_newkey123'),
    save: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe('companyService', () => {
  let companyService;
  let companyRepository;
  let subscriptionRepository;

  beforeEach(async () => {
    jest.clearAllMocks();
    const mod = await import('../../src/services/company.service.js');
    const repoMod = await import('../../src/repositories/company.repository.js');
    const subMod = await import('../../src/repositories/subscription.repository.js');
    companyService = mod.companyService;
    companyRepository = repoMod.companyRepository;
    subscriptionRepository = subMod.subscriptionRepository;
  });

  // ── getCompany ───────────────────────────────────────────────
  describe('getCompany', () => {
    it('returns company when found', async () => {
      const company = makeCompany();
      companyRepository.findById.mockResolvedValue(company);

      const result = await companyService.getCompany(company._id.toString());
      expect(result).toBe(company);
    });

    it('throws 404 when company not found', async () => {
      companyRepository.findById.mockResolvedValue(null);
      await expect(companyService.getCompany('missing-id')).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  // ── updateCompany ────────────────────────────────────────────
  describe('updateCompany', () => {
    it('strips protected fields before updating', async () => {
      const company = makeCompany();
      companyRepository.updateById.mockResolvedValue(company);

      await companyService.updateCompany(company._id.toString(), {
        name: 'New Name',
        slug: 'should-be-stripped',
        apiKey: 'should-be-stripped',
        widgetId: 'should-be-stripped',
        plan: 'enterprise',
      });

      const updateArg = companyRepository.updateById.mock.calls[0][1];
      expect(updateArg.name).toBe('New Name');
      expect(updateArg.slug).toBeUndefined();
      expect(updateArg.apiKey).toBeUndefined();
      expect(updateArg.widgetId).toBeUndefined();
      expect(updateArg.plan).toBeUndefined();
    });

    it('throws 404 when company not found', async () => {
      companyRepository.updateById.mockResolvedValue(null);
      await expect(
        companyService.updateCompany('bad-id', { name: 'X' })
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  // ── uploadLogo ───────────────────────────────────────────────
  describe('uploadLogo', () => {
    it('throws 400 when no file provided', async () => {
      await expect(
        companyService.uploadLogo('company-id', null)
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('sets logo URL from uploaded filename', async () => {
      const company = makeCompany();
      companyRepository.findById.mockResolvedValue(company);
      companyRepository.setLogo.mockResolvedValue({ ...company, logo: '/uploads/images/img_abc.jpg' });

      const result = await companyService.uploadLogo(
        company._id.toString(),
        { filename: 'img_abc.jpg' }
      );

      expect(companyRepository.setLogo).toHaveBeenCalledWith(
        company._id.toString(),
        '/uploads/images/img_abc.jpg'
      );
    });
  });

  // ── regenerateApiKey ─────────────────────────────────────────
  describe('regenerateApiKey', () => {
    it('returns the new API key', async () => {
      const company = makeCompany();
      companyRepository.findByIdWithApiKey.mockResolvedValue(company);

      const result = await companyService.regenerateApiKey(company._id.toString());
      expect(result.apiKey).toBe('ak_newkey123');
      expect(company.save).toHaveBeenCalled();
    });
  });

  // ── updateTheme ──────────────────────────────────────────────
  describe('updateTheme', () => {
    it('merges partial updates with existing theme', async () => {
      const company = makeCompany();
      const updatedCompany = {
        ...company,
        theme: { primaryColor: '#ff0000', darkMode: false },
      };
      updatedCompany.theme.toObject = undefined;

      companyRepository.findById.mockResolvedValue(company);
      companyRepository.updateTheme.mockResolvedValue(updatedCompany);

      await companyService.updateTheme(company._id.toString(), {
        primaryColor: '#ff0000',
      });

      const mergedTheme = companyRepository.updateTheme.mock.calls[0][1];
      // Original darkMode preserved, primaryColor overridden
      expect(mergedTheme.darkMode).toBe(false);
      expect(mergedTheme.primaryColor).toBe('#ff0000');
    });
  });

  // ── getEmbedCode ─────────────────────────────────────────────
  describe('getEmbedCode', () => {
    it('includes the widgetId in the embed script tag', () => {
      const company = makeCompany();
      const code = companyService.getEmbedCode(company);
      expect(code).toContain('wid_abc123');
      expect(code).toContain('widget.js');
    });

    it('sets data-theme=dark when darkMode is enabled', () => {
      const company = makeCompany({ theme: { darkMode: true } });
      const code = companyService.getEmbedCode(company);
      expect(code).toContain('data-theme="dark"');
    });
  });

  // ── buildWidgetConfig ────────────────────────────────────────
  describe('buildWidgetConfig', () => {
    it('flattens theme + widgetSettings into the public branding payload', () => {
      const company = makeCompany({
        theme: {
          primaryColor: '#123456',
          secondaryColor: '#654321',
          darkMode: false,
        },
        widgetSettings: {
          botName: 'Ada',
          greeting: 'Hi there',
          placeholder: 'Ask away',
          suggestedQuestions: ['What is this?'],
          showSources: true,
          allowFeedback: true,
          allowEmailTranscript: false,
          position: 'bottom-left',
          zIndex: 5000,
          avatarUrl: 'https://cdn.example.com/avatar.png',
        },
      });

      const config = companyService.buildWidgetConfig(company);

      expect(config).toMatchObject({
        companyName: 'Acme Corp',
        botName: 'Ada',
        welcomeMessage: 'Hi there',
        placeholder: 'Ask away',
        primaryColor: '#123456',
        secondaryColor: '#654321',
        avatar: 'https://cdn.example.com/avatar.png',
        position: 'bottom-left',
        zIndex: 5000,
        theme: 'light',
        suggestedQuestions: ['What is this?'],
        allowEmailTranscript: false,
      });
    });

    it('derives theme="dark" when darkMode is enabled', () => {
      const company = makeCompany({ theme: { darkMode: true } });
      const config = companyService.buildWidgetConfig(company);
      expect(config.theme).toBe('dark');
    });

    it('falls back to the company logo when theme.logoUrl is unset', () => {
      const company = makeCompany({ logo: '/uploads/images/co.png', theme: { logoUrl: null } });
      const config = companyService.buildWidgetConfig(company);
      expect(config.logo).toBe('/uploads/images/co.png');
    });
  });
});
