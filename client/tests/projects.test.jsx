import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import projectsData from '@portfolio/shared/data/projects.json';
import ArchitectureDiagram from '../src/components/sections/ArchitectureDiagram.jsx';
import { getProjects, normalizeProjects } from '../src/services/projectsService.js';
import { getSection, renderSite } from './helpers/renderSite.jsx';

vi.mock('../src/services/projectsService.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, getProjects: vi.fn(actual.getProjects) };
});

const realGetProjects = getProjects.getMockImplementation();

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
      description: 'What it is.',
      problem: 'The problem.',
      solution: 'The solution.',
      features: ['Fast'],
      technologies: ['React'],
      architecture: {
        description: 'Layers.',
        layers: [
          { name: 'Frontend', detail: 'React' },
          { name: 'API', detail: 'Express' },
          { name: 'Backend', detail: 'Node' },
          { name: 'Database', detail: 'PostgreSQL' },
        ],
      },
    },
  ]);

const TWO = () =>
  makeProjects([
    { title: 'Shop', sortOrder: 1 },
    { title: 'Chat', sortOrder: 2 },
  ]);

const renderProjects = () => renderSite('/');
const section = () => getSection('Projects');
const study = (name) => within(section()).getByRole('article', { name });

beforeEach(() => {
  getProjects.mockReset().mockImplementation(realGetProjects);
});

describe('projects section', () => {
  beforeEach(() => {
    getProjects.mockImplementation(async () => ONE());
  });

  it('has its own heading and tells each project as an article under an h3', async () => {
    renderProjects();

    expect(screen.getByRole('heading', { level: 2, name: 'Projects' })).toBeInTheDocument();
    const article = await within(section()).findByRole('article', { name: 'Portfolio Website' });
    expect(within(article).getByRole('heading', { level: 3 })).toHaveTextContent(
      'Portfolio Website',
    );
    expect(article).toHaveAttribute('id', 'project-portfolio-website');
  });

  it('shows status, category and year as text, and no links that are not set', async () => {
    renderProjects();
    const article = await within(section()).findByRole('article', { name: 'Portfolio Website' });

    expect(article).toHaveTextContent('In progress');
    expect(article).toHaveTextContent('Full-Stack');
    expect(article).toHaveTextContent('2026');
    expect(within(article).queryByRole('link', { name: /github|live demo/i })).toBeNull();
  });

  it('shows the written parts in order, under h4 headings, and leaves out the empty ones', async () => {
    renderProjects();
    const article = await within(section()).findByRole('article', { name: 'Portfolio Website' });

    const headings = within(article)
      .getAllByRole('heading', { level: 4 })
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
    renderProjects();

    const diagram = await within(section()).findByRole('list', { name: /layers/i });
    const names = within(diagram)
      .getAllByRole('listitem')
      .map((item) => item.querySelector('strong').textContent);
    expect(names).toEqual(['Frontend', 'API', 'Backend', 'Database']);
  });

  it('shows every project one after another, in order, with no filters', async () => {
    getProjects.mockImplementation(async () => TWO());
    renderProjects();

    await within(section()).findByRole('article', { name: 'Shop' });
    const titles = within(section())
      .getAllByRole('article')
      .map((article) => within(article).getByRole('heading', { level: 3 }).textContent);
    expect(titles).toEqual(['Shop', 'Chat']);
    expect(within(section()).queryByRole('search')).toBeNull();
  });

  it('shows links, picture, screenshots and extra parts when a project has them', async () => {
    getProjects.mockImplementation(async () =>
      makeProjects([
        {
          title: 'Full',
          repoUrl: 'https://github.com/someone/repo',
          demoUrl: 'https://demo.example.org',
          thumbnail: { url: '/cover.png', alt: 'Home screen' },
          screenshots: [{ url: '/shot.png', alt: 'Login form', caption: 'Signing in' }],
          challenges: 'Hard part one.\n\nHard part two.',
          lessons: 'A lesson.',
        },
      ]),
    );
    renderProjects();
    const article = await within(section()).findByRole('article', { name: 'Full' });

    const repo = within(article).getByRole('link', { name: /GitHub repository/ });
    expect(repo).toHaveAttribute('href', 'https://github.com/someone/repo');
    expect(repo).toHaveAttribute('rel', 'noopener noreferrer');
    expect(within(article).getByRole('link', { name: /Live demo/ })).toHaveAttribute(
      'href',
      'https://demo.example.org',
    );
    expect(within(article).getByRole('img', { name: 'Home screen' })).toBeInTheDocument();
    expect(within(article).getByRole('img', { name: 'Login form' })).toBeInTheDocument();
    expect(within(article).getByText('Signing in')).toBeInTheDocument();
    expect(within(article).getByText('Hard part two.')).toBeInTheDocument();
    expect(
      within(article).getByRole('heading', { level: 4, name: 'Lessons learned' }),
    ).toBeInTheDocument();
  });

  it('names the sub-headings of different projects apart (no repeated ids)', async () => {
    getProjects.mockImplementation(async () =>
      makeProjects([
        { title: 'A', technologies: ['React'], screenshots: [{ url: '/a.png', alt: 'A shot' }] },
        { title: 'B', technologies: ['Vite'], screenshots: [{ url: '/b.png', alt: 'B shot' }] },
      ]),
    );
    renderProjects();
    await within(section()).findByRole('article', { name: 'B' });

    const ids = [...section().querySelectorAll('[id]')].map((element) => element.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(
      within(study('A')).getByRole('region', { name: 'Technology stack' }),
    ).toBeInTheDocument();
  });
});

describe('projects section states', () => {
  beforeEach(() => {
    getProjects.mockImplementation(async () => ONE());
  });

  it('announces loading, then shows the projects', async () => {
    renderProjects();

    expect(within(section()).getByRole('status')).toHaveTextContent('Loading projects');
    await within(section()).findByRole('article', { name: 'Portfolio Website' });
    expect(within(section()).queryByRole('status')).toBeNull();
  });

  it('shows a friendly error and recovers on Try again', async () => {
    const user = userEvent.setup();
    getProjects.mockRejectedValueOnce(new Error('secret internal detail'));
    renderProjects();

    const alert = await screen.findByRole('alert');
    expect(alert).not.toHaveTextContent('secret internal detail');
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(
      await within(section()).findByRole('article', { name: 'Portfolio Website' }),
    ).toBeInTheDocument();
  });

  it('shows an empty state when there are no projects', async () => {
    getProjects.mockResolvedValue([]);
    renderProjects();

    expect(await screen.findByRole('heading', { name: 'No projects yet' })).toBeInTheDocument();
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

describe('shipped projects data', () => {
  it('has unique slugs', () => {
    const slugs = projectsData.projects.map((project) => project.slug);

    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
