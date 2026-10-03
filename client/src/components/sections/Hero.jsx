import Badge from '../ui/Badge.jsx';
import LinkButton from '../ui/LinkButton.jsx';
import Avatar from './Avatar.jsx';
import SocialLinks from './SocialLinks.jsx';
import styles from './Hero.module.css';

/**
 * Opening block of the home page and the page's only h1.
 * Everything optional (availability, picture, CV, profile links) is left out when it is empty.
 */
export default function Hero({
  name,
  role,
  intro,
  availability,
  avatarSrc,
  resume,
  socialLinks = [],
}) {
  return (
    <div className={styles.hero}>
      <div className={styles.content}>
        {availability && <Badge tone="success">{availability}</Badge>}
        <h1 className={styles.name}>{name}</h1>
        <p className={styles.role}>{role}</p>
        <p className={styles.intro}>{intro}</p>

        <div className={styles.actions}>
          <LinkButton to="/projects" size="lg">
            View My Projects
          </LinkButton>
          <LinkButton to="/contact" variant="secondary" size="lg">
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

      <Avatar name={name} src={avatarSrc} className={styles.avatar} />
    </div>
  );
}
