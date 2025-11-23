'use client';

import { useState, useEffect } from 'react';
import { User, WorkoutPlan } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import PlanCreator from './PlanCreator';

export default function TrainerDashboard({ user }: { user: User }) {
    const [trainees, setTrainees] = useState<User[]>([]);
    const [selectedTrainee, setSelectedTrainee] = useState<User | null>(null);
    const [plans, setPlans] = useState<WorkoutPlan[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [editingPlan, setEditingPlan] = useState<WorkoutPlan | undefined>(undefined);
    const [isAddingClient, setIsAddingClient] = useState(false);
    const [newClientUsername, setNewClientUsername] = useState('');
    const [addClientError, setAddClientError] = useState('');
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

    useEffect(() => {
        fetchTrainees();
    }, []);

    const fetchTrainees = () => {
        fetch(`/api/users/trainees?trainerId=${user.id}`)
            .then(res => res.json())
            .then(data => setTrainees(data.trainees || []));
    };

    const searchTrainees = async (query: string) => {
        if (query.length === 0) {
            setSearchResults([]);
            setShowDropdown(false);
            return;
        }

        try {
            const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}&role=trainee`);
            const data = await res.json();
            setSearchResults(data.users || []);
            setShowDropdown(data.users?.length > 0);
        } catch (err) {
            console.error('Search error:', err);
            setSearchResults([]);
            setShowDropdown(false);
        }
    };

    const handleAddClient = async (username: string) => {
        setAddClientError('');
        try {
            const res = await fetch('/api/users/link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ trainerId: user.id, traineeUsername: username })
            });
            const data = await res.json();
            if (res.ok) {
                setIsAddingClient(false);
                setNewClientUsername('');
                setSearchResults([]);
                setShowDropdown(false);
                fetchTrainees();
            } else {
                setAddClientError(data.error || 'Failed to add client');
            }
        } catch (err) {
            setAddClientError('An error occurred');
        }
    };

    useEffect(() => {
        if (selectedTrainee) {
            const fetchPlans = async () => {
                try {
                    // Wait for auth state to be ready and retry if session is not available
                    let session = null;
                    let retryCount = 0;
                    const maxRetries = 5;
                    
                    while (!session && retryCount < maxRetries) {
                        const { data: { session: currentSession } } = await supabase.auth.getSession();
                        if (currentSession) {
                            session = currentSession;
                            break;
                        }
                        
                        // Wait briefly before retrying
                        await new Promise(resolve => setTimeout(resolve, 200));
                        retryCount++;
                    }
                    
                    if (!session) {
                        console.error('No valid session found after retries');
                        return;
                    }
                    
                    const headers: any = { 'Content-Type': 'application/json' };
                    if (session?.access_token) {
                        headers.Authorization = `Bearer ${session.access_token}`;
                    }

                    console.log(`Fetching plans for trainee:`, {
                        id: selectedTrainee.id,
                        username: selectedTrainee.username,
                        email: selectedTrainee.email
                    });

                    const res = await fetch(`/api/plans?traineeId=${selectedTrainee.id}`, {
                        headers
                    });
                    
                    if (res.ok) {
                        const data = await res.json();
                        setPlans(data.plans || []);
                        console.log(`Loaded ${data.plans?.length || 0} plans for trainee:`, selectedTrainee.username);
                        
                        if (data.plans?.length > 0) {
                            console.log('Plans found by trainer:', data.plans.map(p => ({
                                id: p.id,
                                name: p.name,
                                trainee_id: p.trainee_id,
                                trainer_id: p.trainer_id
                            })));
                        }
                    } else {
                        console.error('Failed to fetch plans:', res.status);
                        setPlans([]);
                    }
                } catch (error) {
                    console.error('Error fetching plans:', error);
                    setPlans([]);
                }
            };

            fetchPlans();
        }
    }, [selectedTrainee, isCreating, editingPlan]);

    const sortedPlans = [...plans].sort((a, b) => {
        const dateA = new Date(a.created_at || '').getTime();
        const dateB = new Date(b.created_at || '').getTime();
        return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem' }}>
            {/* Sidebar: Client List */}
            <div className="glass-panel" style={{ padding: '1.5rem', height: 'fit-content' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
                    <h3 style={{ margin: 0 }}>Clients</h3>
                    <button
                        onClick={() => setIsAddingClient(true)}
                        style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '1.2rem' }}
                        title="Add Client"
                    >
                        +
                    </button>
                </div>

                {isAddingClient && (
                    <div style={{ marginBottom: '1rem', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', position: 'relative' }}>
                        <input
                            type="text"
                            placeholder="Search trainee by username..."
                            value={newClientUsername}
                            onChange={e => {
                                setNewClientUsername(e.target.value);
                                searchTrainees(e.target.value);
                            }}
                            style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', borderRadius: '4px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
                        />
                        
                        {/* Dropdown with search results */}
                        {showDropdown && searchResults.length > 0 && (
                            <div style={{ 
                                position: 'absolute', 
                                top: '100%', 
                                left: '0.5rem', 
                                right: '0.5rem', 
                                background: 'rgba(0,0,0,0.9)', 
                                border: '1px solid var(--glass-border)', 
                                borderRadius: '4px', 
                                zIndex: 1000,
                                maxHeight: '200px',
                                overflowY: 'auto'
                            }}>
                                {searchResults.map(trainee => (
                                    <div
                                        key={trainee.id}
                                        onClick={() => {
                                            setNewClientUsername(trainee.username);
                                            handleAddClient(trainee.username);
                                        }}
                                        style={{
                                            padding: '0.75rem',
                                            cursor: 'pointer',
                                            borderBottom: '1px solid var(--glass-border)'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <div style={{ fontWeight: 'bold' }}>{trainee.username}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#888' }}>{trainee.email}</div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {addClientError && <p style={{ color: 'red', fontSize: '0.75rem', marginBottom: '0.5rem' }}>{addClientError}</p>}
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button 
                                onClick={() => handleAddClient(newClientUsername)} 
                                style={{ flex: 1, padding: '0.25rem', background: 'var(--primary)', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer' }}
                                disabled={!newClientUsername}
                            >
                                Add
                            </button>
                            <button onClick={() => { 
                                setIsAddingClient(false); 
                                setAddClientError(''); 
                                setNewClientUsername(''); 
                                setSearchResults([]);
                                setShowDropdown(false);
                            }} style={{ flex: 1, padding: '0.25rem', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: '4px', color: '#ccc', cursor: 'pointer' }}>Cancel</button>
                        </div>
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {trainees.map(trainee => (
                        <button
                            key={trainee.id}
                            onClick={() => {
                                setSelectedTrainee(trainee);
                                setIsCreating(false);
                            }}
                            style={{
                                textAlign: 'left',
                                padding: '0.75rem',
                                background: selectedTrainee?.id === trainee.id ? 'var(--primary)' : 'transparent',
                                border: 'none',
                                borderRadius: '8px',
                                color: selectedTrainee?.id === trainee.id ? 'white' : 'var(--foreground)',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            {trainee.username}
                        </button>
                    ))}
                    {trainees.length === 0 && <p style={{ color: '#888', fontSize: '0.875rem' }}>No clients found.</p>}
                </div>
            </div>

            {/* Main Content */}
            <div>
                {!selectedTrainee ? (
                    <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: '#888' }}>
                        Select a client to view or create plans.
                    </div>
                ) : isCreating || editingPlan ? (
                    <PlanCreator
                        traineeId={selectedTrainee.id}
                        trainerId={user.id}
                        onSave={() => { setIsCreating(false); setEditingPlan(undefined); }}
                        onCancel={() => { setIsCreating(false); setEditingPlan(undefined); }}
                        plan={editingPlan}
                    />
                ) : (
                    <div className="glass-panel" style={{ padding: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <h2>Plans for {selectedTrainee.username}</h2>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <select
                                    value={sortOrder}
                                    onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
                                    style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--glass-border)' }}
                                >
                                    <option value="newest">Newest First</option>
                                    <option value="oldest">Oldest First</option>
                                </select>
                                <button className="btn-primary" onClick={() => { setEditingPlan(undefined); setIsCreating(true); }}>
                                    + Create New Plan
                                </button>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {sortedPlans.map(plan => (
                                <div key={plan.id} style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                        <div>
                                            <h3 style={{ marginBottom: '0.25rem' }}>{plan.name}</h3>
                                            <p style={{ color: '#888', fontSize: '0.875rem' }}>Created: {new Date(plan.created_at || '').toLocaleDateString()}</p>
                                        </div>
                                        <button
                                            onClick={() => setEditingPlan(plan)}
                                            style={{ background: 'transparent', border: '1px solid var(--glass-border)', padding: '0.25rem 0.75rem', borderRadius: '4px', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.875rem' }}
                                        >
                                            Edit
                                        </button>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        {plan.exercises.map((ex, i) => (
                                            <span key={i} style={{ background: 'var(--secondary)', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.875rem', border: '1px solid var(--glass-border)' }}>
                                                {ex.name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            {plans.length === 0 && <p style={{ color: '#888' }}>No plans assigned yet.</p>}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
