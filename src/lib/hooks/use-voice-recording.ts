import { useState, useRef, useCallback, useEffect } from "react";
import { logger } from "@/lib/logger";
import { VOICE_CONFIG, SPEECH_RECOGNITION_CONFIG } from "@/lib/chat-config";
import { z } from "zod";

/**
 * Type declarations for Web Speech API
 * Needed because TypeScript doesn't include these by default
 */
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly length: number;
  readonly isFinal: boolean;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognition;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

type VoiceRecordingState = {
  isRecording: boolean;
  isTranscribing: boolean;
  interimTranscript: string;
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
 * Get the SpeechRecognition constructor if available
 * Handles browser prefixes (webkit for Chrome/Safari)
 */
function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

/**
 * Hook for voice recording with real-time transcription preview
 *
 * Features:
 * - Real-time transcription preview via Web Speech API (interim results)
 * - High-quality final transcription via OpenAI Whisper
 * - Automatic MIME type detection (webm > ogg > wav)
 * - Recording duration limit (2 minutes max)
 * - Audio bitrate optimization (128kbps)
 * - Proper cleanup on unmount
 * - Memory leak prevention (clears audio chunks after upload)
 * - Type-safe API responses with Zod validation
 * - Graceful fallback when Web Speech API unavailable
 *
 * @returns Voice recording controls and state including interim transcript
 */
export function useVoiceRecording() {
  const [state, setState] = useState<VoiceRecordingState>({
    isRecording: false,
    isTranscribing: false,
    interimTranscript: "",
    error: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const speechRecognitionRef = useRef<SpeechRecognition | null>(null);

  /**
   * Stop speech recognition and clean up
   */
  const stopSpeechRecognition = useCallback(() => {
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.abort();
      } catch {
        // Ignore errors during cleanup
      }
      speechRecognitionRef.current = null;
    }
  }, []);

  /**
   * Cleanup function to stop recording and release resources
   */
  const cleanup = useCallback(() => {
    // Stop speech recognition
    stopSpeechRecognition();

    // Stop media recorder
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
  }, [stopSpeechRecognition]);

  /**
   * Cleanup on unmount to prevent memory leaks
   */
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  /**
   * Start speech recognition for real-time transcription preview
   * Returns true if started successfully, false otherwise
   */
  const startSpeechRecognition = useCallback(() => {
    const SpeechRecognitionClass = getSpeechRecognition();
    if (!SpeechRecognitionClass) {
      logger.info("Web Speech API not available, skipping real-time preview");
      return false;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = SPEECH_RECOGNITION_CONFIG.CONTINUOUS;
      recognition.interimResults = SPEECH_RECOGNITION_CONFIG.INTERIM_RESULTS;
      recognition.lang = SPEECH_RECOGNITION_CONFIG.LANG;
      recognition.maxAlternatives = SPEECH_RECOGNITION_CONFIG.MAX_ALTERNATIVES;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = "";
        let interimTranscript = "";

        // Build transcript from all results
        // Final results are confirmed, interim results are still being processed
        const results = Array.from(
          { length: event.results.length },
          (_, i) => event.results[i],
        );

        for (const result of results) {
          if (result?.[0]) {
            if (result.isFinal) {
              finalTranscript += result[0].transcript;
            } else {
              interimTranscript += result[0].transcript;
            }
          }
        }

        // Combine final + interim for display
        const fullTranscript = finalTranscript + interimTranscript;

        setState((prev) => ({
          ...prev,
          interimTranscript: fullTranscript,
        }));
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        // Silently handle errors - fall back to Whisper-only mode
        // Common errors: "no-speech", "audio-capture", "network"
        logger.debug("Speech recognition error (falling back to Whisper)", {
          error: event.error,
        });
        stopSpeechRecognition();
      };

      recognition.onend = () => {
        // Recognition ended (possibly due to silence or browser decision)
        // Don't clear interim transcript - keep showing what we have
        // The Whisper result will replace it when ready
      };

      recognition.start();
      speechRecognitionRef.current = recognition;
      logger.info("Speech recognition started for real-time preview");
      return true;
    } catch (error) {
      // Silently fall back to Whisper-only mode
      logger.debug("Failed to start speech recognition", {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }, [stopSpeechRecognition]);

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
      setState({
        isRecording: true,
        isTranscribing: false,
        interimTranscript: "",
        error: null,
      });

      // Start speech recognition for real-time preview (non-blocking)
      startSpeechRecognition();

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
        interimTranscript: "",
        error: errorMessage,
      });
    }
  }, [startSpeechRecognition]);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    // Stop speech recognition immediately (keep interim transcript visible)
    stopSpeechRecognition();

    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current;
      if (!mediaRecorder || mediaRecorder.state === "inactive") {
        setState((prev) => ({
          ...prev,
          isRecording: false,
          interimTranscript: "",
        }));
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
            interimTranscript: "",
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
            interimTranscript: "",
            error: "Recording too large. Please try a shorter recording.",
          });
          audioChunksRef.current = []; // Clean up memory
          resolve(null);
          return;
        }

        // Upload and transcribe (keep interim transcript visible during this phase)
        setState((prev) => ({
          ...prev,
          isRecording: false,
          isTranscribing: true,
          error: null,
        }));

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

          setState({
            isRecording: false,
            isTranscribing: false,
            interimTranscript: "",
            error: null,
          });

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
            interimTranscript: "",
            error: errorMessage,
          });

          // Clean up audio chunks after failed upload
          audioChunksRef.current = [];

          resolve(null);
        }
      };

      mediaRecorder.stop();
    });
  }, [stopSpeechRecognition]);

  const cancelRecording = useCallback(() => {
    cleanup();
    setState({
      isRecording: false,
      isTranscribing: false,
      interimTranscript: "",
      error: null,
    });
  }, [cleanup]);

  return {
    isRecording: state.isRecording,
    isTranscribing: state.isTranscribing,
    interimTranscript: state.interimTranscript,
    error: state.error,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
