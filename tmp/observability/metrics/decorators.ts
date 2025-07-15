import { writeFileSync } from "fs";
import {
  EventLoopUtilization,
  performance,
  type PerformanceMeasure as NodePerformanceMeasure,
} from "node:perf_hooks";
import { memoryUsage } from "node:process";
import { join } from "path";

export interface Measurement {
  duration: number;
  startTime: number;
  name: string;
  absoluteStartTime: number;
  absoluteEndTime: number;
  memory?: NodeJS.MemoryUsage;
  eventLoop?: EventLoopUtilization;
}

export interface BenchmarkOptions {
  warmupRuns?: number;
  iterations?: number;
  collectMemory?: boolean;
  collectEventLoop?: boolean;
  autoLog?: boolean;
  exportFormat?: "json" | "csv" | "prometheus" | "none";
  outputPath?: string;
  visualize?: boolean;
  enableVisualInspector?: boolean;
}

export interface BenchmarkResult {
  name: string;
  measurements: Measurement[];
  stats: {
    min: number;
    max: number;
    mean: number;
    median: number;
    p95: number;
    p99: number;
    stdDev: number;
  };
  systemMetrics: {
    totalMemory: NodeJS.MemoryUsage;
    eventLoopUtilization: EventLoopUtilization;
  };
}

export class Benchmark {
  private results: Map<string, BenchmarkResult> = new Map();
  private baselineEventLoop: EventLoopUtilization;
  private static benchmarks: Measurement[] = [];

  constructor() {
    this.baselineEventLoop = performance.eventLoopUtilization();
  }

  static benchmark(options: BenchmarkOptions = {}) {
    return function (value: Function, context: ClassMethodDecoratorContext) {
      if (context.kind !== "method") {
        throw new Error("benchmark decorator can only be applied to methods");
      }
      return async function (this: any, ...args: any[]) {
        const suite = new Benchmark();
        const { benchmark: benchResult, result } = await suite.run(
          context.name as string,
          value.bind(this),
          args,
          options
        );
        if (options.visualize) {
          suite.visualize([benchResult]);
        }
        if (options.enableVisualInspector) {
          Benchmark.visualInspector(benchResult.measurements);
        }
        return result;
      };
    };
  }

  async run(
    name: string,
    fn: (...args: any[]) => Promise<any>,
    args: any[] = [],
    options: BenchmarkOptions = {}
  ): Promise<{ benchmark: BenchmarkResult; result: any }> {
    const {
      warmupRuns = 3,
      iterations = 10,
      collectMemory = true,
      collectEventLoop = true,
      autoLog = false,
      exportFormat = "none",
      outputPath = "./benchmarks",
      visualize = false,
      enableVisualInspector = false,
    } = options;

    let lastResult: any;

    // Warmup runs
    for (let i = 0; i < warmupRuns; i++) {
      await fn(...args);
    }

    // Actual benchmark runs
    const measurements: Measurement[] = [];
    for (let i = 0; i < iterations; i++) {
      const timer = new Timer(name);
      const startMemory = collectMemory ? memoryUsage() : undefined;
      const startEventLoop = collectEventLoop
        ? performance.eventLoopUtilization(this.baselineEventLoop)
        : undefined;

      timer.start();
      lastResult = await fn(...args);
      const measure = timer.stop();

      const endMemory = collectMemory ? memoryUsage() : undefined;
      const endEventLoop = collectEventLoop
        ? performance.eventLoopUtilization(startEventLoop)
        : undefined;

      const baseMeasurement = {
        duration: measure.duration,
        startTime: measure.startTime,
        name,
        absoluteStartTime: Timer.timeOrigin() + measure.startTime,
        absoluteEndTime:
          Timer.timeOrigin() + measure.startTime + measure.duration,
      };

      const measurement: Measurement = {
        ...baseMeasurement,
        ...(endMemory !== undefined ? { memory: endMemory } : {}),
        ...(endEventLoop !== undefined ? { eventLoop: endEventLoop } : {}),
      };

      measurements.push(measurement);
      Benchmark.benchmarks.push(measurement);

      if (autoLog) {
        console.log(Timer.inspect(name, measurement));
      }
    }

    const benchResult: BenchmarkResult = {
      name,
      measurements,
      stats: this.calculateStats(measurements),
      systemMetrics: {
        totalMemory: memoryUsage(),
        eventLoopUtilization: performance.eventLoopUtilization(),
      },
    };

    this.results.set(name, benchResult);

    if (exportFormat !== "none") {
      const exported = this.export(exportFormat);
      const fileName = `${name}-${Date.now()}.${exportFormat}`;
      const fullPath = join(outputPath, fileName);
      writeFileSync(fullPath, exported);
      if (autoLog) {
        console.log(`Exported metrics to ${fullPath}`);
      }
    }

    return { benchmark: benchResult, result: lastResult };
  }

  private calculateStats(measurements: Measurement[]) {
    const durations = measurements.map((m) => m.duration).sort((a, b) => a - b);
    const mean = durations.reduce((a, b) => a + b, 0) / durations.length;
    const variance =
      durations.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) /
      durations.length;

    return {
      min: durations[0] || 0,
      max: durations[durations.length - 1] || 0,
      mean,
      median: durations[Math.floor(durations.length / 2)] || 0,
      p95: durations[Math.floor(durations.length * 0.95)] || 0,
      p99: durations[Math.floor(durations.length * 0.99)] || 0,
      stdDev: Math.sqrt(variance),
    };
  }

  visualize(
    results: BenchmarkResult[] = Array.from(this.results.values())
  ): void {
    console.log("\n📊 BENCHMARK RESULTS\n");

    results.forEach((result) => {
      console.log(`🔍 ${result.name}`);
      console.log("─".repeat(50));

      // Duration statistics
      console.log(`📈 Duration Stats:`);
      console.log(`   Min: ${result.stats.min.toFixed(3)}ms`);
      console.log(`   Max: ${result.stats.max.toFixed(3)}ms`);
      console.log(`   Mean: ${result.stats.mean.toFixed(3)}ms`);
      console.log(`   Median: ${result.stats.median.toFixed(3)}ms`);
      console.log(`   P95: ${result.stats.p95.toFixed(3)}ms`);
      console.log(`   P99: ${result.stats.p99.toFixed(3)}ms`);
      console.log(`   StdDev: ${result.stats.stdDev.toFixed(3)}ms`);

      // ASCII histogram
      this.renderHistogram(result.measurements);

      // Timeline visualization
      this.renderTimeline(result.measurements);

      // Memory usage if available
      if (result.measurements[0]?.memory) {
        this.renderMemoryUsage(result.measurements);
      }

      console.log("\n");
    });
  }

  private renderHistogram(measurements: Measurement[]): void {
    const durations = measurements.map((m) => m.duration);
    const min = Math.min(...durations);
    const max = Math.max(...durations);
    const buckets = 10;
    const bucketSize = (max - min) / buckets;

    console.log(`\n📊 Duration Distribution:`);

    const histogram = new Array(buckets).fill(0);
    durations.forEach((duration) => {
      const bucket = Math.min(
        Math.floor((duration - min) / bucketSize),
        buckets - 1
      );
      histogram[bucket]++;
    });

    const maxCount = Math.max(...histogram);
    histogram.forEach((count, i) => {
      const barLength = Math.round((count / maxCount) * 30);
      const bar = "█".repeat(barLength);
      const range = `${(min + i * bucketSize).toFixed(1)}-${(
        min +
        (i + 1) * bucketSize
      ).toFixed(1)}ms`;
      console.log(`   ${range.padEnd(12)} │${bar} ${count}`);
    });
  }

  private renderTimeline(measurements: Measurement[]): void {
    console.log(`\n⏱️  Timeline (last 10 runs):`);

    const recent = measurements.slice(-10);
    const minDuration = Math.min(...recent.map((m) => m.duration));
    const maxDuration = Math.max(...recent.map((m) => m.duration));

    recent.forEach((measurement, i) => {
      const normalized =
        maxDuration - minDuration !== 0
          ? (measurement.duration - minDuration) / (maxDuration - minDuration)
          : 0;
      const barLength = Math.round(normalized * 20);
      const bar = "▓".repeat(barLength) + "░".repeat(20 - barLength);
      const timestamp = new Date(measurement.absoluteStartTime)
        .toISOString()
        .slice(11, 23);
      console.log(
        `   ${(i + 1)
          .toString()
          .padStart(2)}: ${bar} ${measurement.duration.toFixed(
          3
        )}ms @${timestamp}`
      );
    });
  }

  private renderMemoryUsage(measurements: Measurement[]): void {
    console.log(`\n💾 Memory Usage (MB):`);

    const memoryData = measurements.map((m) => m.memory!);
    const heapUsed = memoryData.map((m) => m.heapUsed / 1024 / 1024);
    const heapTotal = memoryData.map((m) => m.heapTotal / 1024 / 1024);

    console.log(
      `   Heap Used: ${heapUsed[0].toFixed(2)} → ${heapUsed[
        heapUsed.length - 1
      ].toFixed(2)}`
    );
    console.log(
      `   Heap Total: ${heapTotal[0].toFixed(2)} → ${heapTotal[
        heapTotal.length - 1
      ].toFixed(2)}`
    );

    const trend = heapUsed[heapUsed.length - 1] - heapUsed[0];
    const trendIcon = trend > 0 ? "📈" : trend < 0 ? "📉" : "➡️";
    console.log(
      `   Trend: ${trendIcon} ${trend > 0 ? "+" : ""}${trend.toFixed(2)}MB`
    );
  }

  export(format: "json" | "csv" | "prometheus" = "json"): string {
    const results = Array.from(this.results.values());

    switch (format) {
      case "json":
        return JSON.stringify(results, null, 2);

      case "csv":
        const headers = [
          "name",
          "duration",
          "startTime",
          "absoluteStartTime",
          "absoluteEndTime",
        ];
        const rows = results.flatMap((result) =>
          result.measurements.map((m) => [
            result.name,
            m.duration,
            m.startTime,
            m.absoluteStartTime,
            m.absoluteEndTime,
          ])
        );
        return [headers, ...rows].map((row) => row.join(",")).join("\n");

      case "prometheus":
        return results
          .map((result) => {
            const name = result.name.replace(/[^a-zA-Z0-9_]/g, "_");
            return [
              `# HELP ${name}_duration_seconds Duration of ${result.name}`,
              `# TYPE ${name}_duration_seconds histogram`,
              ...result.measurements.map(
                (m, i) =>
                  `${name}_duration_seconds{quantile="0.${i}"} ${
                    m.duration / 1000
                  }`
              ),
            ].join("\n");
          })
          .join("\n\n");

      default:
        return JSON.stringify(results, null, 2);
    }
  }

  compare(names: string[]): void {
    console.log("\n🔄 BENCHMARK COMPARISON\n");

    const results = names
      .map((name) => this.results.get(name))
      .filter(Boolean) as BenchmarkResult[];

    if (results.length < 2) {
      console.log("❌ Need at least 2 benchmarks to compare");
      return;
    }

    console.log("📊 Performance Comparison:");
    console.log("─".repeat(60));

    const baseline = results[0];
    results.forEach((result, i) => {
      const ratio = i === 0 ? 1 : result.stats.mean / baseline.stats.mean;
      const change =
        i === 0
          ? ""
          : ` (${ratio > 1 ? "+" : ""}${((ratio - 1) * 100).toFixed(1)}%)`;
      const icon = i === 0 ? "📍" : ratio < 1 ? "🚀" : "🐌";

      console.log(
        `${icon} ${result.name}: ${result.stats.mean.toFixed(3)}ms${change}`
      );
    });
  }

  static compareTimers(): Measurement[] {
    return [...Benchmark.benchmarks].sort((a, b) => a.duration - b.duration);
  }

  static visualInspector(
    measurements: Measurement[] = Benchmark.benchmarks
  ): void {
    console.log("\n=== Visual Benchmark Inspector ===");

    const maxDuration = Math.max(...measurements.map((b) => b.duration));
    const scaleFactor = maxDuration ? 50 / maxDuration : 1;

    measurements.forEach((b) => {
      const barLength = Math.round(b.duration * scaleFactor);
      console.log(
        `${b.name.padEnd(20)} | ${"█".repeat(barLength)} ${b.duration.toFixed(
          2
        )} ms`
      );
    });

    console.log("=================================\n");
  }
}

export class Timer {
  #measureName: string;
  #startMark: string;
  #stopMark: string;
  #startTime?: number;

  constructor(label = "duration") {
    const id = `${label}-${performance.now()}-${Math.random()}`;
    this.#measureName = `${id}-measure`;
    this.#startMark = `${id}-start`;
    this.#stopMark = `${id}-stop`;
  }

  start(): void {
    this.#startTime = performance.now();
    performance.mark(this.#startMark);
  }

  stop(): NodePerformanceMeasure {
    if (!this.#startTime) {
      throw new Error("Timer not started");
    }

    performance.mark(this.#stopMark);
    const measure = performance.measure(
      this.#measureName,
      this.#startMark,
      this.#stopMark
    );

    // Clean up marks to prevent memory leaks
    performance.clearMarks(this.#startMark);
    performance.clearMarks(this.#stopMark);
    performance.clearMeasures(this.#measureName);

    return measure;
  }

  static toJSON(): ReturnType<typeof performance.toJSON> {
    return performance.toJSON();
  }

  static now(): number {
    return performance.now();
  }

  static timeOrigin(): number {
    return performance.timeOrigin;
  }

  static loopUtilization(): EventLoopUtilization {
    return performance.eventLoopUtilization();
  }

  static inspect(label: string, measurement: Measurement) {
    const loop = measurement.eventLoop || Timer.loopUtilization();
    const memory =
      measurement.memory ||
      (process?.memoryUsage ? process.memoryUsage() : undefined);

    return {
      label,
      duration: measurement.duration.toFixed(3) + " ms",
      startedAt: new Date(measurement.absoluteStartTime).toISOString(),
      endedAt: new Date(measurement.absoluteEndTime).toISOString(),
      loop: {
        utilization: loop.utilization.toFixed(4),
        idle: loop.idle.toFixed(2) + " ms",
        active: loop.active.toFixed(2) + " ms",
      },
      memory: memory
        ? {
            rss: (memory.rss / 1024 / 1024).toFixed(2) + " MB",
            heapTotal: (memory.heapTotal / 1024 / 1024).toFixed(2) + " MB",
            heapUsed: (memory.heapUsed / 1024 / 1024).toFixed(2) + " MB",
            external: (memory.external / 1024 / 1024).toFixed(2) + " MB",
          }
        : { rss: "N/A", heapTotal: "N/A", heapUsed: "N/A", external: "N/A" },
      raw: measurement,
    };
  }
}
