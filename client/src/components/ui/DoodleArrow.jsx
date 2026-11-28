import { classNames } from '../../utils/classNames.js';

/*
 * One hand-drawn style arrow for every accent in the design ("Hello, I'm", "Pull me!", "Thanks
 * for scrolling", before and after). The shaft is a loose curve and the head is a wide, open V
 * with long legs and a heavy stroke, so it still reads as an arrow when it is drawn small.
 * Each shape is the same arrow turned to point where it is needed.
 */
const SHAPES = {
  // Curls from the text and points down.
  down: {
    viewBox: '0 0 64 52',
    path: 'M6 6C30 2 52 12 46 44M38.1 30 46 44 57.6 33',
  },
  // Rises from the left and points right.
  right: {
    viewBox: '0 -8 52 60',
    path: 'M6 46C2 22 12 0 44 6M33 -5.6 44 6 30 13.9',
  },
};

export default function DoodleArrow({ direction = 'down', className }) {
  const shape = SHAPES[direction];
  return (
    <svg
      className={classNames('doodle-arrow', className)}
      viewBox={shape.viewBox}
      fill="none"
      focusable="false"
      aria-hidden="true"
    >
      <path
        d={shape.path}
        stroke="currentColor"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
