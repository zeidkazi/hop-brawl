import { expect, it } from 'vitest';
import { LifeEvents } from '../../client/src/game/life-events';
it('predicted then confirmed death animates once and confirms once, including replayed snapshots', () => {
  const events = new LifeEvents();
  expect(events.animation('p', 1)).toBe(true);
  expect(events.animation('p', 1)).toBe(false);
  expect(events.confirmation('p', 1)).toBe(true);
  expect(events.confirmation('p', 1)).toBe(false);
  expect(events.animation('p', 2)).toBe(true);
  expect(events.animation('p', 1)).toBe(false);
  expect(events.confirmation('p', 2)).toBe(true);
  events.clear(); expect(events.animation('p', 1)).toBe(true);
});
it('server-only deaths and separate players each get their own animation and confirmation', () => {
  const events = new LifeEvents();
  for (const id of ['a', 'b']) {
    expect(events.confirmation(id, 1)).toBe(true); expect(events.animation(id, 1)).toBe(true);
    expect(events.animation(id, 1)).toBe(false);
  }
});
