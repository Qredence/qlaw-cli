import { expect, test, describe } from "bun:test";
import pkg from "../../package.json";

describe("cli version", () => {
  test("package version is 0.1.5", () => {
    expect(pkg.version).toBe("0.1.5");
  });
});
