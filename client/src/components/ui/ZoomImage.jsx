import { classNames } from '../../utils/classNames.js';
import Icon from './Icon.jsx';
import styles from './ZoomImage.module.css';

/**
 * A picture that opens in the full-screen viewer. The button's name is the picture's description.
 * By default the picture keeps its own proportions; with `fill` it covers whatever box the
 * parent gives it (cropped from the top), which is how screens of different heights sit in
 * the same frame.
 */
export default function ZoomImage({ picture, onOpen, priority = false, fill = false, className }) {
  return (
    <button
      type="button"
      className={classNames(styles.zoom, fill && styles.fill, className)}
      onClick={onOpen}
      aria-haspopup="dialog"
      aria-label={`Enlarge: ${picture.alt}`}
    >
      <img
        src={picture.url}
        alt={picture.alt}
        width={picture.width ?? undefined}
        height={picture.height ?? undefined}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
      />
      <span className={styles.icon} aria-hidden="true">
        <Icon name="maximize" size={18} />
      </span>
    </button>
  );
}
