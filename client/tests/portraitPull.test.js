import { describe, expect, it } from 'vitest';
import {
  CLING_AT,
  PULL_RANGE,
  STRAIN_AT,
  createPull,
  poseForPull,
  pullFromDrag,
  stepPull,
} from '../src/utils/portraitPull.js';

const run = (state, seconds, target, options) => {
  let moving = true;
  for (let i = 0; i < seconds * 60; i += 1) moving = stepPull(state, 1 / 60, target, options);
  return moving;
};

describe('pullFromDrag', () => {
  it('is nothing without a drag, and never goes negative', () => {
    expect(pullFromDrag(0)).toBe(0);
    expect(pullFromDrag(-50)).toBe(0);
  });

  it('grows with the drag but gets harder, like a rubber band, and never reaches 1', () => {
    const a = pullFromDrag(50);
    const b = pullFromDrag(150);
    const c = pullFromDrag(450);
    expect(a).toBeLessThan(b);
    expect(b).toBeLessThan(c);
    expect(c - b).toBeLessThan((b - a) * 3);
    expect(pullFromDrag(100000)).toBeLessThan(1 + 1e-9);
    expect(pullFromDrag(PULL_RANGE)).toBeCloseTo(0.632, 2);
  });
});

describe('poseForPull', () => {
  it('goes from peeking to hanging on to straining as the pull grows', () => {
    expect(poseForPull(0)).toBe('peek');
    expect(poseForPull(CLING_AT + 0.01)).toBe('cling1');
    expect(poseForPull(STRAIN_AT + 0.01)).toBe('cling2');
  });

  it('does not flicker around a threshold: it holds a pose until the pull drops clearly below', () => {
    expect(poseForPull(CLING_AT - 0.02, 'cling1')).toBe('cling1');
    expect(poseForPull(CLING_AT - 0.02, 'peek')).toBe('peek');
    expect(poseForPull(STRAIN_AT - 0.02, 'cling2')).toBe('cling2');
    expect(poseForPull(STRAIN_AT - 0.02, 'cling1')).toBe('cling1');
    expect(poseForPull(CLING_AT - 0.1, 'cling1')).toBe('peek');
    expect(poseForPull(STRAIN_AT - 0.1, 'cling2')).toBe('cling1');
  });
});

describe('stepPull', () => {
  it('follows the pointer closely while it is held, without overshooting', () => {
    const state = createPull();
    let highest = 0;
    for (let i = 0; i < 120; i += 1) {
      stepPull(state, 1 / 60, 0.6);
      highest = Math.max(highest, state.value);
    }
    expect(state.value).toBeCloseTo(0.6, 2);
    expect(highest).toBeLessThanOrEqual(0.6 + 1e-3);
  });

  it('snaps back to the edge when let go, hitting it and settling', () => {
    const state = createPull();
    run(state, 1, 0.9);
    let lowest = 1;
    let moving = true;
    for (let i = 0; i < 240 && moving; i += 1) {
      moving = stepPull(state, 1 / 60, 0);
      lowest = Math.min(lowest, state.value);
    }

    expect(moving).toBe(false);
    expect(state.value).toBe(0);
    expect(state.velocity).toBe(0);
    expect(lowest).toBe(0);
  });

  it('comes back faster than it was pulled out, on a spring', () => {
    const state = createPull();
    run(state, 1, 0.9);
    let frames = 0;
    while (stepPull(state, 1 / 60, 0) && frames < 600) frames += 1;
    expect(frames).toBeLessThan(60);
  });

  it('eases back without bouncing when reduced motion is asked for', () => {
    const state = createPull();
    run(state, 1, 0.9);
    let moving = true;
    let previous = state.value;
    for (let i = 0; i < 600 && moving; i += 1) {
      moving = stepPull(state, 1 / 60, 0, { bouncy: false });
      expect(state.value).toBeLessThanOrEqual(previous + 1e-9);
      previous = state.value;
    }
    expect(state.value).toBe(0);
  });

  it('survives a long pause between frames without jumping', () => {
    const state = createPull();
    stepPull(state, 10, 0.5);
    expect(state.value).toBeGreaterThanOrEqual(0);
    expect(state.value).toBeLessThanOrEqual(0.6);
  });

  it('can be left alone at rest', () => {
    const state = createPull();
    expect(stepPull(state, 1 / 60, 0)).toBe(false);
    expect(state.value).toBe(0);
  });
});
