import Section from '../../components/layout/Section.jsx';
import AsyncView from '../../components/ui/AsyncView.jsx';
import useAsync from '../../hooks/useAsync.js';
import { getProjects } from '../../services/projectsService.js';
import ProjectCaseStudy from './ProjectCaseStudy.jsx';
import styles from './ProjectsSection.module.css';

export default function ProjectsSection() {
  const { status, data: projects, retry } = useAsync(getProjects);

  return (
    <Section
      id="projects"
      title="Projects"
      lead="Things I have built, and what I used to build them."
    >
      <AsyncView
        status={status}
        onRetry={retry}
        loadingLabel="Loading projects"
        errorTitle="Projects could not be loaded."
        isEmpty={status === 'success' && projects.length === 0}
        empty={{
          title: 'No projects yet',
          description: 'Projects will appear here once they are added.',
        }}
      >
        {() => (
          // eslint-disable-next-line jsx-a11y/no-redundant-roles
          <ol role="list" className={styles.list}>
            {projects.map((project) => (
              <li key={project.slug}>
                <ProjectCaseStudy project={project} />
              </li>
            ))}
          </ol>
        )}
      </AsyncView>
    </Section>
  );
}
