import { Link } from 'react-router';
import Badge from '../ui/Badge.jsx';
import Card from '../ui/Card.jsx';
import Icon from '../ui/Icon.jsx';
import Tag from '../ui/Tag.jsx';
import useReveal from '../../hooks/useReveal.js';
import { PROJECT_STATUSES } from '../../utils/projectStatus.js';
import styles from './ProjectCard.module.css';

/**
 * Tells the CSS where the mouse is inside the card, so the soft glow can follow it. Only a mouse
 * moves it: touch and pen input leave the glow where the stylesheet puts it by default. The
 * values are written straight to the element, so moving the mouse never re-renders React.
 */
function trackGlow(event) {
  if (event.pointerType !== 'mouse') return;
  const card = event.currentTarget;
  const box = card.getBoundingClientRect();
  card.style.setProperty('--glow-x', `${event.clientX - box.left}px`);
  card.style.setProperty('--glow-y', `${event.clientY - box.top}px`);
}

/**
 * One project in the list. The title is the card's link and its clickable area covers the whole
 * card; the GitHub and demo links sit above it so they stay separate, working links.
 * Optional parts (picture, status, links) are left out when the project has none.
 * It fades in when scrolled into view (`revealDelay` staggers cards in a row). On hover or
 * keyboard focus the card lifts and a soft glow appears (see the stylesheet for when
 * the movement is switched off).
 */
export default function ProjectCard({ project, headingAs: Heading = 'h2', revealDelay = 0 }) {
  const revealRef = useReveal({ delay: revealDelay });
  const status = project.status ? PROJECT_STATUSES[project.status] : null;
  const { thumbnail } = project;

  return (
    <Card as="li" ref={revealRef} className={styles.card} onPointerMove={trackGlow}>
      {thumbnail && (
        <img
          className={styles.thumbnail}
          src={thumbnail.url}
          alt={thumbnail.alt}
          width={thumbnail.width ?? 640}
          height={thumbnail.height ?? 360}
          loading="lazy"
          decoding="async"
        />
      )}

      <div className={styles.meta}>
        {status && <Badge tone={status.tone}>{status.label}</Badge>}
        {project.category && <span>{project.category}</span>}
        {project.year && <span>{project.year}</span>}
      </div>

      <Heading className={styles.title}>
        <Link to={`/projects/${project.slug}`} className={styles.titleLink}>
          {project.title}
        </Link>
      </Heading>
      <p className={styles.summary}>{project.summary}</p>

      {project.technologies.length > 0 && (
        // eslint-disable-next-line jsx-a11y/no-redundant-roles
        <ul role="list" className={styles.tags} aria-label="Technologies">
          {project.technologies.map((name) => (
            <li key={name}>
              <Tag>{name}</Tag>
            </li>
          ))}
        </ul>
      )}

      {(project.repoUrl || project.demoUrl) && (
        // eslint-disable-next-line jsx-a11y/no-redundant-roles
        <ul role="list" className={styles.links}>
          {project.repoUrl && (
            <li>
              <a href={project.repoUrl} target="_blank" rel="noopener noreferrer">
                <Icon name="github" size={16} />
                GitHub{' '}
                <span className="visually-hidden">
                  repository of {project.title} (opens in a new tab)
                </span>
              </a>
            </li>
          )}
          {project.demoUrl && (
            <li>
              <a href={project.demoUrl} target="_blank" rel="noopener noreferrer">
                Live demo{' '}
                <span className="visually-hidden">of {project.title} (opens in a new tab)</span>
              </a>
            </li>
          )}
        </ul>
      )}
    </Card>
  );
}
