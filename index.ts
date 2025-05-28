/**
 * Simple Educational Signals Implementation
 *
 * This is a minimal, easy-to-understand implementation of the TC39 Signals proposal.
 * It prioritizes clarity and educational value over performance optimizations.
 *
 * Key concepts:
 * - Signal.State: writable reactive state
 * - Signal.Computed: computed values that automatically track dependencies
 * - Signal.subtle.Watcher: low-level API for observing signal changes
 * - Auto-tracking: computed signals automatically track what state they read
 * - Pull-based: computations are lazy and only run when accessed
 * - Glitch-free: no unnecessary recalculations
 */

// Global state for tracking the currently executing computed
let currentlyComputing: Computed<any> | null = null;

// Global watcher for scheduling effect updates - will be initialized after Signal is defined
let pending = false;
let w: Watcher;

// Base Signal interface
interface Signal<T> {
  get(): T;
}

/**
 * Watcher class - low-level API for observing signal changes
 * This is the foundation that frameworks use to build effects
 */
class Watcher {
  #callback: () => void;
  #watchedSignals = new Set<State<any> | Computed<any>>();

  constructor(callback: () => void) {
    this.#callback = callback;
  }

  /**
   * Watch a signal for changes
   */
  watch(signal: Signal<any>): void {
    if (signal instanceof State || signal instanceof Computed) {
      this.#watchedSignals.add(signal);
      signal._addWatcher(this);
    }
  }

  /**
   * Stop watching a signal
   */
  unwatch(signal: Signal<any>): void {
    if (signal instanceof State || signal instanceof Computed) {
      this.#watchedSignals.delete(signal);
      signal._removeWatcher(this);
    }
  }

  /**
   * Get all currently watched signals
   */
  getPending(): Signal<any>[] {
    return Array.from(this.#watchedSignals);
  }

  /**
   * Internal method called when a watched signal changes
   */
  _notify(): void {
    this.#callback();
  }
}

/**
 * State signal - holds a writable value
 */
class State<T> implements Signal<T> {
  #value: T;
  #dependents = new Set<Computed<any>>();
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
    if (this.#value !== newValue) {
      this.#value = newValue;

      // Mark all dependent computeds as stale
      for (const dependent of this.#dependents) {
        dependent._markStale();
      }

      // Notify all watchers synchronously (as per TC39 spec)
      for (const watcher of this.#watchers) {
        watcher._notify();
      }
    }
  }

  // Internal method to remove a dependent
  _removeDependent(computed: Computed<any>): void {
    this.#dependents.delete(computed);
  }

  // Internal method to add a watcher
  _addWatcher(watcher: Watcher): void {
    this.#watchers.add(watcher);
  }

  // Internal method to remove a watcher
  _removeWatcher(watcher: Watcher): void {
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
  #sources = new Set<State<any> | Computed<any>>();
  #dependents = new Set<Computed<any>>();
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
  _addSource(source: State<any> | Computed<any>): void {
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
        watcher._notify();
      }
    }
  }

  // Internal method to remove a dependent
  _removeDependent(computed: Computed<any>): void {
    this.#dependents.delete(computed);
  }

  // Internal method to add a watcher
  _addWatcher(watcher: Watcher): void {
    this.#watchers.add(watcher);
  }

  // Internal method to remove a watcher
  _removeWatcher(watcher: Watcher): void {
    this.#watchers.delete(watcher);
  }
}

// Main Signal namespace following TC39 proposal structure
const Signal = {
  State,
  Computed,

  // Signal.subtle namespace as per TC39 proposal
  subtle: {
    Watcher,
    untrack,
    currentComputed: () => currentlyComputing,
  },
};

// Initialize the global watcher after Signal is defined
w = new Signal.subtle.Watcher(() => {
  if (!pending) {
    pending = true;
    queueMicrotask(() => {
      pending = false;
      for (let s of w.getPending()) s.get();
      // Re-watch all the signals that were pending
      for (let s of w.getPending()) w.watch(s);
    });
  }
});

/**
 * Effect implementation following TC39 proposal patterns
 * This function would usually live in a library/framework, not application code
 * NOTE: This scheduling logic is too basic to be useful. Do not copy/paste.
 */

// An effect Signal which evaluates to cb, which schedules a read of
// itself on the microtask queue whenever one of its dependencies might change
function effect(cb: () => void | (() => void)): () => void {
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
