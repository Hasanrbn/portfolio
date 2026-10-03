import siteConfig from '@portfolio/shared/siteConfig.json';
import aboutData from '@portfolio/shared/data/about.json';
import PageTitle from '../../components/layout/PageTitle.jsx';
import TextSection from '../../components/sections/TextSection.jsx';
import Avatar from '../../components/sections/Avatar.jsx';
import Tag from '../../components/ui/Tag.jsx';
import { getAvatarSource } from '../../utils/profile.js';
import styles from './AboutPage.module.css';

const avatarSrc = getAvatarSource(siteConfig.avatar);
const highlights = (aboutData.highlights ?? []).filter(
  (item) => typeof item === 'string' && item.trim() !== '',
);

export default function AboutPage() {
  return (
    <>
      <PageTitle title="About" />
      <div className={styles.page}>
        <div className={styles.intro}>
          <div className={styles.text}>
            <h1>About me</h1>
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

        {highlights.length > 0 && (
          <section aria-labelledby="highlights-heading">
            <h2 id="highlights-heading" className={styles.heading}>
              Personal highlights
            </h2>
            {/* eslint-disable-next-line jsx-a11y/no-redundant-roles */}
            <ul role="list" className={styles.highlights}>
              {highlights.map((item) => (
                <li key={item}>
                  <Tag>{item}</Tag>
                </li>
              ))}
            </ul>
          </section>
        )}

        {(aboutData.sections ?? []).map((section) => (
          <TextSection
            key={section.id}
            title={section.title}
            paragraphs={section.paragraphs}
            items={section.items}
          />
        ))}
      </div>
    </>
  );
}
