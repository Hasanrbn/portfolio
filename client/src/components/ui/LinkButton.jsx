import { Link } from 'react-router';
import { buttonClassName } from './Button.jsx';

/**
 * A link that looks like a Button. Use `to` for pages inside the site (client-side
 * navigation) and `href` for external or file links such as the CV download.
 */
export default function LinkButton({
  to,
  href,
  newTab = false,
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}) {
  const classes = buttonClassName({ variant, size, className });

  if (to) {
    return (
      <Link to={to} className={classes} {...props}>
        {children}
      </Link>
    );
  }

  const newTabProps = newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {};

  return (
    <a href={href} className={classes} {...newTabProps} {...props}>
      {children}
      {newTab && (
        <>
          {/* The space sits outside the hidden span so it survives accessible-name trimming. */}{' '}
          <span className="visually-hidden">(opens in a new tab)</span>
        </>
      )}
    </a>
  );
}
