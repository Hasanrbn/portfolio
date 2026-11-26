import { useState } from 'react';
import ArchitectureDiagram from '../../components/sections/ArchitectureDiagram.jsx';
import BeforeAfter from '../../components/ui/BeforeAfter.jsx';
import BrowserFrame from '../../components/ui/BrowserFrame.jsx';
import Icon from '../../components/ui/Icon.jsx';
import LinkButton from '../../components/ui/LinkButton.jsx';
import Lightbox from '../../components/ui/Lightbox.jsx';
import Tag from '../../components/ui/Tag.jsx';
import useReveal from '../../hooks/useReveal.js';
import { PROJECT_STATUSES } from '../../utils/projectStatus.js';
import { splitParagraphs } from '../../utils/text.js';
import styles from './ProjectCaseStudy.module.css';

/** A titled part of the case study: the title on the left on wide screens, the text beside it. */
function Block({ id, title, children }) {
  return (
    <div role="group" aria-labelledby={id} className={styles.block}>
      <h4 id={id} className={styles.blockTitle}>
        {title}
      </h4>
      <div className={styles.blockBody}>{children}</div>
    </div>
  );
}

function Paragraphs({ text }) {
  return splitParagraphs(text).map((paragraph) => <p key={paragraph}>{paragraph}</p>);
}

/** A picture that opens in the full-screen viewer. The button's name is the picture's description. */
function ZoomImage({ picture, onOpen, priority = false }) {
  return (
    <button
      type="button"
      className={styles.zoom}
      onClick={onOpen}
      aria-haspopup="dialog"
      aria-label={`Enlarge: ${picture.alt}`}
    >
      <img
        src={picture.url}
        alt={picture.alt}
        width={picture.width ?? undefined}
        height={picture.height ?? undefined}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
      />
      <span className={styles.zoomIcon} aria-hidden="true">
        <Icon name="maximize" size={18} />
      </span>
    </button>
  );
}

function hostOf(url) {
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
}

/**
 * One project told as a case study, inline in the Projects section: a large title, the cover in
 * a browser frame, the facts, the written parts, then the screenshots and (when the project has
 * one) a before/after slider. The title is an h3 (the section title is the h2); the parts are h4.
 */
export default function ProjectCaseStudy({ project, number }) {
  const revealRef = useReveal();
  // Index of the picture open in the viewer, or null while it is closed.
  const [viewing, setViewing] = useState(null);
  const id = `project-${project.slug}`;
  const status = project.status ? PROJECT_STATUSES[project.status] : null;
  const { architecture, thumbnail, screenshots, comparison } = project;

  // The cover is the first picture in the viewer, followed by the screenshots.
  const pictures = [thumbnail, ...screenshots].filter(Boolean);
  const firstShot = thumbnail ? 1 : 0;
  const facts = [
    project.category && ['Category', project.category],
    project.year && ['Year', String(project.year)],
    status && ['Status', status.label],
  ].filter(Boolean);

  return (
    <article id={id} ref={revealRef} aria-labelledby={`${id}-title`} className={styles.study}>
      <header className={styles.head}>
        <p className={styles.number} aria-hidden="true">
          {String(number).padStart(2, '0')}
        </p>
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
      </header>

      {thumbnail && (
        <div className={styles.cover}>
          <BrowserFrame address={hostOf(project.demoUrl)}>
            <ZoomImage picture={thumbnail} onOpen={() => setViewing(0)} />
          </BrowserFrame>
        </div>
      )}

      {facts.length > 0 && (
        <dl className={styles.facts}>
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className={styles.sections}>
        {project.description && (
          <Block id={`${id}-overview`} title="Overview">
            <Paragraphs text={project.description} />
          </Block>
        )}
        {project.problem && (
          <Block id={`${id}-problem`} title="Problem">
            <Paragraphs text={project.problem} />
          </Block>
        )}
        {project.solution && (
          <Block id={`${id}-solution`} title="Solution">
            <Paragraphs text={project.solution} />
          </Block>
        )}
        {project.features.length > 0 && (
          <Block id={`${id}-features`} title="Features">
            <ul className={styles.list}>
              {project.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </Block>
        )}

        {project.technologies.length > 0 && (
          <Block id={`${id}-stack`} title="Technology stack">
            {/* eslint-disable-next-line jsx-a11y/no-redundant-roles */}
            <ul role="list" className={styles.tags}>
              {project.technologies.map((name) => (
                <li key={name}>
                  <Tag>{name}</Tag>
                </li>
              ))}
            </ul>
          </Block>
        )}

        {architecture && (
          <Block id={`${id}-architecture`} title="Architecture">
            <Paragraphs text={architecture.description} />
            <ArchitectureDiagram layers={architecture.layers} />
          </Block>
        )}

        {project.challenges && (
          <Block id={`${id}-challenges`} title="Challenges">
            <Paragraphs text={project.challenges} />
          </Block>
        )}
        {project.lessons && (
          <Block id={`${id}-lessons`} title="Lessons learned">
            <Paragraphs text={project.lessons} />
          </Block>
        )}

        {screenshots.length > 0 && (
          <div role="group" aria-labelledby={`${id}-screenshots`} className={styles.wide}>
            <h4 id={`${id}-screenshots`} className={styles.wideTitle}>
              Screenshots
            </h4>
            {/* eslint-disable-next-line jsx-a11y/no-redundant-roles */}
            <ul role="list" className={styles.shots}>
              {screenshots.map((shot, shotIndex) => (
                <li
                  key={shot.url}
                  className={shot.height > shot.width ? styles.portrait : undefined}
                >
                  <figure className={styles.figure}>
                    <BrowserFrame>
                      <ZoomImage picture={shot} onOpen={() => setViewing(firstShot + shotIndex)} />
                    </BrowserFrame>
                    {shot.caption && <figcaption>{shot.caption}</figcaption>}
                  </figure>
                </li>
              ))}
            </ul>
          </div>
        )}

        {comparison && (
          <div role="group" aria-labelledby={`${id}-comparison`} className={styles.wide}>
            <h4 id={`${id}-comparison`} className={styles.wideTitle}>
              Before &amp; after
            </h4>
            <BeforeAfter {...comparison} />
          </div>
        )}
      </div>

      {viewing !== null && (
        <Lightbox
          images={pictures}
          index={viewing}
          onIndexChange={setViewing}
          onClose={() => setViewing(null)}
        />
      )}
    </article>
  );
}
