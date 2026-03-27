import { describe, it, expect } from "vitest";
import { features, isFeatureEnabled } from "@/config/features";

describe("Feature Flags", () => {
  it("exports a features object with all expected flags", () => {
    const expectedFlags = [
      "adminDashboard",
      "palantirMode",
      "openclawRuntime",
      "monthlyReportAuto",
      "publicLiveStats",
      "voiceMode",
    ] as const;

    for (const flag of expectedFlags) {
      expect(typeof features[flag]).toBe("boolean");
    }
  });

  it("isFeatureEnabled returns boolean for each flag", () => {
    expect(typeof isFeatureEnabled("adminDashboard")).toBe("boolean");
    expect(typeof isFeatureEnabled("voiceMode")).toBe("boolean");
    expect(typeof isFeatureEnabled("palantirMode")).toBe("boolean");
  });

  it("default values: dangerous features are OFF", () => {
    expect(features.adminDashboard).toBe(false);
    expect(features.palantirMode).toBe(false);
    expect(features.openclawRuntime).toBe(false);
    expect(features.monthlyReportAuto).toBe(false);
    expect(features.publicLiveStats).toBe(false);
  });

  it("voiceMode is ON by default", () => {
    expect(features.voiceMode).toBe(true);
  });

  it("no flag is undefined or null", () => {
    for (const [key, value] of Object.entries(features)) {
      expect(value, `Flag "${key}" must not be null/undefined`).not.toBeNull();
      expect(value, `Flag "${key}" must not be undefined`).not.toBeUndefined();
    }
  });
});
