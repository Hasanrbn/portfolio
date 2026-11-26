import { useEffect, useRef } from 'react';
import { brush, computeFrame, createPose, paintLayer, stepPose } from '../../utils/armillary.js';
import styles from './ArmillarySphere.module.css';

/**
 * Wraps a round picture in an armillary sphere: rings that keep turning, drawn so the half behind
 * the picture is really behind it and the half in front passes over it. The sphere has weight:
 * brushing it with the pointer sets it spinning, friction slows it, and it leans towards the
 * pointer and tips back upright afterwards.
 *
 * The rings are decoration (the canvases are hidden from assistive technology); the children
 * keep their own accessible names. With reduced motion, or without canvas support, the rings are
 * drawn once and stay still.
 */
export default function ArmillarySphere({ children, className }) {
  const rootRef = useRef(null);
  const backRef = useRef(null);
  const frontRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    const backCtx = backRef.current?.getContext?.('2d');
    const frontCtx = frontRef.current?.getContext?.('2d');
    if (!root || !backCtx || !frontCtx) return undefined;

    const pose = createPose();
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    let size = 0;
    let color = '';
    let frameId = 0;
    let lastTime = 0;
    let inView = true;
    let pointer = null; // position over the sphere in sphere radii, or null
    let previous = null; // last pointer position in pixels, to measure each movement

    const animates = () => !reduceMotion?.matches;
    const running = () => animates() && inView && !document.hidden;

    function draw() {
      if (size === 0) return;
      const frame = computeFrame(pose, size);
      paintLayer(backCtx, frame, 'back', color);
      paintLayer(frontCtx, frame, 'front', color);
    }

    function readColor() {
      color = getComputedStyle(root).color;
    }

    function resize() {
      size = root.getBoundingClientRect().width;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      for (const [canvas, ctx] of [
        [backRef.current, backCtx],
        [frontRef.current, frontCtx],
      ]) {
        canvas.width = Math.round(size * ratio);
        canvas.height = Math.round(size * ratio);
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      }
      draw();
    }

    function tick(now) {
      stepPose(pose, (now - lastTime) / 1000, pointer);
      lastTime = now;
      draw();
      frameId = requestAnimationFrame(tick);
    }

    function sync() {
      if (running() && !frameId) {
        lastTime = performance.now();
        frameId = requestAnimationFrame(tick);
      } else if (!running() && frameId) {
        cancelAnimationFrame(frameId);
        frameId = 0;
      }
      if (!running()) draw();
    }

    function locate(event) {
      const rect = root.getBoundingClientRect();
      return { px: event.clientX - rect.left, py: event.clientY - rect.top, half: rect.width / 2 };
    }

    function onPointerMove(event) {
      if (!animates()) return;
      const { px, py, half } = locate(event);
      pointer = { x: (px - half) / half, y: (py - half) / half };
      if (previous) brush(pose, (px - previous.x) / half, (py - previous.y) / half);
      previous = { x: px, y: py };
    }

    function onPointerLeave() {
      pointer = null;
      previous = null;
    }

    readColor();
    resize();
    sync();

    root.addEventListener('pointermove', onPointerMove);
    root.addEventListener('pointerleave', onPointerLeave);
    root.addEventListener('pointercancel', onPointerLeave);
    document.addEventListener('visibilitychange', sync);
    reduceMotion?.addEventListener?.('change', sync);

    const resizeObserver =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
    resizeObserver?.observe(root);

    const visibilityObserver =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(([entry]) => {
            inView = entry.isIntersecting;
            sync();
          });
    visibilityObserver?.observe(root);

    // The rings take the accent colour of the current theme.
    const themeObserver = new MutationObserver(() => {
      readColor();
      if (!running()) draw();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => {
      cancelAnimationFrame(frameId);
      root.removeEventListener('pointermove', onPointerMove);
      root.removeEventListener('pointerleave', onPointerLeave);
      root.removeEventListener('pointercancel', onPointerLeave);
      document.removeEventListener('visibilitychange', sync);
      reduceMotion?.removeEventListener?.('change', sync);
      resizeObserver?.disconnect();
      visibilityObserver?.disconnect();
      themeObserver.disconnect();
    };
  }, []);

  const classes = [styles.sphere, className].filter(Boolean).join(' ');

  return (
    <div ref={rootRef} className={classes}>
      <canvas ref={backRef} className={`${styles.layer} ${styles.back}`} aria-hidden="true" />
      <div className={styles.picture}>{children}</div>
      <canvas ref={frontRef} className={`${styles.layer} ${styles.front}`} aria-hidden="true" />
    </div>
  );
}
