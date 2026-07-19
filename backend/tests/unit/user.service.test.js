import { jest } from '@jest/globals';

process.env.NODE_ENV = 'test';
process.env.CLIENT_URL = 'http://localhost:5173';

jest.unstable_mockModule('../../src/repositories/user.repository.js', () => ({
  userRepository: {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findByCompany: jest.fn(),
    create: jest.fn(),
    updateById: jest.fn(),
    countByCompany: jest.fn(),
    deactivate: jest.fn(),
  },
}));

jest.unstable_mockModule('../../src/repositories/subscription.repository.js', () => ({
  subscriptionRepository: {
    findByCompany: jest.fn(),
  },
}));

jest.unstable_mockModule('../../src/middleware/upload.middleware.js', () => ({
  deleteUploadedFile: jest.fn(),
}));

jest.unstable_mockModule('../../src/services/email.service.js', () => ({
  sendEmailVerification: jest.fn().mockResolvedValue({}),
}));

jest.unstable_mockModule('../../src/utils/logger.js', () => ({
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import mongoose from 'mongoose';

function makeUser(overrides = {}) {
  const id = new mongoose.Types.ObjectId();
  const companyId = new mongoose.Types.ObjectId();
  return {
    _id: id,
    name: 'Test User',
    email: 'user@example.com',
    role: 'admin',
    companyId,
    isActive: true,
    avatar: null,
    refreshTokens: [],
    createEmailVerificationToken: jest.fn().mockReturnValue('raw-token'),
    toSafeObject: jest.fn().mockReturnValue({ id: id.toString(), name: 'Test User' }),
    save: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

function makeSub(overrides = {}) {
  return {
    plan: 'free',
    features: { maxTeamMembers: 1 },
    isWithinChatLimit: () => true,
    ...overrides,
  };
}

describe('userService', () => {
  let userService;
  let userRepository;
  let subscriptionRepository;

  beforeEach(async () => {
    jest.clearAllMocks();
    const mod = await import('../../src/services/user.service.js');
    const repoMod = await import('../../src/repositories/user.repository.js');
    const subMod = await import('../../src/repositories/subscription.repository.js');
    userService = mod.userService;
    userRepository = repoMod.userRepository;
    subscriptionRepository = subMod.subscriptionRepository;
  });

  // ── updateProfile ────────────────────────────────────────────
  describe('updateProfile', () => {
    it('strips protected fields', async () => {
      const user = makeUser();
      userRepository.updateById.mockResolvedValue(user);

      await userService.updateProfile(user._id.toString(), {
        name: 'New Name',
        role: 'admin',          // should be stripped
        companyId: 'hijack',    // should be stripped
        password: 'newpass',    // should be stripped
      });

      const updateArg = userRepository.updateById.mock.calls[0][1];
      expect(updateArg.name).toBe('New Name');
      expect(updateArg.role).toBeUndefined();
      expect(updateArg.companyId).toBeUndefined();
      expect(updateArg.password).toBeUndefined();
    });
  });

  // ── inviteTeamMember ─────────────────────────────────────────
  describe('inviteTeamMember', () => {
    it('throws 400 when team member seat limit reached', async () => {
      subscriptionRepository.findByCompany.mockResolvedValue(
        makeSub({ features: { maxTeamMembers: 1 } })
      );
      userRepository.countByCompany.mockResolvedValue(1); // at limit

      await expect(
        userService.inviteTeamMember(
          'company-id',
          { name: 'Bob', email: 'bob@x.com', role: 'employee' },
          makeUser()
        )
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('throws 409 when email already in use', async () => {
      subscriptionRepository.findByCompany.mockResolvedValue(
        makeSub({ features: { maxTeamMembers: 10 } })
      );
      userRepository.countByCompany.mockResolvedValue(1);
      userRepository.findByEmail.mockResolvedValue(makeUser()); // already exists

      await expect(
        userService.inviteTeamMember(
          'company-id',
          { name: 'Bob', email: 'existing@x.com', role: 'employee' },
          makeUser()
        )
      ).rejects.toMatchObject({ statusCode: 409 });
    });

    it('creates user and sends invite when within limits', async () => {
      const companyId = new mongoose.Types.ObjectId();
      subscriptionRepository.findByCompany.mockResolvedValue(
        makeSub({ features: { maxTeamMembers: 5 } })
      );
      userRepository.countByCompany.mockResolvedValue(2);
      userRepository.findByEmail.mockResolvedValue(null);
      const newUser = makeUser({ companyId });
      userRepository.create.mockResolvedValue(newUser);

      const result = await userService.inviteTeamMember(
        companyId.toString(),
        { name: 'Bob', email: 'bob@x.com', role: 'employee' },
        makeUser({ companyId })
      );

      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'bob@x.com', role: 'employee' })
      );
    });
  });

  // ── removeMember ─────────────────────────────────────────────
  describe('removeMember', () => {
    it('throws 400 when trying to remove self', async () => {
      const id = new mongoose.Types.ObjectId().toString();
      await expect(
        userService.removeMember('company-id', id, id)
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('throws 403 when target user belongs to different company', async () => {
      const user = makeUser({ companyId: new mongoose.Types.ObjectId() });
      userRepository.findById.mockResolvedValue(user);

      await expect(
        userService.removeMember('different-company-id', user._id.toString(), 'requester-id')
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('throws 400 when removing last admin', async () => {
      const companyId = new mongoose.Types.ObjectId();
      const user = makeUser({ role: 'admin', companyId });
      userRepository.findById.mockResolvedValue(user);
      // Only one admin
      userRepository.findByCompany.mockResolvedValue([user]);

      await expect(
        userService.removeMember(
          companyId.toString(),
          user._id.toString(),
          'some-other-id'
        )
      ).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  // ── updateMember ─────────────────────────────────────────────
  describe('updateMember', () => {
    it('throws 403 when modifying user from different company', async () => {
      const user = makeUser({ companyId: new mongoose.Types.ObjectId() });
      userRepository.findById.mockResolvedValue(user);

      const requester = makeUser({ role: 'admin' });

      await expect(
        userService.updateMember('wrong-company', user._id.toString(), { role: 'employee' }, requester)
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('throws 400 when demoting last admin', async () => {
      const companyId = new mongoose.Types.ObjectId();
      const user = makeUser({ role: 'admin', companyId });
      userRepository.findById.mockResolvedValue(user);
      userRepository.findByCompany.mockResolvedValue([user]); // only 1 admin

      const requester = makeUser({ role: 'admin', companyId });

      await expect(
        userService.updateMember(
          companyId.toString(),
          user._id.toString(),
          { role: 'employee' },
          requester
        )
      ).rejects.toMatchObject({ statusCode: 400 });
    });
  });
});
