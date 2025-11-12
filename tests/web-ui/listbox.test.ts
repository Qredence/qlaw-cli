import { expect, test, describe } from "bun:test";
import { initListbox } from "../../web-ui/af-workflows-ui";

function createItem(value: string) {
  const cls: Set<string> = new Set();
  return {
    getAttribute(n: string) { return n === "data-af-value" ? value : null; },
    setAttribute() {},
    tabIndex: -1,
    classList: { add: (c: string) => cls.add(c), remove: (c: string) => cls.delete(c) },
    scrollIntoView() {},
    focus() {},
    click() {},
  } as any;
}

function createRoot() {
  const items = [createItem("a"), createItem("b"), createItem("c")];
  const listeners: Record<string, Function[]> = {};
  return {
    querySelectorAll() { return items as any; },
    setAttribute() {},
    addEventListener(type: string, fn: Function) { (listeners[type] ||= []).push(fn); },
    dispatchEvent(ev: any) { (listeners["af-select"] || []).forEach(f => f(ev)); },
    triggerKey(key: string) { (listeners["keydown"] || []).forEach(f => f({ key, preventDefault: () => {} })); },
    lastEvent: null as any,
  } as any;
}

describe("listbox", () => {
  test("arrow keys navigate", () => {
    const root = createRoot();
    const api = initListbox(root as any);
    expect(api.getIndex()).toBe(0);
    root.triggerKey("ArrowDown");
    expect(api.getIndex()).toBe(1);
    root.triggerKey("ArrowUp");
    expect(api.getIndex()).toBe(0);
  });

  test("enter selects", () => {
    const root = createRoot();
    const api = initListbox(root as any);
    let selected: any = null;
    root.addEventListener("af-select", (ev: any) => { selected = ev.detail; });
    root.triggerKey("ArrowDown");
    root.triggerKey("Enter");
    expect(api.getIndex()).toBe(1);
    expect(selected.value).toBe("b");
  });
});

