# Metrics Reporter

A hybrid pattern for managing metrics and observability data or buckets of data
where you need to observe changes over time.

## How It Works

The `Reporter` class is a hybrid pattern for managing metrics and observability data or buckets of data
where you need to observe changes over time.

It combines the flexibility of function-based commands with the simplicity of direct delta patches.

### Methods

- `filter()` — logical AND (default: all predicates must pass).
- `prune()` — logical AND, but destructive (mutates state and emits).
- `extract(..., "any" | "all")` — read-only sampling with logical mode (default: all predicates must pass).
- `watch(...keys)` — filtered stream that only emits when watched keys change (default: all keys).

### Operation Functions

`set`, `add`, `sub`, `compute`, `when` each return a pure function that derives a partial delta from the existing state.

### Mixed Deltas

`apply()` accepts both raw partial objects and Operation functions, merging all deltas into one map.

### Single Emission

Internally computes a net delta, updates `#state` once, and calls `BehaviorSubject.next()` a single time.

### Distinct Until Changed

Uses a bulletproof `shallowEqual` to suppress duplicate emissions, but honors `NaN`, `-0`, and reference changes as distinct.

### Snapshot Safety

`snapshot()` returns a shallow clone to prevent external mutation.

This hybrid pattern delivers both the flexibility of function-based commands and the simplicity of direct delta patches—while ensuring your monitoring/metrics stream stays consistent, debounced, and fully-tested.

## Usage

```ts

```
