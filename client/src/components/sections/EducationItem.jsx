import Card from '../ui/Card.jsx';
import Tag from '../ui/Tag.jsx';
import useReveal from '../../hooks/useReveal.js';
import styles from './EducationItem.module.css';

/** One education entry. Relevant subjects and achievements are shown only when there are some. */
export default function EducationItem({ education, headingAs: Heading = 'h2' }) {
  const revealRef = useReveal();
  const { startYear, endYear } = education;

  return (
    <Card as="li" ref={revealRef} className={styles.card}>
      <p className={styles.years}>
        {startYear} – {endYear ?? 'Present'}
      </p>
      <Heading className={styles.program}>{education.program}</Heading>
      <p className={styles.institution}>{education.institution}</p>

      {education.subjects.length > 0 && (
        <div className={styles.group}>
          <p className={styles.label}>Relevant subjects</p>
          {/* eslint-disable-next-line jsx-a11y/no-redundant-roles */}
          <ul role="list" className={styles.tags} aria-label="Relevant subjects">
            {education.subjects.map((subject) => (
              <li key={subject}>
                <Tag>{subject}</Tag>
              </li>
            ))}
          </ul>
        </div>
      )}

      {education.achievements.length > 0 && (
        <div className={styles.group}>
          <p className={styles.label}>Achievements</p>
          <ul className={styles.achievements} aria-label="Achievements">
            {education.achievements.map((achievement) => (
              <li key={achievement}>{achievement}</li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
