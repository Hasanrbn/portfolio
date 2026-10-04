import Badge from '../ui/Badge.jsx';
import Tag from '../ui/Tag.jsx';
import { formatMonth } from '../../utils/dates.js';
import { EXPERIENCE_TYPES } from '../../utils/experienceTypes.js';
import { splitParagraphs } from '../../utils/text.js';
import styles from './TimelineItem.module.css';

/** One entry of the experience timeline. Everything except position and organization is optional. */
export default function TimelineItem({ experience, headingAs: Heading = 'h2' }) {
  const { startDate, endDate } = experience;

  return (
    <li className={styles.item}>
      <span className={styles.dot} aria-hidden="true" />
      <article className={styles.body}>
        <p className={styles.dates}>
          <time dateTime={startDate}>{formatMonth(startDate)}</time>
          {' – '}
          {endDate ? <time dateTime={endDate}>{formatMonth(endDate)}</time> : 'Present'}
        </p>
        <Heading className={styles.position}>{experience.position}</Heading>
        <p className={styles.organization}>
          {experience.organization}
          {experience.type && (
            <Badge className={styles.type}>{EXPERIENCE_TYPES[experience.type]}</Badge>
          )}
        </p>

        {splitParagraphs(experience.description).map((paragraph) => (
          <p key={paragraph} className={styles.description}>
            {paragraph}
          </p>
        ))}

        {experience.responsibilities.length > 0 && (
          <ul className={styles.responsibilities} aria-label="Responsibilities">
            {experience.responsibilities.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}

        {experience.technologies.length > 0 && (
          // eslint-disable-next-line jsx-a11y/no-redundant-roles
          <ul role="list" className={styles.tags} aria-label="Technologies">
            {experience.technologies.map((name) => (
              <li key={name}>
                <Tag>{name}</Tag>
              </li>
            ))}
          </ul>
        )}
      </article>
    </li>
  );
}
