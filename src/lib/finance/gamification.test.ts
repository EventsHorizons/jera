import { describe, expect, it } from "vitest";
import {
  applyStreakQualification,
  computeHealthScore,
  levelFromXp,
} from "@/lib/finance/gamification";

describe("applyStreakQualification", () => {
  const empty = {
    current_streak: 0,
    longest_streak: 0,
    last_qualified_on: null as string | null,
    freeze_tokens: 0,
    milestones_claimed: [] as number[],
  };

  it("starts streak at 1", () => {
    const r = applyStreakQualification(empty, "2026-08-29");
    expect(r.next.current_streak).toBe(1);
    expect(r.newlyQualified).toBe(true);
  });

  it("increments consecutive days", () => {
    const r = applyStreakQualification(
      { ...empty, current_streak: 3, last_qualified_on: "2026-08-28" },
      "2026-08-29",
    );
    expect(r.next.current_streak).toBe(4);
  });

  it("is idempotent same day", () => {
    const r = applyStreakQualification(
      { ...empty, current_streak: 3, last_qualified_on: "2026-08-29" },
      "2026-08-29",
    );
    expect(r.newlyQualified).toBe(false);
    expect(r.next.current_streak).toBe(3);
  });

  it("uses freeze on one missed day", () => {
    const r = applyStreakQualification(
      {
        ...empty,
        current_streak: 7,
        last_qualified_on: "2026-08-27",
        freeze_tokens: 1,
        milestones_claimed: [7],
      },
      "2026-08-29",
    );
    expect(r.usedFreeze).toBe(true);
    expect(r.next.freeze_tokens).toBe(0);
    expect(r.next.current_streak).toBe(8);
  });

  it("breaks without freeze", () => {
    const r = applyStreakQualification(
      {
        ...empty,
        current_streak: 5,
        last_qualified_on: "2026-08-26",
        freeze_tokens: 0,
      },
      "2026-08-29",
    );
    expect(r.broken).toBe(true);
    expect(r.next.current_streak).toBe(1);
  });

  it("awards milestone freeze at 7", () => {
    const r = applyStreakQualification(
      {
        ...empty,
        current_streak: 6,
        last_qualified_on: "2026-08-28",
        freeze_tokens: 0,
        milestones_claimed: [],
      },
      "2026-08-29",
    );
    expect(r.newMilestones).toContain(7);
    expect(r.next.freeze_tokens).toBe(1);
  });
});

describe("levelFromXp", () => {
  it("maps thresholds", () => {
    expect(levelFromXp(0).level).toBe(1);
    expect(levelFromXp(100).level).toBe(2);
    expect(levelFromXp(22000).level).toBe(10);
  });
});

describe("computeHealthScore", () => {
  it("weights components", () => {
    const score = computeHealthScore({
      budget: 1,
      streak: 1,
      goals: 1,
      debts: 1,
      logging: 1,
    });
    expect(score).toBe(100);
  });
});
