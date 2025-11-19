/// <reference lib="dom" />

type Theme = "dark" | "light";

export function getStoredTheme(): Theme {
  try {
    const t = localStorage.getItem("af-theme");
    return (t === "light" ? "light" : "dark");
  } catch {
    return "dark";
  }
}

export function applyTheme(theme: Theme) {
  try { document.documentElement.dataset.theme = theme; } catch {}
  try { localStorage.setItem("af-theme", theme); } catch {}
}

export function initTheme() {
  const theme = getStoredTheme();
  applyTheme(theme);
}

export function initListbox(root: HTMLElement) {
  const items = Array.from(root.querySelectorAll<HTMLElement>("[data-af-option]"));
  let index = 0;
  const select = (i: number) => {
    index = (i + items.length) % items.length;
    items.forEach((el, n) => {
      const sel = n === index;
      el.setAttribute("aria-selected", sel ? "true" : "false");
      el.tabIndex = sel ? 0 : -1;
      if (sel) {
        el.classList.add("af-selected");
        try { el.scrollIntoView({ block: "nearest", behavior: "smooth" }); } catch {}
        el.focus();
      } else {
        el.classList.remove("af-selected");
      }
    });
  };
  root.setAttribute("role", "listbox");
  items.forEach(el => el.setAttribute("role", "option"));
  select(0);
  root.addEventListener("keydown", (e: any) => {
    const k = e.key?.toLowerCase();
    if (k === "arrowdown") { e.preventDefault?.(); select(index + 1); }
    else if (k === "arrowup") { e.preventDefault?.(); select(index - 1); }
    else if (k === "enter") {
      e.preventDefault?.();
      const el = items[index];
      if (!el) return;
      const ev = new CustomEvent("af-select", { detail: { index, value: el.getAttribute("data-af-value") } });
      root.dispatchEvent(ev);
      el.click?.();
    }
  });
  return { getIndex: () => index, select };
}

export type ValidationSchema = Record<string, { type: "string" | "number" | "boolean"; required?: boolean; min?: number; max?: number }>;

export function validateAgentParams(values: Record<string, any>, schema: ValidationSchema) {
  const errors: Record<string, string> = {};
  Object.keys(schema).forEach(key => {
    const s = schema[key];
    if (!s) return;
    const v = values[key];
    if (s.required && (v === undefined || v === null || v === "")) errors[key] = "required";
    if (v !== undefined && v !== null) {
      if (s.type === "number") {
        const n = Number(v);
        if (Number.isNaN(n)) errors[key] = "type";
        if (s.min !== undefined && n < s.min) errors[key] = "min";
        if (s.max !== undefined && n > s.max) errors[key] = "max";
      } else if (s.type === "boolean") {
        if (!(v === true || v === false)) errors[key] = "type";
      } else if (s.type === "string") {
        if (typeof v !== "string") errors[key] = "type";
      }
    }
  });
  const valid = Object.keys(errors).length === 0;
  return { valid, errors };
}

export function initAutoScroll(container: HTMLElement) {
  let atBottom = true;
  const threshold = 8;
  const check = () => {
    const d = container.scrollHeight - container.scrollTop - container.clientHeight;
    atBottom = d <= threshold;
  };
  const toBottom = () => {
    try { container.scrollTo({ top: container.scrollHeight, behavior: "smooth" }); } catch { container.scrollTop = container.scrollHeight; }
  };
  container.addEventListener("scroll", () => check());
  const onAppend = () => { if (atBottom) toBottom(); };
  const onResize = () => { check(); if (atBottom) toBottom(); };
  try { window.addEventListener("resize", onResize); } catch {}
  return { onAppend, onResize, isAtBottom: () => atBottom };
}

export function renderMessage(container: HTMLElement, payload: { role: string; text: string; timestamp: Date; meta?: Record<string, any> }) {
  const item = document.createElement("div");
  const role = payload.role.toLowerCase();
  item.className = `af-message af-role-${role}`;
  const header = document.createElement("div");
  header.className = "af-message-header";
  const badge = document.createElement("span");
  badge.className = "af-badge";
  badge.textContent = payload.role;
  const time = document.createElement("span");
  time.className = "af-time";
  time.textContent = payload.timestamp.toLocaleTimeString();
  header.appendChild(badge);
  header.appendChild(time);
  const body = document.createElement("div");
  body.className = "af-message-body";
  body.textContent = payload.text;
  item.appendChild(header);
  item.appendChild(body);
  container.appendChild(item);
}
