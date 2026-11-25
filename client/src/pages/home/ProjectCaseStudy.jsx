import ArchitectureDiagram from '../../components/sections/ArchitectureDiagram.jsx';
import TextSection from '../../components/sections/TextSection.jsx';
import Badge from '../../components/ui/Badge.jsx';
import LinkButton from '../../components/ui/LinkButton.jsx';
import Tag from '../../components/ui/Tag.jsx';
import useReveal from '../../hooks/useReveal.js';
import { PROJECT_STATUSES } from '../../utils/projectStatus.js';
import { splitParagraphs } from '../../utils/text.js';
import styles from './ProjectCaseStudy.module.css';

function Screenshots({ id, shots }) {
  return (
    <section aria-labelledby={`${id}-screenshots`}>
      <h4 id={`${id}-screenshots`} className={styles.heading}>
        Screenshots
      </h4>
      {/* eslint-disable-next-line jsx-a11y/no-redundant-roles */}
      <ul role="list" className={styles.shots}>
        {shots.map((shot) => (
          <li key={shot.url}>
            <figure className={styles.figure}>
              <img
                src={shot.url}
                alt={shot.alt}
                width={shot.width ?? undefined}
                height={shot.height ?? undefined}
                loading="lazy"
                decoding="async"
              />
              {shot.caption && <figcaption>{shot.caption}</figcaption>}
            </figure>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * One project told as a case study, inline in the Projects section. The project title is an h3
 * (the section title is the h2); the parts inside it are h4.
 */
export default function ProjectCaseStudy({ project }) {
  const revealRef = useReveal();
  const id = `project-${project.slug}`;
  const status = project.status ? PROJECT_STATUSES[project.status] : null;
  const { architecture, thumbnail } = project;

  return (
    <article id={id} ref={revealRef} aria-labelledby={`${id}-title`} className={styles.study}>
      <div className={styles.meta}>
        {status && <Badge tone={status.tone}>{status.label}</Badge>}
        {project.category && <span>{project.category}</span>}
        {project.year && <span>{project.year}</span>}
      </div>
      <h3 id={`${id}-title`} className={styles.title}>
        {project.title}
      </h3>
      <p className={styles.lead}>{project.summary}</p>

      {(project.repoUrl || project.demoUrl) && (
        <div className={styles.actions}>
          {project.demoUrl && (
            <LinkButton href={project.demoUrl} newTab size="lg">
              Live demo
            </LinkButton>
          )}
          {project.repoUrl && (
            <LinkButton href={project.repoUrl} newTab variant="secondary" size="lg">
              GitHub repository
            </LinkButton>
          )}
        </div>
      )}

      {thumbnail && (
        <img
          className={styles.cover}
          src={thumbnail.url}
          alt={thumbnail.alt}
          width={thumbnail.width ?? 1280}
          height={thumbnail.height ?? 720}
          loading="lazy"
          decoding="async"
        />
      )}

      <div className={styles.sections}>
        <TextSection
          headingAs="h4"
          title="Overview"
          paragraphs={splitParagraphs(project.description)}
        />
        <TextSection headingAs="h4" title="Problem" paragraphs={splitParagraphs(project.problem)} />
        <TextSection
          headingAs="h4"
          title="Solution"
          paragraphs={splitParagraphs(project.solution)}
        />
        <TextSection headingAs="h4" title="Features" items={project.features} />

        {project.technologies.length > 0 && (
          <section aria-labelledby={`${id}-stack`}>
            <h4 id={`${id}-stack`} className={styles.heading}>
              Technology stack
            </h4>
            {/* eslint-disable-next-line jsx-a11y/no-redundant-roles */}
            <ul role="list" className={styles.tags}>
              {project.technologies.map((name) => (
                <li key={name}>
                  <Tag>{name}</Tag>
                </li>
              ))}
            </ul>
          </section>
        )}

        {architecture && (
          <section aria-labelledby={`${id}-architecture`} className={styles.architecture}>
            <h4 id={`${id}-architecture`} className={styles.heading}>
              Architecture
            </h4>
            {splitParagraphs(architecture.description).map((paragraph) => (
              <p key={paragraph} className={styles.prose}>
                {paragraph}
              </p>
            ))}
            <ArchitectureDiagram layers={architecture.layers} />
          </section>
        )}

        <TextSection
          headingAs="h4"
          title="Challenges"
          paragraphs={splitParagraphs(project.challenges)}
        />
        <TextSection
          headingAs="h4"
          title="Lessons learned"
          paragraphs={splitParagraphs(project.lessons)}
        />
        {project.screenshots.length > 0 && <Screenshots id={id} shots={project.screenshots} />}
      </div>
    </article>
  );
}
