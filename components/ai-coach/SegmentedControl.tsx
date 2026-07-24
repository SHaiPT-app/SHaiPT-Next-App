'use client';

import { useRef, useEffect, useState } from 'react';

export interface SegmentedControlTab {
    id: string;
    label: string;
    icon?: React.ReactNode;
}

interface SegmentedControlProps {
    tabs: SegmentedControlTab[];
    activeTab: string;
    onTabChange: (tabId: string) => void;
    disabled?: boolean;
}

export default function SegmentedControl({
    tabs,
    activeTab,
    onTabChange,
    disabled = false,
}: SegmentedControlProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number }>({ left: 3, width: 0 });

    useEffect(() => {
        if (!containerRef.current) return;
        const activeIndex = tabs.findIndex(t => t.id === activeTab);
        if (activeIndex < 0) return;

        const buttons = containerRef.current.querySelectorAll<HTMLButtonElement>('[data-seg-tab]');
        const btn = buttons[activeIndex];
        if (btn) {
            setIndicatorStyle({
                left: btn.offsetLeft,
                width: btn.offsetWidth,
            });
        }
    }, [activeTab, tabs]);

    return (
        <div
            ref={containerRef}
            className={`relative flex rounded-[10px] border border-line-soft bg-[var(--surface-1)] p-[3px] ${
                disabled ? 'pointer-events-none opacity-50' : ''
            }`}
        >
            <div
                className="absolute bottom-[3px] top-[3px] rounded-lg bg-[image:var(--brand-gradient)] shadow-[0_0_16px_var(--brand-glow-soft)] transition-[left,width] duration-[250ms] ease-in-out"
                style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
            />
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    data-seg-tab
                    data-active={tab.id === activeTab ? 'true' : 'false'}
                    className={`relative z-[1] flex flex-1 cursor-pointer items-center justify-center gap-[0.35rem] rounded-lg border-none bg-transparent px-4 py-2 text-center font-display text-[0.8rem] font-semibold transition-colors duration-200 ${
                        tab.id === activeTab ? 'text-white' : 'text-ink-low hover:text-ink-mid'
                    }`}
                    onClick={() => onTabChange(tab.id)}
                    disabled={disabled}
                >
                    {tab.icon}
                    {tab.label}
                </button>
            ))}
        </div>
    );
}
