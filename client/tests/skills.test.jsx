import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import skillsData from '@portfolio/shared/data/skills.json';
import App from '../src/app/App.jsx';
import ThemeProvider from '../src/app/ThemeProvider.jsx';
import SkillGroup from '../src/components/sections/SkillGroup.jsx';
import { getSkillGroups, normalizeSkillGroups } from '../src/services/skillsService.js';

vi.mock('../src/services/skillsService.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, getSkillGroups: vi.fn(actual.getSkillGroups) };
});

const realGetSkillGroups = getSkillGroups.getMockImplementation();

function renderSkillsPage() {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={['/skills']}>
        <App />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

beforeEach(() => {
  getSkillGroups.mockReset();
  getSkillGroups.mockImplementation(realGetSkillGroups);
});

describe('skills page', () => {
  it('shows every group under the page heading, in order', async () => {
    renderSkillsPage();

    expect(screen.getByRole('heading', { level: 1, name: 'Skills' })).toBeInTheDocument();
    await screen.findByRole('heading', { level: 2, name: 'Frontend' });

    const headings = within(screen.getByRole('main'))
      .getAllByRole('heading', { level: 2 })
      .map((node) => node.textContent);
    expect(headings).toEqual(skillsData.categories.map((category) => category.label));
  });

  it('lists every skill from the data file inside its group', async () => {
    renderSkillsPage();
    await screen.findByRole('heading', { level: 2, name: 'Frontend' });

    for (const category of skillsData.categories) {
      const group = screen.getByRole('region', { name: category.label });
      const names = within(group)
        .getAllByRole('listitem')
        .map((item) => item.textContent);
      expect(names).toEqual(category.skills.map((skill) => skill.name));
    }
  });

  it('claims no level and shows no level guide while none is set', async () => {
    renderSkillsPage();
    await screen.findByRole('heading', { level: 2, name: 'Frontend' });

    expect(screen.queryByText(/familiar|intermediate|advanced/i)).toBeNull();
    expect(screen.queryByText('What the levels mean')).toBeNull();
    expect(document.body.textContent).not.toMatch(/\d+\s?%/);
  });

  it('announces loading and then replaces it with the skills', async () => {
    renderSkillsPage();

    expect(screen.getByRole('status')).toHaveTextContent('Loading skills');
    await screen.findByRole('heading', { level: 2, name: 'Frontend' });
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('shows a friendly error and loads again after Try again', async () => {
    const user = userEvent.setup();
    getSkillGroups.mockRejectedValueOnce(new Error('secret internal detail'));
    renderSkillsPage();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Skills could not be loaded.');
    expect(alert).not.toHaveTextContent('secret internal detail');

    await user.click(screen.getByRole('button', { name: 'Try again' }));

    await screen.findByRole('heading', { level: 2, name: 'Frontend' });
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows an empty state when there are no skills', async () => {
    getSkillGroups.mockResolvedValue([]);
    renderSkillsPage();

    expect(await screen.findByRole('heading', { name: 'No skills yet' })).toBeInTheDocument();
  });

  it('explains the levels once at least one skill has one', async () => {
    getSkillGroups.mockResolvedValue([
      {
        id: 'frontend',
        label: 'Frontend',
        skills: [{ id: 'react', name: 'React', level: 'intermediate', description: '' }],
      },
    ]);
    renderSkillsPage();

    const guide = await screen.findByRole('region', { name: 'What the levels mean' });
    expect(
      within(guide)
        .getAllByRole('term')
        .map((node) => node.textContent),
    ).toEqual(['Familiar', 'Intermediate', 'Advanced']);
  });
});

describe('SkillGroup', () => {
  const group = {
    id: 'frontend',
    label: 'Frontend',
    skills: [
      { id: 'react', name: 'React', level: 'advanced', description: 'Used for this site.' },
      { id: 'css', name: 'CSS', level: null, description: '' },
    ],
  };

  it('shows level and description only for skills that have them', () => {
    render(<SkillGroup group={group} />);
    const [react, css] = screen.getAllByRole('listitem');

    expect(react).toHaveTextContent('React');
    expect(react).toHaveTextContent('Level: Advanced');
    expect(react).toHaveTextContent('Used for this site.');
    expect(css).toHaveTextContent(/^CSS$/);
  });

  it('copes with a category that has no icon of its own', () => {
    render(<SkillGroup group={{ ...group, id: 'something-new' }} />);

    expect(screen.getByRole('heading', { name: 'Frontend' })).toBeInTheDocument();
  });
});

describe('normalizeSkillGroups', () => {
  it('drops incomplete entries, unknown levels and empty groups', async () => {
    const result = normalizeSkillGroups({
      categories: [
        {
          id: 'frontend',
          label: ' Frontend ',
          skills: [
            { id: 'react', name: ' React ', level: 'expert', description: '  ' },
            { id: 'css', name: 'CSS', level: 'familiar', description: ' Layout ' },
            { id: '', name: 'No id' },
            { id: 'nameless' },
            null,
          ],
        },
        { id: 'empty', label: 'Empty', skills: [] },
        { label: 'No id', skills: [{ id: 'x', name: 'X' }] },
      ],
    });

    expect(result).toEqual([
      {
        id: 'frontend',
        label: 'Frontend',
        skills: [
          { id: 'react', name: 'React', level: null, description: '' },
          { id: 'css', name: 'CSS', level: 'familiar', description: 'Layout' },
        ],
      },
    ]);
  });

  it('returns an empty list for missing or malformed data', () => {
    expect(normalizeSkillGroups(undefined)).toEqual([]);
    expect(normalizeSkillGroups({ categories: 'nope' })).toEqual([]);
  });

  it('accepts the shipped data file as it is', () => {
    const groups = normalizeSkillGroups(skillsData);

    expect(groups).toHaveLength(skillsData.categories.length);
    expect(groups.flatMap((group) => group.skills)).toHaveLength(
      skillsData.categories.flatMap((category) => category.skills).length,
    );
  });
});

describe('skills data file', () => {
  it('has unique skill ids across all categories', () => {
    const ids = skillsData.categories.flatMap((category) => category.skills.map((s) => s.id));

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('only uses the three known levels', () => {
    const levels = skillsData.categories.flatMap((category) =>
      category.skills.map((skill) => skill.level),
    );

    levels.forEach((level) =>
      expect([null, 'familiar', 'intermediate', 'advanced']).toContain(level),
    );
  });
});
