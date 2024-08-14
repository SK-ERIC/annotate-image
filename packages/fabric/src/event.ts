interface ListenerOptions {
  filter?: (...args: any[]) => boolean
}

type EventMap = { [key: string]: (...args: any[]) => void }

class EventEmitter<T extends EventMap = EventMap> {
  private events: Map<
    keyof T,
    { func: T[keyof T]; options?: ListenerOptions }[]
  > = new Map()

  /**
   * Register an event listener.
   * @param key The event name.
   * @param func The function to be triggered.
   * @param options Optional configuration, such as a filter.
   * @memberof EventEmitter
   */
  on<K extends keyof T>(key: K, func: T[K], options?: ListenerOptions): this {
    if (!this.events.has(key)) {
      this.events.set(key, [])
    }
    this.events.get(key)!.push({ func, options })
    return this
  }

  /**
   * Register a one-time event listener.
   * @param key The event name.
   * @param func The function to be triggered.
   * @memberof EventEmitter
   */
  once<K extends keyof T>(key: K, func: T[K]): this {
    const onceWrapper = (...args: Parameters<T[K]>) => {
      func(...args)
      this.off(key, onceWrapper as T[K])
    }
    return this.on(key, onceWrapper as T[K])
  }

  /**
   * Add a listener at the front of the event queue.
   * @param key The event name.
   * @param func The function to be triggered.
   * @memberof EventEmitter
   */
  prependListener<K extends keyof T>(
    key: K,
    func: T[K],
    options?: ListenerOptions
  ): this {
    if (!this.events.has(key)) {
      this.events.set(key, [])
    }
    this.events.get(key)!.unshift({ func, options })
    return this
  }

  /**
   * Add a one-time listener at the front of the event queue.
   * @param key The event name.
   * @param func The function to be triggered.
   * @memberof EventEmitter
   */
  prependOnceListener<K extends keyof T>(key: K, func: T[K]): this {
    const onceWrapper = (...args: Parameters<T[K]>) => {
      func(...args)
      this.off(key, onceWrapper as T[K])
    }
    return this.prependListener(key, onceWrapper as T[K])
  }

  /**
   * Emit all functions under a certain event.
   * @param key The name of the event to be triggered.
   * @param args The arguments to be passed to the triggered functions.
   * @memberof EventEmitter
   */
  emit<K extends keyof T>(key: K, ...args: Parameters<T[K]>): void {
    const funcs = this.events.get(key)
    if (funcs) {
      funcs.forEach(({ func, options }) => {
        if (!options?.filter || options.filter(...args)) {
          func(...args)
        }
      })
    }
  }

  /**
   * Emit all functions for a certain event and return a Promise.
   * @param key The name of the event to be triggered.
   * @param args The arguments to be passed to the triggered functions.
   * @memberof EventEmitter
   */
  async emitAsync<K extends keyof T>(
    key: K,
    ...args: Parameters<T[K]>
  ): Promise<void> {
    const funcs = this.events.get(key)
    if (funcs) {
      await Promise.all(
        funcs.map(({ func, options }) => {
          if (!options?.filter || options.filter(...args)) {
            return Promise.resolve(func(...args))
          }
          return Promise.resolve()
        })
      )
    }
  }

  /**
   * Remove a specific listener from an event.
   * @param key The event name.
   * @param func The listener to be removed.
   * @memberof EventEmitter
   */
  off<K extends keyof T>(key: K, func: T[K]): this {
    this.removeListener(key, func)
    return this
  }

  /**
   * Remove all execution functions for an event.
   * @param key The event name.
   * @memberof EventEmitter
   */
  offAll<K extends keyof T>(key?: K): this {
    if (key) {
      this.remove(key)
    } else {
      this.removeAll()
    }
    return this
  }

  /**
   * Get the list of event names.
   * @memberof EventEmitter
   */
  eventNames(): Array<keyof T> {
    return Array.from(this.events.keys())
  }

  /**
   * Get the number of listeners for an event.
   * @param key The event name.
   * @memberof EventEmitter
   */
  listenerCount<K extends keyof T>(key: K): number {
    const listeners = this.events.get(key)
    return listeners ? listeners.length : 0
  }

  /**
   * Get the list of listeners for an event.
   * @param key The event name.
   * @memberof EventEmitter
   */
  rawListeners<K extends keyof T>(key: K): T[K][] {
    return (this.events.get(key)?.map((entry) => entry.func) || []) as T[K][]
  }

  /**
   * Remove a specific listener from an event.
   * @param key The event name.
   * @param func The listener to be removed.
   * @memberof EventEmitter
   */
  private removeListener<K extends keyof T>(key: K, func: T[K]): void {
    const funcs = this.events.get(key)
    if (funcs) {
      this.events.set(
        key,
        funcs.filter((f) => f.func !== func)
      )
      if (this.events.get(key)!.length === 0) {
        this.events.delete(key)
      }
      this.emitRemoveListener(key, func)
    }
  }

  /**
   * Remove all execution functions for an event.
   * @param key The event name.
   * @memberof EventEmitter
   */
  private remove<K extends keyof T>(key: K): void {
    const funcs = this.events.get(key)
    if (funcs) {
      funcs.forEach(({ func }) => this.emitRemoveListener(key, func))
      this.events.delete(key)
    }
  }

  /**
   * Remove all listeners.
   * @memberof EventEmitter
   */
  private removeAll(): void {
    this.events.forEach((funcs, key) => {
      funcs.forEach(({ func }) => this.emitRemoveListener(key, func))
    })
    this.events.clear()
  }

  /**
   * Handle the emission of the 'removeListener' event.
   * @param key The event name.
   * @param func The removed listener.
   * @private
   */
  private emitRemoveListener<K extends keyof T>(key: K, func: T[K]): void {
    const removeListener = this.events.get('removeListener' as K)
    if (removeListener) {
      removeListener.forEach(({ func: removeFunc }) => {
        removeFunc(key, func)
      })
    }
  }
}

export default EventEmitter
