import Section from '../../components/layout/Section.jsx';
import Timeline from '../../components/sections/Timeline.jsx';
import AsyncView from '../../components/ui/AsyncView.jsx';
import useAsync from '../../hooks/useAsync.js';
import { getExperiences } from '../../services/experienceService.js';

export default function ExperienceSection() {
  const { status, data: experiences, retry } = useAsync(getExperiences);

  return (
    <Section
      id="experience"
      title="Experience"
      lead="Work, internships and projects where I applied what I know, newest first."
    >
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
    </Section>
  );
}
