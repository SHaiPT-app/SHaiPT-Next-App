'use client';

import { useCallback } from 'react';

interface QuickReplyChipsProps {
    options: string[];
    selected: string[];
    onSelect: (selected: string[]) => void;
    multiSelect?: boolean;
    maxSelections?: number;
    onSubmit?: () => void;
}

export default function QuickReplyChips({
    options,
    selected,
    onSelect,
    multiSelect = false,
    maxSelections = 3,
    onSubmit,
}: QuickReplyChipsProps) {
    const handleClick = useCallback(
        (option: string) => {
            if (multiSelect) {
                const idx = selected.indexOf(option);
                if (idx >= 0) {
                    // Remove
                    onSelect(selected.filter(s => s !== option));
                } else if (selected.length < maxSelections) {
                    // Add
                    onSelect([...selected, option]);
                }
            } else {
                onSelect([option]);
                onSubmit?.();
            }
        },
        [selected, onSelect, multiSelect, maxSelections, onSubmit]
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.4rem',
                    overflowX: 'auto',
                    WebkitOverflowScrolling: 'touch',
                    scrollbarWidth: 'none',
                    padding: '0.25rem 0',
                }}
            >
                {options.map(option => {
                    const selIdx = selected.indexOf(option);
                    const isSelected = selIdx >= 0;

                    return (
                        <button
                            key={option}
                            type="button"
                            className="quick-reply-chip"
                            data-selected={isSelected ? 'true' : 'false'}
                            onClick={() => handleClick(option)}
                        >
                            {multiSelect && isSelected && (
                                <span className="quick-reply-chip-badge">{selIdx + 1}</span>
                            )}
                            {option}
                        </button>
                    );
                })}
            </div>
            {multiSelect && selected.length > 0 && (
                <button
                    type="button"
                    onClick={onSubmit}
                    style={{
                        alignSelf: 'flex-end',
                        padding: '0.4rem 1rem',
                        background: '#FF6600',
                        color: '#0B0B15',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                    }}
                >
                    Confirm ({selected.length})
                </button>
            )}
        </div>
    );
}
