import { useCallback } from 'react';
import { Link, useParams } from 'react-router';
import PageTitle from '../../components/layout/PageTitle.jsx';
import ArchitectureDiagram from '../../components/sections/ArchitectureDiagram.jsx';
import TextSection from '../../components/sections/TextSection.jsx';
import Badge from '../../components/ui/Badge.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import Icon from '../../components/ui/Icon.jsx';
import LinkButton from '../../components/ui/LinkButton.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import Tag from '../../components/ui/Tag.jsx';
import useAsync from '../../hooks/useAsync.js';
import { getProjectBySlug } from '../../services/projectsService.js';
import { PROJECT_STATUSES } from '../../utils/projectStatus.js';
import { splitParagraphs } from '../../utils/text.js';
import styles from './ProjectDetailPage.module.css';

function Screenshots({ shots }) {
  return (
    <section aria-labelledby="screenshots-heading">
      <h2 id="screenshots-heading" className={styles.heading}>
        Screenshots
      </h2>
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

function ProjectBody({ project }) {
  const status = project.status ? PROJECT_STATUSES[project.status] : null;
  const { architecture, thumbnail } = project;

  return (
    <>
      <PageTitle title={project.title} />
      <div className={styles.meta}>
        {status && <Badge tone={status.tone}>{status.label}</Badge>}
        {project.category && <span>{project.category}</span>}
        {project.year && <span>{project.year}</span>}
      </div>
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
          decoding="async"
        />
      )}

      <div className={styles.sections}>
        <TextSection title="Overview" paragraphs={splitParagraphs(project.description)} />
        <TextSection title="Problem" paragraphs={splitParagraphs(project.problem)} />
        <TextSection title="Solution" paragraphs={splitParagraphs(project.solution)} />
        <TextSection title="Features" items={project.features} />

        {project.technologies.length > 0 && (
          <section aria-labelledby="stack-heading">
            <h2 id="stack-heading" className={styles.heading}>
              Technology stack
            </h2>
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
          <section aria-labelledby="architecture-heading" className={styles.architecture}>
            <h2 id="architecture-heading" className={styles.heading}>
              Architecture
            </h2>
            {splitParagraphs(architecture.description).map((paragraph) => (
              <p key={paragraph} className={styles.prose}>
                {paragraph}
              </p>
            ))}
            <ArchitectureDiagram layers={architecture.layers} />
          </section>
        )}

        <TextSection title="Challenges" paragraphs={splitParagraphs(project.challenges)} />
        <TextSection title="Lessons learned" paragraphs={splitParagraphs(project.lessons)} />
        {project.screenshots.length > 0 && <Screenshots shots={project.screenshots} />}
      </div>
    </>
  );
}

export default function ProjectDetailPage() {
  const { slug } = useParams();
  const load = useCallback(() => getProjectBySlug(slug), [slug]);
  const { status, data: project, retry } = useAsync(load);

  const notFound = status === 'success' && project === null;
  const heading =
    status === 'success'
      ? (project?.title ?? 'Project not found')
      : status === 'error'
        ? 'Project'
        : 'Loading project';

  return (
    <>
      <Link to="/projects" className={styles.back}>
        <Icon name="arrow-left" size={18} />
        All projects
      </Link>

      {/* One h1 in every state keeps the heading the router focuses after navigation in place. */}
      <h1 className={styles.title}>{heading}</h1>

      {status !== 'success' && <PageTitle title="Project" />}

      {status === 'loading' && (
        <div aria-busy="true" className={styles.loading}>
          <p role="status" className="visually-hidden">
            Loading project
          </p>
          <Skeleton lines={3} />
        </div>
      )}

      {status === 'error' && (
        <ErrorState
          title="This project could not be loaded."
          description="Please try again in a moment."
          onRetry={retry}
        />
      )}

      {notFound && (
        <>
          <PageTitle title="Project not found" />
          <p>There is no project at this address.</p>
          <p>
            <LinkButton to="/projects">Back to Projects</LinkButton>
          </p>
        </>
      )}

      {status === 'success' && project && <ProjectBody project={project} />}
    </>
  );
}
