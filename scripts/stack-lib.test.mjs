import { describe, expect, it } from "vitest";
import { chain, children, order, overlaps, validate } from "./stack-lib.mjs";

const lane = (parent) => ({ parent, base: "x", files: [] });
const lanes = {
  c: lane("b"),
  a: lane("main"),
  b: lane("a"),
  solo: lane("main"),
};

describe("stack lanes", () => {
  it("chains from the lane cut from main down to the branch", () => {
    expect(chain(lanes, "c")).toEqual(["a", "b", "c"]);
    expect(chain(lanes, "solo")).toEqual(["solo"]);
  });

  it("orders parents before children", () => {
    const o = order(lanes);
    expect(o.indexOf("a")).toBeLessThan(o.indexOf("b"));
    expect(o.indexOf("b")).toBeLessThan(o.indexOf("c"));
    expect(children(lanes, "a")).toEqual(["b"]);
  });

  it("accepts a valid registry", () => {
    expect(validate(lanes)).toEqual([]);
  });

  it("rejects unknown parents, cycles and stacks deeper than 3", () => {
    expect(validate({ x: lane("ghost") })[0]).toMatch(/unknown parent/);
    expect(validate({ x: lane("y"), y: lane("x") })[0]).toMatch(
      /never reaches/,
    );
    const deep = { a: lane("main"), b: lane("a"), c: lane("b"), d: lane("c") };
    expect(validate(deep)).toEqual(["d: stack is 4 deep, the limit is 3"]);
  });

  it("flags shared files only between independent lanes", () => {
    const touched = {
      a: ["src/es/ui.ts"],
      b: ["src/es/ui.ts"],
      solo: ["src/es/ui.ts", "x"],
    };
    expect(overlaps(lanes, touched)).toEqual([
      { a: "a", b: "solo", files: ["src/es/ui.ts"] },
      { a: "b", b: "solo", files: ["src/es/ui.ts"] },
    ]);
  });
});
