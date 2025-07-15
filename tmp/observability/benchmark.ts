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
  memory: NodeJS.MemoryUsage;
  eventLoop: EventLoopUtilization;
}

export interface BenchmarkOptions {
  warmupRuns?: number;
  iterations?: number;
  collectMemory?: boolean;
  collectEventLoop?: boolean;
  autoLog?: boolean;
  exportFormat?: "json" | "csv" | "none";
  outputPath?: string;
  visualize?: boolean;
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

export class PowerBenchmark {
  private results: Map<string, BenchmarkResult> = new Map();
  private baselineEventLoop: EventLoopUtilization;
  private static benchmarks: Measurement[] = [];

  constructor() {
    this.baselineEventLoop = performance.eventLoopUtilization();
  }

  // Decorator for drop-in usage
  static benchmark(options: BenchmarkOptions = {}) {
    return function (
      target: any,
      propertyKey: string,
      descriptor: PropertyDescriptor
    ) {
      const originalMethod = descriptor.value;
      descriptor.value = async function (...args: any[]) {
        const suite = new PowerBenchmark();
        const result = await suite.run(
          propertyKey,
          originalMethod.bind(this),
          args,
          options
        );

        if (options.visualize) {
          suite.visualize([result]);
        }
        return result;
      };
      return descriptor;
    };
  }

  async run(
    name: string,
    fn: Function,
    args: any[] = [],
    options: BenchmarkOptions = {}
  ): Promise<BenchmarkResult> {
    const {
      warmupRuns = 3,
      iterations = 10,
      collectMemory = true,
      collectEventLoop = true,
      autoLog = false,
      exportFormat = "none",
      outputPath = "./benchmarks",
      visualize = false,
    } = options;

    for (let i = 0; i < warmupRuns; i++) {
      await fn(...args);
    }

    const measurements: Measurement[] = [];
    for (let i = 0; i < iterations; i++) {
      const timer = new Timer(name);
      const startMemory = collectMemory ? memoryUsage() : undefined;
      const startEventLoop = collectEventLoop
        ? performance.eventLoopUtilization(this.baselineEventLoop)
        : undefined;

      timer.start();
      await fn(...args);
      const measure = timer.stop();

      const endMemory = collectMemory ? memoryUsage() : undefined;
      const endEventLoop = collectEventLoop
        ? performance.eventLoopUtilization(startEventLoop)
        : undefined;

      const m: Measurement = {
        duration: measure.duration,
        startTime: measure.startTime,
        name: measure.name,
        absoluteStartTime: Timer.timeOrigin() + measure.startTime,
        absoluteEndTime:
          Timer.timeOrigin() + measure.startTime + measure.duration,
        memory: endMemory as NodeJS.MemoryUsage,
        eventLoop: endEventLoop as EventLoopUtilization,
      };

      measurements.push(m);
      PowerBenchmark.benchmarks.push(m);

      if (autoLog) {
        console.log(
          `Benchmark[${name}] #${i + 1}:`,
          Timer.inspect(name, measure)
        );
      }

      if (exportFormat !== "none") {
        this.exportSingle(m, name, exportFormat, outputPath);
      }
    }

    const result: BenchmarkResult = {
      name,
      measurements,
      stats: this.calculateStats(measurements),
      systemMetrics: {
        totalMemory: memoryUsage(),
        eventLoopUtilization: performance.eventLoopUtilization(),
      },
    };

    this.results.set(name, result);

    if (visualize) {
      this.visualize([result]);
    }

    return result;
  }

  private calculateStats(measurements: Measurement[]) {
    const durations = measurements.map((m) => m.duration).sort((a, b) => a - b);
    const mean = durations.reduce((a, b) => a + b, 0) / durations.length;
    const variance =
      durations.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) /
      durations.length;
    return {
      min: durations[0],
      max: durations[durations.length - 1],
      mean,
      median: durations[Math.floor(durations.length / 2)],
      p95: durations[Math.floor(durations.length * 0.95)],
      p99: durations[Math.floor(durations.length * 0.99)],
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
      console.log(`📈 Duration Stats:`);
      Object.entries(result.stats).forEach(([k, v]) => {
        console.log(`   ${k}: ${typeof v === "number" ? v.toFixed(3) : v}`);
      });
      this.renderHistogram(result.measurements);
      this.renderTimeline(result.measurements);
      if (result.measurements[0].memory) {
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
        maxDuration === minDuration
          ? 1
          : (measurement.duration - minDuration) / (maxDuration - minDuration);
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

  // Export all results in one file
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

  // Export a single measurement (for decorator/manual run)
  private exportSingle(
    measurement: Measurement,
    name: string,
    format: string,
    outputPath: string
  ) {
    const fileName = `${name}-${Date.now()}.${format}`;
    const fullPath = join(outputPath, fileName);
    let data: string;
    if (format === "json") {
      data = JSON.stringify(measurement, null, 2);
    } else if (format === "csv") {
      data = `Label,Duration (ms),Start Time,End Time\n`;
      data += `${measurement.name},${measurement.duration},${measurement.startTime},${measurement.absoluteEndTime}\n`;
    } else {
      return;
    }
    writeFileSync(fullPath, data);
  }

  // Compare multiple benchmarks by name
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

  // Compare all timers (manual usage)
  static compareTimers(): Measurement[] {
    return [...PowerBenchmark.benchmarks].sort(
      (a, b) => a.duration - b.duration
    );
  }

  // Visual inspector for all timers
  static visualInspector(): void {
    console.log("\n=== Visual Benchmark Inspector ===");
    const benchmarks = PowerBenchmark.benchmarks;
    const maxDuration = Math.max(...benchmarks.map((b) => b.duration));
    const scaleFactor = 50 / maxDuration;
    benchmarks.forEach((benchmark) => {
      const barLength = Math.round(benchmark.duration * scaleFactor);
      console.log(
        `${benchmark.name.padEnd(20)} | ${"█".repeat(
          barLength
        )} ${benchmark.duration.toFixed(2)} ms`
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
    if (!this.#startTime) throw new Error("Timer not started");
    performance.mark(this.#stopMark);
    const measure = performance.measure(
      this.#measureName,
      this.#startMark,
      this.#stopMark
    );
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

  static inspect(label: string, measure: NodePerformanceMeasure) {
    const origin = Timer.timeOrigin();
    const loop = Timer.loopUtilization();
    const memory =
      typeof process !== "undefined" && process.memoryUsage
        ? {
            rss: (process.memoryUsage().rss / 1024 / 1024).toFixed(2) + " MB",
            heapTotal:
              (process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2) +
              " MB",
            heapUsed:
              (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2) + " MB",
          }
        : { rss: "N/A", heapTotal: "N/A", heapUsed: "N/A" };
    return {
      label,
      duration: measure.duration.toFixed(3) + " ms",
      startedAt: new Date(origin + measure.startTime).toISOString(),
      endedAt: new Date(
        origin + measure.startTime + measure.duration
      ).toISOString(),
      loop: {
        utilization: loop.utilization.toFixed(4),
        idle: loop.idle.toFixed(2) + " ms",
        active: loop.active.toFixed(2) + " ms",
      },
      memory,
      raw: measure,
    };
  }
}

/*
======== USAGE EXAMPLES ========

1. Simple Decorator Usage:
class MyService {
  @PowerBenchmark.benchmark({ iterations: 5, visualize: true })
  async processData(data: any[]) {
    // Your processing logic
    return data.map(item => item * 2);
  }
}

2. Manual Benchmarking:
const suite = new PowerBenchmark();
await suite.run('http-fetch', async () => {
  const response = await fetch('<https://api.example.com>');
  return response.json();
}, [], { iterations: 10, collectMemory: true });

await suite.run('json-parse', () => {
  return JSON.parse(largeJsonString);
}, [], { iterations: 100 });

suite.visualize();
suite.compare(['http-fetch', 'json-parse']);
console.log(suite.export('csv'));

3. Custom Configuration:
const result = await suite.run('custom-benchmark', myFunction, [arg1, arg2], {
  warmupRuns: 5,
  iterations: 50,
  collectMemory: true,
  collectEventLoop: true,
  exportFormat: 'json',
  visualize: true
});

// Manual timer usage:
const timer1 = new Timer("task1");
timer1.start();
await someAsyncTask();
timer1.stop();

PowerBenchmark.visualInspector();
console.log("Comparison:", PowerBenchmark.compareTimers());
*/
