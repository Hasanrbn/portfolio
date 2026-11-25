import { useEffect, useRef } from 'react';
import Icon from './Icon.jsx';
import styles from './Lightbox.module.css';

/**
 * Full-screen viewer for a list of pictures, built on the native <dialog>: the browser traps
 * focus inside it, Esc closes it and focus goes back to the button that opened it. Arrow keys
 * (and the two buttons) move between pictures; a click outside the picture closes it.
 * It is mounted only while open, so `images` and `index` are always valid here.
 */
export default function Lightbox({ images, index, onIndexChange, onClose }) {
  const dialogRef = useRef(null);
  const image = images[index];
  const count = images.length;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog.open) dialog.showModal();
    // The page behind must not scroll while the viewer is open.
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = 'hidden';
    return () => {
      root.style.overflow = previousOverflow;
      if (dialog.open) dialog.close();
    };
  }, []);

  // The end buttons use aria-disabled instead of disabled: a disabled button that has focus
  // drops it, and the arrow keys would stop working inside the viewer.
  function step(direction) {
    const next = index + direction;
    if (next >= 0 && next < count) onIndexChange(next);
  }

  function handleKeyDown(event) {
    if (event.key === 'ArrowLeft') step(-1);
    if (event.key === 'ArrowRight') step(1);
  }

  function handleClick(event) {
    // Only the empty area around the picture counts as "outside".
    if (event.target === dialogRef.current || event.target === event.currentTarget.firstChild) {
      onClose();
    }
  }

  return (
    // The dialog element is the focus trap; clicks on it are a convenience, Esc is the real way out.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-label="Image viewer"
      onClose={onClose}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <div className={styles.stage}>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close viewer">
          <Icon name="close" size={22} />
        </button>

        <figure className={styles.figure}>
          <img
            key={image.url}
            src={image.url}
            alt={image.alt}
            width={image.width ?? undefined}
            height={image.height ?? undefined}
            className={styles.image}
          />
          <figcaption className={styles.caption}>
            {image.caption && <span>{image.caption}</span>}
            {count > 1 && (
              <span className={styles.count}>
                {index + 1} / {count}
              </span>
            )}
          </figcaption>
        </figure>

        {count > 1 && (
          <>
            <button
              type="button"
              className={`${styles.nav} ${styles.prev}`}
              onClick={() => step(-1)}
              aria-disabled={index === 0}
              aria-label="Previous image"
            >
              <Icon name="chevron-left" size={24} />
            </button>
            <button
              type="button"
              className={`${styles.nav} ${styles.next}`}
              onClick={() => step(1)}
              aria-disabled={index === count - 1}
              aria-label="Next image"
            >
              <Icon name="chevron-right" size={24} />
            </button>
          </>
        )}
        <p className="visually-hidden" aria-live="polite">
          {`Image ${index + 1} of ${count}`}
        </p>
      </div>
    </dialog>
  );
}
