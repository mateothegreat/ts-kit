import { describe, expect, it } from "vitest";
import { MetricsReporter } from "./reporter";

describe("MetricsReporter", () => {
  it("emits initial snapshot", () => {
    const reporter = new MetricsReporter({ boot: true });
    reporter.metrics$.subscribe((snapshot) => {
      expect(snapshot).toEqual({ boot: true });
    });
  });

  it("tracks value changes and emits updates", () => {
    const reporter = new MetricsReporter();
    let latest = {};
    reporter.updates$.subscribe((update) => {
      latest = update.snapshot;
    });

    reporter.capture({ requests: 1 });
    reporter.capture({ requests: 2, latency: 100 });

    expect(latest).toEqual({ requests: 2, latency: 100 });
  });

  it("emits changes with before/after values", () => {
    const reporter = new MetricsReporter({ requests: 5 });
    let changes: any[] = [];

    reporter.updates$.subscribe((update) => {
      changes = update.changes;
    });

    reporter.capture({ requests: 10, errors: 2 });

    expect(changes).toEqual([
      { key: "requests", before: 5, after: 10 },
      { key: "errors", before: undefined, after: 2 },
    ]);
  });

  it("does not emit if values are unchanged", () => {
    const reporter = new MetricsReporter({ x: 1 });
    let called = 0;
    reporter.metrics$.subscribe(() => called++);
    reporter.capture({ x: 1 }); // no change
    expect(called).toBe(1); // only initial emit
  });

  it("provides a safe snapshot clone", () => {
    const reporter = new MetricsReporter();
    reporter.capture({ stage: "ready" });

    const snapshot = reporter.snapshot();
    snapshot.stage = "hacked";

    expect(reporter.snapshot().stage).toBe("ready");
  });
});
