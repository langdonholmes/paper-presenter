import { describe, it, expect } from "vitest";
import {
  parseNoteMinutes,
  plannedMinutes,
  formatClock,
  formatBudget,
  pace,
} from "./console-timing";

describe("parseNoteMinutes", () => {
  it("reads whole minutes", () => {
    expect(parseNoteMinutes("~2 min. Go slow.")).toBe(2);
  });

  it("reads fractional minutes", () => {
    expect(parseNoteMinutes("~1.5 min")).toBe(1.5);
  });

  it("converts seconds to minutes", () => {
    expect(parseNoteMinutes("~30 sec. Breath point.")).toBe(0.5);
    expect(parseNoteMinutes("~45 sec")).toBe(0.75);
  });

  it("tolerates spacing and case", () => {
    expect(parseNoteMinutes("~  3   MIN")).toBe(3);
  });

  it("returns null when there is no estimate", () => {
    expect(parseNoteMinutes("Leave this up for the discussion.")).toBeNull();
    expect(parseNoteMinutes("")).toBeNull();
  });

  it("ignores a bare tilde with no unit", () => {
    expect(parseNoteMinutes("~5 slides")).toBeNull();
  });

  it("ignores a duration mentioned mid-note", () => {
    expect(
      parseNoteMinutes("Leave this up for the ~30 min discussion."),
    ).toBeNull();
  });
});

describe("plannedMinutes", () => {
  it("sums the estimates it can find", () => {
    expect(plannedMinutes(["~2 min", "~30 sec", "~1.5 min"])).toBe(4);
  });

  it("treats unparseable notes as zero", () => {
    expect(plannedMinutes(["~2 min", "no estimate here"])).toBe(2);
  });

  it("is zero for an empty deck", () => {
    expect(plannedMinutes([])).toBe(0);
  });
});

describe("formatClock", () => {
  it("pads to mm:ss", () => {
    expect(formatClock(0)).toBe("00:00");
    expect(formatClock(9)).toBe("00:09");
    expect(formatClock(61)).toBe("01:01");
    expect(formatClock(3600)).toBe("60:00");
  });

  it("floors fractional seconds and clamps negatives", () => {
    expect(formatClock(5.9)).toBe("00:05");
    expect(formatClock(-10)).toBe("00:00");
  });
});

describe("formatBudget", () => {
  it("uses seconds below a minute", () => {
    expect(formatBudget(0.5)).toBe("30 sec");
    expect(formatBudget(0.75)).toBe("45 sec");
  });

  it("uses minutes at or above a minute", () => {
    expect(formatBudget(1)).toBe("1 min");
    expect(formatBudget(1.5)).toBe("1.5 min");
    expect(formatBudget(2)).toBe("2 min");
  });
});

describe("pace", () => {
  it("reports on plan inside a one-minute band", () => {
    expect(pace(120, 2).state).toBe("on-plan");
    expect(pace(150, 2).label).toBe("on plan");
    expect(pace(90, 2).state).toBe("on-plan");
  });

  it("reports running over", () => {
    const result = pace(300, 2);
    expect(result.state).toBe("over");
    expect(result.label).toBe("3 min over");
  });

  it("reports running ahead", () => {
    const result = pace(60, 5);
    expect(result.state).toBe("ahead");
    expect(result.label).toBe("4 min ahead");
  });
});
