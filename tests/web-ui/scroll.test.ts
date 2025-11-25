import { expect, test, describe } from "bun:test";
import { initAutoScroll } from "../../web-ui/af-workflows-ui";

function createContainer() {
  let scrollTop = 0;
  let clientHeight = 100;
  let scrollHeight = 200;
  const listeners: Record<string, Function[]> = {};
  return {
    get scrollTop() { return scrollTop; },
    set scrollTop(v: number) { scrollTop = v; },
    get clientHeight() { return clientHeight; },
    set clientHeight(v: number) { clientHeight = v; },
    get scrollHeight() { return scrollHeight; },
    set scrollHeight(v: number) { scrollHeight = v; },
    addEventListener(type: string, fn: Function) { (listeners[type] ||= []).push(fn); },
    dispatch(type: string) { (listeners[type] || []).forEach(f => f()); },
    scrollTo(opts: any) { scrollTop = opts.top; },
  } as any;
}

describe("auto-scroll", () => {
  test("scrolls when at bottom", () => {
    const c = createContainer();
    c.scrollTop = 100;
    const as = initAutoScroll(c as any);
    as.onAppend();
    expect(c.scrollTop).toBe(200);
  });

  test("does not scroll when not at bottom", () => {
    const c = createContainer();
    c.scrollTop = 0;
    const as = initAutoScroll(c as any);
    c.dispatch("scroll");
    as.onAppend();
    expect(c.scrollTop).toBe(0);
  });

  test("respects disabled flag", () => {
    const c = createContainer();
    c.scrollTop = 100;
    const as = initAutoScroll(c as any, { enabled: false });
    as.onAppend();
    expect(c.scrollTop).toBe(100);
    as.setEnabled(true);
    as.onAppend();
    expect(c.scrollTop).toBe(200);
  });

  test("initial load scrolls to bottom", () => {
    const c = createContainer();
    c.scrollTop = 0;
    const as = initAutoScroll(c as any);
    as.onInit();
    expect(c.scrollTop).toBe(200);
  });
});
