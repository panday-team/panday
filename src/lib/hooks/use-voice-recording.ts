import { useState, useRef, useCallback, useEffect } from "react";
import { logger } from "@/lib/logger";
import { VOICE_CONFIG } from "@/lib/chat-config";
import { z } from "zod";

type VoiceRecordingState = {
  isRecording: boolean;
  isTranscribing: boolean;
  error: string | null;
};

/**
 * Zod schema for transcription API response
 * Matches the server-side TranscriptionResponse type
 */
const TranscriptionResponseSchema = z.object({
  transcript: z.string(),
  language: z.string(),
  translation: z.string().optional(),
  finalText: z.string(),
});

/**
 * Hook for voice recording with OpenAI Whisper transcription
 *
 * Features:
 * - Automatic MIME type detection (webm > ogg > wav)
 * - Recording duration limit (2 minutes max)
 * - Audio bitrate optimization (128kbps)
 * - Proper cleanup on unmount
 * - Memory leak prevention (clears audio chunks after upload)
 * - Type-safe API responses with Zod validation
 *
 * @returns Voice recording controls and state
 */
export function useVoiceRecording() {
  const [state, setState] = useState<VoiceRecordingState>({
    isRecording: false,
    isTranscribing: false,
    error: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Cleanup function to stop recording and release resources
   */
  const cleanup = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current;
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stream.getTracks().forEach((track) => track.stop());
      if (mediaRecorder.state === "recording") {
        mediaRecorder.stop();
      }
    }
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
    audioChunksRef.current = [];
    mediaRecorderRef.current = null;
  }, []);

  /**
   * Cleanup on unmount to prevent memory leaks
   */
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const startRecording = useCallback(async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Determine supported MIME type (prefer webm > ogg > wav)
      let mimeType = "audio/webm";
      for (const type of VOICE_CONFIG.MIME_TYPES) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          break;
        }
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: VOICE_CONFIG.AUDIO_BITRATE,
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setState({ isRecording: true, isTranscribing: false, error: null });

      // Auto-stop recording after max duration
      recordingTimeoutRef.current = setTimeout(() => {
        if (mediaRecorderRef.current?.state === "recording") {
          logger.info("Recording auto-stopped due to duration limit", {
            maxDuration: VOICE_CONFIG.MAX_RECORDING_DURATION_MS,
          });
          // Trigger stop directly on the recorder
          mediaRecorderRef.current.stop();
        }
      }, VOICE_CONFIG.MAX_RECORDING_DURATION_MS);

      logger.info("Voice recording started", { mimeType });
    } catch (error) {
      logger.error(
        "Failed to start recording",
        error instanceof Error ? error : new Error(String(error)),
      );
      const errorMessage =
        error instanceof Error ? error.message : "Failed to access microphone";
      setState({
        isRecording: false,
        isTranscribing: false,
        error: errorMessage,
      });
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current;
      if (!mediaRecorder || mediaRecorder.state === "inactive") {
        resolve(null);
        return;
      }

      // Clear timeout if recording is stopped manually
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
        recordingTimeoutRef.current = null;
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
        if (audioBlob.size < VOICE_CONFIG.MIN_BLOB_SIZE_BYTES) {
          setState({
            isRecording: false,
            isTranscribing: false,
            error: "Recording too short. Please try again.",
          });
          audioChunksRef.current = []; // Clean up memory
          resolve(null);
          return;
        }

        // Check if recording exceeds size limit (shouldn't happen with duration limit, but safety check)
        if (audioBlob.size > VOICE_CONFIG.MAX_FILE_SIZE_BYTES) {
          setState({
            isRecording: false,
            isTranscribing: false,
            error: "Recording too large. Please try a shorter recording.",
          });
          audioChunksRef.current = []; // Clean up memory
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

          // Validate response with Zod schema
          const data = TranscriptionResponseSchema.parse(dataJson);

          logger.info("Transcription successful", {
            language: data.language,
            hasTranslation: !!data.translation,
          });

          setState({ isRecording: false, isTranscribing: false, error: null });

          // Clean up audio chunks after successful upload (prevent memory leak)
          audioChunksRef.current = [];

          resolve(data.finalText);
        } catch (error) {
          logger.error(
            "Failed to transcribe audio",
            error instanceof Error ? error : new Error(String(error)),
          );
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Failed to transcribe audio";
          setState({
            isRecording: false,
            isTranscribing: false,
            error: errorMessage,
          });

          // Clean up audio chunks after failed upload
          audioChunksRef.current = [];

          resolve(null);
        }
      };

      mediaRecorder.stop();
    });
  }, []);

  const cancelRecording = useCallback(() => {
    cleanup();
    setState({ isRecording: false, isTranscribing: false, error: null });
  }, [cleanup]);

  return {
    isRecording: state.isRecording,
    isTranscribing: state.isTranscribing,
    error: state.error,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
