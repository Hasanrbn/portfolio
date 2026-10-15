import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import projectsData from '@portfolio/shared/data/projects.json';
import App from '../src/app/App.jsx';
import ThemeProvider from '../src/app/ThemeProvider.jsx';
import ArchitectureDiagram from '../src/components/sections/ArchitectureDiagram.jsx';
import ProjectCard from '../src/components/sections/ProjectCard.jsx';
import {
  filterProjects,
  getFilterOptions,
  getProjectBySlug,
  getProjects,
  normalizeProjects,
} from '../src/services/projectsService.js';

vi.mock('../src/services/projectsService.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getProjects: vi.fn(actual.getProjects),
    getProjectBySlug: vi.fn(actual.getProjectBySlug),
  };
});

const realGetProjects = getProjects.getMockImplementation();
const realGetProjectBySlug = getProjectBySlug.getMockImplementation();

function makeProjects(entries) {
  return normalizeProjects({
    projects: entries.map((entry, index) => ({
      slug: `project-${index + 1}`,
      title: `Project ${index + 1}`,
      summary: `Summary ${index + 1}`,
      ...entry,
    })),
  });
}

// One project written for these tests, so they do not change when the real projects do.
const ONE = () =>
  makeProjects([
    {
      slug: 'portfolio-website',
      title: 'Portfolio Website',
      category: 'Full-Stack',
      status: 'in_progress',
      year: 2026,
    },
  ]);

const THREE = () =>
  makeProjects([
    { title: 'Shop', category: 'Web', technologies: ['React', 'Express'], sortOrder: 1 },
    { title: 'Chat', category: 'Web', technologies: ['Node.js'], sortOrder: 2 },
    { title: 'Scanner', category: 'Tools', technologies: ['Linux', 'React'], sortOrder: 3 },
  ]);

function renderAt(path) {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

const main = () => screen.getByRole('main');
const cardTitles = () =>
  within(main())
    .queryAllByRole('listitem')
    .flatMap((item) => within(item).queryAllByRole('heading', { level: 2 }))
    .map((heading) => heading.textContent);

beforeEach(() => {
  getProjects.mockReset().mockImplementation(realGetProjects);
  getProjectBySlug.mockReset().mockImplementation(realGetProjectBySlug);
});

describe('projects page with a single project', () => {
  beforeEach(() => {
    getProjects.mockImplementation(async () => ONE());
  });

  it('lists the project with a link to its page, and no filters for a single project', async () => {
    renderAt('/projects');

    expect(screen.getByRole('heading', { level: 1, name: 'Projects' })).toBeInTheDocument();
    const link = await screen.findByRole('link', { name: 'Portfolio Website' });
    expect(link).toHaveAttribute('href', '/projects/portfolio-website');
    expect(screen.queryByRole('search')).toBeNull();
  });

  it('shows status, category and year as text, and no links that are not set', async () => {
    renderAt('/projects');
    await screen.findByRole('link', { name: 'Portfolio Website' });
    const card = screen.getByRole('heading', { level: 2, name: 'Portfolio Website' }).closest('li');

    expect(card).toHaveTextContent('In progress');
    expect(card).toHaveTextContent('Full-Stack');
    expect(card).toHaveTextContent('2026');
    expect(within(card).queryByRole('link', { name: /github|live demo/i })).toBeNull();
  });
});

describe('projects page states', () => {
  beforeEach(() => {
    getProjects.mockImplementation(async () => ONE());
  });

  it('announces loading, then shows the projects', async () => {
    renderAt('/projects');

    expect(screen.getByRole('status')).toHaveTextContent('Loading projects');
    await screen.findByRole('link', { name: 'Portfolio Website' });
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('shows a friendly error and recovers on Try again', async () => {
    const user = userEvent.setup();
    getProjects.mockRejectedValueOnce(new Error('secret internal detail'));
    renderAt('/projects');

    const alert = await screen.findByRole('alert');
    expect(alert).not.toHaveTextContent('secret internal detail');
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('link', { name: 'Portfolio Website' })).toBeInTheDocument();
  });

  it('shows an empty state when there are no projects', async () => {
    getProjects.mockResolvedValue([]);
    renderAt('/projects');

    expect(await screen.findByRole('heading', { name: 'No projects yet' })).toBeInTheDocument();
  });
});

describe('filtering', () => {
  beforeEach(() => {
    getProjects.mockImplementation(async () => THREE());
  });

  it('shows the filters and every project when there are several', async () => {
    renderAt('/projects');
    await screen.findByRole('link', { name: 'Shop' });

    expect(screen.getByRole('search', { name: 'Filter projects' })).toBeInTheDocument();
    expect(cardTitles()).toEqual(['Shop', 'Chat', 'Scanner']);
    expect(screen.getByRole('status', { name: '' })).toHaveTextContent('3 projects');
  });

  it('narrows the list as you type and says how many are shown', async () => {
    const user = userEvent.setup();
    renderAt('/projects');
    await screen.findByRole('link', { name: 'Shop' });

    await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'react');

    expect(cardTitles()).toEqual(['Shop', 'Scanner']);
    expect(screen.getByRole('status')).toHaveTextContent('Showing 2 of 3 projects');
  });

  it('filters by category and by technology together', async () => {
    const user = userEvent.setup();
    renderAt('/projects');
    await screen.findByRole('link', { name: 'Shop' });

    await user.selectOptions(screen.getByRole('combobox', { name: 'Category' }), 'Web');
    expect(cardTitles()).toEqual(['Shop', 'Chat']);

    await user.selectOptions(screen.getByRole('combobox', { name: 'Technology' }), 'React');
    expect(cardTitles()).toEqual(['Shop']);
  });

  it('offers only categories and technologies that exist, sorted', async () => {
    renderAt('/projects');
    await screen.findByRole('link', { name: 'Shop' });

    const names = (label) =>
      within(screen.getByRole('combobox', { name: label }))
        .getAllByRole('option')
        .map((option) => option.textContent);
    expect(names('Category')).toEqual(['All categories', 'Tools', 'Web']);
    expect(names('Technology')).toEqual([
      'All technologies',
      'Express',
      'Linux',
      'Node.js',
      'React',
    ]);
  });

  it('starts from the filters in the address, so a filtered view can be shared', async () => {
    renderAt('/projects?tech=Linux');
    await screen.findByRole('link', { name: 'Scanner' });

    expect(cardTitles()).toEqual(['Scanner']);
    expect(screen.getByRole('combobox', { name: 'Technology' })).toHaveValue('Linux');
  });

  it('ignores a category or technology that does not exist', async () => {
    renderAt('/projects?category=Nope&tech=Nothing');
    await screen.findByRole('link', { name: 'Shop' });

    expect(cardTitles()).toEqual(['Shop', 'Chat', 'Scanner']);
  });

  it('explains when nothing matches and clears the filters from there', async () => {
    const user = userEvent.setup();
    renderAt('/projects');
    await screen.findByRole('link', { name: 'Shop' });

    await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'zzz');
    expect(screen.getByRole('heading', { name: 'No projects match' })).toBeInTheDocument();

    const empty = screen.getByRole('heading', { name: 'No projects match' }).parentElement;
    await user.click(within(empty).getByRole('button', { name: 'Clear filters' }));

    expect(cardTitles()).toEqual(['Shop', 'Chat', 'Scanner']);
    expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveValue('');
  });

  it('does not reload the page when Enter is pressed in the search box', async () => {
    const user = userEvent.setup();
    renderAt('/projects');
    await screen.findByRole('link', { name: 'Shop' });

    await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'chat{Enter}');

    expect(cardTitles()).toEqual(['Chat']);
  });
});

describe('project detail page', () => {
  it('shows the written sections in order and leaves out the empty ones', async () => {
    renderAt('/projects/portfolio-website');

    await screen.findByRole('heading', { level: 2, name: 'Overview' });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Portfolio Website');
    const headings = within(main())
      .getAllByRole('heading', { level: 2 })
      .map((heading) => heading.textContent);
    expect(headings).toEqual([
      'Overview',
      'Problem',
      'Solution',
      'Features',
      'Technology stack',
      'Architecture',
    ]);
  });

  it('shows the architecture as Frontend, API, Backend, Database in order', async () => {
    renderAt('/projects/portfolio-website');

    const diagram = await screen.findByRole('list', { name: /layers/i });
    const names = within(diagram)
      .getAllByRole('listitem')
      .map((item) => item.querySelector('strong').textContent);
    expect(names).toEqual(['Frontend', 'API', 'Backend', 'Database']);
  });

  it('shows the title as the browser tab title', async () => {
    renderAt('/projects/portfolio-website');
    await screen.findByRole('heading', { level: 2, name: 'Overview' });

    expect(document.title).toMatch(/^Portfolio Website \|/);
  });

  it('says so, with a way back, when there is no project at the address', async () => {
    renderAt('/projects/does-not-exist');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Project not found' }),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'Back to Projects' })).toHaveAttribute(
      'href',
      '/projects',
    );
  });

  it('opens from the list and moves focus to the heading', async () => {
    const user = userEvent.setup();
    renderAt('/projects');

    await user.click(await screen.findByRole('link', { name: 'Portfolio Website' }));

    const heading = await screen.findByRole('heading', { level: 1, name: 'Portfolio Website' });
    expect(heading).toHaveFocus();
    expect(screen.getByRole('link', { name: 'All projects' })).toHaveAttribute('href', '/projects');
  });

  it('shows links, picture, screenshots and extra sections when a project has them', async () => {
    getProjectBySlug.mockResolvedValue(
      makeProjects([
        {
          repoUrl: 'https://github.com/someone/repo',
          demoUrl: 'https://demo.example.org',
          thumbnail: { url: '/cover.png', alt: 'Home screen' },
          screenshots: [{ url: '/shot.png', alt: 'Login form', caption: 'Signing in' }],
          challenges: 'Hard part one.\n\nHard part two.',
          lessons: 'A lesson.',
        },
      ])[0],
    );
    renderAt('/projects/project-1');

    const repo = await screen.findByRole('link', { name: /GitHub repository/ });
    expect(repo).toHaveAttribute('href', 'https://github.com/someone/repo');
    expect(repo).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByRole('link', { name: /Live demo/ })).toHaveAttribute(
      'href',
      'https://demo.example.org',
    );
    expect(screen.getByRole('img', { name: 'Home screen' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Login form' })).toBeInTheDocument();
    expect(screen.getByText('Signing in')).toBeInTheDocument();
    expect(screen.getByText('Hard part two.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Lessons learned' })).toBeInTheDocument();
  });

  it('shows a friendly error and recovers on Try again', async () => {
    const user = userEvent.setup();
    getProjectBySlug.mockRejectedValueOnce(new Error('secret internal detail'));
    renderAt('/projects/portfolio-website');

    const alert = await screen.findByRole('alert');
    expect(alert).not.toHaveTextContent('secret internal detail');
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('heading', { level: 2, name: 'Overview' })).toBeInTheDocument();
  });
});

describe('ProjectCard', () => {
  const render1 = (entry) =>
    render(
      <MemoryRouter>
        <ul>
          <ProjectCard project={makeProjects([entry])[0]} />
        </ul>
      </MemoryRouter>,
    );

  it('keeps the GitHub and demo links separate from the card link, and names them', () => {
    render1({
      repoUrl: 'https://github.com/someone/repo',
      demoUrl: 'https://demo.example.org',
    });

    expect(
      screen.getByRole('link', { name: 'GitHub repository of Project 1 (opens in a new tab)' }),
    ).toHaveAttribute('target', '_blank');
    expect(
      screen.getByRole('link', { name: 'Live demo of Project 1 (opens in a new tab)' }),
    ).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByRole('link', { name: 'Project 1' })).toHaveAttribute(
      'href',
      '/projects/project-1',
    );
  });

  it('describes a picture with its alt text, or a default that names the project', () => {
    render1({ thumbnail: { url: '/cover.png' } });

    expect(screen.getByRole('img', { name: 'Preview of Project 1' })).toHaveAttribute(
      'loading',
      'lazy',
    );
  });

  describe('hover glow', () => {
    const cardOf = () => screen.getByRole('link', { name: 'Project 1' }).closest('li');

    it('follows the mouse inside the card', () => {
      render1({});

      fireEvent.pointerMove(cardOf(), { pointerType: 'mouse', clientX: 40, clientY: 25 });

      // jsdom lays nothing out, so the card sits at 0,0 and the values equal the mouse position.
      expect(cardOf().style.getPropertyValue('--glow-x')).toBe('40px');
      expect(cardOf().style.getPropertyValue('--glow-y')).toBe('25px');
    });

    it('ignores touch and pen, which have no hover', () => {
      render1({});

      fireEvent.pointerMove(cardOf(), { pointerType: 'touch', clientX: 40, clientY: 25 });
      fireEvent.pointerMove(cardOf(), { pointerType: 'pen', clientX: 40, clientY: 25 });

      expect(cardOf().style.getPropertyValue('--glow-x')).toBe('');
      expect(cardOf().style.getPropertyValue('--glow-y')).toBe('');
    });
  });
});

describe('ArchitectureDiagram', () => {
  it('renders nothing without layers', () => {
    const { container } = render(<ArchitectureDiagram layers={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});

describe('normalizeProjects', () => {
  const base = { title: 'T', summary: 'S' };

  it('drops unpublished projects, unsafe or repeated slugs and entries without title or summary', () => {
    const result = normalizeProjects({
      projects: [
        { ...base, slug: 'good' },
        { ...base, slug: 'hidden', published: false },
        { ...base, slug: 'Bad Slug' },
        { ...base, slug: '../etc' },
        { ...base, slug: 'good' },
        { slug: 'no-title', summary: 'S' },
        { slug: 'no-summary', title: 'T' },
        null,
      ],
    });

    expect(result.map((project) => project.slug)).toEqual(['good']);
  });

  it('keeps only https links and image addresses that are safe', () => {
    const [project] = normalizeProjects({
      projects: [
        {
          ...base,
          slug: 'links',
          repoUrl: 'javascript:alert(1)',
          demoUrl: 'http://plain.example.org',
          thumbnail: { url: 'data:image/svg+xml,<svg/>' },
          screenshots: [{ url: '/ok.png' }, { url: 'javascript:alert(1)' }],
        },
      ],
    });

    expect(project.repoUrl).toBeNull();
    expect(project.demoUrl).toBeNull();
    expect(project.thumbnail).toBeNull();
    expect(project.screenshots.map((shot) => shot.url)).toEqual(['/ok.png']);
  });

  it('sorts by sortOrder and ignores an unknown status', () => {
    const result = normalizeProjects({
      projects: [
        { ...base, slug: 'b', sortOrder: 2, status: 'done-ish' },
        { ...base, slug: 'a', sortOrder: 1, status: 'completed' },
      ],
    });

    expect(result.map((project) => project.slug)).toEqual(['a', 'b']);
    expect(result.map((project) => project.status)).toEqual(['completed', null]);
  });

  it('returns an empty list for missing or malformed data', () => {
    expect(normalizeProjects(undefined)).toEqual([]);
    expect(normalizeProjects({ projects: 'nope' })).toEqual([]);
  });

  it('accepts every project in the shipped data file', () => {
    expect(normalizeProjects(projectsData)).toHaveLength(projectsData.projects.length);
  });
});

describe('filterProjects and getFilterOptions', () => {
  it('matches text against title, summary and technologies, ignoring case', () => {
    const projects = THREE();

    expect(filterProjects(projects, { q: 'SHOP' }).map((p) => p.title)).toEqual(['Shop']);
    expect(filterProjects(projects, { q: 'summary 2' }).map((p) => p.title)).toEqual(['Chat']);
    expect(filterProjects(projects, { q: 'linux' }).map((p) => p.title)).toEqual(['Scanner']);
    expect(filterProjects(projects, { q: '   ' })).toHaveLength(3);
    expect(filterProjects(projects)).toHaveLength(3);
  });

  it('requires every given filter to match', () => {
    const projects = THREE();

    expect(filterProjects(projects, { category: 'Web', tech: 'Linux' })).toEqual([]);
  });

  it('lists each category and technology once, sorted', () => {
    expect(getFilterOptions(THREE())).toEqual({
      categories: ['Tools', 'Web'],
      technologies: ['Express', 'Linux', 'Node.js', 'React'],
    });
  });
});

describe('shipped projects data', () => {
  it('has unique slugs', () => {
    const slugs = projectsData.projects.map((project) => project.slug);

    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
