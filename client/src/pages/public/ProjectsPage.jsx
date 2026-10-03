import { useSearchParams } from 'react-router';
import PageTitle from '../../components/layout/PageTitle.jsx';
import ProjectCard from '../../components/sections/ProjectCard.jsx';
import ProjectFilters from '../../components/sections/ProjectFilters.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import useAsync from '../../hooks/useAsync.js';
import { filterProjects, getFilterOptions, getProjects } from '../../services/projectsService.js';
import styles from './ProjectsPage.module.css';

// With one project there is nothing to narrow down, so the filters stay hidden.
const MIN_PROJECTS_FOR_FILTERS = 2;

function LoadingProjects() {
  return (
    <div aria-busy="true" className={styles.grid}>
      <p role="status" className="visually-hidden">
        Loading projects
      </p>
      {[0, 1].map((index) => (
        <div key={index}>
          <Skeleton height="9rem" radius="var(--radius-md)" />
        </div>
      ))}
    </div>
  );
}

function resultText(shown, total) {
  if (shown === total) {
    return `${total} ${total === 1 ? 'project' : 'projects'}`;
  }
  return `Showing ${shown} of ${total} ${total === 1 ? 'project' : 'projects'}`;
}

export default function ProjectsPage() {
  const { status, data: projects, retry } = useAsync(getProjects);
  const [searchParams, setSearchParams] = useSearchParams();

  const showFilters = status === 'success' && projects.length >= MIN_PROJECTS_FOR_FILTERS;
  const options = showFilters ? getFilterOptions(projects) : { categories: [], technologies: [] };

  // Values come from the address, so they can be anything. A category or technology that does
  // not exist is ignored instead of hiding every project.
  const requested = {
    q: searchParams.get('q') ?? '',
    category: searchParams.get('category') ?? '',
    tech: searchParams.get('tech') ?? '',
  };
  const values = {
    q: requested.q,
    category: options.categories.includes(requested.category) ? requested.category : '',
    tech: options.technologies.includes(requested.tech) ? requested.tech : '',
  };

  function changeFilter(name, value) {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(name, value);
    } else {
      next.delete(name);
    }
    // Replace, so each keystroke does not add a history entry the Back button has to undo.
    setSearchParams(next, { replace: true });
  }

  function clearFilters() {
    setSearchParams(new URLSearchParams(), { replace: true });
  }

  const visible =
    status === 'success' ? (showFilters ? filterProjects(projects, values) : projects) : [];

  return (
    <>
      <PageTitle title="Projects" />
      <h1>Projects</h1>
      <p className={styles.lead}>Things I have built, and what I used to build them.</p>

      <div className={styles.body}>
        {status === 'loading' && <LoadingProjects />}

        {status === 'error' && (
          <ErrorState
            title="Projects could not be loaded."
            description="Please try again in a moment."
            onRetry={retry}
          />
        )}

        {status === 'success' && projects.length === 0 && (
          <EmptyState
            title="No projects yet"
            description="Projects will appear here once they are added."
          />
        )}

        {status === 'success' && projects.length > 0 && (
          <div className={styles.content}>
            {showFilters && (
              <ProjectFilters
                values={values}
                categories={options.categories}
                technologies={options.technologies}
                onChange={changeFilter}
                onClear={clearFilters}
                resultText={resultText(visible.length, projects.length)}
              />
            )}

            {visible.length > 0 ? (
              // eslint-disable-next-line jsx-a11y/no-redundant-roles
              <ul role="list" className={styles.grid}>
                {visible.map((project) => (
                  <ProjectCard key={project.slug} project={project} />
                ))}
              </ul>
            ) : (
              <EmptyState
                title="No projects match"
                description="Try a different search or remove a filter."
                action={<Button onClick={clearFilters}>Clear filters</Button>}
              />
            )}
          </div>
        )}
      </div>
    </>
  );
}
