import { describe, expect, it } from "vitest";
import { TrackMetrics } from "./decorators";
import { MetricsReporter } from "./reporter";

describe("TrackMetrics decorator", () => {
  it("records duration and success", async () => {
    const reporter = new MetricsReporter();

    class Test {
      @TrackMetrics("work", reporter)
      async run() {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return "done";
      }
    }

    const result = await new Test().run();
    const snapshot = reporter.snapshot();

    expect(result).toBe("done");

    console.log(snapshot);

    expect(snapshot["work.success"]).toBe(true);
    expect(snapshot["work.method"]).toBe("run");
    expect(snapshot["work.duration"]).toBeGreaterThanOrEqual(0);
    expect(snapshot["work.duration"]).toBeLessThan(3);
  });

  // it("captures failure and error message", async () => {
  //   const reporter = new MetricsReporter();

  //   class CustomError extends Error {
  //     constructor(message: string) {
  //       super(message);
  //       this.name = "CustomError";
  //       this.message = "custom custom error";
  //     }
  //   }

  //   class Test {
  //     @TrackMetrics("work", reporter)
  //     async fail() {
  //       await new Promise((resolve) => setTimeout(resolve, 1));
  //       throw new CustomError("fail-fast");
  //     }
  //   }

  //   await expect(() => new Test().fail()).rejects.toThrow(CustomError);

  //   const snapshot = reporter.snapshot();
  //   console.log(snapshot);
  //   expect(snapshot["work.success"]).toBe(false);
  //   expect(snapshot["work.duration"]).toBeGreaterThanOrEqual(0);
  //   expect(snapshot["work.duration"]).toBeLessThan(3);
  // });
});
