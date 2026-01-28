'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Save } from 'lucide-react';

interface ExerciseNotesProps {
    notes?: string;
    onSave: (notes: string) => void;
    placeholder?: string;
}

export function ExerciseNotes({
    notes = '',
    onSave,
    placeholder = 'Add notes for this exercise...',
}: ExerciseNotesProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [localNotes, setLocalNotes] = useState(notes);

    useEffect(() => {
        setLocalNotes(notes);
    }, [notes]);

    const handleSave = () => {
        onSave(localNotes);
        setIsOpen(false);
    };

    return (
        <>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(true)}
                className={`
                    flex items-center gap-2 px-3 py-2 rounded-lg transition-colors
                    ${notes
                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                        : 'bg-gray-800 text-gray-400 hover:text-white'
                    }
                `}
            >
                <MessageSquare className="w-4 h-4" />
                <span className="text-sm">
                    {notes ? 'View Notes' : 'Add Notes'}
                </span>
            </button>

            {/* Modal */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) setIsOpen(false);
                        }}
                    >
                        <motion.div
                            initial={{ y: 100, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 100, opacity: 0 }}
                            className="w-full max-w-lg bg-gray-900 rounded-t-2xl sm:rounded-2xl border border-gray-800 overflow-hidden"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-gray-800">
                                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                    <MessageSquare className="w-5 h-5 text-cyan-400" />
                                    Exercise Notes
                                </h3>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-4">
                                <textarea
                                    value={localNotes}
                                    onChange={(e) => setLocalNotes(e.target.value)}
                                    placeholder={placeholder}
                                    rows={6}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white placeholder-gray-500
                                             resize-none focus:outline-none focus:border-cyan-500"
                                />

                                <div className="mt-2 text-xs text-gray-500">
                                    Tips: Note any form cues, adjustments, or how the exercise felt.
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="p-4 border-t border-gray-800 flex gap-3">
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="flex-1 py-2.5 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="flex-1 py-2.5 rounded-lg bg-cyan-500 text-white hover:bg-cyan-600 flex items-center justify-center gap-2"
                                >
                                    <Save className="w-4 h-4" />
                                    Save Notes
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

export default ExerciseNotes;
