import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { UserPlus, Trash2, Shield, User, Mail, Check, X, Crown } from 'lucide-react';
import { useTeam, useInviteMember, useUpdateMemberRole, useRemoveMember } from '@/hooks/useTeam';
import { useAuth } from '@/hooks/useAuth';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import { cn } from '@/lib/utils';

const ROLE_CONFIG = {
  owner: { label: 'Owner',    icon: Crown,  cls: 'bg-amber-50 text-amber-700 border-amber-200'  },
  admin: { label: 'Admin',    icon: Shield, cls: 'bg-brand-50 text-brand-700 border-brand-200'  },
  employee: { label: 'Member', icon: User,  cls: 'bg-gray-50 text-gray-600 border-gray-200'     },
};

export default function TeamPage() {
  const { user: me } = useAuth();
  const { data: members = [], isLoading, isError } = useTeam();
  const [showInvite, setShowInvite] = useState(false);
  const [globalError, setGlobalError] = useState('');

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Team</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Manage who has access to your HelpGenie dashboard.
          </p>
        </div>
        <Button
          onClick={() => setShowInvite((v) => !v)}
          className="shrink-0 gap-2"
        >
          {showInvite ? (
            <><X className="h-4 w-4" />Cancel</>
          ) : (
            <><UserPlus className="h-4 w-4" />Invite member</>
          )}
        </Button>
      </div>

      {/* Invite form */}
      {showInvite && (
        <InviteForm
          onSuccess={() => setShowInvite(false)}
          onError={(msg) => setGlobalError(msg)}
        />
      )}

      <Alert type="error" message={globalError} onDismiss={() => setGlobalError('')} />

      {/* Member list */}
      <div className="card divide-y divide-gray-100 overflow-hidden">
        {isLoading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="flex animate-pulse items-center gap-4 px-5 py-4">
              <div className="h-10 w-10 rounded-full bg-gray-200 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-36 rounded bg-gray-200" />
                <div className="h-3 w-48 rounded bg-gray-200" />
              </div>
              <div className="h-7 w-20 rounded bg-gray-200" />
            </div>
          ))
        ) : isError ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">
            Could not load team members.
          </div>
        ) : members.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">
            No team members yet.
          </div>
        ) : (
          members.map((member) => (
            <MemberRow
              key={member._id}
              member={member}
              isSelf={member._id === me?._id}
              onError={setGlobalError}
            />
          ))
        )}
      </div>

      <p className="text-xs text-gray-400">
        <strong>Owner</strong> — full access &nbsp;·&nbsp;
        <strong>Admin</strong> — all features except billing &nbsp;·&nbsp;
        <strong>Member</strong> — view-only analytics &amp; chat history
      </p>
    </div>
  );
}

// ── Invite form ───────────────────────────────────────────────

function InviteForm({ onSuccess, onError }) {
  const inviteMember = useInviteMember();
  const [sent, setSent] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: { email: '', role: 'employee' },
  });

  const onSubmit = async (values) => {
    try {
      await inviteMember.mutateAsync(values);
      setSent(true);
      setTimeout(() => { setSent(false); reset(); onSuccess(); }, 2000);
    } catch (err) {
      onError(err.message || 'Failed to send invite.');
    }
  };

  return (
    <div className="card p-5">
      <h3 className="mb-4 text-sm font-semibold text-gray-700">Invite a new member</h3>

      {sent ? (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <Check className="h-4 w-4" />
          Invite sent! They&apos;ll receive an email shortly.
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input
              id="invite-email"
              label="Email address"
              type="email"
              placeholder="colleague@company.com"
              error={errors.email?.message}
              {...register('email', {
                required: 'Email is required',
                pattern: { value: /\S+@\S+\.\S+/, message: 'Enter a valid email' },
              })}
            />
          </div>

          <div className="space-y-1 sm:w-36">
            <label htmlFor="invite-role" className="label">Role</label>
            <select
              id="invite-role"
              className="input-base"
              {...register('role')}
            >
              <option value="employee">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <Button
            type="submit"
            size="md"
            isLoading={inviteMember.isPending}
            className="gap-2 sm:mb-0"
          >
            <Mail className="h-4 w-4" />
            Send invite
          </Button>
        </form>
      )}
    </div>
  );
}

// ── Member row ────────────────────────────────────────────────

function MemberRow({ member, isSelf, onError }) {
  const updateRole  = useUpdateMemberRole();
  const removeMember = useRemoveMember();
  const [confirmRemove, setConfirmRemove] = useState(false);

  const roleCfg = ROLE_CONFIG[member.role] ?? ROLE_CONFIG.employee;
  const RoleIcon = roleCfg.icon;
  const isOwner = member.role === 'owner';

  const handleRoleChange = async (e) => {
    try {
      await updateRole.mutateAsync({ userId: member._id, role: e.target.value });
    } catch (err) {
      onError(err.message || 'Could not update role.');
    }
  };

  const handleRemove = async () => {
    if (!confirmRemove) { setConfirmRemove(true); return; }
    try {
      await removeMember.mutateAsync(member._id);
    } catch (err) {
      onError(err.message || 'Could not remove member.');
      setConfirmRemove(false);
    }
  };

  return (
    <div className="flex items-center gap-4 px-5 py-4">
      {/* Avatar */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
        {member.name?.[0]?.toUpperCase() ?? '?'}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-gray-900">{member.name}</p>
          {isSelf && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
              You
            </span>
          )}
          {!member.emailVerified && (
            <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs text-amber-600">
              Unverified
            </span>
          )}
        </div>
        <p className="truncate text-xs text-gray-400">{member.email}</p>
      </div>

      {/* Role — select for others, badge for self/owner */}
      {isSelf || isOwner ? (
        <span
          className={cn(
            'flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
            roleCfg.cls
          )}
        >
          <RoleIcon className="h-3 w-3" />
          {roleCfg.label}
        </span>
      ) : (
        <select
          value={member.role}
          onChange={handleRoleChange}
          disabled={updateRole.isPending}
          className="shrink-0 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-medium text-gray-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        >
          <option value="employee">Member</option>
          <option value="admin">Admin</option>
        </select>
      )}

      {/* Remove */}
      {!isSelf && !isOwner && (
        <div className="flex shrink-0 items-center gap-2">
          {confirmRemove ? (
            <>
              <button
                onClick={() => setConfirmRemove(false)}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Cancel
              </button>
              <Button
                variant="danger"
                size="sm"
                isLoading={removeMember.isPending}
                onClick={handleRemove}
              >
                Remove
              </Button>
            </>
          ) : (
            <button
              onClick={handleRemove}
              className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
              title="Remove member"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
