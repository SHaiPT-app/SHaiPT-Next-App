'use client';

import { useState, useEffect } from 'react';
import { Profile } from '@/lib/types';
import { db } from '@/lib/supabaseDb';
import { supabase } from '@/lib/supabase';

interface ProfileModalProps {
    user: Profile;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: (updatedUser: Profile) => void;
}

export default function ProfileModal({ user, isOpen, onClose, onUpdate }: ProfileModalProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Form State
    const [formData, setFormData] = useState({
        username: user.username,
        display_name: user.display_name || '',
        height: user.height || '',
        weight: user.weight || '',
        experience: user.experience || '',
        dob: user.dob || '',
        trainer_id: user.trainer_id || ''
    });

    // Password State
    const [showPasswordChange, setShowPasswordChange] = useState(false);
    const [passwordData, setPasswordData] = useState({
        newPassword: '',
        confirmPassword: ''
    });

    // Trainers List (for Trainees)
    const [availableTrainers, setAvailableTrainers] = useState<Profile[]>([]);

    // Trainees List (for Trainers)
    const [myTrainees, setMyTrainees] = useState<Profile[]>([]);
    const [availableTrainees, setAvailableTrainees] = useState<Profile[]>([]);
    const [selectedTraineeId, setSelectedTraineeId] = useState('');

    useEffect(() => {
        if (isOpen) {
            // Reset state on open
            setFormData({
                username: user.username,
                display_name: user.display_name || '',
                height: user.height || '',
                weight: user.weight || '',
                experience: user.experience || '',
                dob: user.dob || '',
                trainer_id: user.trainer_id || ''
            });
            setIsEditing(false);
            setShowPasswordChange(false);
            setError('');
            setSuccess('');

            // Fetch data based on role
            if (user.role === 'trainee') {
                fetchTrainers();
            } else if (user.role === 'trainer') {
                fetchTraineeLists();
            }
        }
    }, [isOpen, user]);

    const fetchTrainers = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('role', 'trainer');

            if (error) throw error;
            setAvailableTrainers(data || []);
        } catch (err) {
            console.error('Error fetching trainers:', err);
        }
    };

    const fetchTraineeLists = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            // Fetch My Trainees
            const myRes = await fetch(`/api/users/trainees?trainerId=${user.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const myData = await myRes.json();
            setMyTrainees(Array.isArray(myData) ? myData : []);

            // Fetch Available Trainees
            const availRes = await fetch(`/api/users/trainees?status=available`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const availData = await availRes.json();
            setAvailableTrainees(Array.isArray(availData) ? availData : []);

        } catch (err) {
            console.error('Error fetching trainees:', err);
        }
    };

    const handleLinkTrainee = async (traineeId: string, action: 'link' | 'unlink') => {
        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();

            const res = await fetch('/api/users/link', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    trainerId: user.id,
                    traineeId: traineeId,
                    action
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to update connection');
            }

            // Refresh lists
            await fetchTraineeLists();
            setSuccess(action === 'link' ? 'Trainee added!' : 'Trainee removed!');
            setSelectedTraineeId('');

            setTimeout(() => setSuccess(''), 3000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            // 1. Update Profile Data
            const updates: Partial<Profile> = {
                username: formData.username,
                display_name: formData.display_name,
                height: formData.height ? Number(formData.height) : undefined,
                weight: formData.weight ? Number(formData.weight) : undefined,
                experience: formData.experience,
                dob: formData.dob,
                trainer_id: user.role === 'trainee' ? formData.trainer_id : undefined
            };

            const updatedProfile = await db.profiles.update(user.id, updates);

            // 2. Update Password if requested
            if (showPasswordChange && passwordData.newPassword) {
                if (passwordData.newPassword.length < 8) {
                    throw new Error('Password must be at least 8 characters');
                }
                if (passwordData.newPassword !== passwordData.confirmPassword) {
                    throw new Error('Passwords do not match');
                }

                const { error: pwError } = await supabase.auth.updateUser({
                    password: passwordData.newPassword
                });

                if (pwError) throw pwError;
            }

            onUpdate(updatedProfile);
            setSuccess('Profile updated successfully!');
            setIsEditing(false);
            setShowPasswordChange(false);
            setPasswordData({ newPassword: '', confirmPassword: '' });

            // Close after short delay
            setTimeout(() => {
                setSuccess('');
            }, 3000);

        } catch (err: any) {
            console.error('Update error:', err);
            setError(err.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(5px)'
        }}>
            <div className="glass-panel" style={{
                width: '90%',
                maxWidth: '600px',
                maxHeight: '90vh',
                overflowY: 'auto',
                padding: '2rem',
                position: 'relative'
            }}>
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '1rem',
                        right: '1rem',
                        background: 'none',
                        border: 'none',
                        color: '#888',
                        fontSize: '1.5rem',
                        cursor: 'pointer'
                    }}
                >
                    ×
                </button>

                <h2 style={{ marginBottom: '2rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
                    {isEditing ? 'Edit Profile' : 'My Profile'}
                </h2>

                {error && (
                    <div style={{ background: 'rgba(255,0,0,0.1)', color: 'var(--error)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                        {error}
                    </div>
                )}

                {success && (
                    <div style={{ background: 'rgba(0,255,0,0.1)', color: 'var(--success)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                        {success}
                    </div>
                )}

                <div style={{ display: 'grid', gap: '1.5rem' }}>
                    {/* Basic Info */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>Username</label>
                            {isEditing ? (
                                <input
                                    className="input-field"
                                    value={formData.username}
                                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                                />
                            ) : (
                                <div style={{ fontSize: '1.1rem' }}>{user.username}</div>
                            )}
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>Role</label>
                            <div style={{ fontSize: '1.1rem', textTransform: 'capitalize' }}>{user.role}</div>
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>Display Name</label>
                        {isEditing ? (
                            <input
                                className="input-field"
                                value={formData.display_name}
                                onChange={e => setFormData({ ...formData, display_name: e.target.value })}
                                placeholder="What should we call you?"
                            />
                        ) : (
                            <div style={{ fontSize: '1.1rem' }}>{user.display_name || user.username}</div>
                        )}
                    </div>

                    {/* Demographics */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>Height</label>
                            {isEditing ? (
                                <input
                                    className="input-field"
                                    value={formData.height}
                                    onChange={e => setFormData({ ...formData, height: e.target.value })}
                                    placeholder="e.g. 180cm"
                                />
                            ) : (
                                <div>{user.height || '-'}</div>
                            )}
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>Weight</label>
                            {isEditing ? (
                                <input
                                    className="input-field"
                                    value={formData.weight}
                                    onChange={e => setFormData({ ...formData, weight: e.target.value })}
                                    placeholder="e.g. 80kg"
                                />
                            ) : (
                                <div>{user.weight || '-'}</div>
                            )}
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>Experience</label>
                            {isEditing ? (
                                <input
                                    className="input-field"
                                    value={formData.experience}
                                    onChange={e => setFormData({ ...formData, experience: e.target.value })}
                                    placeholder="e.g. 2 years"
                                />
                            ) : (
                                <div>{user.experience || '-'}</div>
                            )}
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>Date of Birth</label>
                            {isEditing ? (
                                <input
                                    type="date"
                                    className="input-field"
                                    value={formData.dob}
                                    onChange={e => setFormData({ ...formData, dob: e.target.value })}
                                />
                            ) : (
                                <div>{user.dob || '-'}</div>
                            )}
                        </div>
                    </div>

                    {/* Trainer Selection (Only for Trainees) */}
                    {user.role === 'trainee' && (
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>My Trainer</label>
                            {isEditing ? (
                                <select
                                    className="input-field"
                                    value={formData.trainer_id}
                                    onChange={e => setFormData({ ...formData, trainer_id: e.target.value })}
                                    style={{ width: '100%' }}
                                >
                                    <option value="">Select a Trainer</option>
                                    {availableTrainers.map(t => (
                                        <option key={t.id} value={t.id}>
                                            {t.display_name || t.username}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <div>
                                    {availableTrainers.find(t => t.id === user.trainer_id)?.display_name ||
                                        availableTrainers.find(t => t.id === user.trainer_id)?.username ||
                                        (user.trainer_id ? 'Unknown Trainer' : 'No trainer selected')}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Trainee Management (Only for Trainers) */}
                    {user.role === 'trainer' && (
                        <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
                            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Manage Trainees</h3>

                            {/* List My Trainees */}
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>My Trainees</label>
                                {myTrainees.length === 0 ? (
                                    <div style={{ color: '#666', fontStyle: 'italic' }}>No trainees assigned yet.</div>
                                ) : (
                                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                                        {myTrainees.map(t => (
                                            <div key={t.id} style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                background: 'rgba(255,255,255,0.05)',
                                                padding: '0.5rem 1rem',
                                                borderRadius: '6px'
                                            }}>
                                                <span>{t.display_name || t.username}</span>
                                                <button
                                                    onClick={() => handleLinkTrainee(t.id, 'unlink')}
                                                    disabled={loading}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        color: 'var(--error)',
                                                        cursor: 'pointer',
                                                        fontSize: '0.9rem'
                                                    }}
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Add Trainee */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>Add Trainee</label>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <select
                                        className="input-field"
                                        value={selectedTraineeId}
                                        onChange={e => setSelectedTraineeId(e.target.value)}
                                        style={{ flex: 1 }}
                                    >
                                        <option value="">Select available trainee...</option>
                                        {availableTrainees.map(t => (
                                            <option key={t.id} value={t.id}>
                                                {t.display_name || t.username}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={() => handleLinkTrainee(selectedTraineeId, 'link')}
                                        disabled={!selectedTraineeId || loading}
                                        className="btn-primary"
                                        style={{ padding: '0.5rem 1rem' }}
                                    >
                                        Add
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Password Change Section */}
                    {isEditing && (
                        <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
                            <button
                                type="button"
                                onClick={() => setShowPasswordChange(!showPasswordChange)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--primary)',
                                    cursor: 'pointer',
                                    padding: 0,
                                    marginBottom: '1rem'
                                }}
                            >
                                {showPasswordChange ? '- Cancel Password Change' : '+ Change Password'}
                            </button>

                            {showPasswordChange && (
                                <div style={{ display: 'grid', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px' }}>
                                    <input
                                        type="password"
                                        className="input-field"
                                        placeholder="New Password"
                                        value={passwordData.newPassword}
                                        onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                    />
                                    <input
                                        type="password"
                                        className="input-field"
                                        placeholder="Confirm New Password"
                                        value={passwordData.confirmPassword}
                                        onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        {isEditing ? (
                            <>
                                <button
                                    onClick={handleSave}
                                    className="btn-primary"
                                    disabled={loading}
                                    style={{ flex: 1 }}
                                >
                                    {loading ? 'Saving...' : 'Save Changes'}
                                </button>
                                <button
                                    onClick={() => setIsEditing(false)}
                                    style={{
                                        flex: 1,
                                        padding: '0.75rem',
                                        background: 'transparent',
                                        border: '1px solid var(--glass-border)',
                                        color: 'var(--foreground)',
                                        borderRadius: '8px',
                                        cursor: 'pointer'
                                    }}
                                    disabled={loading}
                                >
                                    Cancel
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="btn-primary"
                                style={{ width: '100%' }}
                            >
                                Edit Profile
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
