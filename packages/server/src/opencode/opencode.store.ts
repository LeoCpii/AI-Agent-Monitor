import { EventEmitter } from 'node:events';

import type { OpenCodeEvent } from '@ai-monitor/dto/opencode';

const MAX_EVENTS = 200;

const events: OpenCodeEvent[] = [];

const emitter = new EventEmitter();

export function addOpenCodeEvent(event: OpenCodeEvent) {
  events.push(event);

  if (events.length > MAX_EVENTS) {
    events.shift();
  }

  emitter.emit('event', event);
}

export function getOpenCodeEvents(limit = 100) {
  return events.slice(-limit).reverse();
}

export function subscribeToOpenCodeEvents(
  listener: (event: OpenCodeEvent) => void
) {
  emitter.on('event', listener);

  return () => {
    emitter.off('event', listener);
  };
}