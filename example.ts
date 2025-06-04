import { Signal, effect } from "./index.ts";

// Example 1: Basic Counter
console.log("Example 1: Basic Counter");
const counter = new Signal.State(0);
const isEven = new Signal.Computed(() => (counter.get() & 1) === 0);
const parity = new Signal.Computed(() => (isEven.get() ? "even" : "odd"));

console.log(`Initial: ${counter.get()} is ${parity.get()}`); // Initial: 0 is even

counter.set(1);
console.log(`After set(1): ${counter.get()} is ${parity.get()}`); // After set(1): 1 is odd

counter.set(4);
console.log(`After set(4): ${counter.get()} is ${parity.get()}`); // After set(4): 4 is even

// Example 2: Auto-tracking
console.log("\nExample 2: Auto-tracking");
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
console.log("\nExample 3: Conditional Dependencies");
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
console.log("\nExample 4: Effects");
const temperature = new Signal.State(20);
const temperatureF = new Signal.Computed(
  () => (temperature.get() * 9) / 5 + 32
);

effect(() => {
  const temp = temperature.get();
  const tempF = temperatureF.get();
  console.log(`Temperature: ${temp}°C (${tempF}°F)`);
});

console.log("Changing temperature...");
temperature.set(25);
temperature.set(30);
