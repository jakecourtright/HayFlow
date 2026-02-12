'use client';

import { useOrganization } from '@clerk/nextjs';
import { useState } from 'react';
import { Users, Mail, Trash2, Shield } from 'lucide-react';
import CustomSelect from '@/components/CustomSelect';

const ROLE_OPTIONS = [
    { value: 'org:admin', label: 'Admin' },
    { value: 'org:bookkeeper', label: 'Bookkeeper / Dispatcher' },
    { value: 'org:driver', label: 'Driver' },
];

function roleLabel(role: string) {
    const found = ROLE_OPTIONS.find(r => r.value === role);
    return found?.label || role.replace('org:', '');
}

export default function TeamManagement() {
    const { organization, memberships, invitations } = useOrganization({
        memberships: { infinite: true },
        invitations: { infinite: true },
    });

    const [email, setEmail] = useState('');
    const [role, setRole] = useState('org:driver');
    const [inviting, setInviting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [editingMemberId, setEditingMemberId] = useState<string | null>(null);

    if (!organization) return null;

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setInviting(true);
        try {
            await organization.inviteMember({ emailAddress: email, role });
            setSuccess(`Invitation sent to ${email}`);
            setEmail('');
            invitations?.revalidate?.();
        } catch (err: any) {
            setError(err?.errors?.[0]?.message || 'Failed to send invitation');
        } finally {
            setInviting(false);
        }
    };

    const handleUpdateRole = async (userId: string, newRole: string) => {
        setError('');
        try {
            await organization.updateMember({ userId, role: newRole });
            memberships?.revalidate?.();
            setEditingMemberId(null);
            setSuccess('Role updated successfully');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err: any) {
            const msg = err?.errors?.[0]?.message || err?.message || 'Failed to update role';
            if (msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('not_found')) {
                setError('Role not found. Make sure custom roles (admin, bookkeeper, driver) are created in your Clerk Dashboard → Organizations → Roles.');
            } else {
                setError(msg);
            }
        }
    };

    const handleRemoveMember = async (userId: string) => {
        if (!confirm('Remove this member from the organization?')) return;
        try {
            await organization.removeMember(userId);
            memberships?.revalidate?.();
        } catch (err: any) {
            setError(err?.errors?.[0]?.message || 'Failed to remove member');
        }
    };

    const handleRevokeInvitation = async (invitationId: string) => {
        if (!confirm('Revoke this invitation?')) return;
        try {
            const inv = invitations?.data?.find((i: any) => i.id === invitationId);
            if (inv) {
                await inv.revoke();
                invitations?.revalidate?.();
            }
        } catch (err: any) {
            setError(err?.errors?.[0]?.message || 'Failed to revoke invitation');
        }
    };

    return (
        <div className="space-y-5">
            {/* Invite Form */}
            <form onSubmit={handleInvite} className="space-y-3">
                <div>
                    <label className="label-modern">Email Address</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="team@example.com"
                        required
                        className="input-modern"
                    />
                </div>
                <div>
                    <label className="label-modern">Role</label>
                    <CustomSelect
                        name="invite-role"
                        options={ROLE_OPTIONS}
                        value={role}
                        onChange={setRole}
                        placeholder="Select a role..."
                    />
                </div>
                <button
                    type="submit"
                    disabled={inviting}
                    className="btn btn-primary w-full flex items-center justify-center gap-2"
                >
                    <Mail size={16} />
                    {inviting ? 'Sending...' : 'Send Invitation'}
                </button>
            </form>

            {error && (
                <div className="p-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
                    {error}
                </div>
            )}
            {success && (
                <div className="p-3 rounded-xl text-sm" style={{ background: 'rgba(var(--primary-rgb),0.15)', color: 'var(--primary-light)' }}>
                    {success}
                </div>
            )}

            {/* Current Members */}
            <div>
                <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-dim)' }}>
                    <Users size={12} className="inline mr-1" /> Members ({memberships?.data?.length || 0})
                </h3>
                <div className="space-y-2">
                    {memberships?.data?.map((membership: any) => {
                        const userId = membership.publicUserData?.userId;
                        const isEditing = editingMemberId === membership.id;

                        return (
                            <div
                                key={membership.id}
                                className="p-3 rounded-xl"
                                style={{ background: 'var(--bg-surface)' }}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 min-w-0">
                                        {membership.publicUserData?.imageUrl ? (
                                            <img
                                                src={membership.publicUserData.imageUrl}
                                                alt=""
                                                className="w-8 h-8 rounded-full flex-shrink-0"
                                            />
                                        ) : (
                                            <div
                                                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                                                style={{ background: 'var(--primary)', color: 'white' }}
                                            >
                                                {(membership.publicUserData?.firstName?.[0] || '?').toUpperCase()}
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <p className="font-medium text-sm truncate" style={{ color: 'var(--text-main)' }}>
                                                {membership.publicUserData?.firstName} {membership.publicUserData?.lastName}
                                            </p>
                                            <p className="text-xs truncate" style={{ color: 'var(--text-dim)' }}>
                                                {membership.publicUserData?.identifier}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <button
                                            onClick={() => setEditingMemberId(isEditing ? null : membership.id)}
                                            className="text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1 transition-colors hover:brightness-110"
                                            style={{ background: 'var(--bg-deep)', color: 'var(--primary-light)' }}
                                            title="Click to change role"
                                        >
                                            <Shield size={10} />
                                            {roleLabel(membership.role)}
                                        </button>
                                        {membership.role !== 'org:admin' && (
                                            <button
                                                onClick={() => handleRemoveMember(userId)}
                                                className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10"
                                                style={{ color: '#ef4444' }}
                                                title="Remove member"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Role Editor */}
                                {isEditing && (
                                    <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--glass-border)' }}>
                                        <label className="label-modern">Change Role</label>
                                        <CustomSelect
                                            name={`role-${membership.id}`}
                                            options={ROLE_OPTIONS}
                                            value={membership.role}
                                            onChange={(newRole) => handleUpdateRole(userId, newRole)}
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Pending Invitations */}
            {invitations?.data && invitations.data.length > 0 && (
                <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-dim)' }}>
                        <Mail size={12} className="inline mr-1" /> Pending Invitations
                    </h3>
                    <div className="space-y-2">
                        {invitations.data.map((invitation: any) => (
                            <div
                                key={invitation.id}
                                className="flex items-center justify-between p-3 rounded-xl"
                                style={{ background: 'var(--bg-surface)' }}
                            >
                                <div className="min-w-0">
                                    <p className="font-medium text-sm truncate" style={{ color: 'var(--text-main)' }}>
                                        {invitation.emailAddress}
                                    </p>
                                    <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                                        {roleLabel(invitation.role)} • Invited {new Date(invitation.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleRevokeInvitation(invitation.id)}
                                    className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10 flex-shrink-0"
                                    style={{ color: '#ef4444' }}
                                    title="Revoke invitation"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
