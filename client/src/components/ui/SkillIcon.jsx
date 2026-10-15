/**
 * A technology logo drawn from one SVG path (see utils/skillIcons.js). It is decoration: the
 * skill's name always sits next to it as text, so screen readers skip the picture. It takes the
 * surrounding text colour (`currentColor`), which keeps it readable in the light and dark theme.
 */
export default function SkillIcon({ path, className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d={path} />
    </svg>
  );
}
