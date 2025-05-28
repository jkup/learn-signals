# 🚦 Simple Educational Signals Implementation

A minimal, easy-to-understand implementation of JavaScript Signals based on the [TC39 Signals Proposal](https://github.com/tc39/proposal-signals). This implementation prioritizes **clarity and educational value** over performance optimizations.

## 🎯 Purpose

This library is designed to help you understand:

- How reactive programming works under the hood
- The core concepts of the TC39 Signals proposal
- Auto-tracking dependency management
- Pull-based lazy evaluation

## ✨ Key Features

### 📦 Core API

- **`Signal.State<T>`** - Writable reactive state
- **`Signal.Computed<T>`** - Computed values that automatically track dependencies
- **`Signal.subtle.Watcher`** - Low-level API for observing signal changes

### ⚛️ Effect API (not part of the TC39 proposal)

- **`effect(fn)`** - Side effects that run when dependencies change. This is just added for educational purposes. In reality, this would be handled by the framework.

### 🔄 Key Characteristics

- **Auto-tracking**: Computed signals automatically discover their dependencies
- **Pull-based**: Computations are lazy and only run when accessed
- **Cached**: Results are memoized until dependencies change
- **Synchronous notifications**: Watchers are notified immediately when signals change

## 📖 Detailed Examples

### Auto-tracking Dependencies

```typescript
const firstName = new Signal.State("John");
const lastName = new Signal.State("Doe");

// This computed automatically tracks both firstName and lastName
const fullName = new Signal.Computed(
  () => `${firstName.get()} ${lastName.get()}`
);

console.log(fullName.get()); // "John Doe"

firstName.set("Jane");
console.log(fullName.get()); // "Jane Doe" - automatically updated!
```

## 🏗️ How It Works

### Auto-tracking Magic

When a computed signal runs, it sets itself as the "currently computing" signal. Any state signals accessed during this time automatically register the computed as a dependent.

```typescript
// When this computed runs:
const computed = new Signal.Computed(() => {
  return state1.get() + state2.get(); // Both state1 and state2 track this computed
});
```

### Pull-based Evaluation

Computed signals are lazy - they only recalculate when someone actually reads their value, even if dependencies changed earlier.

```typescript
state.set(newValue); // Marks computeds as "stale" but doesn't run them
// ... other code ...
const result = computed.get(); // NOW the computation runs
```

## 🔍 Differences from Production Implementations

This educational version omits some optimizations found in production signals:

- **No performance optimizations** (prioritizes clarity)
- **No advanced scheduling** (basic effect implementation)
- **No memory optimizations** (uses simple data structures)
- **No async support** (synchronous only)
- **Simplified error handling** (basic error propagation)

## 🔗 Links

- [TC39 Signals Proposal](https://github.com/tc39/proposal-signals) - The official proposal
- [Rob Eisenberg's Blog Post](https://eisenbergeffect.medium.com/a-tc39-proposal-for-signals-f0bedd37a335) - Explains the motivation and design
