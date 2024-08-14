import { describe, it, expect, vi } from 'vitest';
import EventEmitter from '../src/event';

describe('EventEmitter', () => {
  it('should register and trigger an event', () => {
    const emitter = new EventEmitter<{ event1: (data: string) => void }>();
    const callback = vi.fn();

    emitter.on('event1', callback);
    emitter.emit('event1', 'test');

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('test');
  });

  it('should register and trigger an event once', () => {
    const emitter = new EventEmitter<{ event1: (data: string) => void }>();
    const callback = vi.fn();

    emitter.once('event1', callback);
    emitter.emit('event1', 'test');
    emitter.emit('event1', 'test2');

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('test');
  });

  it('should prepend listeners correctly', () => {
    const emitter = new EventEmitter<{ event1: (data: string) => void }>();
    const callback1 = vi.fn();
    const callback2 = vi.fn();

    emitter.on('event1', callback1);
    emitter.prependListener('event1', callback2);
    emitter.emit('event1', 'test');

    expect(callback2).toHaveBeenCalledTimes(1);
    expect(callback1).toHaveBeenCalledTimes(1);

    // Check the order manually
    expect(callback2.mock.invocationCallOrder[0]).toBeLessThan(callback1.mock.invocationCallOrder[0]);
  });

  it('should prepend once listeners correctly', () => {
    const emitter = new EventEmitter<{ event1: (data: string) => void }>();
    const callback1 = vi.fn();
    const callback2 = vi.fn();

    emitter.on('event1', callback1);
    emitter.prependOnceListener('event1', callback2);
    emitter.emit('event1', 'test');
    emitter.emit('event1', 'test2');

    expect(callback2).toHaveBeenCalledTimes(1);
    expect(callback1).toHaveBeenCalledTimes(2);

    // Check the order manually
    expect(callback2.mock.invocationCallOrder[0]).toBeLessThan(callback1.mock.invocationCallOrder[0]);
  });

  it('should remove specific listeners', () => {
    const emitter = new EventEmitter<{ event1: (data: string) => void }>();
    const callback = vi.fn();

    emitter.on('event1', callback);
    emitter.off('event1', callback);
    emitter.emit('event1', 'test');

    expect(callback).not.toHaveBeenCalled();
  });

  it('should remove all listeners for an event', () => {
    const emitter = new EventEmitter<{ event1: (data: string) => void }>();
    const callback1 = vi.fn();
    const callback2 = vi.fn();

    emitter.on('event1', callback1);
    emitter.on('event1', callback2);
    emitter.offAll('event1');
    emitter.emit('event1', 'test');

    expect(callback1).not.toHaveBeenCalled();
    expect(callback2).not.toHaveBeenCalled();
  });

  it('should remove all listeners for all events', () => {
    const emitter = new EventEmitter<{
      event1: (data: string) => void;
      event2: (data: number) => void;
    }>();
    const callback1 = vi.fn();
    const callback2 = vi.fn();

    emitter.on('event1', callback1);
    emitter.on('event2', callback2);
    emitter.offAll();
    emitter.emit('event1', 'test');
    emitter.emit('event2', 42);

    expect(callback1).not.toHaveBeenCalled();
    expect(callback2).not.toHaveBeenCalled();
  });

  it('should get event names', () => {
    const emitter = new EventEmitter<{
      event1: (data: string) => void;
      event2: (data: number) => void;
    }>();

    emitter.on('event1', () => {});
    emitter.on('event2', () => {});

    const eventNames = emitter.eventNames();
    expect(eventNames).toEqual(['event1', 'event2']);
  });

  it('should get listener count for an event', () => {
    const emitter = new EventEmitter<{ event1: (data: string) => void }>();

    emitter.on('event1', () => {});
    emitter.on('event1', () => {});

    const listenerCount = emitter.listenerCount('event1');
    expect(listenerCount).toBe(2);
  });

  it('should get raw listeners for an event', () => {
    const emitter = new EventEmitter<{ event1: (data: string) => void }>();
    const callback1 = vi.fn();
    const callback2 = vi.fn();

    emitter.on('event1', callback1);
    emitter.on('event1', callback2);

    const rawListeners = emitter.rawListeners('event1');
    expect(rawListeners).toEqual([callback1, callback2]);
  });

  it('should handle async emit', async () => {
    const emitter = new EventEmitter<{ event1: (data: string) => Promise<void> }>();
    const callback = vi.fn().mockResolvedValue(undefined);

    emitter.on('event1', callback);
    await emitter.emitAsync('event1', 'test');

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('test');
  });

  it('should filter events based on options', () => {
    const emitter = new EventEmitter<{ event1: (data: string) => void }>();
    const callback = vi.fn();

    emitter.on('event1', callback, {
      filter: (data) => data === 'pass',
    });

    emitter.emit('event1', 'fail');
    emitter.emit('event1', 'pass');

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('pass');
  });

  it('should emit removeListener event when a listener is removed', () => {
    const emitter = new EventEmitter<{
      event1: (data: string) => void;
      removeListener: (eventName: string, func: (data: string) => void) => void;
    }>();
    const callback = vi.fn();
    const removeListenerCallback = vi.fn();

    emitter.on('removeListener', removeListenerCallback);
    emitter.on('event1', callback);
    emitter.off('event1', callback);

    expect(removeListenerCallback).toHaveBeenCalledWith('event1', callback);
  });
});
