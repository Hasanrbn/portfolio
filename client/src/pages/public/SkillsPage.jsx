import PageTitle from '../../components/layout/PageTitle.jsx';
import SkillGroup from '../../components/sections/SkillGroup.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import useAsync from '../../hooks/useAsync.js';
import { getSkillGroups } from '../../services/skillsService.js';
import { SKILL_LEVELS } from '../../utils/skillLevels.js';
import styles from './SkillsPage.module.css';

function LoadingSkills() {
  return (
    <div aria-busy="true" className={styles.groups}>
      <p role="status" className="visually-hidden">
        Loading skills
      </p>
      {[0, 1, 2].map((index) => (
        <div key={index}>
          <Skeleton width="10rem" height="2rem" />
          <div className={styles.skeletonGrid}>
            <Skeleton height="4rem" radius="var(--radius-md)" />
            <Skeleton height="4rem" radius="var(--radius-md)" />
            <Skeleton height="4rem" radius="var(--radius-md)" />
          </div>
        </div>
      ))}
    </div>
  );
}

function LevelGuide() {
  return (
    <section aria-labelledby="levels-heading" className={styles.levels}>
      <h2 id="levels-heading" className={styles.levelsHeading}>
        What the levels mean
      </h2>
      <dl className={styles.levelList}>
        {Object.values(SKILL_LEVELS).map((level) => (
          <div key={level.label}>
            <dt>{level.label}</dt>
            <dd>{level.meaning}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default function SkillsPage() {
  const { status, data: groups, retry } = useAsync(getSkillGroups);
  const hasLevels = groups?.some((group) => group.skills.some((skill) => skill.level)) ?? false;

  return (
    <>
      <PageTitle title="Skills" />
      <h1>Skills</h1>
      <p className={styles.lead}>The technologies and tools I work with, grouped by area.</p>

      <div className={styles.body}>
        {status === 'loading' && <LoadingSkills />}

        {status === 'error' && (
          <ErrorState
            title="Skills could not be loaded."
            description="Please try again in a moment."
            onRetry={retry}
          />
        )}

        {status === 'success' && groups.length === 0 && (
          <EmptyState
            title="No skills yet"
            description="Skills will appear here once they are added."
          />
        )}

        {status === 'success' && groups.length > 0 && (
          <div className={styles.groups}>
            {groups.map((group) => (
              <SkillGroup key={group.id} group={group} />
            ))}
            {hasLevels && <LevelGuide />}
          </div>
        )}
      </div>
    </>
  );
}
