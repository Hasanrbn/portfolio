import Badge from '../ui/Badge.jsx';
import LinkButton from '../ui/LinkButton.jsx';
import SocialLinks from './SocialLinks.jsx';
import styles from './Hero.module.css';

/**
 * Opening block of the home page and the page's only h1.
 * Everything optional (availability, CV, profile links) is left out when it is empty.
 * There is no picture here yet: a half-body photo is planned for the right-hand side.
 */
export default function Hero({ name, role, intro, availability, resume, socialLinks = [] }) {
  return (
    <div className={styles.hero}>
      <div className={styles.content}>
        {availability && <Badge tone="success">{availability}</Badge>}
        {/* Decorative: the h1 below already says who this is. */}
        <p className={styles.greeting} aria-hidden="true">
          Hello, I’m
          <svg className={styles.doodle} viewBox="0 0 64 48" fill="none" focusable="false">
            <path
              d="M4 6c14-2 30 4 36 18 3 7 2 14-2 18m0 0-9-2m9 2 1-10"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </p>
        <h1 className={styles.name}>{name}</h1>
        <p className={styles.role}>{role}</p>
        <p className={styles.intro}>{intro}</p>

        <div className={styles.actions}>
          <LinkButton to="/#projects" size="lg">
            View My Projects
          </LinkButton>
          <LinkButton to="/#contact" variant="secondary" size="lg">
            Contact Me
          </LinkButton>
          {resume && (
            <LinkButton
              href={resume.href}
              variant="ghost"
              size="lg"
              {...(resume.isExternal ? { newTab: true } : { download: '' })}
            >
              Download CV
            </LinkButton>
          )}
        </div>

        <SocialLinks links={socialLinks} />
      </div>
    </div>
  );
}
