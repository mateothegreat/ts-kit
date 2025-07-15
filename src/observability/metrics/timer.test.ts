import { describe, expect, it } from "vitest";
import { MetricsTimer } from "./timer";

describe("MetricsTimer", () => {
  it("returns a duration when stopped", async () => {
    const timer = new MetricsTimer();
    await new Promise((res) => setTimeout(res, 50));
    const duration = timer.stop();
    expect(duration).toBeGreaterThanOrEqual(50);
  });

  it("returns live duration before stop", async () => {
    const timer = new MetricsTimer();
    await new Promise((res) => setTimeout(res, 30));
    expect(timer.duration).toBeGreaterThanOrEqual(30);
  });

  it("resets correctly", async () => {
    const timer = new MetricsTimer();
    await new Promise((res) => setTimeout(res, 40));
    timer.reset();
    await new Promise((res) => setTimeout(res, 10));
    expect(timer.duration).toBeGreaterThanOrEqual(10);
    expect(timer.duration).toBeLessThan(50); // original duration wiped
  });
});
