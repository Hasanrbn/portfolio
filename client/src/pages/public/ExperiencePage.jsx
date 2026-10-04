import PageTitle from '../../components/layout/PageTitle.jsx';
import Timeline from '../../components/sections/Timeline.jsx';
import AsyncView from '../../components/ui/AsyncView.jsx';
import useAsync from '../../hooks/useAsync.js';
import { getExperiences } from '../../services/experienceService.js';
import styles from './ListPage.module.css';

export default function ExperiencePage() {
  const { status, data: experiences, retry } = useAsync(getExperiences);

  return (
    <>
      <PageTitle title="Experience" />
      <h1>Experience</h1>
      <p className={styles.lead}>
        Work, internships and projects where I applied what I know, newest first.
      </p>

      <div className={styles.body}>
        <AsyncView
          status={status}
          onRetry={retry}
          loadingLabel="Loading experience"
          errorTitle="Experience could not be loaded."
          isEmpty={status === 'success' && experiences.length === 0}
          empty={{
            title: 'No experience listed yet',
            description:
              'Experience, internships and personal projects will appear here once they are added.',
          }}
        >
          {() => <Timeline experiences={experiences} />}
        </AsyncView>
      </div>
    </>
  );
}
