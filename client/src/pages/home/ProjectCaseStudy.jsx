import { useState } from 'react';
import ArchitectureDiagram from '../../components/sections/ArchitectureDiagram.jsx';
import BeforeAfter from '../../components/ui/BeforeAfter.jsx';
import BrowserFrame from '../../components/ui/BrowserFrame.jsx';
import { Laptop, Phone } from '../../components/ui/DeviceFrame.jsx';
import LinkButton from '../../components/ui/LinkButton.jsx';
import Lightbox from '../../components/ui/Lightbox.jsx';
import Tag from '../../components/ui/Tag.jsx';
import ZoomImage from '../../components/ui/ZoomImage.jsx';
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

/** A screenshot much taller than it is wide was taken on a phone, so it sits in a phone. */
const isPhoneShot = (picture) => picture.height / picture.width > 1.6;

/**
 * One project told as a case study, inline in the Projects section, laid out like a board of
 * sheets: the title, summary and facts beside the cover on a laptop (and a phone, when there is a
 * phone screenshot); the written parts; a before/after board when the project has one; and the
 * main pages as a grid of screens. The title is an h3 (the section title is the h2); parts are h4.
 */
export default function ProjectCaseStudy({ project, number }) {
  const revealRef = useReveal();
  // Index of the picture open in the viewer, or null while it is closed.
  const [viewing, setViewing] = useState(null);
  const id = `project-${project.slug}`;
  const status = project.status ? PROJECT_STATUSES[project.status] : null;
  const { architecture, thumbnail, screenshots, comparison } = project;

  // The viewer walks through the cover, the screenshots, then the old and new versions.
  const pictures = [thumbnail, ...screenshots, comparison?.before, comparison?.after].filter(
    Boolean,
  );
  const firstShot = thumbnail ? 1 : 0;
  const firstComparison = firstShot + screenshots.length;
  const openComparison = (side) => setViewing(firstComparison + (side === 'after' ? 1 : 0));

  // A phone screenshot stands next to the laptop in the cover, so it is not repeated below.
  const phoneShot = thumbnail ? screenshots.find(isPhoneShot) : undefined;
  const pages = screenshots
    .map((shot, index) => ({ shot, index }))
    .filter(({ shot }) => shot !== phoneShot);

  const facts = [
    project.category && ['Category', project.category],
    project.year && ['Year', String(project.year)],
    status && ['Status', status.label],
  ].filter(Boolean);

  return (
    <article id={id} ref={revealRef} aria-labelledby={`${id}-title`} className={styles.study}>
      <div className={styles.intro} data-cover={thumbnail ? 'true' : undefined}>
        <header className={styles.head}>
          <p className={styles.number} aria-hidden="true">
            {String(number).padStart(2, '0')}
          </p>
          <h3 id={`${id}-title`} className={styles.title}>
            {project.title}
          </h3>
          <p className={styles.lead}>{project.summary}</p>

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
            <Laptop>
              <ZoomImage fill priority picture={thumbnail} onOpen={() => setViewing(0)} />
            </Laptop>
            {phoneShot && (
              <Phone className={styles.phone}>
                <ZoomImage
                  fill
                  picture={phoneShot}
                  onOpen={() => setViewing(firstShot + screenshots.indexOf(phoneShot))}
                />
              </Phone>
            )}
          </div>
        )}
      </div>

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

        {comparison && (
          <div role="group" aria-labelledby={`${id}-comparison`} className={styles.wide}>
            <h4 id={`${id}-comparison`} className={styles.wideTitle}>
              Before &amp; after
            </h4>
            <BeforeAfter {...comparison} onOpen={openComparison} />
          </div>
        )}

        {pages.length > 0 && (
          <div role="group" aria-labelledby={`${id}-pages`} className={styles.wide}>
            <h4 id={`${id}-pages`} className={styles.wideTitle}>
              Main pages
            </h4>
            {/* eslint-disable-next-line jsx-a11y/no-redundant-roles */}
            <ul role="list" className={styles.pages}>
              {pages.map(({ shot, index }) => (
                <li key={shot.url} className={isPhoneShot(shot) ? styles.phoneItem : undefined}>
                  <figure className={styles.figure}>
                    {isPhoneShot(shot) ? (
                      <Phone>
                        <ZoomImage
                          fill
                          picture={shot}
                          onOpen={() => setViewing(firstShot + index)}
                        />
                      </Phone>
                    ) : (
                      <BrowserFrame>
                        <div className={styles.thumb}>
                          <ZoomImage
                            fill
                            picture={shot}
                            onOpen={() => setViewing(firstShot + index)}
                          />
                        </div>
                      </BrowserFrame>
                    )}
                    {shot.caption && <figcaption>{shot.caption}</figcaption>}
                  </figure>
                </li>
              ))}
            </ul>
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
