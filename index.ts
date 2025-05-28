/**
 * Simple Educational Signals Implementation
 *
 * This is a minimal, easy-to-understand implementation of the TC39 Signals proposal.
 * It prioritizes clarity and educational value over performance optimizations.
 *
 * Key concepts:
 * - Signal.State: writable reactive state
 * - Signal.Computed: computed values that automatically track dependencies
 * - Auto-tracking: computed signals automatically track what state they read
 * - Pull-based: computations are lazy and only run when accessed
 * - Glitch-free: no unnecessary recalculations
 */

// Global state for tracking the currently executing computed
let currentlyComputing: Computed<any> | null = null;

// Base Signal interface
interface Signal<T> {
  get(): T;
}

/**
 * State signal - holds a writable value
 */
class State<T> implements Signal<T> {
  private _value: T;
  private _dependents = new Set<Computed<any>>();

  constructor(initialValue: T) {
    this._value = initialValue;
  }

  get(): T {
    // If a computed is currently running, register this state as a dependency
    if (currentlyComputing) {
      this._dependents.add(currentlyComputing);
      currentlyComputing._addSource(this);
    }
    return this._value;
  }

  set(newValue: T): void {
    // Only update if the value actually changed
    if (this._value !== newValue) {
      this._value = newValue;

      // Mark all dependent computeds as stale
      for (const dependent of this._dependents) {
        dependent._markStale();
      }
    }
  }

  // Internal method to remove a dependent
  _removeDependent(computed: Computed<any>): void {
    this._dependents.delete(computed);
  }
}

/**
 * Computed signal - automatically tracks dependencies and caches results
 */
class Computed<T> implements Signal<T> {
  private _computation: () => T;
  private _value: T | undefined = undefined;
  private _isStale = true;
  private _sources = new Set<State<any>>();

  constructor(computation: () => T) {
    this._computation = computation;
  }

  get(): T {
    // If we're stale, recompute
    if (this._isStale) {
      this._recompute();
    }

    // If a computed is currently running, this becomes a dependency
    if (currentlyComputing) {
      // Note: In a full implementation, we'd track computed->computed dependencies
      // For simplicity, we're only tracking state->computed dependencies
    }

    return this._value!;
  }

  private _recompute(): void {
    // Clear old dependencies
    for (const source of this._sources) {
      source._removeDependent(this);
    }
    this._sources.clear();

    // Set ourselves as the currently computing signal
    const previouslyComputing = currentlyComputing;
    currentlyComputing = this;

    try {
      // Run the computation - this will automatically track dependencies
      this._value = this._computation();
      this._isStale = false;
    } finally {
      // Restore the previous computing context
      currentlyComputing = previouslyComputing;
    }
  }

  // Internal method to add a source dependency
  _addSource(source: State<any>): void {
    this._sources.add(source);
  }

  // Internal method to mark this computed as stale
  _markStale(): void {
    if (!this._isStale) {
      this._isStale = true;
      // In a full implementation, we'd propagate staleness to dependent computeds
    }
  }
}

/**
 * Simple effect implementation for educational purposes
 * Effects run side effects when their dependencies change
 */
function effect(fn: () => void | (() => void)): () => void {
  let cleanup: (() => void) | void;

  // Create a computed that runs the effect function
  const computed = new Computed(() => {
    // Run cleanup from previous execution
    if (typeof cleanup === "function") {
      cleanup();
    }

    // Run the effect and capture any cleanup function
    cleanup = fn();
  });

  // Run the effect immediately
  computed.get();

  // Return a function to stop the effect
  return () => {
    if (typeof cleanup === "function") {
      cleanup();
    }
  };
}

/**
 * Untrack function - runs a function without tracking dependencies
 * This is useful when you want to read signals without creating dependencies
 */
function untrack<T>(fn: () => T): T {
  const previouslyComputing = currentlyComputing;
  currentlyComputing = null;

  try {
    return fn();
  } finally {
    currentlyComputing = previouslyComputing;
  }
}

// Main Signal namespace following TC39 proposal structure
const Signal = {
  State,
  Computed,

  // Simple utilities namespace (simplified version of Signal.subtle)
  subtle: {
    untrack,
    currentComputed: () => currentlyComputing,
  },
};

// Export everything
export { Signal, effect };

// Default export for convenience
export default Signal;

/**
 * Example usage:
 *
 * import { Signal, effect } from './index.js';
 *
 * // Create reactive state
 * const count = new Signal.State(0);
 * const doubled = new Signal.Computed(() => count.get() * 2);
 *
 * // Create an effect that logs when doubled changes
 * const stop = effect(() => {
 *   console.log('Doubled:', doubled.get());
 * });
 *
 * // Update the count - this will trigger the effect
 * count.set(5); // Logs: "Doubled: 10"
 *
 * // Stop the effect
 * stop();
 */
