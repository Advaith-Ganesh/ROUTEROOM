import { useState, type FormEvent } from 'react';
import { useMembers, useInviteMember, useRemoveMember, useUpdateMemberRole } from '../../hooks/useMembers';
import { ApiError } from '../../api/client';
import type { TripRole } from '../../api/types';

export function MembersPanel({ tripId, role }: { tripId: string; role: TripRole }) {
  const { data: members, isLoading } = useMembers(tripId);
  const invite = useInviteMember(tripId);
  const updateRole = useUpdateMemberRole(tripId);
  const removeMember = useRemoveMember(tripId);
  const isOwner = role === 'OWNER';

  const [email, setEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'EDITOR' | 'VIEWER'>('EDITOR');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await invite.mutateAsync({ email, role: inviteRole });
      setEmail('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not invite this person.');
    }
  }

  return (
    <div className="rounded-xl border border-ink-100 bg-white p-5">
      <h3 className="font-semibold text-ink-900">Collaborators</h3>

      {isOwner && (
        <form onSubmit={handleSubmit} className="mt-3 flex flex-wrap gap-2">
          <input
            type="email"
            required
            placeholder="Email of a registered RouteRoom user"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="min-w-0 flex-1 rounded-md border border-ink-100 px-2 py-1.5 text-sm"
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as 'EDITOR' | 'VIEWER')}
            className="rounded-md border border-ink-100 px-2 py-1.5 text-sm"
          >
            <option value="EDITOR">Editor</option>
            <option value="VIEWER">Viewer</option>
          </select>
          <button
            type="submit"
            disabled={invite.isPending}
            className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-60"
          >
            Invite
          </button>
        </form>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {isLoading && <p className="mt-3 text-sm text-ink-500">Loading members...</p>}
      <ul className="mt-4 space-y-2">
        {members?.map((member) => (
          <li
            key={member.id}
            className="flex items-center justify-between rounded-md border border-ink-100 px-3 py-2 text-sm"
          >
            <div>
              <p className="font-medium text-ink-900">{member.user.name}</p>
              <p className="text-xs text-ink-500">{member.user.email}</p>
            </div>
            {isOwner && member.role !== 'OWNER' ? (
              <div className="flex items-center gap-2">
                <select
                  value={member.role}
                  onChange={(e) =>
                    updateRole.mutate({ memberId: member.id, role: e.target.value as 'EDITOR' | 'VIEWER' })
                  }
                  className="rounded-md border border-ink-100 px-2 py-1 text-xs"
                >
                  <option value="EDITOR">Editor</option>
                  <option value="VIEWER">Viewer</option>
                </select>
                <button
                  onClick={() => removeMember.mutate(member.id)}
                  className="text-xs text-ink-500 hover:text-red-600"
                >
                  Remove
                </button>
              </div>
            ) : (
              <span className="rounded-full bg-ink-100 px-2 py-0.5 text-xs text-ink-700">{member.role}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
