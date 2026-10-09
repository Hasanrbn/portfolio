import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import educationData from '@portfolio/shared/data/education.json';
import experiencesData from '@portfolio/shared/data/experiences.json';
import App from '../src/app/App.jsx';
import ThemeProvider from '../src/app/ThemeProvider.jsx';
import AsyncView from '../src/components/ui/AsyncView.jsx';
import { getEducation, normalizeEducationList } from '../src/services/educationService.js';
import { getExperiences, normalizeExperiences } from '../src/services/experienceService.js';
import { formatMonth, isMonth } from '../src/utils/dates.js';

vi.mock('../src/services/experienceService.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, getExperiences: vi.fn(actual.getExperiences) };
});
vi.mock('../src/services/educationService.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, getEducation: vi.fn(actual.getEducation) };
});

const realGetExperiences = getExperiences.getMockImplementation();
const realGetEducation = getEducation.getMockImplementation();

function renderAt(path) {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

const experience = (overrides) => ({
  id: 'x',
  position: 'Developer',
  organization: 'Acme',
  startDate: '2024-01',
  ...overrides,
});
const study = (overrides) => ({
  id: 'e',
  institution: 'Uni',
  program: 'Computer Science',
  startYear: 2022,
  ...overrides,
});

beforeEach(() => {
  getExperiences.mockReset().mockImplementation(realGetExperiences);
  getEducation.mockReset().mockImplementation(realGetEducation);
});

describe('experience page', () => {
  it('shows an honest empty state while no experience has been added', async () => {
    getExperiences.mockResolvedValue([]);
    renderAt('/experience');

    expect(screen.getByRole('heading', { level: 1, name: 'Experience' })).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'No experience listed yet' }),
    ).toBeInTheDocument();
    expect(within(screen.getByRole('main')).queryByRole('list')).toBeNull();
  });

  it('announces loading before the content', async () => {
    getExperiences.mockResolvedValue([]);
    renderAt('/experience');

    expect(screen.getByRole('status')).toHaveTextContent('Loading experience');
    await screen.findByRole('heading', { name: 'No experience listed yet' });
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('shows a timeline, newest first, with dates, type and details', async () => {
    getExperiences.mockResolvedValue(
      normalizeExperiences({
        experiences: [
          experience({
            id: 'old',
            position: 'Intern',
            organization: 'Old Org',
            type: 'internship',
            startDate: '2023-06',
            endDate: '2023-08',
          }),
          experience({
            id: 'new',
            position: 'Developer',
            organization: 'New Org',
            type: 'personal',
            startDate: '2025-03',
            description: 'Built things.\n\nShipped them.',
            responsibilities: ['Wrote tests', 'Reviewed code'],
            technologies: ['React', 'Express'],
          }),
        ],
      }),
    );
    renderAt('/experience');

    const mainHeadings = await within(screen.getByRole('main')).findAllByRole('heading', {
      level: 2,
    });
    expect(mainHeadings.map((heading) => heading.textContent)).toEqual(['Developer', 'Intern']);

    const [current, past] = screen.getAllByRole('article');
    expect(current).toHaveTextContent('Mar 2025 – Present');
    expect(current).toHaveTextContent('New Org');
    expect(current).toHaveTextContent('Personal project');
    expect(current).toHaveTextContent('Shipped them.');
    expect(
      within(within(current).getByRole('list', { name: 'Responsibilities' }))
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Wrote tests', 'Reviewed code']);
    expect(within(current).getByRole('list', { name: 'Technologies' })).toHaveTextContent(
      'ReactExpress',
    );
    expect(past).toHaveTextContent('Jun 2023 – Aug 2023');
    expect(past.querySelector('time')).toHaveAttribute('datetime', '2023-06');
    expect(within(past).queryByRole('list')).toBeNull();
  });

  it('shows a friendly error and recovers on Try again', async () => {
    const user = userEvent.setup();
    getExperiences
      .mockRejectedValueOnce(new Error('secret internal detail'))
      .mockResolvedValueOnce([]);
    renderAt('/experience');

    const alert = await screen.findByRole('alert');
    expect(alert).not.toHaveTextContent('secret internal detail');
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('heading', { name: 'No experience listed yet' })).toBeVisible();
  });
});

describe('education page', () => {
  it('shows an honest empty state while no education has been added', async () => {
    getEducation.mockResolvedValue([]);
    renderAt('/education');

    expect(screen.getByRole('heading', { level: 1, name: 'Education' })).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'No education listed yet' }),
    ).toBeInTheDocument();
  });

  it('shows each entry with years, subjects and achievements', async () => {
    getEducation.mockResolvedValue(
      normalizeEducationList({
        education: [
          study({
            id: 'a',
            program: 'Diploma',
            institution: 'College',
            startYear: 2018,
            endYear: 2021,
          }),
          study({
            id: 'b',
            subjects: ['Algorithms', 'Databases'],
            achievements: ['Dean’s list'],
          }),
        ],
      }),
    );
    renderAt('/education');

    const headings = await within(screen.getByRole('main')).findAllByRole('heading', { level: 2 });
    expect(headings.map((heading) => heading.textContent)).toEqual(['Computer Science', 'Diploma']);

    const [current, finished] = screen
      .getAllByRole('listitem')
      .filter((item) => item.querySelector('h2'));
    expect(current).toHaveTextContent('2022 – Present');
    expect(current).toHaveTextContent('Uni');
    expect(within(current).getByRole('list', { name: 'Relevant subjects' })).toHaveTextContent(
      'AlgorithmsDatabases',
    );
    expect(within(current).getByRole('list', { name: 'Achievements' })).toHaveTextContent(
      'Dean’s list',
    );
    expect(finished).toHaveTextContent('2018 – 2021');
    expect(within(finished).queryByText('Relevant subjects')).toBeNull();
    expect(within(finished).queryByText('Achievements')).toBeNull();
  });

  it('shows a friendly error and recovers on Try again', async () => {
    const user = userEvent.setup();
    getEducation.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce([]);
    renderAt('/education');

    await screen.findByRole('alert');
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('heading', { name: 'No education listed yet' })).toBeVisible();
  });
});

describe('AsyncView', () => {
  const empty = { title: 'Nothing', description: 'Nothing here.' };

  it('only evaluates its content once the data is there', () => {
    const content = vi.fn(() => <p>content</p>);
    render(
      <AsyncView status="loading" loadingLabel="Loading it" empty={empty} isEmpty={false}>
        {content}
      </AsyncView>,
    );

    expect(content).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('Loading it');
  });

  it('shows the empty state or the content when loaded', () => {
    const { rerender } = render(
      <AsyncView status="success" empty={empty} isEmpty>
        {() => <p>content</p>}
      </AsyncView>,
    );
    expect(screen.getByRole('heading', { name: 'Nothing' })).toBeInTheDocument();

    rerender(
      <AsyncView status="success" empty={empty} isEmpty={false}>
        {() => <p>content</p>}
      </AsyncView>,
    );
    expect(screen.getByText('content')).toBeInTheDocument();
  });
});

describe('normalizeExperiences', () => {
  it('drops hidden entries, repeated ids and entries missing required fields', () => {
    const result = normalizeExperiences({
      experiences: [
        experience({ id: 'ok' }),
        experience({ id: 'hidden', visible: false }),
        experience({ id: 'ok' }),
        experience({ id: 'no-position', position: ' ' }),
        experience({ id: 'no-org', organization: undefined }),
        experience({ id: '' }),
        null,
      ],
    });

    expect(result.map((entry) => entry.id)).toEqual(['ok']);
  });

  it('never guesses at dates: bad or reversed dates drop the entry', () => {
    const result = normalizeExperiences({
      experiences: [
        experience({ id: 'good', startDate: '2024-02', endDate: '2024-02' }),
        experience({ id: 'bad-start', startDate: '2024-13' }),
        experience({ id: 'no-start', startDate: undefined }),
        experience({ id: 'bad-end', endDate: 'soon' }),
        experience({ id: 'reversed', startDate: '2024-05', endDate: '2024-01' }),
      ],
    });

    expect(result.map((entry) => entry.id)).toEqual(['good']);
  });

  it('treats an empty end date as "present" and sorts newest first', () => {
    const result = normalizeExperiences({
      experiences: [
        experience({ id: 'a', startDate: '2022-01', endDate: '' }),
        experience({ id: 'b', startDate: '2024-01', sortOrder: 2 }),
        experience({ id: 'c', startDate: '2024-01', sortOrder: 1 }),
      ],
    });

    expect(result.map((entry) => entry.id)).toEqual(['c', 'b', 'a']);
    expect(result[2].endDate).toBeNull();
  });

  it('ignores an unknown type and returns [] for malformed data', () => {
    expect(
      normalizeExperiences({ experiences: [experience({ type: 'wizard' })] })[0].type,
    ).toBeNull();
    expect(normalizeExperiences(undefined)).toEqual([]);
    expect(normalizeExperiences({ experiences: 'nope' })).toEqual([]);
  });

  it('accepts every visible entry of the shipped data file', () => {
    const visible = experiencesData.experiences.filter((entry) => entry.visible !== false);
    expect(normalizeExperiences(experiencesData)).toHaveLength(visible.length);
  });
});

describe('normalizeEducationList', () => {
  it('drops hidden, incomplete, repeated and impossible entries', () => {
    const result = normalizeEducationList({
      education: [
        study({ id: 'ok', endYear: 2025 }),
        study({ id: 'hidden', visible: false }),
        study({ id: 'ok' }),
        study({ id: 'no-program', program: '' }),
        study({ id: 'bad-start', startYear: '2020' }),
        study({ id: 'reversed', startYear: 2025, endYear: 2020 }),
        study({ id: 'bad-end', endYear: 'later' }),
      ],
    });

    expect(result.map((entry) => entry.id)).toEqual(['ok']);
  });

  it('treats a missing end year as "present" and sorts newest first', () => {
    const result = normalizeEducationList({
      education: [
        study({ id: 'old', startYear: 2015, endYear: 2019 }),
        study({ id: 'new', startYear: 2022, endYear: null }),
      ],
    });

    expect(result.map((entry) => entry.id)).toEqual(['new', 'old']);
    expect(result[0].endYear).toBeNull();
  });

  it('accepts every visible entry of the shipped data file', () => {
    const visible = educationData.education.filter((entry) => entry.visible !== false);

    expect(normalizeEducationList(educationData)).toHaveLength(visible.length);
  });
});

describe('dates', () => {
  it('formats a month in English and ignores anything else', () => {
    expect(formatMonth('2025-03')).toBe('Mar 2025');
    expect(formatMonth('2024-12')).toBe('Dec 2024');
    expect(formatMonth('2025-3')).toBe('');
    expect(formatMonth(undefined)).toBe('');
    expect(isMonth('2025-00')).toBe(false);
    expect(isMonth('2025-12')).toBe(true);
  });
});
