import { jest } from '@jest/globals';

process.env.NODE_ENV = 'test';

jest.unstable_mockModule('../../src/models/index.js', () => ({
  Company: {
    findOne: jest.fn(),
    findByWidgetId: jest.fn(),
  },
}));

const { Company } = await import('../../src/models/index.js');
const { requireTenant, resolveWidgetTenant } = await import('../../src/middleware/tenant.middleware.js');

describe('requireTenant', () => {
  beforeEach(() => jest.clearAllMocks());

  it('attaches req.company/req.companyId when the user has an active company', async () => {
    const company = { _id: 'co1' };
    Company.findOne.mockResolvedValue(company);

    const req = { user: { companyId: 'co1' } };
    const next = jest.fn();
    await requireTenant(req, {}, next);

    expect(Company.findOne).toHaveBeenCalledWith({ _id: 'co1', isActive: true });
    expect(req.company).toBe(company);
    expect(req.companyId).toBe('co1');
    expect(next).toHaveBeenCalledWith();
  });

  it('calls next with a 403 when the authenticated user has no companyId', async () => {
    const req = { user: {} };
    const next = jest.fn();
    await requireTenant(req, {}, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
    expect(Company.findOne).not.toHaveBeenCalled();
  });

  it('calls next with a 403 when the company is missing or deactivated', async () => {
    Company.findOne.mockResolvedValue(null);
    const req = { user: { companyId: 'co1' } };
    const next = jest.fn();
    await requireTenant(req, {}, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });
});

describe('resolveWidgetTenant', () => {
  beforeEach(() => jest.clearAllMocks());

  it('resolves via body.widgetId and attaches req.company/req.companyId', async () => {
    const company = { _id: 'co1', widgetId: 'wid_1' };
    Company.findByWidgetId.mockResolvedValue(company);

    const req = { body: { widgetId: 'wid_1' }, query: {} };
    const next = jest.fn();
    await resolveWidgetTenant(req, {}, next);

    expect(Company.findByWidgetId).toHaveBeenCalledWith('wid_1');
    expect(req.company).toBe(company);
    expect(req.companyId).toBe('co1');
    expect(next).toHaveBeenCalledWith();
  });

  it('falls back to query.widgetId when body.widgetId is absent', async () => {
    Company.findByWidgetId.mockResolvedValue({ _id: 'co2', widgetId: 'wid_2' });
    const req = { body: {}, query: { widgetId: 'wid_2' } };
    const next = jest.fn();
    await resolveWidgetTenant(req, {}, next);

    expect(Company.findByWidgetId).toHaveBeenCalledWith('wid_2');
    expect(next).toHaveBeenCalledWith();
  });

  it('calls next with a 400 when widgetId is missing entirely', async () => {
    const req = { body: {}, query: {} };
    const next = jest.fn();
    await resolveWidgetTenant(req, {}, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    expect(Company.findByWidgetId).not.toHaveBeenCalled();
  });

  it('calls next with a 404 when no company matches the widgetId (prevents session/widget spoofing)', async () => {
    Company.findByWidgetId.mockResolvedValue(null);
    const req = { body: { widgetId: 'wid_bogus' }, query: {} };
    const next = jest.fn();
    await resolveWidgetTenant(req, {}, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
  });
});
