/**
 * Hook for managing streaming responses
 * Handles OpenAI and Agent Framework streaming logic
 */

import { useState, useEffect, useMemo } from "react";
import type { Message, AppSettings } from "../types.ts";
import { streamResponseFromOpenAI } from "../services/streamingService.ts";
import { startWorkflow } from "../workflow.ts";

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

export interface UseStreamingReturn {
  isProcessing: boolean;
  requestStartAt: number | null;
  spinnerIndex: number;
  spinnerFrame: string;
  elapsedSec: number;
  streamResponse: (params: {
    messages: Message[];
    userInput: string;
    mode: "standard" | "workflow";
    settings: AppSettings;
    assistantMessageId: string;
    onMessageUpdate: (updater: (prev: Message[]) => Message[]) => void;
  }) => void;
}

/**
 * Helper to create an optimized message updater that updates the last message directly.
 * This avoids O(n) .map() operations during streaming by updating the array element directly.
 * @param assistantMessageId - The ID of the assistant message being streamed
 * @param onMessageUpdate - The state updater function
 * @param contentAppend - Text to append to the message content
 */
function createLastMessageUpdater(
  assistantMessageId: string,
  onMessageUpdate: (updater: (prev: Message[]) => Message[]) => void,
  contentAppend: string
): void {
  onMessageUpdate((prev) => {
    if (prev.length === 0) return prev;
    const lastIndex = prev.length - 1;
    const lastMessage = prev[lastIndex];
    if (!lastMessage || lastMessage.id !== assistantMessageId) return prev;
    const updated = [...prev];
    updated[lastIndex] = { ...lastMessage, content: lastMessage.content + contentAppend };
    return updated;
  });
}

/**
 * Manages streaming response state and logic
 */
export function useStreaming(): UseStreamingReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [requestStartAt, setRequestStartAt] = useState<number | null>(null);
  const [spinnerIndex, setSpinnerIndex] = useState(0);

  // Streaming spinner animation
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined;
    if (isProcessing) {
      intervalId = setInterval(
        () => setSpinnerIndex((i) => (i + 1) % SPINNER_FRAMES.length),
        80
      );
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isProcessing]);

  const spinnerFrame = SPINNER_FRAMES[spinnerIndex] || "";

  const elapsedSec = useMemo(() => {
    if (!requestStartAt || !isProcessing) return 0;
    return Math.max(0, Math.floor((Date.now() - requestStartAt) / 1000));
  }, [requestStartAt, isProcessing]);

  const streamResponse = (params: {
    messages: Message[];
    userInput: string;
    mode: "standard" | "workflow";
    settings: AppSettings;
    assistantMessageId: string;
    onMessageUpdate: (updater: (prev: Message[]) => Message[]) => void;
  }) => {
    const {
      messages,
      userInput,
      mode,
      settings,
      assistantMessageId,
      onMessageUpdate,
    } = params;

    setIsProcessing(true);
    setRequestStartAt(Date.now());

    // Route based on AF bridge configuration
    const useAf =
      mode === "workflow" &&
      !!settings.afBridgeBaseUrl &&
      !!(settings.afModel || settings.model);

    if (useAf) {
      const modelId = settings.afModel || settings.model || "workflow";
      startWorkflow({
        baseUrl: settings.afBridgeBaseUrl!,
        model: modelId,
        conversation: undefined,
        input: userInput,
        onDelta: (chunk) => {
          createLastMessageUpdater(assistantMessageId, onMessageUpdate, chunk);
        },
        onError: (err) => {
          createLastMessageUpdater(assistantMessageId, onMessageUpdate, `\n\n[Error] ${err.message}`);
        },
        onDone: () => {
          setIsProcessing(false);
        },
      });
    } else {
      // Stream from OpenAI Responses API
      streamResponseFromOpenAI({
        history: messages,
        callbacks: {
          onDelta: (chunk) => {
            createLastMessageUpdater(assistantMessageId, onMessageUpdate, chunk);
          },
          onError: (err) => {
            createLastMessageUpdater(assistantMessageId, onMessageUpdate, `\n\n[Error] ${err.message}`);
          },
          onDone: () => {
            setIsProcessing(false);
          },
        },
      });
    }
  };

  return {
    isProcessing,
    requestStartAt,
    spinnerIndex,
    spinnerFrame,
    elapsedSec,
    streamResponse,
  };
}

