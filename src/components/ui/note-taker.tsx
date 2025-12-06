"use client"

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
                <Button
                    onClick={() => setIsOpen(true)}
                    variant="default"
                    size="icon"
                    className="fixed right-4 top-1/2 transform -translate-y-1/2 z-50 rounded-l-lg"
                    title="Open Notes"
                >
                    📝
                </Button>
            )}

            {/* Note Taker Panel - visible when open */}
            {isOpen && (
                <div className="fixed right-0 top-0 h-screen w-96 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-l border-border shadow-xl z-40">
                    <Card className="h-full rounded-none border-0 border-l shadow-none">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                            <CardTitle className="text-lg font-semibold">
                                Notes
                            </CardTitle>
                            <div className="flex items-center gap-2">
                                {lastSaved && (
                                    <span className="text-xs text-muted-foreground">
                                        {lastSaved.toLocaleTimeString()}
                                    </span>
                                )}
                                <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => setIsOpen(false)}
                                    title="Close Notes"
                                >
                                    ×
                                </Button>
                            </div>
                        </CardHeader>
                        
                        <CardContent className="flex flex-col gap-4 p-6 pt-0 flex-1">
                            <div className="flex-1 flex flex-col gap-4">
                                <textarea
                                    id={id}
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="Write your notes here..."
                                    className={cn(
                                        "flex-1 min-h-[200px] resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                                        isSaving && "opacity-60"
                                    )}
                                    disabled={isSaving}
                                />

                                {error && (
                                    <div className="text-sm text-destructive font-medium">
                                        {error}
                                    </div>
                                )}
                            </div>

                            <Button
                                onClick={handleSave}
                                disabled={isSaving || !content.trim()}
                                className="w-full"
                                variant="default"
                            >
                                {isSaving ? "Saving..." : "Save Note"}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            )}
        </>
    );
}