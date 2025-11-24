import { expect, test, describe } from "bun:test";
import { debounce } from "../src/utils.ts";

describe("debounce", () => {
  test("should delay function execution", async () => {
    let callCount = 0;
    const fn = () => callCount++;
    const debounced = debounce(fn, 50);

    // Call multiple times rapidly
    debounced();
    debounced();
    debounced();

    // Should not have executed yet
    expect(callCount).toBe(0);

    // Wait for debounce delay
    await new Promise(resolve => setTimeout(resolve, 60));

    // Should have executed only once
    expect(callCount).toBe(1);
  });

  test("should pass arguments correctly", async () => {
    let lastArgs: any[] = [];
    const fn = (...args: any[]) => {
      lastArgs = args;
    };
    const debounced = debounce(fn, 50);

    debounced("arg1", "arg2", "arg3");
    
    await new Promise(resolve => setTimeout(resolve, 60));

    expect(lastArgs).toEqual(["arg1", "arg2", "arg3"]);
  });

  test("should reset timer on subsequent calls", async () => {
    let callCount = 0;
    const fn = () => callCount++;
    const debounced = debounce(fn, 50);

    // Call first time
    debounced();
    
    // Wait 30ms (less than debounce delay)
    await new Promise(resolve => setTimeout(resolve, 30));
    
    // Call again - should reset the timer
    debounced();
    
    // Wait 30ms more (total 60ms from first call, but only 30ms from second)
    await new Promise(resolve => setTimeout(resolve, 30));
    
    // Should not have executed yet
    expect(callCount).toBe(0);
    
    // Wait another 30ms (60ms from second call)
    await new Promise(resolve => setTimeout(resolve, 30));
    
    // Should have executed once
    expect(callCount).toBe(1);
  });

  test("should execute with last set of arguments", async () => {
    let lastValue = "";
    const fn = (value: string) => {
      lastValue = value;
    };
    const debounced = debounce(fn, 50);

    debounced("first");
    debounced("second");
    debounced("third");

    await new Promise(resolve => setTimeout(resolve, 60));

    // Should use the last arguments
    expect(lastValue).toBe("third");
  });
});
