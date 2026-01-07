import { describe, it, expect } from "vitest";

describe("Test Infrastructure", () => {
  it("vitest is configured correctly", () => {
    expect(1 + 1).toBe(2);
  });

  it("globals are available", () => {
    expect(testUtils).toBeDefined();
    expect(testUtils.createMockPlan).toBeDefined();
    expect(testUtils.createMockActivity).toBeDefined();
    expect(testUtils.createMockAthlete).toBeDefined();
  });

  it("mock helpers create valid objects", () => {
    const plan = testUtils.createMockPlan();
    expect(plan.id).toBe("test-plan-id");
    expect(plan.weeks).toHaveLength(12);

    const activity = testUtils.createMockActivity();
    expect(activity.type).toBe("Run");

    const athlete = testUtils.createMockAthlete();
    expect(athlete.experience).toBe("intermediate");
  });
});
