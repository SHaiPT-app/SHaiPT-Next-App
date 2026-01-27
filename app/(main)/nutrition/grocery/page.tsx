'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShoppingCart,
    Check,
    Trash2,
    RefreshCw,
    ChevronDown,
    ChevronRight,
    ArrowLeft,
    Loader2,
    Package,
} from 'lucide-react';
import type { Profile, GroceryList, GroceryListItem } from '@/lib/types';

// ============================================
// CONSTANTS
// ============================================

const CATEGORY_COLORS: Record<string, string> = {
    proteins: '#39ff14',
    dairy: '#00d4ff',
    vegetables: '#10b981',
    fruits: '#f59e0b',
    grains: '#c084fc',
    pantry: '#818cf8',
    other: '#888',
};

const CATEGORY_LABELS: Record<string, string> = {
    proteins: 'Proteins',
    dairy: 'Dairy',
    vegetables: 'Vegetables',
    fruits: 'Fruits',
    grains: 'Grains & Starches',
    pantry: 'Pantry Staples',
    other: 'Other',
};

const CATEGORY_ORDER = ['proteins', 'vegetables', 'fruits', 'dairy', 'grains', 'pantry', 'other'];

// ============================================
// SUB-COMPONENTS
// ============================================

function GroceryItemRow({
    item,
    onToggle,
}: {
    item: GroceryListItem;
    onToggle: () => void;
}) {
    return (
        <button
            onClick={onToggle}
            style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.6rem 0.75rem',
                background: item.checked ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.03)',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'left',
                color: 'inherit',
                transition: 'background 0.15s',
            }}
        >
            <div
                style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '4px',
                    border: `2px solid ${item.checked ? '#39ff14' : 'rgba(255,255,255,0.2)'}`,
                    background: item.checked ? 'rgba(57, 255, 20, 0.15)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 0.15s',
                }}
            >
                {item.checked && <Check size={12} color="#39ff14" />}
            </div>
            <div style={{ flex: 1 }}>
                <span
                    style={{
                        fontSize: '0.9rem',
                        color: item.checked ? '#555' : '#e5e5e7',
                        textDecoration: item.checked ? 'line-through' : 'none',
                        transition: 'color 0.15s',
                    }}
                >
                    {item.name}
                </span>
                {item.quantity && item.quantity !== item.name && (
                    <span style={{ fontSize: '0.75rem', color: '#666', marginLeft: '0.5rem' }}>
                        ({item.quantity})
                    </span>
                )}
            </div>
        </button>
    );
}

function CategorySection({
    category,
    items,
    onToggleItem,
}: {
    category: string;
    items: GroceryListItem[];
    onToggleItem: (itemName: string) => void;
}) {
    const [expanded, setExpanded] = useState(true);
    const color = CATEGORY_COLORS[category] || '#888';
    const label = CATEGORY_LABELS[category] || category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const checkedCount = items.filter(i => i.checked).length;

    return (
        <div
            style={{
                background: 'rgba(255,255,255,0.02)',
                border: `1px solid ${color}22`,
                borderRadius: '12px',
                overflow: 'hidden',
            }}
        >
            <button
                onClick={() => setExpanded(!expanded)}
                style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'transparent',
                    border: 'none',
                    color: 'inherit',
                    cursor: 'pointer',
                    textAlign: 'left',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                        style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: color,
                            flexShrink: 0,
                        }}
                    />
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color }}>{label}</span>
                    <span style={{ fontSize: '0.75rem', color: '#666' }}>
                        {checkedCount}/{items.length}
                    </span>
                </div>
                {expanded ? <ChevronDown size={16} color="#888" /> : <ChevronRight size={16} color="#888" />}
            </button>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div style={{ padding: '0 0.75rem 0.75rem', display: 'grid', gap: '0.25rem' }}>
                            {items.map(item => (
                                <GroceryItemRow
                                    key={item.name}
                                    item={item}
                                    onToggle={() => onToggleItem(item.name)}
                                />
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export default function GroceryListPage() {
    const router = useRouter();
    const [user, setUser] = useState<Profile | null>(null);
    const [groceryList, setGroceryList] = useState<GroceryList | null>(null);
    const [allLists, setAllLists] = useState<GroceryList[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

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

    // Fetch existing grocery lists
    const fetchLists = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/grocery-lists?userId=${user.id}`);
            if (res.ok) {
                const data = await res.json();
                setAllLists(data.lists || []);
                if (data.lists && data.lists.length > 0) {
                    setGroceryList(data.lists[0]); // most recent
                }
            }
        } catch (err) {
            console.error('Failed to fetch grocery lists:', err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            fetchLists();
        }
    }, [user, fetchLists]);

    // Generate new grocery list from active meal plan
    const handleGenerate = async () => {
        if (!user) return;
        setGenerating(true);
        setError(null);

        try {
            const res = await fetch('/api/grocery-lists/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to generate grocery list');
            }

            const data = await res.json();
            setGroceryList(data.list);
            setAllLists(prev => [data.list, ...prev]);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate grocery list');
        } finally {
            setGenerating(false);
        }
    };

    // Toggle item checked state
    const handleToggleItem = async (itemName: string) => {
        if (!groceryList) return;

        const updatedItems = groceryList.items.map(item =>
            item.name === itemName ? { ...item, checked: !item.checked } : item
        );

        setGroceryList({ ...groceryList, items: updatedItems });

        // Persist update
        setSaving(true);
        try {
            await fetch('/api/grocery-lists', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: groceryList.id, items: updatedItems }),
            });
        } catch (err) {
            console.error('Failed to save item toggle:', err);
        } finally {
            setSaving(false);
        }
    };

    // Delete grocery list
    const handleDelete = async (listId: string) => {
        try {
            const res = await fetch(`/api/grocery-lists?id=${listId}`, { method: 'DELETE' });
            if (res.ok) {
                setAllLists(prev => prev.filter(l => l.id !== listId));
                if (groceryList?.id === listId) {
                    const remaining = allLists.filter(l => l.id !== listId);
                    setGroceryList(remaining.length > 0 ? remaining[0] : null);
                }
            }
        } catch (err) {
            console.error('Failed to delete grocery list:', err);
        }
    };

    // Group items by category
    const groupedItems: Record<string, GroceryListItem[]> = {};
    if (groceryList?.items) {
        for (const item of groceryList.items) {
            const cat = item.category || 'other';
            if (!groupedItems[cat]) groupedItems[cat] = [];
            groupedItems[cat].push(item);
        }
    }

    const sortedCategories = CATEGORY_ORDER.filter(c => groupedItems[c]?.length > 0);
    // Add any categories not in our order
    for (const cat of Object.keys(groupedItems)) {
        if (!sortedCategories.includes(cat)) sortedCategories.push(cat);
    }

    const totalItems = groceryList?.items?.length || 0;
    const checkedItems = groceryList?.items?.filter(i => i.checked).length || 0;
    const progressPct = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;

    if (loading && !user) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '60vh',
            }}>
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div style={{
            maxWidth: '700px',
            margin: '0 auto',
            padding: '2rem 1rem',
        }}>
            {/* Page Header */}
            <div style={{ marginBottom: '1.5rem' }}>
                <button
                    onClick={() => router.push('/nutrition')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        background: 'none',
                        border: 'none',
                        color: '#888',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        padding: 0,
                        marginBottom: '1rem',
                    }}
                >
                    <ArrowLeft size={14} />
                    Back to Nutrition
                </button>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div>
                        <h1 style={{
                            fontSize: '1.75rem',
                            fontWeight: 700,
                            color: '#39ff14',
                            marginBottom: '0.5rem',
                        }}>
                            Grocery List
                        </h1>
                        <p style={{ color: '#888', fontSize: '0.9rem' }}>
                            Auto-generated from your active meal plan
                        </p>
                    </div>
                    <button
                        onClick={handleGenerate}
                        disabled={generating}
                        style={{
                            padding: '0.5rem 1.25rem',
                            background: generating ? 'rgba(57, 255, 20, 0.05)' : 'rgba(57, 255, 20, 0.1)',
                            color: '#39ff14',
                            border: '1px solid rgba(57, 255, 20, 0.2)',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            cursor: generating ? 'not-allowed' : 'pointer',
                            opacity: generating ? 0.6 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            flexShrink: 0,
                        }}
                    >
                        {generating ? (
                            <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                        ) : (
                            <RefreshCw size={14} />
                        )}
                        {groceryList ? 'Regenerate' : 'Generate'}
                    </button>
                </div>
            </div>

            {/* Error state */}
            {error && (
                <div style={{
                    padding: '1rem',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '8px',
                    color: '#ef4444',
                    marginBottom: '1.5rem',
                    fontSize: '0.9rem',
                }}>
                    {error}
                </div>
            )}

            {/* Loading state */}
            {loading && user && (
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: '40vh',
                }}>
                    <div className="spinner" />
                </div>
            )}

            {/* Empty state */}
            {!loading && !groceryList && (
                <div style={{
                    textAlign: 'center',
                    padding: '4rem 2rem',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.06)',
                }}>
                    <ShoppingCart size={48} style={{ color: '#39ff14', marginBottom: '1.5rem', opacity: 0.7 }} />
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                        No grocery list yet
                    </h2>
                    <p style={{ color: '#888', marginBottom: '2rem', maxWidth: '400px', margin: '0 auto 2rem' }}>
                        Generate a grocery list from your active meal plan. All ingredients will be organized by category for easy shopping.
                    </p>
                    <button
                        onClick={handleGenerate}
                        disabled={generating}
                        style={{
                            padding: '0.75rem 2rem',
                            background: '#39ff14',
                            color: '#000',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 600,
                            fontSize: '1rem',
                            cursor: generating ? 'not-allowed' : 'pointer',
                            opacity: generating ? 0.6 : 1,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                        }}
                    >
                        {generating ? (
                            <>
                                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                                Generating...
                            </>
                        ) : (
                            'Generate Grocery List'
                        )}
                    </button>
                </div>
            )}

            {/* Grocery list content */}
            {!loading && groceryList && (
                <div style={{ display: 'grid', gap: '1rem' }}>
                    {/* Progress bar */}
                    <div style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '12px',
                        padding: '1rem 1.25rem',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Package size={16} color="#39ff14" />
                                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                                    {groceryList.name}
                                </span>
                                {saving && (
                                    <span style={{ fontSize: '0.7rem', color: '#888' }}>Saving...</span>
                                )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <span style={{ fontSize: '0.8rem', color: '#39ff14', fontWeight: 600 }}>
                                    {checkedItems}/{totalItems} items
                                </span>
                                <button
                                    onClick={() => handleDelete(groceryList.id)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#666',
                                        cursor: 'pointer',
                                        padding: '0.25rem',
                                        display: 'flex',
                                    }}
                                    title="Delete list"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>

                        {/* Progress bar */}
                        <div style={{
                            width: '100%',
                            height: '6px',
                            background: 'rgba(255,255,255,0.06)',
                            borderRadius: '3px',
                            overflow: 'hidden',
                        }}>
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${progressPct}%` }}
                                transition={{ duration: 0.3 }}
                                style={{
                                    height: '100%',
                                    background: progressPct === 100 ? '#39ff14' : 'rgba(57, 255, 20, 0.6)',
                                    borderRadius: '3px',
                                }}
                            />
                        </div>
                    </div>

                    {/* List selector if multiple lists */}
                    {allLists.length > 1 && (
                        <div style={{
                            display: 'flex',
                            gap: '0.5rem',
                            overflowX: 'auto',
                            paddingBottom: '0.25rem',
                        }}>
                            {allLists.map(list => (
                                <button
                                    key={list.id}
                                    onClick={() => setGroceryList(list)}
                                    style={{
                                        padding: '0.35rem 0.75rem',
                                        borderRadius: '20px',
                                        border: `1px solid ${groceryList.id === list.id ? '#39ff14' : 'rgba(255,255,255,0.1)'}`,
                                        background: groceryList.id === list.id ? 'rgba(57, 255, 20, 0.15)' : 'transparent',
                                        color: groceryList.id === list.id ? '#39ff14' : '#888',
                                        fontSize: '0.75rem',
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap',
                                        flexShrink: 0,
                                    }}
                                >
                                    {list.name || 'Grocery List'}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Category sections */}
                    {sortedCategories.map(category => (
                        <CategorySection
                            key={category}
                            category={category}
                            items={groupedItems[category]}
                            onToggleItem={handleToggleItem}
                        />
                    ))}
                </div>
            )}

            {/* Spin animation keyframes */}
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
