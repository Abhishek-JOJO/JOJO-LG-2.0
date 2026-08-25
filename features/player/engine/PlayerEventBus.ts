/**
 * Player Event Bus
 *
 * Typed, in-memory publish/subscribe event bus scoped to a single player instance.
 * Decouples analytics, ads, UI, and recovery from each other.
 *
 * Zero external dependencies — pure TypeScript.
 */

import { logger } from '@/lib/logger/logger';
import type { PlayerEventPayloadMap, PlayerEventType } from '../model/types';

type Listener<T extends PlayerEventType> = (
  payload: PlayerEventPayloadMap[T]
) => void;

type AnyListener = (payload: PlayerEventPayloadMap[PlayerEventType]) => void;

export class PlayerEventBus {
  private readonly listeners = new Map<string, Set<AnyListener>>();

  /**
   * Subscribe to an event.
   * Returns an unsubscribe function.
   */
  on<T extends PlayerEventType>(
    event: T,
    listener: Listener<T>
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener as AnyListener);

    return () => this.off(event, listener);
  }

  /**
   * Subscribe to an event once.
   */
  once<T extends PlayerEventType>(
    event: T,
    listener: Listener<T>
  ): () => void {
    const wrapped = (payload: PlayerEventPayloadMap[T]) => {
      listener(payload);
      this.off(event, wrapped);
    };
    return this.on(event, wrapped);
  }

  /**
   * Unsubscribe from an event.
   */
  off<T extends PlayerEventType>(
    event: T,
    listener: Listener<T>
  ): void {
    this.listeners.get(event)?.delete(listener as AnyListener);
  }

  /**
   * Publish an event to all subscribers.
   */
  emit<T extends PlayerEventType>(
    event: T,
    payload: PlayerEventPayloadMap[T]
  ): void {
    const handlers = this.listeners.get(event);
    if (!handlers || handlers.size === 0) return;

    // Snapshot to avoid mutation issues during iteration
    for (const handler of Array.from(handlers)) {
      try {
        handler(payload as PlayerEventPayloadMap[PlayerEventType]);
      } catch (err) {
        // Listener errors must never crash the player
        logger.error(`[PlayerEventBus] Listener error for event "${event}"`, err);
      }
    }
  }

  /**
   * Remove all listeners for all events.
   * Call on player destroy.
   */
  destroy(): void {
    this.listeners.clear();
  }

  /**
   * Get the number of active listeners for a given event (for debugging).
   */
  listenerCount(event: PlayerEventType): number {
    return this.listeners.get(event)?.size ?? 0;
  }
}
