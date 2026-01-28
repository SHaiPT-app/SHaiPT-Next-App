'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    Search,
    Trash2,
    Flame,
    Beef,
    Wheat,
    Droplets,
    Target,
    Loader2,
    X,
    Check,
} from 'lucide-react';
import type { Profile, FoodItem, FoodLog, FoodLogMealType, MacroTargets } from '@/lib/types';

// ============================================
// CONSTANTS
// ============================================

const MEAL_TYPES: { key: FoodLogMealType; label: string }[] = [
    { key: 'breakfast', label: 'Breakfast' },
    { key: 'lunch', label: 'Lunch' },
    { key: 'dinner', label: 'Dinner' },
    { key: 'snack', label: 'Snack' },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatDate(dateStr: string): string {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.getTime() === today.getTime()) return 'Today';
    if (date.getTime() === yesterday.getTime()) return 'Yesterday';

    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function getDateString(date: Date): string {
    return date.toISOString().split('T')[0];
}

// ============================================
// SUB-COMPONENTS
// ============================================

function MacroProgressBar({ label, current, target, color, unit, icon: Icon }: {
    label: string;
    current: number;
    target: number;
    color: string;
    unit: string;
    icon: typeof Flame;
}) {
    const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
    const isOver = current > target && target > 0;

    return (
        <div style={{ flex: 1, minWidth: '0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.25rem' }}>
                <Icon size={12} style={{ color, flexShrink: 0 }} />
                <span style={{ fontSize: '0.65rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: isOver ? '#ef4444' : color, marginBottom: '0.25rem' }}>
                {Math.round(current)}<span style={{ fontSize: '0.7rem', color: '#666', fontWeight: 400 }}> / {Math.round(target)}{unit}</span>
            </div>
            <div style={{
                height: '4px',
                borderRadius: '2px',
                background: 'rgba(255,255,255,0.06)',
                overflow: 'hidden',
            }}>
                <div style={{
                    height: '100%',
                    width: `${pct}%`,
                    borderRadius: '2px',
                    background: isOver ? '#ef4444' : color,
                    transition: 'width 0.3s ease',
                }} />
            </div>
        </div>
    );
}

function FoodSearchModal({ isOpen, onClose, onSelect, mealType }: {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (food: FoodItem, servings: number) => void;
    mealType: FoodLogMealType;
}) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<FoodItem[]>([]);
    const [searching, setSearching] = useState(false);
    const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
    const [servings, setServings] = useState(1);
    const [customMode, setCustomMode] = useState(false);
    const [customFood, setCustomFood] = useState({
        name: '', calories: '', protein_g: '', carbs_g: '', fat_g: '',
        serving_size: '1', serving_unit: 'serving',
    });

    const searchFoods = useCallback(async (q: string) => {
        if (q.length < 2) {
            setResults([]);
            return;
        }
        setSearching(true);
        try {
            const res = await fetch(`/api/food-database?q=${encodeURIComponent(q)}`);
            if (res.ok) {
                const data = await res.json();
                setResults(data.foods || []);
            }
        } catch {
            // search failed silently
        } finally {
            setSearching(false);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (query) searchFoods(query);
        }, 300);
        return () => clearTimeout(timer);
    }, [query, searchFoods]);

    useEffect(() => {
        if (!isOpen) {
            setQuery('');
            setResults([]);
            setSelectedFood(null);
            setServings(1);
            setCustomMode(false);
            setCustomFood({ name: '', calories: '', protein_g: '', carbs_g: '', fat_g: '', serving_size: '1', serving_unit: 'serving' });
        }
    }, [isOpen]);

    const handleConfirm = () => {
        if (selectedFood) {
            onSelect(selectedFood, servings);
        }
    };

    const handleCustomSubmit = () => {
        if (!customFood.name) return;
        const food: FoodItem = {
            id: `custom_${Date.now()}`,
            name: customFood.name,
            serving_size: Number(customFood.serving_size) || 1,
            serving_unit: customFood.serving_unit || 'serving',
            calories: Number(customFood.calories) || 0,
            protein_g: Number(customFood.protein_g) || 0,
            carbs_g: Number(customFood.carbs_g) || 0,
            fat_g: Number(customFood.fat_g) || 0,
        };
        onSelect(food, 1);
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.6)',
            padding: '1rem',
        }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                style={{
                    width: '100%',
                    maxWidth: '500px',
                    maxHeight: '80vh',
                    background: '#1a1a2e',
                    borderRadius: '16px 16px 0 0',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '1rem 1.25rem',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#FF6600', margin: 0 }}>
                        Add to {MEAL_TYPES.find(m => m.key === mealType)?.label}
                    </h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: '0.25rem' }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Toggle: Search / Custom */}
                <div style={{ padding: '0.75rem 1.25rem', display: 'flex', gap: '0.5rem' }}>
                    <button
                        onClick={() => setCustomMode(false)}
                        style={{
                            flex: 1, padding: '0.5rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
                            background: !customMode ? 'rgba(255,102,0,0.15)' : 'rgba(255,255,255,0.05)',
                            color: !customMode ? '#FF6600' : '#888', fontWeight: 500, fontSize: '0.85rem',
                        }}
                    >
                        Search Food
                    </button>
                    <button
                        onClick={() => setCustomMode(true)}
                        style={{
                            flex: 1, padding: '0.5rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
                            background: customMode ? 'rgba(255,102,0,0.15)' : 'rgba(255,255,255,0.05)',
                            color: customMode ? '#FF6600' : '#888', fontWeight: 500, fontSize: '0.85rem',
                        }}
                    >
                        Custom Entry
                    </button>
                </div>

                {!customMode ? (
                    <>
                        {/* Search input */}
                        <div style={{ padding: '0 1.25rem 0.75rem', position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: '1.75rem', top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search foods..."
                                autoFocus
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 1rem 0.75rem 2.5rem',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    color: '#e5e5e7',
                                    fontSize: '0.9rem',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                }}
                            />
                        </div>

                        {/* Results */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '0 1.25rem' }}>
                            {searching && (
                                <div style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>
                                    <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                                </div>
                            )}

                            {!searching && results.length === 0 && query.length >= 2 && (
                                <div style={{ textAlign: 'center', padding: '2rem', color: '#666', fontSize: '0.85rem' }}>
                                    No foods found. Try a different search or add a custom entry.
                                </div>
                            )}

                            {results.map(food => (
                                <button
                                    key={food.id}
                                    onClick={() => { setSelectedFood(food); setServings(1); }}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        background: selectedFood?.id === food.id ? 'rgba(255,102,0,0.08)' : 'transparent',
                                        border: `1px solid ${selectedFood?.id === food.id ? 'rgba(255,102,0,0.3)' : 'rgba(255,255,255,0.04)'}`,
                                        borderRadius: '8px',
                                        color: '#e5e5e7',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        marginBottom: '0.5rem',
                                        display: 'block',
                                    }}
                                >
                                    <div style={{ fontWeight: 500, marginBottom: '0.2rem' }}>{food.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#888', display: 'flex', gap: '0.75rem' }}>
                                        <span>{food.serving_size}{food.serving_unit}</span>
                                        <span style={{ color: '#f59e0b' }}>{food.calories} kcal</span>
                                        <span style={{ color: '#FF6600' }}>P: {food.protein_g}g</span>
                                        <span style={{ color: '#FF6600' }}>C: {food.carbs_g}g</span>
                                        <span style={{ color: '#ff007f' }}>F: {food.fat_g}g</span>
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Serving selector & confirm */}
                        {selectedFood && (
                            <div style={{
                                padding: '1rem 1.25rem',
                                borderTop: '1px solid rgba(255,255,255,0.08)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                            }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: '0.25rem' }}>Servings</div>
                                    <input
                                        type="number"
                                        value={servings}
                                        onChange={(e) => setServings(Math.max(0.25, Number(e.target.value)))}
                                        min="0.25"
                                        step="0.25"
                                        style={{
                                            width: '80px',
                                            padding: '0.5rem',
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '6px',
                                            color: '#e5e5e7',
                                            fontSize: '0.9rem',
                                            textAlign: 'center',
                                        }}
                                    />
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#f59e0b', textAlign: 'right' }}>
                                    {Math.round(selectedFood.calories * servings)} kcal
                                </div>
                                <button
                                    onClick={handleConfirm}
                                    style={{
                                        padding: '0.5rem 1.5rem',
                                        background: '#FF6600',
                                        color: '#000',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.35rem',
                                    }}
                                >
                                    <Check size={16} /> Add
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    /* Custom food entry form */
                    <div style={{ flex: 1, overflowY: 'auto', padding: '0 1.25rem 1.25rem' }}>
                        <div style={{ display: 'grid', gap: '0.75rem' }}>
                            <div>
                                <label style={{ fontSize: '0.75rem', color: '#888', display: 'block', marginBottom: '0.25rem' }}>Food Name *</label>
                                <input
                                    type="text"
                                    value={customFood.name}
                                    onChange={(e) => setCustomFood(p => ({ ...p, name: e.target.value }))}
                                    placeholder="e.g. Protein shake"
                                    style={{
                                        width: '100%', padding: '0.6rem', background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#e5e5e7', fontSize: '0.9rem', boxSizing: 'border-box',
                                    }}
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: '#888', display: 'block', marginBottom: '0.25rem' }}>Serving Size</label>
                                    <input
                                        type="number" value={customFood.serving_size}
                                        onChange={(e) => setCustomFood(p => ({ ...p, serving_size: e.target.value }))}
                                        style={{ width: '100%', padding: '0.6rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#e5e5e7', fontSize: '0.9rem', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: '#888', display: 'block', marginBottom: '0.25rem' }}>Unit</label>
                                    <input
                                        type="text" value={customFood.serving_unit}
                                        onChange={(e) => setCustomFood(p => ({ ...p, serving_unit: e.target.value }))}
                                        style={{ width: '100%', padding: '0.6rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#e5e5e7', fontSize: '0.9rem', boxSizing: 'border-box' }}
                                    />
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', color: '#f59e0b', display: 'block', marginBottom: '0.25rem' }}>Calories</label>
                                <input
                                    type="number" value={customFood.calories}
                                    onChange={(e) => setCustomFood(p => ({ ...p, calories: e.target.value }))}
                                    placeholder="0"
                                    style={{ width: '100%', padding: '0.6rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#e5e5e7', fontSize: '0.9rem', boxSizing: 'border-box' }}
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: '#FF6600', display: 'block', marginBottom: '0.25rem' }}>Protein (g)</label>
                                    <input
                                        type="number" value={customFood.protein_g}
                                        onChange={(e) => setCustomFood(p => ({ ...p, protein_g: e.target.value }))}
                                        placeholder="0"
                                        style={{ width: '100%', padding: '0.6rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#e5e5e7', fontSize: '0.9rem', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: '#FF6600', display: 'block', marginBottom: '0.25rem' }}>Carbs (g)</label>
                                    <input
                                        type="number" value={customFood.carbs_g}
                                        onChange={(e) => setCustomFood(p => ({ ...p, carbs_g: e.target.value }))}
                                        placeholder="0"
                                        style={{ width: '100%', padding: '0.6rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#e5e5e7', fontSize: '0.9rem', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: '#ff007f', display: 'block', marginBottom: '0.25rem' }}>Fat (g)</label>
                                    <input
                                        type="number" value={customFood.fat_g}
                                        onChange={(e) => setCustomFood(p => ({ ...p, fat_g: e.target.value }))}
                                        placeholder="0"
                                        style={{ width: '100%', padding: '0.6rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#e5e5e7', fontSize: '0.9rem', boxSizing: 'border-box' }}
                                    />
                                </div>
                            </div>
                            <button
                                onClick={handleCustomSubmit}
                                disabled={!customFood.name}
                                style={{
                                    padding: '0.75rem',
                                    background: customFood.name ? '#FF6600' : 'rgba(255,102,0,0.3)',
                                    color: '#000',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: 600,
                                    cursor: customFood.name ? 'pointer' : 'not-allowed',
                                    marginTop: '0.5rem',
                                }}
                            >
                                Add Custom Food
                            </button>
                        </div>
                    </div>
                )}
            </motion.div>

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

function MealSection({ mealType, label, logs, onAdd, onDelete }: {
    mealType: FoodLogMealType;
    label: string;
    logs: FoodLog[];
    onAdd: (mealType: FoodLogMealType) => void;
    onDelete: (id: string) => void;
}) {
    const totalCals = logs.reduce((s, l) => s + l.calories, 0);

    return (
        <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '12px',
            overflow: 'hidden',
        }}>
            <div style={{
                padding: '0.75rem 1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: logs.length > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{label}</span>
                    {totalCals > 0 && (
                        <span style={{ fontSize: '0.75rem', color: '#f59e0b' }}>{Math.round(totalCals)} kcal</span>
                    )}
                </div>
                <button
                    onClick={() => onAdd(mealType)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.35rem 0.75rem',
                        background: 'rgba(255,102,0,0.1)',
                        color: '#FF6600',
                        border: '1px solid rgba(255,102,0,0.2)',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: 500,
                        cursor: 'pointer',
                    }}
                >
                    <Plus size={14} /> Add
                </button>
            </div>

            {logs.map(log => (
                <div
                    key={log.id}
                    style={{
                        padding: '0.6rem 1rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: '1px solid rgba(255,255,255,0.03)',
                    }}
                >
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#e5e5e7' }}>{log.food_name}</div>
                        <div style={{ fontSize: '0.7rem', color: '#666', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span>{log.serving_size} {log.serving_unit}</span>
                            <span style={{ color: '#FF6600' }}>P: {Math.round(log.protein_g)}g</span>
                            <span style={{ color: '#FF6600' }}>C: {Math.round(log.carbs_g)}g</span>
                            <span style={{ color: '#ff007f' }}>F: {Math.round(log.fat_g)}g</span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                        <span style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 500 }}>
                            {Math.round(log.calories)} kcal
                        </span>
                        <button
                            onClick={() => onDelete(log.id)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#666',
                                cursor: 'pointer',
                                padding: '0.25rem',
                            }}
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export default function MacroTrackingPage() {
    const router = useRouter();
    const [user, setUser] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(getDateString(new Date()));
    const [foodLogs, setFoodLogs] = useState<FoodLog[]>([]);
    const [targets, setTargets] = useState<MacroTargets | null>(null);
    const [loadingTargets, setLoadingTargets] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [activeMealType, setActiveMealType] = useState<FoodLogMealType>('breakfast');

    // Load user from localStorage
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch {
                router.push('/');
                return;
            }
        } else {
            router.push('/');
            return;
        }
        setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Fetch food logs for selected date
    const fetchLogs = useCallback(async () => {
        if (!user) return;
        try {
            const res = await fetch(`/api/food-logs?userId=${user.id}&date=${selectedDate}`);
            if (res.ok) {
                const data = await res.json();
                setFoodLogs(data.logs || []);
            }
        } catch {
            console.error('Failed to fetch food logs');
        }
    }, [user, selectedDate]);

    useEffect(() => {
        if (user) fetchLogs();
    }, [user, selectedDate, fetchLogs]);

    // Fetch macro targets
    const fetchTargets = useCallback(async () => {
        if (!user) return;
        setLoadingTargets(true);
        try {
            const res = await fetch('/api/nutrition/macro-targets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id }),
            });
            if (res.ok) {
                const data = await res.json();
                setTargets(data.targets);
            }
        } catch {
            console.error('Failed to fetch macro targets');
        } finally {
            setLoadingTargets(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) fetchTargets();
    }, [user, fetchTargets]);

    // Navigate dates
    const changeDate = (delta: number) => {
        const d = new Date(selectedDate + 'T00:00:00');
        d.setDate(d.getDate() + delta);
        setSelectedDate(getDateString(d));
    };

    // Add food
    const handleAddFood = (mealType: FoodLogMealType) => {
        setActiveMealType(mealType);
        setModalOpen(true);
    };

    const handleSelectFood = async (food: FoodItem, servings: number) => {
        if (!user) return;
        setModalOpen(false);

        try {
            const res = await fetch('/api/food-logs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: user.id,
                    food_id: food.id.startsWith('custom_') ? undefined : food.id,
                    food_name: food.name,
                    meal_type: activeMealType,
                    serving_size: servings,
                    serving_unit: food.serving_unit,
                    calories: Math.round(food.calories * servings),
                    protein_g: Math.round(food.protein_g * servings * 10) / 10,
                    carbs_g: Math.round(food.carbs_g * servings * 10) / 10,
                    fat_g: Math.round(food.fat_g * servings * 10) / 10,
                    logged_date: selectedDate,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setFoodLogs(prev => [...prev, data.log]);
            }
        } catch {
            console.error('Failed to log food');
        }
    };

    // Delete food log
    const handleDeleteLog = async (id: string) => {
        try {
            const res = await fetch(`/api/food-logs?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                setFoodLogs(prev => prev.filter(l => l.id !== id));
            }
        } catch {
            console.error('Failed to delete food log');
        }
    };

    // Calculate daily totals
    const dailyTotals = foodLogs.reduce(
        (acc, log) => ({
            calories: acc.calories + log.calories,
            protein_g: acc.protein_g + log.protein_g,
            carbs_g: acc.carbs_g + log.carbs_g,
            fat_g: acc.fat_g + log.fat_g,
        }),
        { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
    );

    // Group logs by meal type
    const logsByMeal: Record<FoodLogMealType, FoodLog[]> = {
        breakfast: foodLogs.filter(l => l.meal_type === 'breakfast'),
        lunch: foodLogs.filter(l => l.meal_type === 'lunch'),
        dinner: foodLogs.filter(l => l.meal_type === 'dinner'),
        snack: foodLogs.filter(l => l.meal_type === 'snack'),
    };

    if (loading && !user) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem 1rem' }}>
            {/* Page Header */}
            <div style={{ marginBottom: '1.5rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#FF6600', marginBottom: '0.25rem' }}>
                    Macro Tracking
                </h1>
                <p style={{ color: '#888', fontSize: '0.85rem' }}>
                    Log your daily food intake and track macros
                </p>
            </div>

            {/* Date Navigator */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1rem',
                marginBottom: '1.5rem',
            }}>
                <button
                    onClick={() => changeDate(-1)}
                    aria-label="Previous day"
                    style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        padding: '0.5rem',
                        color: '#888',
                        cursor: 'pointer',
                    }}
                >
                    <ChevronLeft size={18} />
                </button>
                <span style={{ fontWeight: 600, fontSize: '1rem', minWidth: '140px', textAlign: 'center' }}>
                    {formatDate(selectedDate)}
                </span>
                <button
                    onClick={() => changeDate(1)}
                    aria-label="Next day"
                    style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        padding: '0.5rem',
                        color: '#888',
                        cursor: 'pointer',
                    }}
                >
                    <ChevronRight size={18} />
                </button>
            </div>

            {/* Macro Progress Summary */}
            <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px',
                padding: '1rem 1.25rem',
                marginBottom: '1.5rem',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <Target size={16} style={{ color: '#FF6600' }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e5e5e7' }}>Daily Progress</span>
                    {loadingTargets && <Loader2 size={14} style={{ color: '#888', animation: 'spin 1s linear infinite' }} />}
                    {targets?.training_phase && (
                        <span style={{
                            fontSize: '0.65rem',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '12px',
                            background: 'rgba(255,102,0,0.1)',
                            color: '#FF6600',
                            textTransform: 'capitalize',
                            marginLeft: 'auto',
                        }}>
                            {targets.training_phase} phase
                        </span>
                    )}
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <MacroProgressBar
                        label="Calories"
                        current={dailyTotals.calories}
                        target={targets?.daily_calories || 2000}
                        color="#f59e0b"
                        unit=" kcal"
                        icon={Flame}
                    />
                    <MacroProgressBar
                        label="Protein"
                        current={dailyTotals.protein_g}
                        target={targets?.protein_g || 150}
                        color="#FF6600"
                        unit="g"
                        icon={Beef}
                    />
                    <MacroProgressBar
                        label="Carbs"
                        current={dailyTotals.carbs_g}
                        target={targets?.carbs_g || 200}
                        color="#FF6600"
                        unit="g"
                        icon={Wheat}
                    />
                    <MacroProgressBar
                        label="Fat"
                        current={dailyTotals.fat_g}
                        target={targets?.fat_g || 65}
                        color="#ff007f"
                        unit="g"
                        icon={Droplets}
                    />
                </div>
            </div>

            {/* Meal Sections */}
            <div style={{ display: 'grid', gap: '0.75rem' }}>
                {MEAL_TYPES.map(({ key, label }) => (
                    <MealSection
                        key={key}
                        mealType={key}
                        label={label}
                        logs={logsByMeal[key]}
                        onAdd={handleAddFood}
                        onDelete={handleDeleteLog}
                    />
                ))}
            </div>

            {/* Link back to nutrition plans */}
            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                <button
                    onClick={() => router.push('/nutrition')}
                    style={{
                        padding: '0.5rem 1.5rem',
                        background: 'transparent',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: '#888',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                    }}
                >
                    View Meal Plans
                </button>
            </div>

            {/* Food Search Modal */}
            <AnimatePresence>
                {modalOpen && (
                    <FoodSearchModal
                        isOpen={modalOpen}
                        onClose={() => setModalOpen(false)}
                        onSelect={handleSelectFood}
                        mealType={activeMealType}
                    />
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
