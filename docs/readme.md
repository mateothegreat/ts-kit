# @mateothegreat/ts-kit

A TypeScript utility library providing containers and filesystem utilities.

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
```

### Import specific modules

```typescript
// Import only containers
import { HierarchicalContainer } from '@mateothegreat/ts-kit/containers';

// Import only filesystem utilities
import { ensure } from '@mateothegreat/ts-kit/fs';
```

### Import individual exports

```typescript
import { HierarchicalContainer, ensure } from '@mateothegreat/ts-kit';
```

## Features

- **Containers**: Hierarchical container implementation for managing nested data structures
- **Filesystem**: Utilities for filesystem operations including directory/file creation

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
