import {
  EventLoopUtilization,
  performance,
  type PerformanceMeasure as NodePerformanceMeasure,
} from "node:perf_hooks";

export interface Mesaurement {
  duration: number;
  startTime: number;
  name: string;
}

export class Timer {
  #measureName: string;
  #startMark: string;
  #stopMark: string;

  constructor(label = "duration") {
    const id = `${label}-${performance.now()}-${Math.random()}`;
    this.#measureName = `${id}-measure`;
    this.#startMark = `${id}-start`;
    this.#stopMark = `${id}-stop`;
  }

  start(): void {
    const mark = performance.mark(this.#startMark);
    console.log("start", mark);
  }

  stop(): NodePerformanceMeasure {
    performance.mark(this.#stopMark);
    const measure = performance.measure(
      this.#measureName,
      this.#startMark,
      this.#stopMark
    );
    // performance.clearMarks(this.#startMark);
    // performance.clearMarks(this.#stopMark);
    return measure;
  }

  static toJSON(): ReturnType<typeof performance.toJSON> {
    return performance.toJSON();
  }

  static now(): number {
    return performance.now(); // relative to timeOrigin
  }

  static timeOrigin(): number {
    return performance.timeOrigin; // absolute start timestamp
  }

  static loopUtilization(): EventLoopUtilization {
    return performance.eventLoopUtilization();
  }

  static inspect(label: string, measure: NodePerformanceMeasure) {
    const origin = Timer.timeOrigin();
    const loop = Timer.loopUtilization();

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
      raw: measure,
    };
  }
}
