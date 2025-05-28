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

// Base Signal interface
interface Signal<T> {
  get(): T;
}

/**
 * Watcher class - low-level API for observing signal changes
 * This is the foundation that frameworks use to build effects
 */
class Watcher {
  private _callback: () => void;
  private _watchedSignals = new Set<State<any> | Computed<any>>();

  constructor(callback: () => void) {
    this._callback = callback;
  }

  /**
   * Watch a signal for changes
   */
  watch(signal: Signal<any>): void {
    if (signal instanceof State || signal instanceof Computed) {
      this._watchedSignals.add(signal);
      signal._addWatcher(this);
    }
  }

  /**
   * Stop watching a signal
   */
  unwatch(signal: Signal<any>): void {
    if (signal instanceof State || signal instanceof Computed) {
      this._watchedSignals.delete(signal);
      signal._removeWatcher(this);
    }
  }

  /**
   * Get all currently watched signals
   */
  getPending(): Signal<any>[] {
    return Array.from(this._watchedSignals);
  }

  /**
   * Internal method called when a watched signal changes
   */
  _notify(): void {
    this._callback();
  }
}

/**
 * State signal - holds a writable value
 */
class State<T> implements Signal<T> {
  private _value: T;
  private _dependents = new Set<Computed<any>>();
  private _watchers = new Set<Watcher>();

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

      // Notify all watchers synchronously (as per TC39 spec)
      for (const watcher of this._watchers) {
        watcher._notify();
      }
    }
  }

  // Internal method to remove a dependent
  _removeDependent(computed: Computed<any>): void {
    this._dependents.delete(computed);
  }

  // Internal method to add a watcher
  _addWatcher(watcher: Watcher): void {
    this._watchers.add(watcher);
  }

  // Internal method to remove a watcher
  _removeWatcher(watcher: Watcher): void {
    this._watchers.delete(watcher);
  }
}

/**
 * Computed signal - automatically tracks dependencies and caches results
 */
class Computed<T> implements Signal<T> {
  private _computation: () => T;
  private _value: T | undefined = undefined;
  private _isStale = true;
  private _sources = new Set<State<any> | Computed<any>>();
  private _dependents = new Set<Computed<any>>();
  private _watchers = new Set<Watcher>();

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
      this._dependents.add(currentlyComputing);
      currentlyComputing._addSource(this);
    }

    return this._value!;
  }

  private _recompute(): void {
    // Clear old dependencies
    for (const source of this._sources) {
      if (source instanceof State) {
        source._removeDependent(this);
      } else if (source instanceof Computed) {
        source._removeDependent(this);
      }
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
  _addSource(source: State<any> | Computed<any>): void {
    this._sources.add(source);
  }

  // Internal method to mark this computed as stale
  _markStale(): void {
    if (!this._isStale) {
      this._isStale = true;

      // Propagate staleness to dependent computeds
      for (const dependent of this._dependents) {
        dependent._markStale();
      }

      // Notify all watchers synchronously
      for (const watcher of this._watchers) {
        watcher._notify();
      }
    }
  }

  // Internal method to remove a dependent
  _removeDependent(computed: Computed<any>): void {
    this._dependents.delete(computed);
  }

  // Internal method to add a watcher
  _addWatcher(watcher: Watcher): void {
    this._watchers.add(watcher);
  }

  // Internal method to remove a watcher
  _removeWatcher(watcher: Watcher): void {
    this._watchers.delete(watcher);
  }
}

/**
 * Simple effect implementation for educational purposes
 * Effects run side effects when their dependencies change
 *
 * Note: This is built on top of the Watcher API as frameworks would do
 */
function effect(fn: () => void | (() => void)): () => void {
  let cleanup: (() => void) | void;
  let isRunning = false;

  // Create a watcher that will be notified of changes
  const watcher = new Watcher(() => {
    if (!isRunning) {
      runEffect();
    }
  });

  function runEffect() {
    isRunning = true;

    // Run cleanup from previous execution
    if (typeof cleanup === "function") {
      cleanup();
    }

    // Create a computed to track dependencies
    const computed = new Computed(() => {
      cleanup = fn();
      return undefined;
    });

    // Watch the computed for changes
    watcher.watch(computed);

    // Run the effect
    computed.get();

    isRunning = false;
  }

  // Run the effect immediately
  runEffect();

  // Return a function to stop the effect
  return () => {
    if (typeof cleanup === "function") {
      cleanup();
    }
    // Clean up all watched signals
    for (const signal of watcher.getPending()) {
      watcher.unwatch(signal);
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

  // Signal.subtle namespace as per TC39 proposal
  subtle: {
    Watcher,
    untrack,
    currentComputed: () => currentlyComputing,
  },
};

// Export everything
export { Signal, effect };

// Default export for convenience
export default Signal;
