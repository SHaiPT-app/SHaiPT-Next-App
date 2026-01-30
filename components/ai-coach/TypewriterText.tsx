'use client';

import { useState, useEffect, useRef } from 'react';

interface TypewriterTextProps {
    text: string;
    speed?: number; // ms per character
    onComplete?: () => void;
    className?: string;
    style?: React.CSSProperties;
}

export default function TypewriterText({
    text,
    speed = 20,
    onComplete,
    className,
    style,
}: TypewriterTextProps) {
    const [displayed, setDisplayed] = useState('');
    const [isComplete, setIsComplete] = useState(false);
    const prevTextRef = useRef('');

    useEffect(() => {
        // If text is the same or got shorter, display immediately
        if (text.length <= prevTextRef.current.length) {
            setDisplayed(text);
            setIsComplete(true);
            prevTextRef.current = text;
            return;
        }

        // Type out only the new portion
        const startIdx = prevTextRef.current.length;
        setIsComplete(false);
        let idx = startIdx;

        const interval = setInterval(() => {
            idx++;
            if (idx >= text.length) {
                setDisplayed(text);
                setIsComplete(true);
                clearInterval(interval);
                onComplete?.();
            } else {
                setDisplayed(text.slice(0, idx));
            }
        }, speed);

        prevTextRef.current = text;

        return () => clearInterval(interval);
    }, [text, speed, onComplete]);

    return (
        <span className={className} style={style}>
            {displayed}
            {!isComplete && (
                <span
                    style={{
                        display: 'inline-block',
                        width: '2px',
                        height: '1em',
                        background: 'var(--neon-orange)',
                        marginLeft: '1px',
                        verticalAlign: 'text-bottom',
                        animation: 'typewriter-cursor 0.8s infinite',
                    }}
                />
            )}
        </span>
    );
}
