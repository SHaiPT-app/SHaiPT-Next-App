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
        <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-[0.4rem] overflow-x-auto py-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none]">
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
                    className="self-end cursor-pointer rounded-lg border-none bg-brand px-4 py-[0.4rem] text-[0.8rem] font-semibold text-white transition-colors hover:bg-brand-deep"
                >
                    Confirm ({selected.length})
                </button>
            )}
        </div>
    );
}
