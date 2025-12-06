"use client"

import { useState } from "react";

interface NoteProps {
    id: string;
    onSave?: (content: string) => Promise<void>
}

export function Note({ id, onSave }: NoteProps) {
    const [content, setContent] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    async function handleSave() {
        if (!content.trim()) {
            setError("Note cannot be empty");
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            if (onSave) {
                await onSave(content);
            }
            setLastSaved(new Date());
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save note");
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <>
            {/* Toggle Button - visible when closed */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed right-4 top-1/2 transform -translate-y-1/2 z-50 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-l-lg shadow-lg transition-all duration-300"
                    title="Open Notes"
                >
                    📝
                </button>
            )}

            {/* Note Taker Panel - visible when open */}
            {isOpen && (
                <div className="fixed right-0 top-0 h-screen w-96 flex flex-col gap-4 p-6 bg-white shadow-lg border-l border-gray-200 overflow-y-auto z-40">
                    <div className="flex justify-between items-center">
                        <label htmlFor={id} className="font-bold text-lg text-gray-800">
                            Notes
                        </label>
                        <div className="flex items-center gap-2">
                            {lastSaved && (
                                <span className="text-xs text-gray-500">
                                    {lastSaved.toLocaleTimeString()}
                                </span>
                            )}
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-gray-600 hover:text-gray-800 text-lg leading-none"
                                title="Close Notes"
                            >
                                ×
                            </button>
                        </div>
                    </div>

                    <textarea
                        id={id}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Write your notes here..."
                        className="flex-1 p-3 border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                        disabled={isSaving}
                    />

                    {error && <div className="text-red-600 text-sm font-medium">{error}</div>}

                    <button
                        onClick={handleSave}
                        disabled={isSaving || !content.trim()}
                        className="w-full py-2 px-4 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                        {isSaving ? "Saving..." : "Save Note"}
                    </button>
                </div>
            )}
        </>
    );
}