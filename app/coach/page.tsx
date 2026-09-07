'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { apiFetch } from '@/lib/apiClient';
import { ArrowLeft, Bot, Users } from 'lucide-react';
import { coaches } from '@/data/coaches';
import type { CoachPersona } from '@/data/coaches';
import type { Profile } from '@/lib/types';
import HumanCoachCard from '@/components/HumanCoachCard';
import CoachRequestModal from '@/components/CoachRequestModal';

function CoachCard({ coach, isSelected, onSelect }: {
    coach: CoachPersona;
    isSelected: boolean;
    onSelect: (coach: CoachPersona) => void;
}) {
    return (
        <button
            onClick={() => onSelect(coach)}
            data-testid={`coach-card-${coach.id}`}
            className={`glass-card glass-card-hover flex w-full cursor-pointer flex-col items-center p-6 text-center ${
                isSelected
                    ? '!border-brand !bg-[var(--brand-glow-soft)] shadow-[0_0_20px_var(--brand-glow-soft)]'
                    : ''
            }`}
        >
            {/* Avatar */}
            <div
                className={`mb-4 flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 ${
                    isSelected
                        ? 'border-brand bg-[image:var(--brand-gradient)]'
                        : 'border-[var(--line-strong)] bg-[var(--surface-2)]'
                }`}
            >
                <img
                    src={coach.avatarUrl}
                    alt={coach.fullName}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        if (target.parentElement) {
                            target.parentElement.innerHTML = `<span style="font-size:1.8rem;font-weight:700;color:${isSelected ? '#fff' : '#888'};font-family:var(--font-orbitron)">${coach.fullName.charAt(0)}</span>`;
                        }
                    }}
                />
            </div>

            {/* Name */}
            <h3
                className={`font-display mb-3 text-[0.95rem] font-semibold leading-[1.3] ${
                    isSelected ? 'text-brand' : 'text-ink-hi'
                }`}
            >
                {coach.displayName}
            </h3>

            {/* Coaching Style */}
            <p className="mb-4 flex-grow text-[0.8rem] leading-normal text-ink-mid">
                {coach.coachingStyle}
            </p>

            {/* Specialty Tags */}
            <div className="flex flex-wrap justify-center gap-1.5">
                {coach.specialtyTags.map((tag) => (
                    <span
                        key={tag}
                        className={`rounded-full border px-2.5 py-0.5 text-[0.7rem] font-medium ${
                            isSelected
                                ? 'border-brand/30 bg-[var(--brand-glow-soft)] text-brand'
                                : 'border-[var(--line-soft)] bg-[var(--surface-2)] text-ink-mid'
                        }`}
                    >
                        {tag}
                    </span>
                ))}
            </div>
        </button>
    );
}

type TabType = 'ai' | 'human';

export default function CoachSelectionPage() {
    const [activeTab, setActiveTab] = useState<TabType>('ai');
    const [selectedCoach, setSelectedCoach] = useState<CoachPersona | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [trainers, setTrainers] = useState<(Profile & { relationship_status?: string | null })[]>([]);
    const [trainersLoading, setTrainersLoading] = useState(false);
    const [selectedTrainer, setSelectedTrainer] = useState<(Profile & { relationship_status?: string | null }) | null>(null);
    const router = useRouter();

    // Auth guard + get user ID
    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) {
                router.push('/login');
            } else {
                setCurrentUserId(user.id);
            }
        });
    }, [router]);

    const fetchTrainers = useCallback(async () => {
        if (!currentUserId) return;
        setTrainersLoading(true);
        try {
            // the athlete is the token holder; the route marks each trainer's relationship to them
            const { trainers: data } = await apiFetch<{ trainers?: (Profile & { relationship_status?: string | null })[] }>('/api/coaching/trainers');
            setTrainers(data || []);
        } catch {
            // Silently fail
        } finally {
            setTrainersLoading(false);
        }
    }, [currentUserId]);

    // Fetch trainers when switching to human tab
    useEffect(() => {
        if (activeTab === 'human' && currentUserId) {
            fetchTrainers();
        }
    }, [activeTab, currentUserId, fetchTrainers]);

    const handleSelect = (coach: CoachPersona) => {
        setSelectedCoach(coach);
    };

    const handleStartTraining = () => {
        if (selectedCoach) {
            router.push(`/coach/${selectedCoach.id}`);
        }
    };

    const handleTrainerClick = (trainer: Profile & { relationship_status?: string | null }) => {
        if (!trainer.is_accepting_clients) {
            // Show a simple alert for coming-soon trainers
            alert(`${trainer.full_name} is not yet accepting clients. Check back soon!`);
            return;
        }
        setSelectedTrainer(trainer);
    };

    return (
        <div className="min-h-screen px-6 py-8 text-ink-hi">
            <div className="mx-auto max-w-[1200px]">
                {/* Header */}
                <div className="mb-8">
                    <div className="mb-2 flex items-center gap-3">
                        <button
                            onClick={() => router.push('/home')}
                            aria-label="Back to Home"
                            className="btn-soft shrink-0 !rounded-xl !px-3.5 !py-2 !text-[0.85rem]"
                        >
                            <ArrowLeft size={18} />
                            Home
                        </button>
                        <h1 className="display text-gradient-brand text-[2rem]">
                            Coach List
                        </h1>
                    </div>
                    <p className="text-[0.95rem] text-ink-mid">
                        Browse AI and human coaches to match your training goals.
                    </p>
                </div>

                {/* Tab Toggle */}
                <div className="mb-8 flex max-w-[400px] gap-2 rounded-xl border border-line-soft bg-[var(--surface-1)] p-1">
                    <button
                        onClick={() => setActiveTab('ai')}
                        className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm transition-all ${
                            activeTab === 'ai'
                                ? 'bg-brand font-semibold text-ink-hi shadow-[0_0_16px_var(--brand-glow-soft)]'
                                : 'bg-transparent font-normal text-ink-mid hover:text-ink-hi'
                        }`}
                    >
                        <Bot size={16} />
                        AI Coaches
                    </button>
                    <button
                        onClick={() => setActiveTab('human')}
                        className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm transition-all ${
                            activeTab === 'human'
                                ? 'bg-brand font-semibold text-ink-hi shadow-[0_0_16px_var(--brand-glow-soft)]'
                                : 'bg-transparent font-normal text-ink-mid hover:text-ink-hi'
                        }`}
                    >
                        <Users size={16} />
                        Human Coaches
                    </button>
                </div>

                {/* AI Coaches Tab */}
                {activeTab === 'ai' && (
                    <>
                        <div
                            data-testid="coach-grid"
                            className="mb-8 grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-5"
                        >
                            {coaches.map((coach) => (
                                <CoachCard
                                    key={coach.id}
                                    coach={coach}
                                    isSelected={selectedCoach?.id === coach.id}
                                    onSelect={handleSelect}
                                />
                            ))}
                        </div>

                        {/* Selected Coach CTA */}
                        {selectedCoach && (
                            <div
                                data-testid="selected-coach-cta"
                                className="fixed inset-x-0 bottom-0 z-[100] flex items-center justify-center gap-4 border-t border-brand/30 bg-[rgba(21,21,31,0.95)] px-6 py-5 backdrop-blur-[16px]"
                            >
                                <span className="text-[0.95rem] text-ink-mid">
                                    Selected: <strong className="text-brand">{selectedCoach.displayName}</strong>
                                </span>
                                <button
                                    data-testid="start-training-btn"
                                    className="btn-brand !px-8 !py-3 !text-[0.95rem]"
                                    onClick={handleStartTraining}
                                >
                                    Start Training
                                </button>
                            </div>
                        )}
                    </>
                )}

                {/* Human Coaches Tab */}
                {activeTab === 'human' && (
                    <>
                        {trainersLoading ? (
                            <div className="p-12 text-center text-ink-mid">
                                <div className="spinner mx-auto mb-4"></div>
                                Loading trainers...
                            </div>
                        ) : trainers.length === 0 ? (
                            <div className="glass-card p-12 text-center text-ink-mid">
                                <Users size={40} className="mx-auto mb-4 text-ink-low" />
                                <p className="mb-2 text-base">No human coaches available yet</p>
                                <p className="text-[0.85rem]">Check back soon — trainers are being onboarded!</p>
                            </div>
                        ) : (
                            <div className="mb-8 grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-5">
                                {trainers.map((trainer) => (
                                    <HumanCoachCard
                                        key={trainer.id}
                                        trainer={trainer}
                                        onClick={() => handleTrainerClick(trainer)}
                                    />
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Coach Request Modal */}
            {selectedTrainer && currentUserId && (
                <CoachRequestModal
                    trainer={selectedTrainer}
                    athleteId={currentUserId}
                    onClose={() => setSelectedTrainer(null)}
                    onSuccess={() => {
                        fetchTrainers();
                    }}
                />
            )}
        </div>
    );
}
