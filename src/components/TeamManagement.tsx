'use client';

import { useOrganization } from '@clerk/nextjs';
import { useState } from 'react';
import { Users, Mail, Trash2, Shield } from 'lucide-react';

export default function TeamManagement() {
    const { organization, memberships, invitations } = useOrganization({
        memberships: { infinite: true },
        invitations: { infinite: true },
    });

    const [email, setEmail] = useState('');
    const [role, setRole] = useState('org:member');
    const [inviting, setInviting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

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

    const roleLabel = (role: string) => {
        if (role === 'org:admin') return 'Admin';
        if (role === 'org:bookkeeper') return 'Bookkeeper';
        if (role === 'org:driver') return 'Driver';
        if (role === 'org:member') return 'Member';
        return role.replace('org:', '');
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
                    <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="input-modern"
                    >
                        <option value="org:admin">Admin</option>
                        <option value="org:bookkeeper">Bookkeeper / Dispatcher</option>
                        <option value="org:driver">Driver</option>
                        <option value="org:member">Member</option>
                    </select>
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
                    {memberships?.data?.map((membership: any) => (
                        <div
                            key={membership.id}
                            className="flex items-center justify-between p-3 rounded-xl"
                            style={{ background: 'var(--bg-surface)' }}
                        >
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
                                <span
                                    className="text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1"
                                    style={{ background: 'var(--bg-deep)', color: 'var(--primary-light)' }}
                                >
                                    <Shield size={10} />
                                    {roleLabel(membership.role)}
                                </span>
                                {membership.role !== 'org:admin' && (
                                    <button
                                        onClick={() => handleRemoveMember(membership.publicUserData.userId)}
                                        className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10"
                                        style={{ color: '#ef4444' }}
                                        title="Remove member"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
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
