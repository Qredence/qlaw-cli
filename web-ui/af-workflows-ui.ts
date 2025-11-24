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
  let selectedIndex = 0;
  const select = (i: number) => {
    selectedIndex = (i + items.length) % items.length;
    items.forEach((el, n) => {
      const isSelected = n === selectedIndex;
      el.setAttribute("aria-selected", isSelected ? "true" : "false");
      el.tabIndex = isSelected ? 0 : -1;
      if (isSelected) {
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
  root.addEventListener("keydown", (e: KeyboardEvent) => {
    const k = e.key?.toLowerCase();
    if (k === "arrowdown") { e.preventDefault?.(); select(selectedIndex + 1); }
    else if (k === "arrowup") { e.preventDefault?.(); select(selectedIndex - 1); }
    else if (k === "enter") {
      e.preventDefault?.();
      const el = items[selectedIndex];
      if (!el) return;
      const ev = new CustomEvent("af-select", { detail: { index: selectedIndex, value: el.getAttribute("data-af-value") } });
      root.dispatchEvent(ev);
      el.click?.();
    }
  });
  return { getIndex: () => selectedIndex, select };
}

export type ValidationSchema = Record<string, { type: "string" | "number" | "boolean"; required?: boolean; min?: number; max?: number }>;

export function validateAgentParams(values: Record<string, any>, schema: ValidationSchema) {
  const errors: Record<string, string> = {};
  Object.keys(schema).forEach(key => {
    const schemaField = schema[key];
    if (!schemaField) return;
    const value = values[key];
    if (schemaField.required && (value === undefined || value === null || value === "")) errors[key] = "required";
    if (value !== undefined && value !== null) {
      if (schemaField.type === "number") {
        const n = Number(value);
        if (Number.isNaN(n)) errors[key] = "type";
        if (schemaField.min !== undefined && n < schemaField.min) errors[key] = "min";
        if (schemaField.max !== undefined && n > schemaField.max) errors[key] = "max";
      } else if (schemaField.type === "boolean") {
        if (!(value === true || value === false)) errors[key] = "type";
      } else if (schemaField.type === "string") {
        if (typeof value !== "string") errors[key] = "type";
      }
    }
  });
  const valid = Object.keys(errors).length === 0;
  return { valid, errors };
}

export function initAutoScroll(
  container: HTMLElement,
  opts?: { enabled?: boolean; durationMs?: number; threshold?: number; includeUI?: boolean }
) {
  let atBottom = true;
  let enabled = opts?.enabled ?? true;
  const threshold = Math.max(0, opts?.threshold ?? 8);

  const check = () => {
    const d = container.scrollHeight - container.scrollTop - container.clientHeight;
    atBottom = d <= threshold;
  };

  const animateTo = (targetTop: number, durationMs: number) => {
    if (durationMs <= 0) { container.scrollTop = targetTop; return; }
    const startTop = container.scrollTop;
    const delta = targetTop - startTop;
    const start = Date.now();
    const step = () => {
      const t = Math.min(1, (Date.now() - start) / durationMs);
      const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      container.scrollTop = Math.round(startTop + delta * eased);
      if (t < 1) requestAnimationFrame(step);
    };
    try { requestAnimationFrame(step); } catch { container.scrollTop = targetTop; }
  };

  const toBottom = (duration?: number) => {
    const target = container.scrollHeight;
    const d = duration ?? opts?.durationMs ?? 300;
    try {
      if (!d) { container.scrollTop = target; }
      else { animateTo(target, d); }
    } catch {
      container.scrollTop = target;
    }
  };

  const onScroll = () => check();
  container.addEventListener("scroll", onScroll);

  const onAppend = () => { if (enabled && atBottom) toBottom(); };
  const onResize = () => { check(); if (enabled && atBottom) toBottom(); };
  const onInit = () => { check(); if (enabled) toBottom(); };

  try { window.addEventListener("resize", onResize); } catch {}

  let ui: { indicator?: HTMLElement; button?: HTMLElement } | undefined;
  if (opts?.includeUI) {
    ui = {};
    const indicator = document.createElement("div");
    indicator.className = "af-indicator";
    indicator.textContent = "New messages";
    indicator.style.position = "sticky";
    indicator.style.bottom = "8px";
    indicator.style.marginLeft = "auto";
    indicator.style.width = "max-content";
    indicator.style.display = "none";

    const button = document.createElement("button");
    button.className = "af-button af-scroll-bottom";
    button.textContent = "Scroll to bottom";
    button.style.marginLeft = "8px";
    button.onclick = () => toBottom();

    const wrapper = document.createElement("div");
    wrapper.style.display = "flex";
    wrapper.style.alignItems = "center";
    wrapper.style.justifyContent = "flex-end";
    wrapper.appendChild(indicator);
    wrapper.appendChild(button);

    const updateUI = () => {
      if (!enabled) { indicator.style.display = "none"; return; }
      indicator.style.display = atBottom ? "none" : "inline-flex";
    };

    container.appendChild(wrapper);
    ui.indicator = indicator;
    ui.button = button;
    container.addEventListener("scroll", updateUI);
  }

  const setEnabled = (v: boolean) => { enabled = !!v; };
  const scrollToBottom = (duration?: number) => toBottom(duration);
  const isAtBottom = () => atBottom;
  const destroy = () => {
    try { window.removeEventListener("resize", onResize); } catch {}
    container.removeEventListener("scroll", onScroll);
    if (ui?.indicator?.parentElement) ui.indicator.parentElement.remove();
  };

  return { onInit, onAppend, onResize, isAtBottom, setEnabled, scrollToBottom, destroy };
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
