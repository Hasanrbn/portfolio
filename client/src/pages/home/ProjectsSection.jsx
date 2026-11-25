import { Link } from 'react-router';
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
      lead="Things I have built, told as short case studies: what the problem was, what I made and how."
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
          <>
            {projects.length > 1 && (
              <nav aria-label="Project index" className={styles.index}>
                {/* eslint-disable-next-line jsx-a11y/no-redundant-roles */}
                <ol role="list" className={styles.indexList}>
                  {projects.map((project, position) => (
                    <li key={project.slug}>
                      <Link to={`/#project-${project.slug}`} className={styles.indexLink}>
                        <span className={styles.indexNumber} aria-hidden="true">
                          {String(position + 1).padStart(2, '0')}
                        </span>
                        {project.title}
                      </Link>
                    </li>
                  ))}
                </ol>
              </nav>
            )}
            {/* eslint-disable-next-line jsx-a11y/no-redundant-roles */}
            <ol role="list" className={styles.list}>
              {projects.map((project, position) => (
                <li key={project.slug}>
                  <ProjectCaseStudy project={project} number={position + 1} />
                </li>
              ))}
            </ol>
          </>
        )}
      </AsyncView>
    </Section>
  );
}
