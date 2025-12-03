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
        <div className="note-container">
            <div className="items">
            <label htmlFor={id} className="note-text">
                Notes:
            </label>
            {lastSaved && (
            <span className="save-text">
                Saved {lastSaved.toLocaleTimeString()}
            </span>
            )}
            </div>

            <textarea
            id={id}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your notes here..."
            className="note-area"
            disabled={isSaving}
            />

            {error && <div className="error-text">{error}</div>}

            <button
            onClick={handleSave}
            disabled={isSaving || !content.trim()}
            className="note-button"
            >
                {isSaving ? "Saving..." : "Save Note"}
            </button>
        </div>
    );
}