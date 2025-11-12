import { expect, test, describe } from "bun:test";
import { getStoredTheme, applyTheme } from "../../web-ui/af-workflows-ui";

describe("theme", () => {
  const store: Record<string, string> = {};
  // @ts-ignore
  globalThis.localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = String(v); },
    removeItem: (k: string) => { delete store[k]; },
  } as any;
  test("default is dark when no storage", () => {
    try { localStorage.removeItem("af-theme"); } catch {}
    const t = getStoredTheme();
    expect(t).toBe("dark");
  });

  test("applyTheme sets storage when document unavailable", () => {
    applyTheme("light");
    expect(localStorage.getItem("af-theme")).toBe("light");
  });
});
