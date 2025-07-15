# @mateothegreat/ts-kit

A TypeScript utility library providing containers, filesystem utilities, and observability tools.

## Installation

```bash
npm install @mateothegreat/ts-kit
```

## Usage

### Import the entire library

```typescript
import * as tskit from '@mateothegreat/ts-kit';

// Use containers
const container = new tskit.HierarchicalContainer();

// Use filesystem utilities
await tskit.ensure('/path/to/directory');

// Use benchmarking
import { Benchmark } from '@mateothegreat/ts-kit/observability/metrics/decorators';

class MyClass {
  @Benchmark.benchmark({ iterations: 5 })
  async myMethod() {
    // code to benchmark
  }
}
```

### Import specific modules

```typescript
// Import only containers
import { HierarchicalContainer } from '@mateothegreat/ts-kit/containers';

// Import only filesystem utilities
import { ensure } from '@mateothegreat/ts-kit/fs';

// Import benchmarking
import { Benchmark } from '@mateothegreat/ts-kit/observability/metrics/decorators';
```

### Import individual exports

```typescript
import { HierarchicalContainer, ensure, Benchmark } from '@mateothegreat/ts-kit';
```

## Features

- **Containers**: Hierarchical container implementation for managing nested data structures
- **Filesystem**: Utilities for filesystem operations including directory/file creation
- **Observability**: Advanced benchmarking tools with metrics, visualization, and export capabilities

### Benchmarking

The benchmarking tool allows you to easily measure performance of methods with options for iterations, warmup, memory and event loop tracking, visualization, and data export.

Example:

```typescript
class Example {
  @Benchmark.benchmark({
    iterations: 10,
    warmupRuns: 3,
    visualize: true,
    collectMemory: true
  })
  async processData(data: any[]) {
    // Your code here
  }
}

// Manual usage
const benchmark = new Benchmark();
const { benchmark: result } = await benchmark.run('myFunction', async () => {
  // code
}, [], { iterations: 10 });
benchmark.visualize();
```

For detailed API documentation, see [api.md](docs/api.md).

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build the library
npm run build

# Watch tests
npm run test:watch
```

## License

MIT
