import { expect, test } from "bun:test";
import { executeCommand } from "../src/services/commandService";

function createContext() {
  const settings: any = { theme: "dark" };
  const sessions: any[] = [];
  const messages: any[] = [];
  const customCommands: any[] = [];
  let currentSessionId: string | null = null;
  return {
    settings,
    sessions,
    messages,
    customCommands,
    currentSessionId,
    setSettings: (v: any) => void v,
    setMessages: (v: any) => void v,
    setPrompt: (_: any) => {},
    setPromptInputValue: (_: string) => {},
    setShowSettingsMenu: (_: boolean) => {},
    setShowSessionList: (_: boolean) => {},
    setMode: (_: any) => {},
    stop: () => {},
  } as any;
}

test("unknown command falls back to handler", () => {
  const res = executeCommand("nonexistent", "", createContext());
  expect(res).toBeTruthy();
});

test("clear command returns result", () => {
  const res = executeCommand("clear", "", createContext());
  expect(res).toBeTruthy();
});
