import BrowserFrame from './BrowserFrame.jsx';
import ZoomImage from './ZoomImage.jsx';
import styles from './BeforeAfter.module.css';

/** A hand-drawn style curve that points from "before" to "after". Decoration only. */
function Arrow() {
  return (
    <svg className={styles.arrow} viewBox="0 0 120 70" fill="none" aria-hidden="true">
      <path
        d="M6 58C22 20 58 6 100 26"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="m84 16 18 11-12 16"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Side({ kind, label, picture, onOpen }) {
  return (
    <div className={`${styles.side} ${styles[kind]}`}>
      <span className={styles.pill}>{label}</span>
      <BrowserFrame>
        <ZoomImage picture={picture} onOpen={() => onOpen(kind)} />
      </BrowserFrame>
    </div>
  );
}

/**
 * The old and the new version side by side (stacked on a phone), each in a browser window with a
 * label, like a before-and-after board. Nothing to drag: both stay in full view, and each opens
 * in the picture viewer through `onOpen('before' | 'after')`.
 */
export default function BeforeAfter({
  before,
  after,
  beforeLabel,
  afterLabel,
  caption,
  onOpen = () => {},
}) {
  return (
    <figure className={styles.figure}>
      <div className={styles.pair}>
        <Side kind="before" label={beforeLabel} picture={before} onOpen={onOpen} />
        <Arrow />
        <Side kind="after" label={afterLabel} picture={after} onOpen={onOpen} />
      </div>
      {caption && <figcaption className={styles.caption}>{caption}</figcaption>}
    </figure>
  );
}
