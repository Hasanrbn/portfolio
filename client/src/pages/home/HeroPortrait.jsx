import { useEffect, useRef, useState } from 'react';
import { createPull, poseForPull, pullFromDrag, stepPull } from '../../utils/portraitPull.js';
import styles from './HeroPortrait.module.css';
import DoodleArrow from '../../components/ui/DoodleArrow.jsx';

const POSES = {
  peek: { src: '/images/profile/peek.webp', width: 614, height: 1200 },
  wave: { src: '/images/profile/wave.webp', width: 614, height: 1200 },
  cling1: { src: '/images/profile/cling1.webp', width: 1073, height: 730 },
  cling2: { src: '/images/profile/cling2.webp', width: 1078, height: 591 },
};

/** The other poses are fetched once the page has settled, so they never compete with first paint. */
const PRELOAD_DELAY_MS = 2000;
/** How long a tap keeps the waving pose on a touch screen, where there is no hover to end it. */
const TAP_HOLD_MS = 2600;

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
const saveData = () => navigator.connection?.saveData === true;

/**
 * A half-body portrait peeking in from the right-hand edge of the screen, one hand on the edge.
 *
 * - Pointing at it (or tapping it on a touch screen) swaps to a waving pose.
 * - Dragging it away from the edge pulls on it. It holds on by its hands: first the peek stretches,
 *   then it hangs from the edge, then it strains, and the pose changes with the pull. Let go and
 *   it snaps back to the edge on a spring.
 *
 * Only the first pose is announced to assistive technology; the others are the same person again.
 */
export default function HeroPortrait({ name }) {
  const rootRef = useRef(null);
  const pull = useRef(createPull());
  const target = useRef(0); // the pull the pointer asks for; 0 when nothing holds it
  const dragging = useRef(false);
  const start = useRef(0);
  const frame = useRef(0);
  const last = useRef(0);
  const holdTimer = useRef(0);

  const [hover, setHover] = useState(false);
  const [pullPose, setPullPose] = useState('peek');
  const [grabbed, setGrabbed] = useState(false);
  const [extrasWanted, setExtrasWanted] = useState(false);
  const [hinted, setHinted] = useState(true);
  const poseRef = useRef('peek');

  useEffect(() => {
    const settle = saveData() ? 0 : setTimeout(() => setExtrasWanted(true), PRELOAD_DELAY_MS);
    return () => {
      clearTimeout(settle);
      clearTimeout(holdTimer.current);
      cancelAnimationFrame(frame.current);
    };
  }, []);

  function tick(now) {
    const seconds = (now - last.current) / 1000;
    last.current = now;
    const moving = stepPull(pull.current, seconds, target.current, {
      bouncy: !prefersReducedMotion(),
    });
    rootRef.current?.style.setProperty('--pull', pull.current.value.toFixed(4));

    const next = poseForPull(pull.current.value, poseRef.current);
    if (next !== poseRef.current) {
      poseRef.current = next;
      setPullPose(next);
    }
    frame.current = moving || dragging.current ? requestAnimationFrame(tick) : 0;
  }

  function run() {
    if (frame.current) return;
    last.current = performance.now();
    frame.current = requestAnimationFrame(tick);
  }

  const wantExtras = () => setExtrasWanted(true);

  const onPointerEnter = (event) => {
    wantExtras();
    if (event.pointerType !== 'touch') setHover(true);
  };

  const onPointerLeave = (event) => {
    if (event.pointerType !== 'touch' && !dragging.current) setHover(false);
  };

  const onPointerDown = (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    wantExtras();
    setHinted(false);
    dragging.current = true;
    start.current = event.clientX;
    setGrabbed(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);

    if (event.pointerType === 'touch') {
      // A tap waves; a drag, handled below, pulls instead.
      clearTimeout(holdTimer.current);
      setHover(true);
      holdTimer.current = setTimeout(() => setHover(false), TAP_HOLD_MS);
    }
    run();
  };

  const onPointerMove = (event) => {
    if (!dragging.current) return;
    target.current = pullFromDrag(start.current - event.clientX);
  };

  const release = (event) => {
    if (!dragging.current) return;
    dragging.current = false;
    target.current = 0;
    setGrabbed(false);
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    if (event.pointerType === 'mouse') {
      // The pointer may have been dragged out of the figure; it only waves if it is still on it.
      const box = event.currentTarget.getBoundingClientRect();
      setHover(
        event.clientX >= box.left &&
          event.clientX <= box.right &&
          event.clientY >= box.top &&
          event.clientY <= box.bottom,
      );
    }
    run();
  };

  // While it is held it stretches in its peeking pose; the wave is for when it is not being pulled.
  const pose = pullPose !== 'peek' ? pullPose : hover && !grabbed ? 'wave' : 'peek';
  const extra = (key) => (extrasWanted ? POSES[key].src : undefined);

  return (
    <div
      ref={rootRef}
      className={styles.portrait}
      data-pose={pose}
      data-dragging={grabbed}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={release}
      onPointerCancel={release}
      onDragStart={(event) => event.preventDefault()}
    >
      {hinted && (
        <span className={styles.hint} aria-hidden="true">
          Pull me!
          <DoodleArrow className={styles.hintArrow} />
        </span>
      )}
      <img
        className={`${styles.pose} ${styles.peek}`}
        src={POSES.peek.src}
        alt={`${name}, smiling and peeking in from the side of the page`}
        width={POSES.peek.width}
        height={POSES.peek.height}
        decoding="async"
        draggable={false}
      />
      <img
        className={`${styles.pose} ${styles.wave}`}
        src={extra('wave')}
        alt=""
        aria-hidden="true"
        width={POSES.wave.width}
        height={POSES.wave.height}
        decoding="async"
        draggable={false}
      />
      <img
        className={`${styles.pose} ${styles.cling} ${styles.cling1}`}
        src={extra('cling1')}
        alt=""
        aria-hidden="true"
        width={POSES.cling1.width}
        height={POSES.cling1.height}
        decoding="async"
        draggable={false}
      />
      <img
        className={`${styles.pose} ${styles.cling} ${styles.cling2}`}
        src={extra('cling2')}
        alt=""
        aria-hidden="true"
        width={POSES.cling2.width}
        height={POSES.cling2.height}
        decoding="async"
        draggable={false}
      />
    </div>
  );
}
