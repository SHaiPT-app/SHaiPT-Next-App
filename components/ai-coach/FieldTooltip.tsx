'use client';

import { useState } from 'react';

interface FieldTooltipProps {
    text: string;
}

export default function FieldTooltip({ text }: FieldTooltipProps) {
    const [show, setShow] = useState(false);

    return (
        <span
            className="relative inline-flex h-[18px] w-[18px] shrink-0 cursor-help items-center justify-center rounded-full bg-[var(--line-soft)] text-[0.65rem] font-bold text-ink-low"
            onMouseEnter={() => setShow(true)}
            onMouseLeave={() => setShow(false)}
            onClick={() => setShow(prev => !prev)}
        >
            i
            {show && (
                <span className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-[100] w-max max-w-[220px] -translate-x-1/2 whitespace-normal rounded-lg border border-line-soft bg-[var(--surface-2)] px-3 py-2 text-xs font-normal leading-snug text-ink-mid shadow-lg backdrop-blur-md">
                    {text}
                </span>
            )}
        </span>
    );
}
