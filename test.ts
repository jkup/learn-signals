import { Signal, effect } from "./index.js";

// Simple test runner
async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    console.log(`✅ ${name}`);
  } catch (error) {
    console.log(`❌ ${name}: ${error}`);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

console.log("🧪 Running Simple Signals Tests\n");

// Test 1: Basic State
test("State creation and access", () => {
  const state = new Signal.State(42);
  assert(state.get() === 42, "State should return initial value");

  state.set(100);
  assert(state.get() === 100, "State should return updated value");
});

// Test 2: Basic Computed
test("Computed creation and caching", () => {
  const state = new Signal.State(5);
  let computeCount = 0;

  const computed = new Signal.Computed(() => {
    computeCount++;
    return state.get() * 2;
  });

  assert(computed.get() === 10, "Computed should return correct value");
  assert(computeCount === 1, "Computation should run once");

  // Access again - should use cache
  assert(computed.get() === 10, "Computed should return same value");
  assert(computeCount === 1, "Computation should not run again");
});

// Test 3: Auto-tracking
test("Auto-tracking dependencies", () => {
  const state = new Signal.State(3);
  let computeCount = 0;

  const computed = new Signal.Computed(() => {
    computeCount++;
    return state.get() + 10;
  });

  assert(computed.get() === 13, "Initial computed value correct");
  assert(computeCount === 1, "Computed once initially");

  state.set(7);
  assert(computed.get() === 17, "Computed updates after state change");
  assert(computeCount === 2, "Computed recomputed after state change");
});

// Test 4: Multiple dependencies
test("Multiple dependencies tracking", () => {
  const a = new Signal.State(2);
  const b = new Signal.State(3);

  const sum = new Signal.Computed(() => a.get() + b.get());

  assert(sum.get() === 5, "Sum of 2 + 3 = 5");

  a.set(4);
  assert(sum.get() === 7, "Sum after changing a: 4 + 3 = 7");

  b.set(6);
  assert(sum.get() === 10, "Sum after changing b: 4 + 6 = 10");
});

// Test 5: Conditional dependencies
test("Conditional dependencies", () => {
  const flag = new Signal.State(true);
  const a = new Signal.State(1);
  const b = new Signal.State(2);
  let computeCount = 0;

  const conditional = new Signal.Computed(() => {
    computeCount++;
    if (flag.get()) {
      return a.get();
    } else {
      return b.get();
    }
  });

  assert(conditional.get() === 1, "Should use a when flag is true");
  assert(computeCount === 1, "Computed once");

  // Change b - should not recompute since flag is true
  b.set(10);
  assert(conditional.get() === 1, "Should still be 1");
  assert(computeCount === 1, "Should not recompute");

  // Change a - should recompute
  a.set(5);
  assert(conditional.get() === 5, "Should update to 5");
  assert(computeCount === 2, "Should recompute");

  // Switch flag
  flag.set(false);
  assert(conditional.get() === 10, "Should now use b");
  assert(computeCount === 3, "Should recompute");
});

// Test 6: Effects
test("Effects run on changes", async () => {
  const state = new Signal.State(1);
  let effectRuns = 0;
  let lastValue = 0;

  const stop = effect(() => {
    effectRuns++;
    lastValue = state.get();
  });

  assert(effectRuns === 1, "Effect should run immediately");
  assert(lastValue === 1, "Effect should see initial value");

  // With the TC39-compliant effect implementation, effects properly re-run
  state.set(5);

  // Give microtask a chance to run
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert(effectRuns === 2, "Effect should re-run when dependency changes");
  assert(lastValue === 5, "Effect should see updated value");

  stop();
});

// Test 7: Untrack
test("Untrack prevents dependencies", () => {
  const tracked = new Signal.State(1);
  const untracked = new Signal.State(100);
  let computeCount = 0;

  const computed = new Signal.Computed(() => {
    computeCount++;
    const a = tracked.get();
    const b = Signal.subtle.untrack(() => untracked.get());
    return a + b;
  });

  assert(computed.get() === 101, "Should compute 1 + 100 = 101");
  assert(computeCount === 1, "Computed once");

  // Change tracked value - should recompute
  tracked.set(2);
  assert(computed.get() === 102, "Should update to 2 + 100 = 102");
  assert(computeCount === 2, "Should recompute");

  // Change untracked value - should NOT recompute
  untracked.set(200);
  assert(computed.get() === 102, "Should stay 2 + 100 = 102");
  assert(computeCount === 2, "Should not recompute");
});

// Test 8: Chained computeds
test("Chained computed signals", () => {
  const base = new Signal.State(2);
  const doubled = new Signal.Computed(() => base.get() * 2);
  const quadrupled = new Signal.Computed(() => doubled.get() * 2);

  assert(quadrupled.get() === 8, "Should compute 2 * 2 * 2 = 8");

  base.set(3);
  assert(quadrupled.get() === 12, "Should compute 3 * 2 * 2 = 12");
});

// Test 9: Effect cleanup
test("Effect cleanup", () => {
  const state = new Signal.State("initial");
  let cleanupCalls = 0;

  const stop = effect(() => {
    const value = state.get();
    return () => {
      cleanupCalls++;
    };
  });

  // In this simplified implementation, cleanup only happens when effect stops
  assert(cleanupCalls === 0, "No cleanup calls yet");

  stop();
  assert(cleanupCalls === 1, "Cleanup should be called when effect stops");
});

// Test 11: Watcher API
test("Watcher API notifications", () => {
  const state = new Signal.State(1);
  const computed = new Signal.Computed(() => state.get() * 2);

  let notificationCount = 0;
  const watcher = new Signal.subtle.Watcher(() => {
    notificationCount++;
  });

  // Watch the state
  watcher.watch(state);

  // Change state - should trigger notification
  state.set(2);
  assert(
    notificationCount === 1,
    "Should receive notification for state change"
  );

  // Watch the computed too and access it to initialize
  watcher.watch(computed);
  computed.get(); // Initialize the computed so it can be marked stale

  // Change state again - should trigger notifications for both state and computed
  state.set(3);
  assert(
    notificationCount === 3,
    "Should receive notifications for both state and computed"
  );

  // Unwatch state - now we only watch the computed
  watcher.unwatch(state);

  // Change state - computed gets marked stale but watcher isn't notified
  // until the computed is accessed (this is correct lazy behavior)
  state.set(4);
  assert(notificationCount === 3, "Computed marked stale but not yet notified");

  // Clean up
  watcher.unwatch(computed);
});

console.log("\n🎉 All tests completed!");
