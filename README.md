# 🚦 Simple Educational Signals Implementation

A minimal, easy-to-understand implementation of JavaScript Signals based on the [TC39 Signals Proposal](https://github.com/tc39/proposal-signals). This implementation prioritizes **clarity and educational value** over performance optimizations.

## 🎯 Purpose

This library is designed to help you understand:

- How reactive programming works under the hood
- The core concepts of the TC39 Signals proposal
- Auto-tracking dependency management
- Pull-based lazy evaluation
- Glitch-free execution

## ✨ Key Features

### 📦 Core API

- **`Signal.State<T>`** - Writable reactive state
- **`Signal.Computed<T>`** - Computed values that automatically track dependencies
- **`effect(fn)`** - Side effects that run when dependencies change
- **`Signal.subtle.untrack(fn)`** - Run code without creating dependencies
- **`Signal.subtle.Watcher`** - Low-level API for observing signal changes

### 🔄 Key Characteristics

- **Auto-tracking**: Computed signals automatically discover their dependencies
- **Pull-based**: Computations are lazy and only run when accessed
- **Glitch-free**: No unnecessary recalculations or intermediate states
- **Cached**: Results are memoized until dependencies change
- **Synchronous notifications**: Watchers are notified immediately when signals change

## 🚀 Quick Start

```typescript
import { Signal, effect } from "./index.js";

// Create reactive state
const count = new Signal.State(0);
const doubled = new Signal.Computed(() => count.get() * 2);

// Create an effect that runs when dependencies change
const stop = effect(() => {
  console.log("Count:", count.get(), "Doubled:", doubled.get());
});
// Logs: "Count: 0 Doubled: 0"

// Update the state - effect runs automatically
count.set(5);
// Logs: "Count: 5 Doubled: 10"

// Stop the effect
stop();
```

## 📖 Detailed Examples

### Basic Counter

```typescript
const counter = new Signal.State(0);
const isEven = new Signal.Computed(() => (counter.get() & 1) === 0);
const parity = new Signal.Computed(() => (isEven.get() ? "even" : "odd"));

console.log(`${counter.get()} is ${parity.get()}`); // "0 is even"

counter.set(3);
console.log(`${counter.get()} is ${parity.get()}`); // "3 is odd"
```

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

### Conditional Dependencies

```typescript
const useNickname = new Signal.State(false);
const realName = new Signal.State("Robert");
const nickname = new Signal.State("Bob");

const displayName = new Signal.Computed(() => {
  if (useNickname.get()) {
    return nickname.get(); // Only tracks nickname when useNickname is true
  } else {
    return realName.get(); // Only tracks realName when useNickname is false
  }
});

console.log(displayName.get()); // "Robert"

// Changing nickname won't trigger updates since useNickname is false
nickname.set("Bobby");
console.log(displayName.get()); // Still "Robert"

useNickname.set(true);
console.log(displayName.get()); // Now "Bobby"
```

### Effects with Cleanup

```typescript
const message = new Signal.State("Hello");

const stop = effect(() => {
  const msg = message.get();
  console.log(`Current message: ${msg}`);

  // Return cleanup function (optional)
  return () => {
    console.log(`Cleaning up for: ${msg}`);
  };
});

message.set("World");
// Logs: "Cleaning up for: Hello"
// Logs: "Current message: World"

stop(); // Manual cleanup
```

### Untrack for Breaking Dependencies

```typescript
const tracked = new Signal.State(1);
const untracked = new Signal.State(100);

const computed = new Signal.Computed(() => {
  const a = tracked.get(); // Creates dependency

  // This won't create a dependency
  const b = Signal.subtle.untrack(() => untracked.get());

  return a + b;
});

console.log(computed.get()); // 101

tracked.set(2);
console.log(computed.get()); // 102 (recomputed)

untracked.set(200);
console.log(computed.get()); // Still 102 (not recomputed)
```

### Low-level Watcher API

The `Signal.subtle.Watcher` provides the foundation for building effects and reactive systems:

```typescript
const state = new Signal.State(0);
const computed = new Signal.Computed(() => state.get() * 2);

// Create a watcher that gets notified of changes
const watcher = new Signal.subtle.Watcher(() => {
  console.log("Something changed!");
});

// Watch specific signals
watcher.watch(state);
watcher.watch(computed);

state.set(5); // Logs: "Something changed!" (twice - once for state, once for computed)

// Stop watching
watcher.unwatch(state);
watcher.unwatch(computed);
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

### Glitch-free Updates

Because computations are pull-based, you never see inconsistent intermediate states. All dependencies are resolved before any effects run.

## 🎓 Educational Features

This implementation includes helpful comments and simplified logic to make it easy to understand:

- Clear separation between state and computed signals
- Explicit dependency tracking with Set data structures
- Simple stale-marking algorithm
- Readable method names and clear code flow

## 🔍 Differences from Production Implementations

This educational version omits some optimizations found in production signals:

- **No performance optimizations** (prioritizes clarity)
- **No advanced scheduling** (basic effect implementation)
- **No memory optimizations** (uses simple data structures)
- **No async support** (synchronous only)
- **Simplified error handling** (basic error propagation)

### ✅ TC39 Proposal Alignment

This implementation now includes the key aspects of the TC39 proposal:

- **`Signal.State` and `Signal.Computed`** - Core signal types
- **`Signal.subtle.Watcher`** - Low-level observation API
- **`Signal.subtle.untrack`** - Dependency escape hatch
- **Auto-tracking** - Automatic dependency discovery
- **Pull-based evaluation** - Lazy computation
- **Synchronous notifications** - Immediate watcher callbacks
- **Computed→computed dependencies** - Full dependency tracking

## 🧪 Running the Examples

```bash
# Run the comprehensive examples
npx tsx example.ts

# Or with Node.js (if you have a TypeScript compiler)
tsc && node example.js
```

## 📚 Learning Path

1. **Start with the basic counter example** - understand state and computed
2. **Explore auto-tracking** - see how dependencies work automatically
3. **Try conditional dependencies** - understand dynamic dependency tracking
4. **Experiment with effects** - learn about side effects and cleanup
5. **Use untrack** - understand when to break dependencies
6. **Read the source code** - it's designed to be educational!

## 🔗 Related Resources

- [TC39 Signals Proposal](https://github.com/tc39/proposal-signals) - The official proposal
- [Signals Polyfill](https://github.com/proposal-signals/signal-polyfill) - Production-ready implementation
- [Rob Eisenberg's Blog Post](https://eisenbergeffect.medium.com/a-tc39-proposal-for-signals-f0bedd37a335) - Explains the motivation and design

## ⚖️ License

This educational implementation is provided for learning purposes. The TC39 Signals proposal is developed by the TC39 committee and various framework authors.

## 🤝 Contributing

This is an educational project! Feel free to:

- Ask questions about how things work
- Suggest improvements to make concepts clearer
- Add more educational examples
- Fix bugs or improve documentation

The goal is to help people understand signals, not to build a production library.
