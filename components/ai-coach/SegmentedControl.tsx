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
            className="segmented-control"
            style={{ opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? 'none' : 'auto' }}
        >
            <div
                className="segmented-control-indicator"
                style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
            />
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    data-seg-tab
                    data-active={tab.id === activeTab ? 'true' : 'false'}
                    className="segmented-control-tab"
                    onClick={() => onTabChange(tab.id)}
                    disabled={disabled}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                >
                    {tab.icon}
                    {tab.label}
                </button>
            ))}
        </div>
    );
}
