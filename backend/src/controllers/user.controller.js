import { userService } from '../services/user.service.js';
import ApiResponse from '../utils/apiResponse.js';

export async function getProfile(req, res, next) {
  try {
    const user = await userService.getProfile(req.userId);
    return ApiResponse.success(res, { user });
  } catch (err) { next(err); }
}

export async function updateProfile(req, res, next) {
  try {
    const user = await userService.updateProfile(req.userId, req.body);
    return ApiResponse.success(res, { user }, 'Profile updated');
  } catch (err) { next(err); }
}

export async function uploadAvatar(req, res, next) {
  try {
    const user = await userService.uploadAvatar(req.userId, req.file);
    return ApiResponse.success(res, { avatar: user.avatar }, 'Avatar updated');
  } catch (err) { next(err); }
}

export async function listTeamMembers(req, res, next) {
  try {
    const members = await userService.listTeamMembers(req.companyId);
    return ApiResponse.success(res, { members, total: members.length });
  } catch (err) { next(err); }
}

export async function inviteTeamMember(req, res, next) {
  try {
    const member = await userService.inviteTeamMember(
      req.companyId,
      req.body,
      req.user
    );
    return ApiResponse.created(res, { member }, 'Invitation sent successfully');
  } catch (err) { next(err); }
}

export async function updateTeamMember(req, res, next) {
  try {
    const member = await userService.updateMember(
      req.companyId,
      req.params.userId,
      req.body,
      req.user
    );
    return ApiResponse.success(res, { member }, 'Team member updated');
  } catch (err) { next(err); }
}

export async function removeTeamMember(req, res, next) {
  try {
    await userService.removeMember(req.companyId, req.params.userId, req.userId);
    return ApiResponse.success(res, null, 'Team member removed');
  } catch (err) { next(err); }
}
