'use client';

import { useState, useEffect } from 'react';
import { User, WorkoutPlan, AIFeatures, TrainingPlan } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { apiFetch, errorMessage } from '@/lib/apiClient';
import PlanCreator from './PlanCreator';
import PlanViewer from './PlanViewer';

export default function TrainerDashboard({ user }: { user: User }) {
    const [trainees, setTrainees] = useState<User[]>([]);
    const [selectedTrainee, setSelectedTrainee] = useState<User | null>(null);
    const [showAddClient, setShowAddClient] = useState(false);
    const [addClientUsername, setAddClientUsername] = useState('');
    const [addClientError, setAddClientError] = useState('');
    const [plans, setPlans] = useState<WorkoutPlan[]>([]);
    const [isCreating, setCreatingPlan] = useState(false);
    const [editingPlan, setEditingPlan] = useState<WorkoutPlan | null>(null);

    // AI Toolkit State
    const [showAIToolkit, setShowAIToolkit] = useState(false);
    const [updatingFeatures, setUpdatingFeatures] = useState(false);
    const [selectedTraineeFeatures, setSelectedTraineeFeatures] = useState<AIFeatures>({
        workout_planner: false,
        dietitian: false,
        form_checker: false
    });
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

    // Assign Plan State
    const [showAssignPlan, setShowAssignPlan] = useState(false);
    const [trainerPlans, setTrainerPlans] = useState<TrainingPlan[]>([]);
    const [selectedPlanId, setSelectedPlanId] = useState('');
    const [assignStartDate, setAssignStartDate] = useState('');
    const [assignEndDate, setAssignEndDate] = useState('');
    const [assigningPlan, setAssigningPlan] = useState(false);
    const [assignError, setAssignError] = useState('');

    useEffect(() => {
        fetchTrainees();
    }, []);

    const fetchTrainees = async () => {
        try {
            // `trainerId` only selects the "my trainees" branch; the server uses the token holder
            const data = await apiFetch<{ trainees?: User[] }>(`/api/users/trainees?trainerId=${user.id}`);
            setTrainees(data.trainees || []);
        } catch (error) {
            console.error('Error fetching trainees:', error);
        }
    };

    const searchTrainees = async (query: string) => {
        if (query.length === 0) {
            setSearchResults([]);
            setShowDropdown(false);
            return;
        }

        try {
            const data = await apiFetch<{ users?: User[] }>(`/api/users/search?q=${encodeURIComponent(query)}&role=trainee`);
            setSearchResults(data.users || []);
            setShowDropdown((data.users?.length ?? 0) > 0);
        } catch (err) {
            console.error('Search error:', err);
            setSearchResults([]);
            setShowDropdown(false);
        }
    };

    const handleAddClient = async (username: string) => {
        setAddClientError('');
        try {
            // trainerId names the trainer of the link (the route checks it is the caller)
            await apiFetch('/api/users/link', {
                method: 'POST',
                body: {
                    trainerId: user.id,
                    traineeUsername: username,
                    action: 'link'
                }
            });
            setShowAddClient(false);
            setAddClientUsername('');
            setSearchResults([]);
            setShowDropdown(false);
            fetchTrainees();
        } catch (err) {
            setAddClientError(errorMessage(err, 'Failed to add client'));
        }
    };

    useEffect(() => {
        if (selectedTrainee) {
            const fetchPlans = async () => {
                try {
                    console.log(`Fetching plans for trainee: `, {
                        id: selectedTrainee.id,
                        username: selectedTrainee.username,
                        email: selectedTrainee.email
                    });

                    const data = await apiFetch<{ plans?: WorkoutPlan[] }>(`/api/plans?traineeId=${selectedTrainee.id}`);
                    setPlans(data.plans || []);
                    console.log(`Loaded ${data.plans?.length || 0} plans for trainee: `, selectedTrainee.username);

                    if (data.plans && data.plans.length > 0) {
                        console.log('Plans found by trainer:', data.plans.map((p: WorkoutPlan) => ({
                            id: p.id,
                            name: p.name,
                            trainee_id: p.trainee_id,
                            trainer_id: p.trainer_id
                        })));
                    }
                } catch (error) {
                    console.error('Error fetching plans:', error);
                    setPlans([]);
                }
            };

            fetchPlans();
        }
    }, [selectedTrainee, isCreating, editingPlan]);

    const openAIToolkit = (trainee: User) => {
        setSelectedTrainee(trainee); // Ensure selectedTrainee is set if not already
        setSelectedTraineeFeatures(trainee.ai_features || {
            workout_planner: false,
            dietitian: false,
            form_checker: false
        });
        setShowAIToolkit(true);
    };

    const toggleFeature = (feature: keyof AIFeatures) => {
        setSelectedTraineeFeatures(prev => ({
            ...prev,
            [feature]: !prev[feature]
        }));
    };

    const saveFeatures = async () => {
        if (!selectedTrainee) return;
        setUpdatingFeatures(true);
        try {
            await apiFetch('/api/users/features', {
                method: 'POST',
                body: {
                    traineeId: selectedTrainee.id,
                    features: selectedTraineeFeatures
                }
            });

            // Update local state
            const updatedTrainees = trainees.map(t =>
                t.id === selectedTrainee.id
                    ? { ...t, ai_features: selectedTraineeFeatures }
                    : t
            );
            setTrainees(updatedTrainees); // Update the trainees list
            setSelectedTrainee(prev => prev ? { ...prev, ai_features: selectedTraineeFeatures } : null); // Update selected trainee
            alert('AI Features updated successfully!');
            setShowAIToolkit(false);
        } catch (error) {
            console.error(error);
            alert(`Failed to update features: ${errorMessage(error, 'Error updating features')}`);
        } finally {
            setUpdatingFeatures(false);
        }
    };

    const openAssignPlan = async () => {
        setAssignError('');
        setSelectedPlanId('');
        const today = new Date().toISOString().split('T')[0];
        setAssignStartDate(today);
        setAssignEndDate('');
        setShowAssignPlan(true);

        try {
            const { data, error } = await supabase
                .from('training_plans')
                .select('*')
                .eq('creator_id', user.id)
                .order('updated_at', { ascending: false });

            if (error) throw error;
            setTrainerPlans(data || []);
        } catch (err) {
            console.error('Error fetching trainer plans:', err);
            setTrainerPlans([]);
        }
    };

    const handleAssignPlan = async () => {
        if (!selectedTrainee || !selectedPlanId || !assignStartDate || !assignEndDate) {
            setAssignError('Please fill in all fields');
            return;
        }

        setAssigningPlan(true);
        setAssignError('');

        try {
            // user_id is the trainee; the assigning trainer is the token holder
            await apiFetch('/api/plan-assignments', {
                method: 'POST',
                body: {
                    plan_id: selectedPlanId,
                    user_id: selectedTrainee.id,
                    start_date: assignStartDate,
                    end_date: assignEndDate,
                },
            });
            setShowAssignPlan(false);
        } catch (err) {
            console.error('Error assigning plan:', err);
            setAssignError(errorMessage(err, 'An error occurred while assigning the plan'));
        } finally {
            setAssigningPlan(false);
        }
    };

    const sortedPlans = [...plans].sort((a, b) => {
        const dateA = new Date(a.created_at || '').getTime();
        const dateB = new Date(b.created_at || '').getTime();
        return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return (
        <div className="grid grid-cols-1 gap-8 md:grid-cols-[300px_1fr]">
            {/* Sidebar: Client List */}
            <div className="glass-card h-fit p-6">
                <div className="mb-4 flex items-center justify-between border-b border-line-soft pb-3">
                    <h3 className="display m-0 text-lg">Clients</h3>
                    <button
                        onClick={() => setShowAddClient(true)}
                        className="icon-btn !h-8 !w-8 !text-lg"
                        title="Add Client"
                    >
                        +
                    </button>
                </div>

                {showAddClient && (
                    <div className="relative mb-4 rounded-xl border border-line-soft bg-[var(--surface-2)] p-3">
                        <input
                            type="text"
                            placeholder="Search trainee by username..."
                            value={addClientUsername}
                            onChange={e => {
                                setAddClientUsername(e.target.value);
                                searchTrainees(e.target.value);
                            }}
                            className="mb-2 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface-2)] px-4 py-3 text-sm text-ink-hi placeholder:text-ink-low outline-none focus:border-brand/60 focus:shadow-[0_0_0_3px_var(--brand-glow-soft)]"
                        />

                        {/* Dropdown with search results */}
                        {showDropdown && searchResults.length > 0 && (
                            <div className="absolute left-3 right-3 top-full z-[1000] max-h-[200px] overflow-y-auto rounded-xl border border-[var(--line-strong)] bg-[var(--surface-0)] shadow-[0_16px_48px_rgba(0,0,0,0.45)]">
                                {searchResults.map(trainee => (
                                    <div
                                        key={trainee.id}
                                        onClick={() => {
                                            setAddClientUsername(trainee.username || '');
                                            handleAddClient(trainee.username || '');
                                        }}
                                        className="cursor-pointer border-b border-line-soft p-3 transition-colors last:border-b-0 hover:bg-[var(--brand-glow-soft)]"
                                    >
                                        <div className="text-sm font-semibold text-ink-hi">{trainee.username}</div>
                                        <div className="text-xs text-ink-low">{trainee.email}</div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {addClientError && <p className="mb-2 text-xs text-destructive">{addClientError}</p>}
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleAddClient(addClientUsername)}
                                className="btn-brand flex-1 !px-3 !py-1.5 !text-[0.8rem]"
                                disabled={!addClientUsername}
                            >
                                Add
                            </button>
                            <button onClick={() => {
                                setShowAddClient(false);
                                setAddClientError('');
                                setAddClientUsername('');
                                setSearchResults([]);
                                setShowDropdown(false);
                            }} className="btn-outline flex-1 !px-3 !py-1.5 !text-[0.8rem]">Cancel</button>
                        </div>
                    </div>
                )}

                <div className="flex flex-col gap-2">
                    {trainees.map(trainee => (
                        <button
                            key={trainee.id}
                            onClick={() => {
                                setSelectedTrainee(trainee);
                                setCreatingPlan(false);
                            }}
                            className={`w-full cursor-pointer rounded-lg px-3 py-2.5 text-left text-sm transition-all ${
                                selectedTrainee?.id === trainee.id
                                    ? 'bg-brand font-semibold text-ink-hi shadow-[0_0_16px_var(--brand-glow-soft)]'
                                    : 'bg-transparent font-normal text-ink-mid hover:bg-[var(--surface-2)] hover:text-ink-hi'
                            }`}
                        >
                            {trainee.username}
                        </button>
                    ))}
                    {trainees.length === 0 && <p className="text-sm text-ink-low">No clients found.</p>}
                </div>
            </div>

            {/* Main Content */}
            <div>
                {!selectedTrainee ? (
                    <div className="glass-card p-12 text-center text-ink-mid">
                        Select a client to view or create plans.
                    </div>
                ) : isCreating || editingPlan ? (
                    <PlanCreator
                        traineeId={selectedTrainee.id}
                        trainerId={user.id}
                        onSave={() => { setCreatingPlan(false); setEditingPlan(null); }}
                        onCancel={() => { setCreatingPlan(false); setEditingPlan(null); }}
                        plan={editingPlan || undefined}
                    />
                ) : (
                    <div className="glass-card p-8">
                        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
                            <h2 className="display m-0 text-xl">Plans for {selectedTrainee.username}</h2>
                            <div className="flex flex-wrap items-center gap-3">
                                <select
                                    value={sortOrder}
                                    onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
                                    className="cursor-pointer rounded-xl border border-[var(--line-strong)] bg-[var(--surface-2)] px-3 py-2 text-sm text-ink-hi outline-none focus:border-brand/60 focus:shadow-[0_0_0_3px_var(--brand-glow-soft)]"
                                >
                                    <option value="newest">Newest First</option>
                                    <option value="oldest">Oldest First</option>
                                </select>
                                <button className="btn-brand !px-4 !py-2 !text-[0.8rem]" onClick={() => { setEditingPlan(null); setCreatingPlan(true); }}>
                                    + Create New Plan
                                </button>
                                <button
                                    className="btn-soft !px-4 !py-2 !text-[0.8rem]"
                                    onClick={openAssignPlan}
                                >
                                    Assign Plan
                                </button>
                                <button
                                    className="btn-outline !px-4 !py-2 !text-[0.8rem]"
                                    onClick={() => openAIToolkit(selectedTrainee)}
                                >
                                    AI Toolkit
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-col gap-4">
                            {sortedPlans.map(plan => (
                                <div key={plan.id} className="rounded-xl border border-line-soft bg-[var(--surface-2)] p-5">
                                    <div className="mb-2 flex items-start justify-between gap-3">
                                        <div>
                                            <h3 className="mb-1 text-base font-semibold text-ink-hi">{plan.name}</h3>
                                            <p className="text-sm text-ink-low">Created: {new Date(plan.created_at || '').toLocaleDateString()}</p>
                                        </div>
                                        <button
                                            onClick={() => setEditingPlan(plan)}
                                            className="btn-outline shrink-0 !px-3 !py-1 !text-[0.8rem]"
                                        >
                                            Edit
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {(plan.exercises || []).map((ex: any, i: number) => (
                                            <span key={i} className="rounded-full border border-line-soft bg-[var(--surface-1)] px-3 py-1 text-[0.8rem] text-ink-mid">
                                                {ex.name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            {plans.length === 0 && <p className="text-sm text-ink-low">No plans assigned yet.</p>}
                        </div>
                    </div>
                )}
            </div>
            {/* Assign Plan Modal */}
            {showAssignPlan && selectedTrainee && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 p-4">
                    <div className="glass-card w-full max-w-[500px] !border-brand/30 p-8">
                        <h3 className="mb-6 font-display text-lg font-bold text-brand">Assign Training Plan</h3>
                        <p className="mb-6 text-sm text-ink-mid">
                            Assign a training plan to <strong>{selectedTrainee.display_name || selectedTrainee.username}</strong>.
                        </p>

                        {assignError && (
                            <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                                {assignError}
                            </div>
                        )}

                        <div className="mb-8 flex flex-col gap-4">
                            <div>
                                <label className="mb-2 block text-sm text-ink-mid">Training Plan</label>
                                <select
                                    value={selectedPlanId}
                                    onChange={(e) => setSelectedPlanId(e.target.value)}
                                    className="w-full cursor-pointer rounded-xl border border-[var(--line-strong)] bg-[var(--surface-2)] px-4 py-3 text-ink-hi outline-none focus:border-brand/60 focus:shadow-[0_0_0_3px_var(--brand-glow-soft)]"
                                >
                                    <option value="">Select a plan...</option>
                                    {trainerPlans.map(plan => (
                                        <option key={plan.id} value={plan.id}>{plan.name}</option>
                                    ))}
                                </select>
                                {trainerPlans.length === 0 && (
                                    <p className="mt-2 text-[0.8rem] text-ink-low">No training plans found. Create one first.</p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-2 block text-sm text-ink-mid">Start Date</label>
                                    <input
                                        type="date"
                                        value={assignStartDate}
                                        onChange={(e) => setAssignStartDate(e.target.value)}
                                        className="w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface-2)] px-4 py-3 text-ink-hi outline-none [color-scheme:dark] focus:border-brand/60 focus:shadow-[0_0_0_3px_var(--brand-glow-soft)]"
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm text-ink-mid">End Date</label>
                                    <input
                                        type="date"
                                        value={assignEndDate}
                                        onChange={(e) => setAssignEndDate(e.target.value)}
                                        className="w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface-2)] px-4 py-3 text-ink-hi outline-none [color-scheme:dark] focus:border-brand/60 focus:shadow-[0_0_0_3px_var(--brand-glow-soft)]"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button
                                className="btn-brand flex-1"
                                onClick={handleAssignPlan}
                                disabled={assigningPlan || !selectedPlanId}
                            >
                                {assigningPlan ? 'Assigning...' : 'Assign Plan'}
                            </button>
                            <button
                                onClick={() => setShowAssignPlan(false)}
                                className="btn-outline flex-1"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* AI Toolkit Modal */}
            {showAIToolkit && selectedTrainee && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 p-4">
                    <div className="glass-card w-full max-w-[500px] !border-brand/30 p-8">
                        <h3 className="mb-6 font-display text-lg font-bold text-brand">AI Toolkit (Bro Version)</h3>
                        <p className="mb-8 text-sm text-ink-mid">
                            Manage AI feature access for <strong>{selectedTrainee.display_name || selectedTrainee.username}</strong>.
                        </p>

                        <div className="mb-8 flex flex-col gap-4">
                            <div className="flex items-center justify-between gap-4 rounded-xl border border-line-soft bg-[var(--surface-2)] p-4">
                                <div>
                                    <div className="font-semibold text-ink-hi">AI Workout Planner</div>
                                    <div className="text-[0.8rem] text-ink-low">Generates personalized workout plans</div>
                                </div>
                                <label className="relative inline-flex shrink-0 cursor-pointer items-center">
                                    <input
                                        type="checkbox"
                                        className="peer sr-only"
                                        checked={selectedTraineeFeatures.workout_planner}
                                        onChange={() => toggleFeature('workout_planner')}
                                    />
                                    <span className="relative h-6 w-11 rounded-full border border-[var(--line-strong)] bg-[var(--surface-1)] transition-colors after:absolute after:left-[3px] after:top-1/2 after:h-[18px] after:w-[18px] after:-translate-y-1/2 after:rounded-full after:bg-ink-low after:transition-transform after:content-[''] peer-checked:border-brand peer-checked:bg-brand peer-checked:shadow-[0_0_16px_var(--brand-glow-soft)] peer-checked:after:translate-x-5 peer-checked:after:bg-white"></span>
                                </label>
                            </div>

                            <div className="flex items-center justify-between gap-4 rounded-xl border border-line-soft bg-[var(--surface-2)] p-4">
                                <div>
                                    <div className="font-semibold text-ink-hi">AI Dietitian</div>
                                    <div className="text-[0.8rem] text-ink-low">Creates meal plans and answers nutrition queries</div>
                                </div>
                                <label className="relative inline-flex shrink-0 cursor-pointer items-center">
                                    <input
                                        type="checkbox"
                                        className="peer sr-only"
                                        checked={selectedTraineeFeatures.dietitian}
                                        onChange={() => toggleFeature('dietitian')}
                                    />
                                    <span className="relative h-6 w-11 rounded-full border border-[var(--line-strong)] bg-[var(--surface-1)] transition-colors after:absolute after:left-[3px] after:top-1/2 after:h-[18px] after:w-[18px] after:-translate-y-1/2 after:rounded-full after:bg-ink-low after:transition-transform after:content-[''] peer-checked:border-brand peer-checked:bg-brand peer-checked:shadow-[0_0_16px_var(--brand-glow-soft)] peer-checked:after:translate-x-5 peer-checked:after:bg-white"></span>
                                </label>
                            </div>

                            <div className="flex items-center justify-between gap-4 rounded-xl border border-line-soft bg-[var(--surface-2)] p-4">
                                <div>
                                    <div className="font-semibold text-ink-hi">AI Form Checker</div>
                                    <div className="text-[0.8rem] text-ink-low">Analyzes exercise form from videos</div>
                                </div>
                                <label className="relative inline-flex shrink-0 cursor-pointer items-center">
                                    <input
                                        type="checkbox"
                                        className="peer sr-only"
                                        checked={selectedTraineeFeatures.form_checker}
                                        onChange={() => toggleFeature('form_checker')}
                                    />
                                    <span className="relative h-6 w-11 rounded-full border border-[var(--line-strong)] bg-[var(--surface-1)] transition-colors after:absolute after:left-[3px] after:top-1/2 after:h-[18px] after:w-[18px] after:-translate-y-1/2 after:rounded-full after:bg-ink-low after:transition-transform after:content-[''] peer-checked:border-brand peer-checked:bg-brand peer-checked:shadow-[0_0_16px_var(--brand-glow-soft)] peer-checked:after:translate-x-5 peer-checked:after:bg-white"></span>
                                </label>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button
                                className="btn-brand flex-1"
                                onClick={saveFeatures}
                                disabled={updatingFeatures}
                            >
                                {updatingFeatures ? 'Saving...' : 'Save Changes'}
                            </button>
                            <button
                                onClick={() => setShowAIToolkit(false)}
                                className="btn-outline flex-1"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
