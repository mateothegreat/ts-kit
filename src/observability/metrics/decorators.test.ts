import { describe, expect, it } from "vitest";
import { Benchmark } from "./decorators";

describe("Benchmark decorator", () => {
  it("benchmarks method execution", async () => {
    class Test {
      @Benchmark.benchmark({ iterations: 1, autoLog: true })
      async run() {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return "done";
      }
    }

    const result = await new Test().run();

    expect(result).toBe("done");
    // Additional assertions can be added based on benchmark results if needed
  });
});
