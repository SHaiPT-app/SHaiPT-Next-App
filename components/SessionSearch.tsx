'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Clock, ChevronDown } from 'lucide-react';
import type { WorkoutSession } from '@/lib/types';

interface SessionSearchProps {
    availableSessions: WorkoutSession[];
    onSelect: (sessionId: string) => void;
    placeholder?: string;
    initialValue?: string | null;
}

export default function SessionSearch({ availableSessions, onSelect, placeholder = "Select a workout...", initialValue }: SessionSearchProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(initialValue || null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Filter sessions based on search query
    const filteredSessions = availableSessions.filter(session =>
        session.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Get selected session name for display
    const selectedSession = availableSessions.find(s => s.id === selectedSessionId);

    useEffect(() => {
        if (initialValue) {
            setSelectedSessionId(initialValue);
        }
    }, [initialValue]);

    useEffect(() => {
        // Close dropdown when clicking outside
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (sessionId: string) => {
        setSelectedSessionId(sessionId);
        onSelect(sessionId);
        setIsOpen(false);
        setSearchQuery('');
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <div className="session-search" ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
            {/* Input / Trigger */}
            <div
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '10px',
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    color: selectedSession ? 'var(--foreground)' : '#888'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                    <Search size={18} color="#888" />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {selectedSession ? selectedSession.name : placeholder}
                    </span>
                </div>
                <ChevronDown size={16} color="#888" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </div>

            {/* Dropdown */}
            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 5px)',
                    left: 0,
                    right: 0,
                    background: 'rgba(20, 20, 30, 0.95)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '12px',
                    zIndex: 1000,
                    boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                    maxHeight: '300px',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    {/* Search Field */}
                    <div style={{ padding: '0.75rem', borderBottom: '1px solid var(--glass-border)' }}>
                        <input
                            type="text"
                            placeholder="Search workouts..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                            style={{
                                width: '100%',
                                background: 'rgba(255,255,255,0.05)',
                                border: 'none',
                                padding: '0.5rem 0.75rem',
                                borderRadius: '6px',
                                color: 'white',
                                fontSize: '0.9rem',
                                outline: 'none'
                            }}
                        />
                    </div>

                    {/* Results List */}
                    <div style={{ overflowY: 'auto', flex: 1, padding: '0.5rem' }}>
                        {/* Option to clear selection (Rest Day) */}
                        <div
                            onClick={() => handleSelect('')}
                            style={{
                                padding: '0.75rem',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                color: '#888',
                                fontSize: '0.9rem'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            <span>Rest Day (Clear)</span>
                        </div>

                        {filteredSessions.length > 0 ? (
                            filteredSessions.map(session => (
                                <div
                                    key={session.id}
                                    onClick={() => handleSelect(session.id)}
                                    style={{
                                        padding: '0.75rem',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        marginBottom: '0.25rem',
                                        background: selectedSessionId === session.id ? 'rgba(242, 95, 41, 0.1)' : 'transparent',
                                        border: selectedSessionId === session.id ? '1px solid rgba(242, 95, 41, 0.2)' : '1px solid transparent'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (selectedSessionId !== session.id) e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                    }}
                                    onMouseLeave={(e) => {
                                        if (selectedSessionId !== session.id) e.currentTarget.style.background = 'transparent';
                                    }}
                                >
                                    <div style={{ fontWeight: '500', marginBottom: '0.25rem', color: selectedSessionId === session.id ? 'var(--primary)' : 'white' }}>
                                        {session.name}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem', color: '#888' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                            <Clock size={12} />
                                            {formatDate(session.updated_at || session.created_at)}
                                        </span>
                                        <span>•</span>
                                        <span>{session.exercises?.length || 0} exercises</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div style={{ padding: '1rem', textAlign: 'center', color: '#666', fontSize: '0.9rem' }}>
                                No workouts found matching "{searchQuery}"
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
