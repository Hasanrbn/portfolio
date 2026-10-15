import { useId } from 'react';
import Badge from '../ui/Badge.jsx';
import Card from '../ui/Card.jsx';
import Icon from '../ui/Icon.jsx';
import SkillIcon from '../ui/SkillIcon.jsx';
import { SKILL_LEVELS } from '../../utils/skillLevels.js';
import styles from './SkillGroup.module.css';

const CATEGORY_ICONS = {
  frontend: 'layout',
  backend: 'server',
  database: 'database',
  tools: 'wrench',
};

/**
 * One category of skills (Frontend, Backend, ...). The level label and the description are
 * shown only for skills that have them, so nothing is claimed that has not been written down.
 * The logo (`skill.icon`, an SVG path) is shown only for skills that have one; the name is
 * always there as text.
 */
export default function SkillGroup({ group }) {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.heading}>
        <Icon name={CATEGORY_ICONS[group.id] ?? 'layers'} size={24} />
        {group.label}
      </h2>
      {/* eslint-disable-next-line jsx-a11y/no-redundant-roles */}
      <ul role="list" className={styles.list}>
        {group.skills.map((skill) => {
          const level = skill.level ? SKILL_LEVELS[skill.level] : null;

          return (
            <Card as="li" key={skill.id} className={styles.item}>
              <div className={styles.top}>
                <span className={styles.name}>
                  {skill.icon && <SkillIcon path={skill.icon} className={styles.icon} />}
                  {skill.name}
                </span>
                {level && (
                  <Badge tone={level.tone}>
                    <span className="visually-hidden">Level: </span>
                    {level.label}
                  </Badge>
                )}
              </div>
              {skill.description && <p className={styles.description}>{skill.description}</p>}
            </Card>
          );
        })}
      </ul>
    </section>
  );
}
