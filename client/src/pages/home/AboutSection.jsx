import siteConfig from '@portfolio/shared/siteConfig.json';
import aboutData from '@portfolio/shared/data/about.json';
import Section from '../../components/layout/Section.jsx';
import Avatar from '../../components/sections/Avatar.jsx';
import Tag from '../../components/ui/Tag.jsx';
import useReveal from '../../hooks/useReveal.js';
import { getAvatarSource } from '../../utils/profile.js';
import styles from './AboutSection.module.css';

const clean = (list = []) => list.filter((item) => typeof item === 'string' && item.trim() !== '');
const highlights = clean(aboutData.highlights);

/** A small titled card: text, a bullet list, or tags. Renders nothing when it has no content. */
function InfoCard({ id, title, paragraphs = [], items = [], tags = [] }) {
  const revealRef = useReveal();
  const texts = clean(paragraphs);
  const points = clean(items);
  const labels = clean(tags);
  if (texts.length + points.length + labels.length === 0) return null;

  return (
    <section ref={revealRef} aria-labelledby={id} className={styles.card}>
      <h3 id={id} className={styles.cardTitle}>
        {title}
      </h3>
      {texts.map((text) => (
        <p key={text}>{text}</p>
      ))}
      {points.length > 0 && (
        <ul className={styles.list}>
          {points.map((text) => (
            <li key={text}>{text}</li>
          ))}
        </ul>
      )}
      {labels.length > 0 && (
        // eslint-disable-next-line jsx-a11y/no-redundant-roles
        <ul role="list" className={styles.tags}>
          {labels.map((text) => (
            <li key={text}>
              <Tag>{text}</Tag>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function AboutSection() {
  const avatarSrc = getAvatarSource(siteConfig.avatar);

  return (
    <Section id="about" title="About me" className={styles.page}>
      <div className={styles.intro}>
        <div className={styles.text}>
          <p className={styles.meta}>
            {siteConfig.role} · {siteConfig.location}
          </p>
          <p className={styles.lead}>{siteConfig.intro}</p>
          {(aboutData.paragraphs ?? []).map((text) => (
            <p key={text}>{text}</p>
          ))}
        </div>
        <Avatar name={siteConfig.name} src={avatarSrc} className={styles.avatar} />
      </div>

      <div className={styles.cards}>
        <InfoCard id="highlights-heading" title="Personal highlights" tags={highlights} />
        {(aboutData.sections ?? []).map((section) => (
          <InfoCard
            key={section.id}
            id={`about-${section.id}-heading`}
            title={section.title}
            paragraphs={section.paragraphs}
            items={section.items}
          />
        ))}
      </div>
    </Section>
  );
}
