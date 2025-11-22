import { useState, useRef, useCallback } from "react";
import { logger } from "@/lib/logger";

type VoiceRecordingState = {
  isRecording: boolean;
  isTranscribing: boolean;
  error: string | null;
};

type TranscriptionResponse = {
  transcript: string;
  language: string;
  translation?: string;
  finalText: string;
};

export function useVoiceRecording() {
  const [state, setState] = useState<VoiceRecordingState>({
    isRecording: false,
    isTranscribing: false,
    error: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Determine supported MIME type
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/ogg")
          ? "audio/ogg"
          : "audio/wav";

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setState({ isRecording: true, isTranscribing: false, error: null });

      logger.info("Voice recording started", { mimeType });
    } catch (error) {
      logger.error("Failed to start recording", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to access microphone";
      setState({ isRecording: false, isTranscribing: false, error: errorMessage });
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current;
      if (!mediaRecorder || mediaRecorder.state === "inactive") {
        resolve(null);
        return;
      }

      mediaRecorder.onstop = async () => {
        // Stop all tracks to release microphone
        mediaRecorder.stream.getTracks().forEach((track) => track.stop());

        // Create audio blob from chunks
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType,
        });

        logger.info("Voice recording stopped", {
          blobSize: audioBlob.size,
          mimeType: audioBlob.type,
        });

        // Check if recording is too short
        if (audioBlob.size < 1000) {
          setState({
            isRecording: false,
            isTranscribing: false,
            error: "Recording too short. Please try again.",
          });
          resolve(null);
          return;
        }

        // Upload and transcribe
        setState({ isRecording: false, isTranscribing: true, error: null });

        try {
          const formData = new FormData();
          formData.append("audio", audioBlob, "recording.webm");

          const response = await fetch("/api/transcribe", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            const errorData: unknown = await response.json().catch(() => null);
            const message =
              typeof errorData === "object" &&
              errorData !== null &&
              "error" in errorData &&
              typeof (errorData as { error?: unknown }).error === "string"
                ? (errorData as { error?: string }).error
                : `Transcription failed: ${response.statusText}`;

            throw new Error(message);
          }

          const dataJson: unknown = await response.json();
          const data = dataJson as TranscriptionResponse;
          logger.info("Transcription successful", {
            language: data.language,
            hasTranslation: !!data.translation,
          });

          setState({ isRecording: false, isTranscribing: false, error: null });
          resolve(data.finalText);
        } catch (error) {
          logger.error("Failed to transcribe audio", error);
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Failed to transcribe audio";
          setState({
            isRecording: false,
            isTranscribing: false,
            error: errorMessage,
          });
          resolve(null);
        }
      };

      mediaRecorder.stop();
    });
  }, []);

  const cancelRecording = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current;
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stream.getTracks().forEach((track) => track.stop());
      mediaRecorder.stop();
      audioChunksRef.current = [];
    }
    setState({ isRecording: false, isTranscribing: false, error: null });
  }, []);

  return {
    isRecording: state.isRecording,
    isTranscribing: state.isTranscribing,
    error: state.error,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
