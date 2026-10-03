import Icon from '../ui/Icon.jsx';
import { classNames } from '../../utils/classNames.js';
import styles from './SocialLinks.module.css';

/**
 * Contact and profile links with icons. Pass the result of getSocialLinks(siteConfig), which
 * already leaves out placeholders; the component renders nothing when there are no links.
 */
export default function SocialLinks({ links, className }) {
  if (links.length === 0) {
    return null;
  }

  return (
    // eslint-disable-next-line jsx-a11y/no-redundant-roles
    <ul role="list" className={classNames(styles.list, className)}>
      {links.map((link) => {
        const opensNewTab = link.href.startsWith('https://');
        const newTabProps = opensNewTab ? { target: '_blank', rel: 'noopener noreferrer' } : {};

        return (
          <li key={link.id}>
            <a href={link.href} className={styles.link} {...newTabProps}>
              <Icon name={link.icon} size={18} />
              {link.label}
              {opensNewTab && (
                <>
                  {' '}
                  <span className="visually-hidden">(opens in a new tab)</span>
                </>
              )}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
