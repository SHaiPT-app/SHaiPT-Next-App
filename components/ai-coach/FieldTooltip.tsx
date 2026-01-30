'use client';

import { useState } from 'react';

interface FieldTooltipProps {
    text: string;
}

export default function FieldTooltip({ text }: FieldTooltipProps) {
    const [show, setShow] = useState(false);

    return (
        <span
            className="field-tooltip"
            onMouseEnter={() => setShow(true)}
            onMouseLeave={() => setShow(false)}
            onClick={() => setShow(prev => !prev)}
        >
            i
            {show && <span className="field-tooltip-content">{text}</span>}
        </span>
    );
}
