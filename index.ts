/**
 * Simple Educational Signals Implementation
 *
 * This is a minimal, easy-to-understand implementation of the TC39 Signals proposal.
 *
 * Key concepts:
 * - Signal.State: writable reactive state
 * - Signal.Computed: computed values that automatically track dependencies
 * - Signal.subtle.Watcher: low-level API for observing signal changes
 * - Auto-tracking: computed signals automatically track what state they depend on
 * - Pull-based: computations are lazy and only run when accessed
 */

// Type aliases
type AnyComputed = Computed<any>;

// Global state for tracking the currently executing computed
let currentlyComputing: AnyComputed | null = null;

// Global watcher for scheduling effect updates - will be initialized after Signal is defined
// pending flag prevents multiple microtask scheduling in the same tick
let pending = false;
let w: Watcher;

// Base Signal interface
interface Signal<T> {
  get(): T;
}

/**
 * State signal - holds a writable value
 */
class State<T> implements Signal<T> {
  #value: T;
  #dependents = new Set<AnyComputed>();
  #watchers = new Set<Watcher>();

  constructor(initialValue: T) {
    this.#value = initialValue;
  }

  get(): T {
    // If a computed is currently running, register this state as a dependency
    if (currentlyComputing) {
      this.#dependents.add(currentlyComputing);
      currentlyComputing._addSource(this);
    }
    return this.#value;
  }

  set(newValue: T): void {
    // Only update if the value actually changed
    if (!Object.is(this.#value, newValue)) {
      this.#value = newValue;

      // Mark all dependent computeds as stale
      for (const dependent of this.#dependents) {
        dependent._markStale();
      }

      // Notify all watchers synchronously
      for (const watcher of this.#watchers) {
        watcher._notify(this);
      }
    }
  }

  // Internal method to remove a dependent
  _removeDependent(computed: AnyComputed): void {
    this.#dependents.delete(computed);
  }

  // Public method to add a watcher
  addWatcher(watcher: Watcher): void {
    this.#watchers.add(watcher);
  }

  // Public method to remove a watcher
  removeWatcher(watcher: Watcher): void {
    this.#watchers.delete(watcher);
  }
}

/**
 * Computed signal - automatically tracks dependencies and caches results
 */
class Computed<T> implements Signal<T> {
  #computation: () => T;
  #value: T | undefined = undefined;
  #isStale = true;
  #sources = new Set<Signal<any>>();
  #dependents = new Set<AnyComputed>();
  #watchers = new Set<Watcher>();

  constructor(computation: () => T) {
    this.#computation = computation;
  }

  get(): T {
    // If we're stale, recompute
    if (this.#isStale) {
      this.#recompute();
    }

    // If a computed is currently running, this becomes a dependency
    if (currentlyComputing) {
      this.#dependents.add(currentlyComputing);
      currentlyComputing._addSource(this);
    }

    return this.#value!;
  }

  #recompute(): void {
    // Clear old dependencies
    for (const source of this.#sources) {
      if (source instanceof State) {
        source._removeDependent(this);
      } else if (source instanceof Computed) {
        source._removeDependent(this);
      }
    }
    this.#sources.clear();

    // Set ourselves as the currently computing signal
    const previouslyComputing = currentlyComputing;
    currentlyComputing = this;

    try {
      // Run the computation - this will automatically track dependencies
      this.#value = this.#computation();
      this.#isStale = false;
    } finally {
      // Restore the previous computing context
      currentlyComputing = previouslyComputing;
    }
  }

  // Internal method to add a source dependency
  _addSource(source: Signal<any>): void {
    this.#sources.add(source);
  }

  // Internal method to mark this computed as stale
  _markStale(): void {
    if (!this.#isStale) {
      this.#isStale = true;

      // Propagate staleness to dependent computeds
      for (const dependent of this.#dependents) {
        dependent._markStale();
      }

      // Notify all watchers synchronously
      for (const watcher of this.#watchers) {
        watcher._notify(this);
      }
    }
  }

  // Internal method to remove a dependent
  _removeDependent(computed: AnyComputed): void {
    this.#dependents.delete(computed);
  }

  // Public method to add a watcher
  addWatcher(watcher: Watcher): void {
    this.#watchers.add(watcher);
  }

  // Public method to remove a watcher
  removeWatcher(watcher: Watcher): void {
    this.#watchers.delete(watcher);
  }
}

/**
 * Watcher class - low-level API for observing signal changes
 * This is the foundation that frameworks use to build effects
 */
class Watcher {
  #callback: () => void;
  #watchedSignals = new Set<Signal<any>>();
  #pendingSignals = new Set<Signal<any>>();

  constructor(callback: () => void) {
    this.#callback = callback;
  }

  /**
   * Watch a signal for changes
   */
  watch(signal: Signal<any>): void {
    if (signal instanceof State || signal instanceof Computed) {
      this.#watchedSignals.add(signal);
      signal.addWatcher(this);
    }
  }

  /**
   * Stop watching a signal
   */
  unwatch(signal: Signal<any>): void {
    if (signal instanceof State || signal instanceof Computed) {
      this.#watchedSignals.delete(signal);
      this.#pendingSignals.delete(signal);
      signal.removeWatcher(this);
    }
  }

  /**
   * Get signals that have changed since last processed
   */
  getPending(): Signal<any>[] {
    const pending = Array.from(this.#pendingSignals);
    this.#pendingSignals.clear(); // Clear after returning
    return pending;
  }

  /**
   * Internal method called when a watched signal changes
   */
  _notify(signal: Signal<any>): void {
    this.#pendingSignals.add(signal);
    this.#callback();
  }
}

// Main Signal namespace
const Signal = {
  State,
  Computed,

  // Signal.subtle namespace
  subtle: {
    Watcher,
    untrack,
    currentComputed: () => currentlyComputing,
  },
};

// Initialize the global watcher after Signal is defined
// This watcher batches effect updates using microtasks to prevent duplicate executions
// when multiple dependencies change in the same synchronous execution
w = new Signal.subtle.Watcher(() => {
  if (!pending) {
    pending = true;
    queueMicrotask(() => {
      pending = false;
      // Just trigger a read of all watched signals to update effects
      // The watcher is already watching them, no need to re-watch
      for (let s of w.getPending()) {
        s.get();
      }
    });
  }
});

/**
 * Effect implementation
 * This would usually live in a library/framework, not application code
 *
 * Creates a computed that re-runs when dependencies change, using the global watcher
 * for batched updates. Returns a cleanup function to stop the effect.
 *
 * Limitations: Basic scheduling, no error boundaries, no async support
 * NOTE: This scheduling logic is too basic to be useful. Do not copy/paste.
 */

// An effect Signal which evaluates to cb, which schedules a read of
// itself on the microtask queue whenever one of its dependencies might change
function effect(cb: () => void): () => void {
  let destructor: (() => void) | void;
  let c = new Signal.Computed(() => {
    destructor?.();
    destructor = cb();
  });
  w.watch(c);
  c.get();
  return () => {
    destructor?.();
    w.unwatch(c);
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

// Export everything
export { Signal, effect };

// Default export for convenience
export default Signal;
