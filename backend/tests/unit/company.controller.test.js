import { jest } from '@jest/globals';

process.env.NODE_ENV = 'test';

jest.unstable_mockModule('../../src/services/company.service.js', () => ({
  companyService: {
    getCompany: jest.fn(),
    updateCompany: jest.fn(),
    uploadLogo: jest.fn(),
    getApiKey: jest.fn(),
    regenerateApiKey: jest.fn(),
    getEmbedCode: jest.fn(),
    getSubscription: jest.fn(),
    buildWidgetConfig: jest.fn(),
  },
}));

const { companyService } = await import('../../src/services/company.service.js');
const { getWidgetConfig, getEmbedCode } = await import('../../src/controllers/company.controller.js');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('company.controller', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getWidgetConfig', () => {
    it('builds the config from req.company, already resolved by resolveWidgetTenant', async () => {
      const company = { _id: 'co1', widgetId: 'wid_1' };
      const config = { companyName: 'Acme', theme: 'light' };
      companyService.buildWidgetConfig.mockReturnValue(config);

      const req = { company };
      const res = mockRes();
      const next = jest.fn();

      await getWidgetConfig(req, res, next);

      expect(companyService.buildWidgetConfig).toHaveBeenCalledWith(company);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: config }));
      expect(next).not.toHaveBeenCalled();
    });

    it('forwards synchronous errors to next()', async () => {
      const err = new Error('boom');
      companyService.buildWidgetConfig.mockImplementation(() => {
        throw err;
      });

      const req = { company: {} };
      const res = mockRes();
      const next = jest.fn();

      await getWidgetConfig(req, res, next);
      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe('getEmbedCode', () => {
    it('builds the embed snippet from the fetched company, without a request-derived origin', async () => {
      const company = { _id: 'co1', widgetId: 'wid_1' };
      companyService.getCompany.mockResolvedValue(company);
      companyService.getEmbedCode.mockReturnValue('<script>...</script>');

      const req = { companyId: 'co1' };
      const res = mockRes();
      const next = jest.fn();

      await getEmbedCode(req, res, next);

      expect(companyService.getEmbedCode).toHaveBeenCalledWith(company);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: { embedCode: '<script>...</script>', widgetId: 'wid_1' },
        })
      );
    });
  });
});
