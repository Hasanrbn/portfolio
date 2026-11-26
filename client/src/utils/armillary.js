/**
 * Geometry and physics of the armillary sphere around the profile picture.
 *
 * Everything here is plain maths with no DOM, so it can be tested on its own; the component only
 * feeds it time and pointer movements and strokes what `computeFrame` returns.
 *
 * Conventions: 3x3 matrices are row-major arrays of 9 numbers, vectors are [x, y, z] with x to
 * the right, y down and z towards the viewer (screen coordinates), and the sphere has radius 1.
 */

const TAU = Math.PI * 2;

export const IDENTITY = Object.freeze([1, 0, 0, 0, 1, 0, 0, 0, 1]);

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const length = (a) => Math.hypot(a[0], a[1], a[2]);
const scale = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const normalize = (a) => {
  const len = length(a);
  return len === 0 ? [0, 0, 0] : scale(a, 1 / len);
};

export function multiplyMatrices(a, b) {
  const out = new Array(9);
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      out[row * 3 + col] =
        a[row * 3] * b[col] + a[row * 3 + 1] * b[3 + col] + a[row * 3 + 2] * b[6 + col];
    }
  }
  return out;
}

export function multiplyVector(m, v) {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ];
}

/** Rotation by `angle` radians about `axis` (Rodrigues' formula). The axis need not be a unit vector. */
export function axisAngle(axis, angle) {
  const len = length(axis);
  if (len === 0 || angle === 0) return [...IDENTITY];
  const [x, y, z] = scale(axis, 1 / len);
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const t = 1 - c;
  return [
    t * x * x + c,
    t * x * y - s * z,
    t * x * z + s * y,
    t * x * y + s * z,
    t * y * y + c,
    t * y * z - s * x,
    t * x * z - s * y,
    t * y * z + s * x,
    t * z * z + c,
  ];
}

/** Removes the drift that repeated small rotations accumulate, keeping the matrix a true rotation. */
export function orthonormalize(m) {
  const r0 = normalize([m[0], m[1], m[2]]);
  const row1 = [m[3], m[4], m[5]];
  const r1 = normalize(row1.map((value, index) => value - dot(row1, r0) * r0[index]));
  const r2 = cross(r0, r1);
  return [...r0, ...r1, ...r2];
}

// --- Physics ----------------------------------------------------------------------------------

/** Radians per second the sphere turns about its own axis when nobody touches it. */
const IDLE_SPIN = 0.3;
/** How quickly spin left over from a push fades back to the idle spin (per second). */
const FRICTION = 2.2;
/** Strength of the pull that tips the axis back to its resting tilt (per second squared). */
const RIGHTING = 3;
/** Resting tilt of the axis towards the viewer, so the rings read as a sphere, not a flat disc. */
const REST_TILT = 0.42;
/** Spin picked up per sphere radius of pointer travel, as if the pointer brushed the surface. */
const BRUSH_GAIN = 1.6;
const MAX_SPIN = 6;
/** How far the sphere leans towards the pointer (radians) and how stiff that lean is. */
const MAX_LEAN = 0.32;
const LEAN_STIFFNESS = 45;
const LEAN_DAMPING = 9;
/** The longest step the physics takes at once, so a stalled tab does not make the sphere jump. */
const MAX_STEP = 1 / 30;
const START_TIME = 2.5;

/** The north pole of the sphere in its own frame; it points up on the screen (y is down). */
const POLE = [0, -1, 0];
const REST_POLE = [0, -Math.cos(REST_TILT), Math.sin(REST_TILT)];

export function createPose() {
  // Start with the axis already at rest, tipped towards the viewer.
  const start = axisAngle([1, 0, 0], -REST_TILT);
  return {
    rotation: start,
    spin: scale(multiplyVector(start, POLE), IDLE_SPIN),
    lean: [0, 0],
    leanSpeed: [0, 0],
    // Not zero, so the meridian does not begin edge-on as a straight line across the picture.
    time: START_TIME,
  };
}

/** Where the sphere's axis points on screen. */
export function poleDirection(pose) {
  return multiplyVector(pose.rotation, POLE);
}

/**
 * The pointer moved by (dx, dy), measured in sphere radii, while over the sphere. Like a hand
 * brushing a globe, this adds spin about the axis perpendicular to the movement.
 */
export function brush(pose, dx, dy) {
  const spin = [pose.spin[0] - dy * BRUSH_GAIN, pose.spin[1] + dx * BRUSH_GAIN, pose.spin[2]];
  const speed = length(spin);
  pose.spin = speed > MAX_SPIN ? scale(spin, MAX_SPIN / speed) : spin;
}

/**
 * Advances the sphere by `seconds`.
 * `pointer` is where the pointer is over the sphere in sphere radii from its centre (x right,
 * y down), or null when it is elsewhere; the sphere leans towards it.
 */
export function stepPose(pose, seconds, pointer = null) {
  const dt = Math.min(Math.max(seconds, 0), MAX_STEP);
  if (dt === 0) return;

  const pole = poleDirection(pose);

  // Righting torque: tips the axis back towards its resting tilt, like a weighted globe.
  const torque = cross(pole, REST_POLE);
  pose.spin = [
    pose.spin[0] + torque[0] * RIGHTING * dt,
    pose.spin[1] + torque[1] * RIGHTING * dt,
    pose.spin[2] + torque[2] * RIGHTING * dt,
  ];

  // Friction: spin fades towards a slow turn about the axis, never to a standstill.
  const idle = scale(pole, IDLE_SPIN);
  const keep = Math.exp(-FRICTION * dt);
  pose.spin = pose.spin.map((value, index) => idle[index] + (value - idle[index]) * keep);

  const speed = length(pose.spin);
  if (speed > 0) {
    const turn = axisAngle(pose.spin, speed * dt);
    pose.rotation = orthonormalize(multiplyMatrices(turn, pose.rotation));
  }

  // The lean is a damped spring: it eases towards the pointer and back to centre when it leaves.
  const target = pointer
    ? [
        Math.max(-1, Math.min(1, pointer.x)) * MAX_LEAN,
        Math.max(-1, Math.min(1, pointer.y)) * MAX_LEAN,
      ]
    : [0, 0];
  for (let axis = 0; axis < 2; axis += 1) {
    const pull = LEAN_STIFFNESS * (target[axis] - pose.lean[axis]);
    pose.leanSpeed[axis] += (pull - LEAN_DAMPING * pose.leanSpeed[axis]) * dt;
    pose.lean[axis] += pose.leanSpeed[axis] * dt;
  }

  pose.time += dt;
}

/** The sphere's whole orientation: its spin, then the lean towards the pointer on top. */
export function poseMatrix(pose) {
  // Pointer to the right brings the front round to the right (about y); pointer below brings it
  // down (about x, the other way round because y points down).
  const lean = multiplyMatrices(
    axisAngle([1, 0, 0], -pose.lean[1]),
    axisAngle([0, 1, 0], pose.lean[0]),
  );
  return multiplyMatrices(lean, pose.rotation);
}

// --- Geometry ---------------------------------------------------------------------------------

function basisFor(normal) {
  const n = normalize(normal);
  const helper = Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const u = normalize(cross(n, helper));
  return { normal: n, u, v: cross(n, u) };
}

const TILT = (23.4 * Math.PI) / 180;

/**
 * The rings, in the sphere's own frame. `spinRate` turns a ring about `spinAxis` (radians per
 * second), which is what makes the rings keep moving relative to one another. `beads` are small
 * dots travelling along the ring.
 */
const RING_SPECS = [
  // The equator.
  {
    radius: 1,
    normal: [0, 1, 0],
    width: 1.8,
    beads: [
      { phase: 0.6, speed: 0.55, size: 3.4 },
      { phase: 3.74, speed: 0.55, size: 2.2 },
    ],
  },
  // A meridian that turns about the axis.
  {
    radius: 1,
    normal: [1, 0, 0],
    spinAxis: [0, 1, 0],
    spinRate: 0.32,
    width: 1.5,
    beads: [{ phase: 2.2, speed: -0.8, size: 3 }],
  },
  // The ecliptic, tilted and turning the other way.
  {
    radius: 0.92,
    normal: [Math.sin(TILT), Math.cos(TILT), 0],
    spinAxis: [0, 1, 0],
    spinRate: -0.2,
    width: 1.4,
    beads: [{ phase: 1.1, speed: 0.4, size: 4 }],
  },
  // An inner ring tumbling about the horizontal axis.
  {
    radius: 0.8,
    normal: [0, 0, 1],
    spinAxis: [1, 0, 0],
    spinRate: 0.44,
    width: 1.2,
    beads: [{ phase: 4.4, speed: 1.1, size: 2.4 }],
  },
  // The two tropics.
  { radius: Math.sqrt(1 - 0.45 * 0.45), normal: [0, 1, 0], offset: 0.45, width: 0.9 },
  { radius: Math.sqrt(1 - 0.45 * 0.45), normal: [0, 1, 0], offset: -0.45, width: 0.9 },
].map((spec) => ({
  offset: 0,
  spinRate: 0,
  spinAxis: [0, 1, 0],
  beads: [],
  ...spec,
  ...basisFor(spec.normal),
}));

export const RINGS = RING_SPECS;

/** Points of the axis rod, a little longer than the sphere. */
const AXIS_REACH = 1.16;
const SEGMENTS = 72;
const AXIS_SEGMENTS = 24;
/** Reach of the picture in the middle, as a fraction of the canvas (it fills half the width). */
const PICTURE_REACH = 0.27;
/** Perspective strength: the larger, the flatter the view. */
const FOCAL = 4;
/** How much of the half-width the unit sphere uses, leaving room for the nearest part to grow. */
const FILL = 0.74;

/** Parts of the sphere facing the viewer are drawn brighter and heavier than those facing away. */
export function depthAlpha(z) {
  return Math.min(1, Math.max(0.16, 0.2 + 0.8 * ((z + 1) / 2)));
}

function projector(size) {
  const half = size / 2;
  const base = half * FILL;
  return ([x, y, z]) => {
    const factor = FOCAL / (FOCAL - z);
    return { x: half + x * factor * base, y: half + y * factor * base, z, factor };
  };
}

/**
 * Everything to draw for one moment, split into the half behind the picture and the half in
 * front of it: { back: { lines, dots }, front: { lines, dots } }. Lines are short segments with
 * their own width and opacity, so depth shows as brightness along each ring.
 */
export function computeFrame(pose, size) {
  const project = projector(size);
  const matrix = poseMatrix(pose);
  const frame = {
    size,
    back: { lines: [], dots: [] },
    front: { lines: [], dots: [] },
  };

  const addLine = (from, to, width, fade = 1, axis = false) => {
    const z = (from.z + to.z) / 2;
    const layer = z < 0 ? frame.back : frame.front;
    layer.lines.push({
      x1: from.x,
      y1: from.y,
      x2: to.x,
      y2: to.y,
      z,
      width: width * (from.factor + to.factor) * 0.5,
      alpha: depthAlpha(z) * fade,
      axis,
    });
  };

  const addDot = (point, radius, fade = 1) => {
    const layer = point.z < 0 ? frame.back : frame.front;
    layer.dots.push({
      x: point.x,
      y: point.y,
      z: point.z,
      radius: radius * point.factor,
      alpha: Math.min(1, depthAlpha(point.z) * fade + 0.1),
    });
  };

  for (const ring of RINGS) {
    const turn = ring.spinRate ? axisAngle(ring.spinAxis, ring.spinRate * pose.time) : IDENTITY;
    const orientation = multiplyMatrices(matrix, turn);
    const centre = multiplyVector(orientation, scale(ring.normal, ring.offset));
    const u = multiplyVector(orientation, ring.u);
    const v = multiplyVector(orientation, ring.v);
    const pointAt = (angle) => {
      const c = Math.cos(angle) * ring.radius;
      const s = Math.sin(angle) * ring.radius;
      return project([
        centre[0] + c * u[0] + s * v[0],
        centre[1] + c * u[1] + s * v[1],
        centre[2] + c * u[2] + s * v[2],
      ]);
    };

    let previous = pointAt(0);
    for (let i = 1; i <= SEGMENTS; i += 1) {
      const next = pointAt((i / SEGMENTS) * TAU);
      addLine(previous, next, ring.width);
      previous = next;
    }
    for (const bead of ring.beads) {
      addDot(pointAt(bead.phase + bead.speed * pose.time), bead.size);
    }
  }

  // The axis rod through both poles, fainter than the rings.
  const axisAt = (t) => project(multiplyVector(matrix, [0, t * AXIS_REACH, 0]));
  // The near half of the rod would cut across the face, so it only shows beyond the picture.
  const behindPicture = (point) =>
    point.z >= 0 && Math.hypot(point.x - size / 2, point.y - size / 2) < size * PICTURE_REACH;
  let last = axisAt(-1);
  for (let i = 1; i <= AXIS_SEGMENTS; i += 1) {
    const next = axisAt(-1 + (2 * i) / AXIS_SEGMENTS);
    if (!behindPicture(last) && !behindPicture(next)) addLine(last, next, 1, 0.55, true);
    last = next;
  }
  addDot(axisAt(-1), 2.4, 0.8);
  addDot(axisAt(1), 2.4, 0.8);

  return frame;
}

/** Strokes one half of a frame onto a 2D canvas context. */
export function paintLayer(ctx, frame, layer, color) {
  ctx.clearRect(0, 0, frame.size, frame.size);
  ctx.lineCap = 'butt';
  ctx.strokeStyle = color;
  ctx.fillStyle = color;

  for (const line of frame[layer].lines) {
    ctx.globalAlpha = line.alpha;
    ctx.lineWidth = line.width;
    ctx.beginPath();
    ctx.moveTo(line.x1, line.y1);
    ctx.lineTo(line.x2, line.y2);
    ctx.stroke();
  }
  for (const dot of frame[layer].dots) {
    ctx.globalAlpha = dot.alpha;
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, dot.radius, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
