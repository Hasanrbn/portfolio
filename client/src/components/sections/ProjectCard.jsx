import { Link } from 'react-router';
import Badge from '../ui/Badge.jsx';
import Card from '../ui/Card.jsx';
import Icon from '../ui/Icon.jsx';
import Tag from '../ui/Tag.jsx';
import { PROJECT_STATUSES } from '../../utils/projectStatus.js';
import styles from './ProjectCard.module.css';

/**
 * One project in the list. The title is the card's link and its clickable area covers the whole
 * card; the GitHub and demo links sit above it so they stay separate, working links.
 * Optional parts (picture, status, links) are left out when the project has none.
 */
export default function ProjectCard({ project, headingAs: Heading = 'h2' }) {
  const status = project.status ? PROJECT_STATUSES[project.status] : null;
  const { thumbnail } = project;

  return (
    <Card as="li" interactive className={styles.card}>
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
