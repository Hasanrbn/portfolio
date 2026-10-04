import PageTitle from '../../components/layout/PageTitle.jsx';
import EducationItem from '../../components/sections/EducationItem.jsx';
import AsyncView from '../../components/ui/AsyncView.jsx';
import useAsync from '../../hooks/useAsync.js';
import { getEducation } from '../../services/educationService.js';
import styles from './ListPage.module.css';

export default function EducationPage() {
  const { status, data: education, retry } = useAsync(getEducation);

  return (
    <>
      <PageTitle title="Education" />
      <h1>Education</h1>
      <p className={styles.lead}>Where I have studied and what I focused on, newest first.</p>

      <div className={styles.body}>
        <AsyncView
          status={status}
          onRetry={retry}
          loadingLabel="Loading education"
          errorTitle="Education could not be loaded."
          isEmpty={status === 'success' && education.length === 0}
          empty={{
            title: 'No education listed yet',
            description: 'Education will appear here once it is added.',
          }}
        >
          {() => (
            // eslint-disable-next-line jsx-a11y/no-redundant-roles
            <ul role="list" className={styles.cards}>
              {education.map((entry) => (
                <EducationItem key={entry.id} education={entry} />
              ))}
            </ul>
          )}
        </AsyncView>
      </div>
    </>
  );
}
