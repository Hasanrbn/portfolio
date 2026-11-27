import { describe, expect, it } from 'vitest';
import {
  QUALITY,
  RINGS,
  axisAngle,
  brush,
  computeFrame,
  createGovernor,
  createPose,
  depthAlpha,
  multiplyVector,
  paintLayer,
  poleDirection,
  poseMatrix,
  startingQuality,
  stepPose,
} from '../src/utils/armillary.js';

const length = (v) => Math.hypot(...v);
const near = (a, b, digits = 6) => {
  a.forEach((value, index) => expect(value).toBeCloseTo(b[index], digits));
};

function isRotation(m) {
  const rows = [m.slice(0, 3), m.slice(3, 6), m.slice(6, 9)];
  rows.forEach((row) => expect(length(row)).toBeCloseTo(1, 6));
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  expect(dot(rows[0], rows[1])).toBeCloseTo(0, 6);
  expect(dot(rows[0], rows[2])).toBeCloseTo(0, 6);
  expect(dot(rows[1], rows[2])).toBeCloseTo(0, 6);
}

describe('rotations', () => {
  it('turns a vector a quarter turn about an axis', () => {
    near(multiplyVector(axisAngle([0, 0, 1], Math.PI / 2), [1, 0, 0]), [0, 1, 0]);
    near(multiplyVector(axisAngle([0, 2, 0], Math.PI), [1, 0, 0]), [-1, 0, 0]);
  });

  it('does nothing for no angle or no axis', () => {
    near(axisAngle([1, 0, 0], 0), [1, 0, 0, 0, 1, 0, 0, 0, 1]);
    near(axisAngle([0, 0, 0], 1), [1, 0, 0, 0, 1, 0, 0, 0, 1]);
  });
});

describe('physics of the sphere', () => {
  const frames = (pose, seconds, pointer = null) => {
    for (let i = 0; i < seconds * 60; i += 1) stepPose(pose, 1 / 60, pointer);
  };

  it('starts at rest, tipped towards the viewer, and keeps turning about its axis', () => {
    const pose = createPose();
    const before = poleDirection(pose);
    frames(pose, 2);

    near(poleDirection(pose), before, 3);
    expect(before[2]).toBeGreaterThan(0);
    expect(length(pose.spin)).toBeCloseTo(0.3, 3);
  });

  it('picks up spin about the axis perpendicular to a pointer movement', () => {
    const pose = createPose();
    const base = [...pose.spin];
    brush(pose, 0.1, 0);
    expect(pose.spin[1]).toBeGreaterThan(base[1]);
    expect(pose.spin[0]).toBeCloseTo(base[0], 9);

    const other = createPose();
    brush(other, 0, 0.1);
    // Moving down turns the front down: about x, the opposite way because y points down.
    expect(other.spin[0]).toBeLessThan(base[0]);
  });

  it('never spins faster than the limit, however hard it is brushed', () => {
    const pose = createPose();
    for (let i = 0; i < 200; i += 1) brush(pose, 1, 1);
    expect(length(pose.spin)).toBeLessThanOrEqual(6 + 1e-9);
  });

  it('slows down after a push, and tips its axis back upright', () => {
    const pose = createPose();
    const rest = poleDirection(pose);
    brush(pose, 1.5, -1.5);
    frames(pose, 0.5);
    expect(length(poleDirection(pose).map((value, i) => value - rest[i]))).toBeGreaterThan(0.01);

    frames(pose, 8);
    near(poleDirection(pose), rest, 2);
    expect(length(pose.spin)).toBeCloseTo(0.3, 2);
  });

  it('stays a true rotation after a long time of pushing', () => {
    const pose = createPose();
    for (let i = 0; i < 3000; i += 1) {
      if (i % 7 === 0) brush(pose, Math.sin(i), Math.cos(i * 1.3));
      stepPose(pose, 1 / 60);
    }
    isRotation(pose.rotation);
    isRotation(poseMatrix(pose));
  });

  it('leans towards the pointer and returns to centre when it leaves', () => {
    const pose = createPose();
    frames(pose, 1.5, { x: 1, y: -1 });
    expect(pose.lean[0]).toBeGreaterThan(0.25);
    expect(pose.lean[1]).toBeLessThan(-0.25);

    frames(pose, 2, null);
    near(pose.lean, [0, 0], 2);
  });

  it('ignores huge time steps and negative ones instead of jumping', () => {
    const pose = createPose();
    const start = pose.time;
    stepPose(pose, 5);
    expect(pose.time - start).toBeCloseTo(1 / 30, 9);
    stepPose(pose, -1);
    expect(pose.time - start).toBeCloseTo(1 / 30, 9);
  });
});

describe('what is drawn', () => {
  const size = 320;
  const frame = computeFrame(createPose(), size);

  it('draws every ring and the axis, split into a back and a front half', () => {
    const lines = frame.back.lines.length + frame.front.lines.length;
    // The near part of the axis rod is hidden where it would cross the picture.
    expect(lines).toBeGreaterThan(RINGS.length * 72);
    expect(lines).toBeLessThanOrEqual(RINGS.length * 72 + 24);
    expect(frame.back.lines.length).toBeGreaterThan(0);
    expect(frame.front.lines.length).toBeGreaterThan(0);
  });

  it('puts the far side of each ring behind the picture and the near side in front', () => {
    expect(frame.back.lines.every((line) => line.z < 0)).toBe(true);
    expect(frame.front.lines.every((line) => line.z >= 0)).toBe(true);
    expect(frame.back.dots.every((dot) => dot.z < 0)).toBe(true);
  });

  it('does not draw the axis rod across the picture', () => {
    const centre = size / 2;
    const rod = frame.front.lines.filter((line) => line.axis);

    expect(rod.length).toBeGreaterThan(0);
    rod.forEach((line) => {
      const reach = Math.hypot(line.x1 - centre, line.y1 - centre);
      expect(reach).toBeGreaterThanOrEqual(size * 0.27 - 1);
    });
  });

  it('draws parts facing the viewer brighter than parts facing away', () => {
    expect(depthAlpha(1)).toBeGreaterThan(depthAlpha(-1));
    const average = (lines) => lines.reduce((sum, line) => sum + line.alpha, 0) / lines.length;
    expect(average(frame.front.lines)).toBeGreaterThan(average(frame.back.lines));
  });

  it('keeps everything inside the canvas, whatever the orientation', () => {
    const pose = createPose();
    for (let i = 0; i < 400; i += 1) {
      if (i % 5 === 0) brush(pose, Math.sin(i), Math.cos(i * 0.7));
      stepPose(pose, 1 / 60, { x: Math.sin(i / 20), y: Math.cos(i / 30) });
      if (i % 25 !== 0) continue;
      const { back, front } = computeFrame(pose, size);
      for (const line of [...back.lines, ...front.lines]) {
        for (const value of [line.x1, line.y1, line.x2, line.y2]) {
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(size);
        }
      }
    }
  });

  it('moves as time passes, because the rings and beads keep turning', () => {
    const later = createPose();
    later.time += 3;
    const moved = computeFrame(later, size);
    // The equator stands still, but the meridian, ecliptic and inner ring turn on their own.
    expect(JSON.stringify(moved.front)).not.toBe(JSON.stringify(frame.front));
  });

  it('paints one half onto a canvas context and leaves it opaque afterwards', () => {
    const calls = [];
    const ctx = new Proxy(
      {},
      {
        get: (target, name) =>
          name in target ? target[name] : (...args) => calls.push([name, ...args]),
        set: (target, name, value) => {
          target[name] = value;
          return true;
        },
      },
    );
    paintLayer(ctx, frame, 'front', 'rgb(200, 242, 107)');

    expect(calls[0][0]).toBe('clearRect');
    expect(calls.filter(([name]) => name === 'stroke')).toHaveLength(frame.front.lines.length);
    expect(ctx.globalAlpha).toBe(1);
    expect(ctx.strokeStyle).toBe('rgb(200, 242, 107)');
  });
});

describe('quality', () => {
  const frames = (governor, count, seconds) => {
    let dropped = false;
    for (let i = 0; i < count; i += 1) dropped = governor.observe(seconds) || dropped;
    return dropped;
  };

  it('draws fewer line segments when asked, and still closes every ring', () => {
    const coarse = computeFrame(createPose(), 320, 36);
    const fine = computeFrame(createPose(), 320, 72);
    const count = (frame) => frame.back.lines.length + frame.front.lines.length;

    expect(count(coarse)).toBeLessThan(count(fine));
    expect(count(coarse)).toBeGreaterThan(RINGS.length * 36);
  });

  it('asks for less of the device at each step down', () => {
    for (let i = 1; i < QUALITY.length; i += 1) {
      const worse = QUALITY[i];
      const better = QUALITY[i - 1];
      expect(worse.pixelRatio).toBeLessThanOrEqual(better.pixelRatio);
      expect(worse.segments).toBeLessThanOrEqual(better.segments);
      expect(worse.frameMs).toBeGreaterThanOrEqual(better.frameMs);
    }
  });

  it('keeps full quality while frames are quick', () => {
    const governor = createGovernor();
    expect(frames(governor, 300, 1 / 60)).toBe(false);
    expect(governor.level).toBe(0);
  });

  it('steps down when frames are slow, and only to the lowest level', () => {
    const governor = createGovernor();
    expect(frames(governor, 45, 0.04)).toBe(true);
    expect(governor.level).toBe(1);

    frames(governor, 500, 0.06);
    expect(governor.level).toBe(QUALITY.length - 1);
    expect(governor.quality).toBe(QUALITY[QUALITY.length - 1]);
  });

  it('does not go back up once the device has proved slow', () => {
    const governor = createGovernor();
    frames(governor, 45, 0.04);
    frames(governor, 500, 1 / 60);
    expect(governor.level).toBe(1);
  });

  it('ignores long pauses, which are hidden tabs and not a slow sphere', () => {
    const governor = createGovernor();
    frames(governor, 200, 2);
    expect(governor.level).toBe(0);
  });

  it('starts lower on devices that say they are small or on a data saver', () => {
    expect(startingQuality({})).toBe(0);
    expect(startingQuality({ deviceMemory: 8, hardwareConcurrency: 8 })).toBe(0);
    expect(startingQuality({ deviceMemory: 2 })).toBe(1);
    expect(startingQuality({ hardwareConcurrency: 2 })).toBe(1);
    expect(startingQuality({ connection: { saveData: true } })).toBe(1);
  });
});
