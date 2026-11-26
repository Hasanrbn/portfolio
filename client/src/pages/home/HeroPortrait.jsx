import { useEffect, useRef, useState } from 'react';

const PEEK = '/images/profile/peek.webp';
const WAVE = '/images/profile/wave.webp';
import styles from './HeroPortrait.module.css';

/** The waving pose is fetched once the page has settled, so it never competes with the first paint. */
const PRELOAD_DELAY_MS = 1500;
const SIZE = { width: 614, height: 1200 };
/** How long a tap keeps the waving pose on a touch screen, where there is no hover to end it. */
const TAP_HOLD_MS = 2600;

/**
 * A half-body portrait peeking in from the right-hand edge of the screen, one hand on the edge.
 * Pointing at it (or tapping it on a touch screen) swaps to a second pose, waving, with a short
 * cross-fade.
 *
 * Both poses are cut out on the same canvas with the edge at the same place, so they line up.
 * Only the first is announced to assistive technology; the second is the same person again.
 */
export default function HeroPortrait({ name }) {
  const [waving, setWaving] = useState(false);
  const [waveWanted, setWaveWanted] = useState(false);
  const timer = useRef(0);

  useEffect(() => {
    const settle = setTimeout(() => setWaveWanted(true), PRELOAD_DELAY_MS);
    return () => {
      clearTimeout(settle);
      clearTimeout(timer.current);
    };
  }, []);

  const onPointerEnter = (event) => {
    setWaveWanted(true);
    if (event.pointerType !== 'touch') setWaving(true);
  };
  const onPointerLeave = (event) => {
    if (event.pointerType !== 'touch') setWaving(false);
  };
  const onPointerDown = (event) => {
    if (event.pointerType !== 'touch') return;
    clearTimeout(timer.current);
    setWaveWanted(true);
    setWaving(true);
    timer.current = setTimeout(() => setWaving(false), TAP_HOLD_MS);
  };

  return (
    <div
      className={styles.portrait}
      data-waving={waving}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onPointerDown={onPointerDown}
    >
      <img
        className={`${styles.pose} ${styles.peek}`}
        src={PEEK}
        alt={`${name}, smiling and peeking in from the side of the page`}
        {...SIZE}
        decoding="async"
      />
      <img
        className={`${styles.pose} ${styles.wave}`}
        src={waveWanted ? WAVE : undefined}
        alt=""
        aria-hidden="true"
        {...SIZE}
        decoding="async"
      />
    </div>
  );
}
