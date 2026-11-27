/**
 * The pull on the portrait: how far the figure has been dragged away from the edge it holds, and
 * how it springs back. `pull` runs from 0 (resting) towards 1 (stretched as far as it will go).
 *
 * Plain maths with no DOM, so it can be tested on its own. The component drives it every frame.
 */

/** Pixels of drag at which the pull has reached about two thirds of its range. */
export const PULL_RANGE = 160;
/** The pull at which the figure lets go of its peek and hangs on by its hands. */
export const CLING_AT = 0.2;
/** The pull at which it is straining hard. */
export const STRAIN_AT = 0.7;
/** The pull has to drop this far below a threshold to leave a pose, so poses do not flicker. */
const HYSTERESIS = 0.05;

/** Dragging further gets harder: a rubber band, so the pull approaches 1 but never reaches it. */
export function pullFromDrag(distance) {
  return distance <= 0 ? 0 : 1 - Math.exp(-distance / PULL_RANGE);
}

/** Which pose goes with a pull, given the pose it is in now (for the hysteresis). */
export function poseForPull(pull, current = 'peek') {
  const down = (limit, pose) => (pose ? pull > limit - HYSTERESIS : pull > limit);
  const strained = down(STRAIN_AT, current === 'cling2');
  if (strained) return 'cling2';
  return down(CLING_AT, current !== 'peek') ? 'cling1' : 'peek';
}

export function createPull() {
  return { value: 0, velocity: 0 };
}

const FOLLOW_STIFFNESS = 420;
const RETURN_STIFFNESS = 150;
const RETURN_DAMPING = 12;
const MAX_STEP = 1 / 60;
const REST = 0.002;

/**
 * Moves the pull towards `target` for `seconds`. While it is being dragged, `target` is the pull
 * the pointer asks for and the figure follows it closely. When let go, `target` is 0 and it
 * snaps back on a spring, hits the edge, and settles; with `bouncy` false it just eases back.
 * Returns true while it is still moving.
 */
export function stepPull(state, seconds, target, { bouncy = true } = {}) {
  const held = target !== 0;
  const stiffness = held ? FOLLOW_STIFFNESS : RETURN_STIFFNESS;
  const damping = held || !bouncy ? 2 * Math.sqrt(stiffness) : RETURN_DAMPING;

  let remaining = Math.min(Math.max(seconds, 0), 0.1);
  while (remaining > 0) {
    const dt = Math.min(remaining, MAX_STEP);
    remaining -= dt;
    const acceleration = stiffness * (target - state.value) - damping * state.velocity;
    state.velocity += acceleration * dt;
    state.value += state.velocity * dt;
    if (state.value < 0) {
      // Back at the edge: a little rebound, then still.
      state.value = 0;
      state.velocity = bouncy ? -state.velocity * 0.3 : 0;
    }
  }

  if (!held && state.value < REST && Math.abs(state.velocity) < 0.01) {
    state.value = 0;
    state.velocity = 0;
    return false;
  }
  return true;
}
