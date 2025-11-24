import { expect, test, describe } from "bun:test";
import { getTheme, DRACULA } from "../src/themes";
import { handleThemeCommand } from "../src/commandHandlers";

describe("theme cycling", () => {
  test("getTheme supports dracula", () => {
    const t = getTheme("dracula");
    expect(t).toBe(DRACULA);
    expect(typeof t.bg.primary).toBe("string");
  });

  test("/theme cycles through dark→light→dracula→dark", () => {
    let settings: any = { theme: "dark" };
    const setSettings = (fn: any) => { settings = fn(settings); };
    const context: any = { settings, setSettings };

    handleThemeCommand(context);
    expect(settings.theme).toBe("light");

    context.settings = settings;
    handleThemeCommand(context);
    expect(settings.theme).toBe("dracula");

    context.settings = settings;
    handleThemeCommand(context);
    expect(settings.theme).toBe("dark");
  });
});
