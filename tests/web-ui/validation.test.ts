import { expect, test, describe } from "bun:test";
import { validateAgentParams } from "../../web-ui/af-workflows-ui";
import type { ValidationSchema } from "../../web-ui/af-workflows-ui";

describe("validation", () => {
  test("required fields", () => {
    const schema: ValidationSchema = { name: { type: "string", required: true } };
    const r1 = validateAgentParams({}, schema);
    expect(r1.valid).toBeFalse();
    expect(r1.errors.name).toBe("required");
    const r2 = validateAgentParams({ name: "x" }, schema);
    expect(r2.valid).toBeTrue();
  });

  test("number bounds", () => {
    const schema: ValidationSchema = { temp: { type: "number", min: 1, max: 3 } };
    const r1 = validateAgentParams({ temp: 0 }, schema);
    expect(r1.errors.temp).toBe("min");
    const r2 = validateAgentParams({ temp: 4 }, schema);
    expect(r2.errors.temp).toBe("max");
    const r3 = validateAgentParams({ temp: 2 }, schema);
    expect(r3.valid).toBeTrue();
  });
});
