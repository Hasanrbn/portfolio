import { getInitials } from '../../utils/profile.js';
import styles from './Avatar.module.css';

/**
 * Round profile picture. Without a picture it shows the person's initials as a decorative
 * monogram, so the site works before a photo is added and never shows a stand-in face.
 * The size is set in CSS (--avatar-size) so layouts can make it larger on wide screens.
 */
export default function Avatar({ name, src, className }) {
  const classes = [styles.avatar, className].filter(Boolean).join(' ');

  if (src) {
    // Width and height reserve the space before the file loads, which prevents layout shift.
    return (
      <img className={classes} src={src} alt={name} width="224" height="224" decoding="async" />
    );
  }

  return (
    <div className={`${classes} ${styles.monogram}`} aria-hidden="true">
      {getInitials(name)}
    </div>
  );
}
