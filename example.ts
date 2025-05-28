import { Signal, effect } from "./index.js";

console.log("🚦 Simple Signals Educational Examples\n");

// Example 1: Basic Counter
console.log("📊 Example 1: Basic Counter");
const counter = new Signal.State(0);
const isEven = new Signal.Computed(() => (counter.get() & 1) === 0);
const parity = new Signal.Computed(() => (isEven.get() ? "even" : "odd"));

console.log(`Initial: ${counter.get()} is ${parity.get()}`);

counter.set(1);
console.log(`After set(1): ${counter.get()} is ${parity.get()}`);

counter.set(4);
console.log(`After set(4): ${counter.get()} is ${parity.get()}`);

// Example 2: Auto-tracking demonstration
console.log("\n🔗 Example 2: Auto-tracking");
const firstName = new Signal.State("John");
const lastName = new Signal.State("Doe");
const fullName = new Signal.Computed(
  () => `${firstName.get()} ${lastName.get()}`
);

console.log(`Full name: ${fullName.get()}`);

firstName.set("Jane");
console.log(`After changing first name: ${fullName.get()}`);

lastName.set("Smith");
console.log(`After changing last name: ${fullName.get()}`);

// Example 3: Conditional dependencies
console.log("\n⚡ Example 3: Conditional Dependencies");
const useFirstName = new Signal.State(true);
const displayName = new Signal.Computed(() => {
  if (useFirstName.get()) {
    return firstName.get();
  } else {
    return lastName.get();
  }
});

console.log(`Display name (using first): ${displayName.get()}`);

useFirstName.set(false);
console.log(`Display name (using last): ${displayName.get()}`);

// Now changing firstName shouldn't affect displayName
firstName.set("Bob");
console.log(`After changing firstName: ${displayName.get()}`); // Still shows lastName

// Example 4: Effects
console.log("\n🔄 Example 4: Effects");
const temperature = new Signal.State(20);
const temperatureF = new Signal.Computed(
  () => (temperature.get() * 9) / 5 + 32
);

const stopTempEffect = effect(() => {
  const temp = temperature.get();
  const tempF = temperatureF.get();
  console.log(`Temperature: ${temp}°C (${tempF}°F)`);
});

console.log("Changing temperature...");
temperature.set(25);
temperature.set(30);

// Example 5: Effect with cleanup
console.log("\n🧹 Example 5: Effect with Cleanup");
const message = new Signal.State("Hello");
let intervalId: number | undefined;

const stopMessageEffect = effect(() => {
  const msg = message.get();
  console.log(`Setting up timer for: "${msg}"`);

  // Return cleanup function
  return () => {
    console.log(`Cleaning up timer for: "${msg}"`);
    if (intervalId !== undefined) {
      clearInterval(intervalId);
    }
  };
});

message.set("World");
message.set("Signals");

// Example 6: Untrack usage
console.log("\n🔓 Example 6: Untrack");
const tracked = new Signal.State(0);
const untracked = new Signal.State(100);

const mixed = new Signal.Computed(() => {
  const trackedValue = tracked.get(); // This creates a dependency

  // This won't create a dependency due to untrack
  const untrackedValue = Signal.subtle.untrack(() => untracked.get());

  return trackedValue + untrackedValue;
});

console.log(`Mixed value: ${mixed.get()}`);

console.log("Changing tracked value...");
tracked.set(5);
console.log(`Mixed value after tracked change: ${mixed.get()}`);

console.log("Changing untracked value...");
untracked.set(200);
console.log(`Mixed value after untracked change: ${mixed.get()}`); // Should be same as before

// Example 7: Demonstrating caching/memoization
console.log("\n💾 Example 7: Caching/Memoization");
let computeCount = 0;

const expensiveComputation = new Signal.Computed(() => {
  computeCount++;
  console.log(`  Computing expensive operation #${computeCount}`);
  return counter.get() * counter.get(); // Expensive operation
});

console.log(`First access: ${expensiveComputation.get()}`);
console.log(`Second access: ${expensiveComputation.get()}`); // Should not recompute
console.log(`Third access: ${expensiveComputation.get()}`); // Should not recompute

console.log("Changing counter...");
counter.set(5);
console.log(`After change: ${expensiveComputation.get()}`); // Should recompute only once

// Example 8: Avoiding glitches
console.log("\n✨ Example 8: Glitch-free Updates");
const a = new Signal.State(1);
const b = new Signal.State(2);
const sum = new Signal.Computed(() => a.get() + b.get());
const product = new Signal.Computed(() => a.get() * b.get());
const combined = new Signal.Computed(() => sum.get() + product.get());

let effectRunCount = 0;
const stopGlitchEffect = effect(() => {
  effectRunCount++;
  const result = combined.get();
  console.log(`  Effect run #${effectRunCount}: combined = ${result}`);
});

console.log("Updating both a and b...");
a.set(3);
b.set(4);
console.log(`Total effect runs: ${effectRunCount}`); // Should be minimal

// Cleanup
console.log("\n🧽 Cleaning up...");
stopTempEffect();
stopMessageEffect();
stopGlitchEffect();

console.log("\n✅ All examples completed!");
