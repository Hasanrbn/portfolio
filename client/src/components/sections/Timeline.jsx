import TimelineItem from './TimelineItem.jsx';
import styles from './Timeline.module.css';

/** Experience entries as a vertical timeline, newest first (the order of the list passed in). */
export default function Timeline({ experiences, headingAs }) {
  return (
    // eslint-disable-next-line jsx-a11y/no-redundant-roles
    <ol role="list" className={styles.timeline}>
      {experiences.map((experience) => (
        <TimelineItem key={experience.id} experience={experience} headingAs={headingAs} />
      ))}
    </ol>
  );
}
