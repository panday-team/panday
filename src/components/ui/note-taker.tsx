"use client"

import { useState } from "react";

export function Note() {
    const [content, setContent] = useState("");
    const [error, setError] = useState(null);

    async function handleSave() {
    if (!content.trim()) {
      return;
    }

    setError(null);
}

    return (
        <div className="note-container">
            <div className="items">
            <span className="save-text"></span>
            </div>
            <textarea
            className="note-area"
            />
            <button
            onClick={handleSave}
            className="note-button"
            />
        </div>
    );
}