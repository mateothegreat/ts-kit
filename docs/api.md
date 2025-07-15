# TS-Kit API Documentation

## Overview

TS-Kit is a TypeScript utility library providing tools for containers, filesystem operations, and observability metrics.

## Observability Metrics

### Benchmark Class

The [`Benchmark`](src/observability/metrics/decorators.ts:53) class provides a comprehensive benchmarking tool for measuring performance of functions and methods.

#### Static Methods

- **`benchmark(options: BenchmarkOptions = {})`**  
  Decorator to benchmark a method.  
  Parameters:  
  - `options`: [`BenchmarkOptions`](src/observability/metrics/decorators.ts:20) - Configuration for the benchmark.  

  Usage:  

  ```typescript
  class Example {
    @Benchmark.benchmark({ iterations: 5, visualize: true })
    async myMethod() {
      // code
    }
  }
  ```

#### Instance Methods

- **`run(name: string, fn: (...args: any[]) => Promise<any>, args: any[] = [], options: BenchmarkOptions = {})`**  
  Runs the benchmark on the provided function.  
  Returns: `{ benchmark: BenchmarkResult; result: any }`  

- **`visualize(results?: BenchmarkResult[])`**  
  Visualizes the benchmark results in the console with stats, histogram, timeline, and memory usage.

- **`export(format: 'json' | 'csv' | 'prometheus' = 'json')`**  
  Exports the results in the specified format.

- **`compare(names: string[])`**  
  Compares multiple benchmarks by name.

#### Static Utility Methods

- **`compareTimers()`**  
  Returns sorted array of all measurements.

- **`visualInspector(measurements?: Measurement[])`**  
  Visual bar chart inspector for measurements.

### Timer Class

The [`Timer`](src/observability/metrics/decorators.ts:308) class provides low-level timing capabilities.

#### Constructor

- **`constructor(label = "duration")`**  

#### Methods

- **`start()`**  
  Starts the timer.

- **`stop()`**  
  Stops the timer and returns the measurement.

#### Static Methods

- **`toJSON()`**  
  Returns performance JSON.

- **`now()`**  
  Returns current performance time.

- **`timeOrigin()`**  
  Returns time origin.

- **`loopUtilization()`**  
  Returns event loop utilization.

- **`inspect(label: string, measurement: Measurement)`**  
  Inspects and formats a measurement with additional details.

### Interfaces

- **[`Measurement`](src/observability/metrics/decorators.ts:10)**  
  - `duration`: number  
  - `startTime`: number  
  - `name`: string  
  - `absoluteStartTime`: number  
  - `absoluteEndTime`: number  
  - `memory?`: NodeJS.MemoryUsage  
  - `eventLoop?`: EventLoopUtilization  

- **[`BenchmarkOptions`](src/observability/metrics/decorators.ts:20)**  
  - `warmupRuns?`: number (default: 3)  
  - `iterations?`: number (default: 10)  
  - `collectMemory?`: boolean (default: true)  
  - `collectEventLoop?`: boolean (default: true)  
  - `autoLog?`: boolean (default: false)  
  - `exportFormat?`: 'json' | 'csv' | 'prometheus' | 'none' (default: 'none')  
  - `outputPath?`: string (default: './benchmarks')  
  - `visualize?`: boolean (default: false)  
  - `enableVisualInspector?`: boolean (default: false)  

- **[`BenchmarkResult`](src/observability/metrics/decorators.ts:35)**  
  - `name`: string  
  - `measurements`: Measurement[]  
  - `stats`: { min, max, mean, median, p95, p99, stdDev }  
  - `systemMetrics`: { totalMemory, eventLoopUtilization }  

## Containers

### HierarchicalContainer

A container for managing hierarchical data structures.

- Methods: add, get, remove, etc. (See source for details: [`hierarchical-container.ts`](src/containers/hierarchical-container.ts))

## Filesystem Utilities

### ensure(path: string)

Ensures the directory or file exists, creating it if necessary.

- See [`ensure.ts`](src/fs/ensure.ts) for implementation.

For full source code and additional utilities, refer to the repository files.
