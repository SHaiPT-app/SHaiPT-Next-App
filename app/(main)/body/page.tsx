'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Scale,
    Ruler,
    Camera,
    Plus,
    Trash2,
    ChevronDown,
    ChevronRight,
    TrendingUp,
    TrendingDown,
    Minus,
    X,
    Loader2,
    Image as ImageIcon,
    Video,
    Calendar,
    Edit3,
} from 'lucide-react';
import type { Profile, BodyMeasurement, ProgressMedia } from '@/lib/types';

// ============================================
// CONSTANTS
// ============================================

const MEASUREMENT_FIELDS: { key: keyof BodyMeasurement; label: string; unit: string }[] = [
    { key: 'weight_kg', label: 'Weight', unit: 'kg' },
    { key: 'body_fat_percentage', label: 'Body Fat', unit: '%' },
    { key: 'neck_cm', label: 'Neck', unit: 'cm' },
    { key: 'shoulders_cm', label: 'Shoulders', unit: 'cm' },
    { key: 'chest_cm', label: 'Chest', unit: 'cm' },
    { key: 'left_bicep_cm', label: 'Left Bicep', unit: 'cm' },
    { key: 'right_bicep_cm', label: 'Right Bicep', unit: 'cm' },
    { key: 'waist_cm', label: 'Waist', unit: 'cm' },
    { key: 'hips_cm', label: 'Hips', unit: 'cm' },
    { key: 'left_thigh_cm', label: 'Left Thigh', unit: 'cm' },
    { key: 'right_thigh_cm', label: 'Right Thigh', unit: 'cm' },
    { key: 'left_calf_cm', label: 'Left Calf', unit: 'cm' },
    { key: 'right_calf_cm', label: 'Right Calf', unit: 'cm' },
];

type ProgressMediaWithUrl = ProgressMedia & { url: string | null };

// ============================================
// SUB-COMPONENTS
// ============================================

function TrendIndicator({ current, previous }: { current?: number; previous?: number }) {
    if (current === undefined || previous === undefined) return null;
    const diff = current - previous;
    if (Math.abs(diff) < 0.01) return <Minus size={14} style={{ color: 'rgba(255,255,255,0.4)' }} />;
    if (diff > 0) return <TrendingUp size={14} style={{ color: '#39ff14' }} />;
    return <TrendingDown size={14} style={{ color: '#ff007f' }} />;
}

function MeasurementCard({ field, value, previousValue, onClick }: {
    field: { key: keyof BodyMeasurement; label: string; unit: string };
    value?: number;
    previousValue?: number;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '1rem',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.2s',
                width: '100%',
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                e.currentTarget.style.borderColor = 'rgba(57, 255, 20, 0.3)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>{field.label}</span>
                <TrendIndicator current={value} previous={previousValue} />
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: value !== undefined ? '#39ff14' : 'rgba(255,255,255,0.2)' }}>
                {value !== undefined ? `${value}` : '--'}
                <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'rgba(255,255,255,0.4)', marginLeft: '0.25rem' }}>
                    {field.unit}
                </span>
            </div>
        </button>
    );
}

function MediaThumbnail({ media, onDelete }: {
    media: ProgressMediaWithUrl;
    onDelete: (id: string) => void;
}) {
    const [expanded, setExpanded] = useState(false);

    return (
        <>
            <div
                style={{
                    position: 'relative',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    aspectRatio: '1',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                }}
                onClick={() => setExpanded(true)}
            >
                {media.url ? (
                    media.media_type === 'video' ? (
                        <div style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(0,0,0,0.5)',
                        }}>
                            <Video size={32} style={{ color: '#39ff14' }} />
                        </div>
                    ) : (
                        <img
                            src={media.url}
                            alt={media.caption || 'Progress photo'}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    )
                ) : (
                    <div style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                        <ImageIcon size={32} style={{ color: 'rgba(255,255,255,0.2)' }} />
                    </div>
                )}
                <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: '0.5rem',
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                    fontSize: '0.7rem',
                    color: 'rgba(255,255,255,0.7)',
                }}>
                    {media.taken_at ? new Date(media.taken_at).toLocaleDateString() : ''}
                </div>
            </div>

            {/* Expanded Modal */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 9999,
                            background: 'rgba(0,0,0,0.9)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '1rem',
                        }}
                        onClick={() => setExpanded(false)}
                    >
                        <div style={{
                            position: 'absolute',
                            top: '1rem',
                            right: '1rem',
                            display: 'flex',
                            gap: '0.75rem',
                        }}>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(media.id);
                                    setExpanded(false);
                                }}
                                style={{
                                    background: 'rgba(255,0,0,0.2)',
                                    border: '1px solid rgba(255,0,0,0.4)',
                                    borderRadius: '50%',
                                    width: '40px',
                                    height: '40px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#ff4444',
                                    cursor: 'pointer',
                                }}
                            >
                                <Trash2 size={18} />
                            </button>
                            <button
                                onClick={() => setExpanded(false)}
                                style={{
                                    background: 'rgba(255,255,255,0.1)',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    borderRadius: '50%',
                                    width: '40px',
                                    height: '40px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#fff',
                                    cursor: 'pointer',
                                }}
                            >
                                <X size={18} />
                            </button>
                        </div>
                        {media.url && (
                            media.media_type === 'video' ? (
                                <video
                                    src={media.url}
                                    controls
                                    style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: '12px' }}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            ) : (
                                <img
                                    src={media.url}
                                    alt={media.caption || 'Progress photo'}
                                    style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: '12px', objectFit: 'contain' }}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            )
                        )}
                        {media.caption && (
                            <p style={{ color: 'rgba(255,255,255,0.7)', marginTop: '1rem', textAlign: 'center' }}>
                                {media.caption}
                            </p>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function BodyCompositionPage() {
    const [user, setUser] = useState<Profile | null>(null);
    const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
    const [media, setMedia] = useState<ProgressMediaWithUrl[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'measurements' | 'photos'>('measurements');
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
    const [formValues, setFormValues] = useState<Record<string, string>>({});
    const [formNotes, setFormNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load user and data
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const u = JSON.parse(storedUser) as Profile;
            setUser(u);
        }
    }, []);

    const fetchData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const [measRes, mediaRes] = await Promise.all([
                fetch(`/api/body-measurements?userId=${user.id}`),
                fetch(`/api/progress-media?userId=${user.id}`),
            ]);
            const measData = await measRes.json();
            const mediaData = await mediaRes.json();
            setMeasurements(measData.measurements || []);
            setMedia(mediaData.media || []);
        } catch (error) {
            console.error('Error fetching body composition data:', error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const latestMeasurement = measurements[0] || null;
    const previousMeasurement = measurements[1] || null;

    const handleOpenForm = (measurement?: BodyMeasurement) => {
        if (measurement) {
            setEditingId(measurement.id);
            setFormDate(measurement.date);
            const vals: Record<string, string> = {};
            for (const field of MEASUREMENT_FIELDS) {
                const v = measurement[field.key];
                if (v !== undefined && v !== null) {
                    vals[field.key] = String(v);
                }
            }
            setFormValues(vals);
            setFormNotes(measurement.notes || '');
        } else {
            setEditingId(null);
            setFormDate(new Date().toISOString().split('T')[0]);
            setFormValues({});
            setFormNotes('');
        }
        setShowForm(true);
    };

    const handleSaveMeasurement = async () => {
        if (!user) return;
        setSaving(true);
        try {
            const payload: Record<string, unknown> = {
                user_id: user.id,
                date: formDate,
                notes: formNotes || undefined,
            };

            for (const field of MEASUREMENT_FIELDS) {
                const val = formValues[field.key];
                if (val !== undefined && val !== '') {
                    payload[field.key] = parseFloat(val);
                }
            }

            if (editingId) {
                payload.id = editingId;
                await fetch('/api/body-measurements', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
            } else {
                await fetch('/api/body-measurements', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
            }

            setShowForm(false);
            await fetchData();
        } catch (error) {
            console.error('Error saving measurement:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteMeasurement = async (id: string) => {
        try {
            await fetch(`/api/body-measurements?id=${id}`, { method: 'DELETE' });
            await fetchData();
        } catch (error) {
            console.error('Error deleting measurement:', error);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('user_id', user.id);
            formData.append('taken_at', new Date().toISOString());
            formData.append('visibility', 'private');

            const res = await fetch('/api/progress-media', {
                method: 'POST',
                body: formData,
            });

            if (res.ok) {
                await fetchData();
            }
        } catch (error) {
            console.error('Error uploading media:', error);
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDeleteMedia = async (id: string) => {
        try {
            await fetch(`/api/progress-media?id=${id}`, { method: 'DELETE' });
            await fetchData();
        } catch (error) {
            console.error('Error deleting media:', error);
        }
    };

    // Convert weight for display if user prefers lbs
    const displayWeight = (valueKg: number | undefined, preferredUnit?: string): string => {
        if (valueKg === undefined) return '--';
        if (preferredUnit === 'lbs') return `${(valueKg * 2.20462).toFixed(1)} lbs`;
        return `${valueKg} kg`;
    };

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '60vh',
            }}>
                <Loader2 size={32} style={{ color: '#39ff14', animation: 'spin 1s linear infinite' }} />
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '1.5rem 1rem 6rem' }}>
            {/* Page Header */}
            <div style={{ marginBottom: '1.5rem' }}>
                <h1 style={{
                    fontSize: '1.75rem',
                    fontWeight: 800,
                    fontFamily: 'var(--font-orbitron)',
                    color: '#39ff14',
                    marginBottom: '0.25rem',
                }}>
                    Body Composition
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
                    Track your weight, measurements, and progress photos
                </p>
            </div>

            {/* Tab Selector */}
            <div style={{
                display: 'flex',
                gap: '0.5rem',
                marginBottom: '1.5rem',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '12px',
                padding: '0.25rem',
                border: '1px solid rgba(255,255,255,0.08)',
            }}>
                {(['measurements', 'photos'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            flex: 1,
                            padding: '0.75rem',
                            borderRadius: '10px',
                            border: 'none',
                            background: activeTab === tab ? 'rgba(57, 255, 20, 0.15)' : 'transparent',
                            color: activeTab === tab ? '#39ff14' : 'rgba(255,255,255,0.5)',
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                        }}
                    >
                        {tab === 'measurements' ? <><Ruler size={16} /> Measurements</> : <><Camera size={16} /> Photos / Videos</>}
                    </button>
                ))}
            </div>

            {/* MEASUREMENTS TAB */}
            {activeTab === 'measurements' && (
                <div>
                    {/* Latest Summary */}
                    {latestMeasurement && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{
                                background: 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                borderRadius: '16px',
                                padding: '1.25rem',
                                marginBottom: '1rem',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <div>
                                    <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>Latest Entry</span>
                                    <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Calendar size={14} />
                                        {new Date(latestMeasurement.date).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric',
                                        })}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleOpenForm(latestMeasurement)}
                                    style={{
                                        background: 'rgba(57, 255, 20, 0.1)',
                                        border: '1px solid rgba(57, 255, 20, 0.3)',
                                        borderRadius: '8px',
                                        padding: '0.4rem 0.75rem',
                                        color: '#39ff14',
                                        fontSize: '0.8rem',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.25rem',
                                    }}
                                >
                                    <Edit3 size={14} /> Edit
                                </button>
                            </div>

                            {/* Weight Highlight */}
                            {latestMeasurement.weight_kg !== undefined && (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'baseline',
                                    gap: '0.5rem',
                                    marginBottom: '1rem',
                                }}>
                                    <Scale size={20} style={{ color: '#39ff14' }} />
                                    <span style={{ fontSize: '2rem', fontWeight: 800, color: '#39ff14' }}>
                                        {displayWeight(latestMeasurement.weight_kg, user?.preferred_weight_unit)}
                                    </span>
                                    {previousMeasurement?.weight_kg !== undefined && latestMeasurement.weight_kg !== undefined && (
                                        <span style={{
                                            fontSize: '0.8rem',
                                            color: latestMeasurement.weight_kg - previousMeasurement.weight_kg > 0 ? '#ff007f' : '#39ff14',
                                        }}>
                                            {latestMeasurement.weight_kg - previousMeasurement.weight_kg > 0 ? '+' : ''}
                                            {(latestMeasurement.weight_kg - previousMeasurement.weight_kg).toFixed(1)} kg
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Measurement Grid */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                                gap: '0.5rem',
                            }}>
                                {MEASUREMENT_FIELDS.filter(f => f.key !== 'weight_kg').map((field) => (
                                    <MeasurementCard
                                        key={field.key}
                                        field={field}
                                        value={latestMeasurement[field.key] as number | undefined}
                                        previousValue={previousMeasurement?.[field.key] as number | undefined}
                                        onClick={() => handleOpenForm(latestMeasurement)}
                                    />
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* Add New Entry Button */}
                    <button
                        onClick={() => handleOpenForm()}
                        style={{
                            width: '100%',
                            padding: '1rem',
                            background: 'rgba(57, 255, 20, 0.1)',
                            border: '1px solid rgba(57, 255, 20, 0.3)',
                            borderRadius: '12px',
                            color: '#39ff14',
                            fontSize: '0.95rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            marginBottom: '1.5rem',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(57, 255, 20, 0.2)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(57, 255, 20, 0.1)';
                        }}
                    >
                        <Plus size={18} /> Log New Measurements
                    </button>

                    {/* History */}
                    {measurements.length > 0 && (
                        <div>
                            <button
                                onClick={() => setShowHistory(!showHistory)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'rgba(255,255,255,0.6)',
                                    fontSize: '0.9rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.5rem 0',
                                    marginBottom: '0.5rem',
                                }}
                            >
                                {showHistory ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                History ({measurements.length} entries)
                            </button>

                            <AnimatePresence>
                                {showHistory && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        style={{ overflow: 'hidden' }}
                                    >
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            {measurements.map((m) => (
                                                <div
                                                    key={m.id}
                                                    style={{
                                                        background: 'rgba(255,255,255,0.03)',
                                                        border: '1px solid rgba(255,255,255,0.08)',
                                                        borderRadius: '12px',
                                                        padding: '1rem',
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                    }}
                                                >
                                                    <div>
                                                        <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.25rem' }}>
                                                            {new Date(m.date).toLocaleDateString('en-US', {
                                                                weekday: 'short',
                                                                month: 'short',
                                                                day: 'numeric',
                                                                year: 'numeric',
                                                            })}
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                                            {m.weight_kg !== undefined && (
                                                                <span style={{ fontSize: '0.8rem', color: '#39ff14' }}>
                                                                    {displayWeight(m.weight_kg, user?.preferred_weight_unit)}
                                                                </span>
                                                            )}
                                                            {m.body_fat_percentage !== undefined && (
                                                                <span style={{ fontSize: '0.8rem', color: '#00d4ff' }}>
                                                                    {m.body_fat_percentage}% BF
                                                                </span>
                                                            )}
                                                            {m.waist_cm !== undefined && (
                                                                <span style={{ fontSize: '0.8rem', color: '#f59e0b' }}>
                                                                    Waist: {m.waist_cm} cm
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                        <button
                                                            onClick={() => handleOpenForm(m)}
                                                            style={{
                                                                background: 'rgba(255,255,255,0.05)',
                                                                border: '1px solid rgba(255,255,255,0.1)',
                                                                borderRadius: '8px',
                                                                padding: '0.4rem',
                                                                color: 'rgba(255,255,255,0.6)',
                                                                cursor: 'pointer',
                                                            }}
                                                        >
                                                            <Edit3 size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteMeasurement(m.id)}
                                                            style={{
                                                                background: 'rgba(255,0,0,0.05)',
                                                                border: '1px solid rgba(255,0,0,0.15)',
                                                                borderRadius: '8px',
                                                                padding: '0.4rem',
                                                                color: '#ff4444',
                                                                cursor: 'pointer',
                                                            }}
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}

                    {/* Empty State */}
                    {measurements.length === 0 && !showForm && (
                        <div style={{
                            textAlign: 'center',
                            padding: '3rem 1rem',
                            color: 'rgba(255,255,255,0.4)',
                        }}>
                            <Scale size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                            <p style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>No measurements yet</p>
                            <p style={{ fontSize: '0.85rem' }}>Start tracking your body composition by logging your first entry.</p>
                        </div>
                    )}
                </div>
            )}

            {/* PHOTOS/VIDEOS TAB */}
            {activeTab === 'photos' && (
                <div>
                    {/* Upload Button */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*"
                        onChange={handleFileUpload}
                        style={{ display: 'none' }}
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        style={{
                            width: '100%',
                            padding: '1rem',
                            background: uploading ? 'rgba(255,255,255,0.05)' : 'rgba(57, 255, 20, 0.1)',
                            border: `1px solid ${uploading ? 'rgba(255,255,255,0.1)' : 'rgba(57, 255, 20, 0.3)'}`,
                            borderRadius: '12px',
                            color: uploading ? 'rgba(255,255,255,0.4)' : '#39ff14',
                            fontSize: '0.95rem',
                            fontWeight: 600,
                            cursor: uploading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            marginBottom: '1.5rem',
                        }}
                    >
                        {uploading ? (
                            <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Uploading...</>
                        ) : (
                            <><Camera size={18} /> Upload Photo or Video</>
                        )}
                    </button>

                    {/* Media Grid */}
                    {media.length > 0 ? (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                            gap: '0.75rem',
                        }}>
                            {media.map((m) => (
                                <MediaThumbnail key={m.id} media={m} onDelete={handleDeleteMedia} />
                            ))}
                        </div>
                    ) : (
                        <div style={{
                            textAlign: 'center',
                            padding: '3rem 1rem',
                            color: 'rgba(255,255,255,0.4)',
                        }}>
                            <Camera size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                            <p style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>No progress photos yet</p>
                            <p style={{ fontSize: '0.85rem' }}>Upload photos and videos to track your visual progress over time.</p>
                        </div>
                    )}
                </div>
            )}

            {/* MEASUREMENT FORM MODAL */}
            <AnimatePresence>
                {showForm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 9999,
                            background: 'rgba(0,0,0,0.85)',
                            display: 'flex',
                            alignItems: 'flex-end',
                            justifyContent: 'center',
                        }}
                        onClick={() => setShowForm(false)}
                    >
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                background: '#1a1a2e',
                                borderRadius: '20px 20px 0 0',
                                width: '100%',
                                maxWidth: '600px',
                                maxHeight: '85vh',
                                overflowY: 'auto',
                                padding: '1.5rem',
                            }}
                        >
                            {/* Form Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h2 style={{
                                    fontSize: '1.25rem',
                                    fontWeight: 700,
                                    color: '#39ff14',
                                    fontFamily: 'var(--font-orbitron)',
                                }}>
                                    {editingId ? 'Edit Measurements' : 'Log Measurements'}
                                </h2>
                                <button
                                    onClick={() => setShowForm(false)}
                                    style={{
                                        background: 'rgba(255,255,255,0.1)',
                                        border: 'none',
                                        borderRadius: '50%',
                                        width: '36px',
                                        height: '36px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#fff',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Date Input */}
                            <div style={{ marginBottom: '1.25rem' }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem' }}>
                                    Date
                                </label>
                                <input
                                    type="date"
                                    value={formDate}
                                    onChange={(e) => setFormDate(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.15)',
                                        borderRadius: '10px',
                                        color: '#fff',
                                        fontSize: '0.9rem',
                                    }}
                                />
                            </div>

                            {/* Measurement Fields */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(2, 1fr)',
                                gap: '0.75rem',
                                marginBottom: '1.25rem',
                            }}>
                                {MEASUREMENT_FIELDS.map((field) => (
                                    <div key={field.key}>
                                        <label style={{
                                            display: 'block',
                                            fontSize: '0.75rem',
                                            color: 'rgba(255,255,255,0.5)',
                                            marginBottom: '0.35rem',
                                        }}>
                                            {field.label} ({field.unit})
                                        </label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            placeholder="--"
                                            value={formValues[field.key] || ''}
                                            onChange={(e) => setFormValues(prev => ({
                                                ...prev,
                                                [field.key]: e.target.value,
                                            }))}
                                            style={{
                                                width: '100%',
                                                padding: '0.65rem',
                                                background: 'rgba(255,255,255,0.05)',
                                                border: '1px solid rgba(255,255,255,0.15)',
                                                borderRadius: '10px',
                                                color: '#fff',
                                                fontSize: '0.9rem',
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>

                            {/* Notes */}
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem' }}>
                                    Notes
                                </label>
                                <textarea
                                    placeholder="Optional notes..."
                                    value={formNotes}
                                    onChange={(e) => setFormNotes(e.target.value)}
                                    rows={2}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.15)',
                                        borderRadius: '10px',
                                        color: '#fff',
                                        fontSize: '0.9rem',
                                        resize: 'vertical',
                                    }}
                                />
                            </div>

                            {/* Save Button */}
                            <button
                                onClick={handleSaveMeasurement}
                                disabled={saving}
                                style={{
                                    width: '100%',
                                    padding: '1rem',
                                    background: saving ? 'rgba(57, 255, 20, 0.1)' : '#39ff14',
                                    border: 'none',
                                    borderRadius: '12px',
                                    color: saving ? '#39ff14' : '#000',
                                    fontSize: '1rem',
                                    fontWeight: 700,
                                    cursor: saving ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s',
                                }}
                            >
                                {saving ? 'Saving...' : (editingId ? 'Update Measurements' : 'Save Measurements')}
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
