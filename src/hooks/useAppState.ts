/**
 * Hook for managing core application state (messages, sessions, settings)
 * Consolidates related state management from index.tsx
 */

import { useState, useEffect, useMemo } from "react";
import type { Message, Session, AppSettings, CustomCommand } from "../types.ts";
import {
  loadSettings,
  loadSessions,
  loadCustomCommands,
  debouncedSaveSettings,
  debouncedSaveSessions,
  debouncedSaveCustomCommands,
} from "../storage.ts";

export interface UseAppStateReturn {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  sessions: Session[];
  setSessions: React.Dispatch<React.SetStateAction<Session[]>>;
  currentSessionId: string | null;
  setCurrentSessionId: React.Dispatch<React.SetStateAction<string | null>>;
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  customCommands: CustomCommand[];
  setCustomCommands: React.Dispatch<React.SetStateAction<CustomCommand[]>>;
  recentSessions: Session[];
}

/**
 * Manages core application state including messages, sessions, settings, and custom commands
 */
export function useAppState(): UseAppStateReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessions, setSessions] = useState<Session[]>(() => loadSessions());
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [customCommands, setCustomCommands] = useState<CustomCommand[]>(() =>
    loadCustomCommands()
  );

  const recentSessions = useMemo(() => {
    return [...sessions]
      .sort((a, b) => {
        // Optimize: Get timestamps directly without creating new Date objects
        // updatedAt is already a Date object from storage loading
        const timeA = a.updatedAt instanceof Date ? a.updatedAt.getTime() : new Date(a.updatedAt).getTime();
        const timeB = b.updatedAt instanceof Date ? b.updatedAt.getTime() : new Date(b.updatedAt).getTime();
        return timeB - timeA;
      })
      .slice(0, 5);
  }, [sessions]);

  // Save settings when changed (debounced to reduce file I/O)
  useEffect(() => {
    debouncedSaveSettings(settings);
  }, [settings]);

  // Save sessions when changed (debounced to reduce file I/O)
  useEffect(() => {
    debouncedSaveSessions(sessions);
  }, [sessions]);

  // Save custom commands when changed (debounced to reduce file I/O)
  useEffect(() => {
    debouncedSaveCustomCommands(customCommands);
  }, [customCommands]);

  // Save current session when messages change
  useEffect(() => {
    if (currentSessionId && messages.length > 0) {
      // Optimized: Find index and update directly instead of O(n) map with per-element checks
      setSessions((prev) => {
        const idx = prev.findIndex((s) => s.id === currentSessionId);
        if (idx === -1) return prev;
        const updated = [...prev];
        updated[idx] = { ...prev[idx], messages, updatedAt: new Date() };
        return updated;
      });
    }
  }, [messages, currentSessionId]);

  return {
    messages,
    setMessages,
    sessions,
    setSessions,
    currentSessionId,
    setCurrentSessionId,
    settings,
    setSettings,
    customCommands,
    setCustomCommands,
    recentSessions,
  };
}

