import { afterEach, describe, expect, it } from 'vitest';
import { loadSeedData, DEFAULT_DATA_DIR } from '../src/db/seed/loadData.js';
import { createDataDir } from './helpers/dataDir.js';

const dirs = [];
async function load(options) {
  const data = await createDataDir(options);
  dirs.push(data);
  return loadSeedData(data.dir);
}
afterEach(async () => {
  await Promise.all(dirs.splice(0).map((data) => data.remove()));
});

describe('loadSeedData', () => {
  it('reads the real files in shared/data without errors', async () => {
    const data = await loadSeedData(DEFAULT_DATA_DIR);

    expect(data.skills.length).toBeGreaterThan(0);
    expect(data.projects.length).toBeGreaterThan(0);
  });

  it('turns the fixture files into clean data with defaults filled in', async () => {
    const data = await load();

    expect(data.skills.map((skill) => skill.id)).toEqual(['react', 'css', 'node-js', 'postgresql']);
    expect(data.skills[0]).toMatchObject({ category: 'frontend', level: 'advanced' });
    const minimal = data.projects.find((project) => project.slug === 'minimal-project');
    expect(minimal).toMatchObject({
      repoUrl: null,
      thumbnail: null,
      architecture: null,
      features: [],
      published: true,
    });
    expect(data.posts.map((post) => post.slug)).toEqual([
      'first-post',
      'second-post',
      'third-post',
    ]);
  });

  it('treats an empty link as "not given"', async () => {
    const data = await load({
      files: {
        'projects.json': {
          projects: [{ slug: 'p', title: 'P', summary: 'S', repoUrl: '', demoUrl: null }],
        },
      },
    });

    expect(data.projects[0]).toMatchObject({ repoUrl: null, demoUrl: null });
  });

  it('lists every problem with the file and the field', async () => {
    const bad = {
      projects: [
        { slug: 'Bad Slug', title: 'T', summary: 'S', repoUrl: 'http://insecure.example.org' },
        { slug: 'ok', title: '', summary: 'S', thumbnail: { url: '//evil.example.org/x.png' } },
      ],
    };

    const error = await load({ files: { 'projects.json': bad } }).catch((e) => e);

    expect(error.message).toMatch(/^Invalid seed data:/);
    expect(error.message).toContain('projects.json: projects[0].slug');
    expect(error.message).toContain('projects.json: projects[0].repoUrl: must be an https address');
    expect(error.message).toContain('projects[1].title');
    expect(error.message).toContain('projects[1].thumbnail.url');
  });

  it.each([
    [
      'an unknown skill level',
      'skills.json',
      { categories: [{ id: 'tools', skills: [{ id: 'git', name: 'Git', level: 'expert' }] }] },
    ],
    ['an unknown category', 'skills.json', { categories: [{ id: 'mobile', skills: [] }] }],
    [
      'a month that is not real',
      'experiences.json',
      { experiences: [{ id: 'e', position: 'P', organization: 'O', startDate: '2024-13' }] },
    ],
    [
      'an end before the start',
      'experiences.json',
      {
        experiences: [
          { id: 'e', position: 'P', organization: 'O', startDate: '2024-05', endDate: '2024-04' },
        ],
      },
    ],
    [
      'an end year before the start year',
      'education.json',
      { education: [{ id: 'e', institution: 'I', program: 'P', startYear: 2024, endYear: 2023 }] },
    ],
    [
      'a certificate link that is not https',
      'certificates.json',
      {
        certificates: [
          {
            id: 'c',
            title: 'T',
            issuer: 'I',
            issuedDate: '2024-01',
            credentialUrl: 'javascript:alert(1)',
          },
        ],
      },
    ],
    [
      'a field the schema does not know (a typo)',
      'projects.json',
      { projects: [{ slug: 'p', title: 'T', summary: 'S', repoURL: 'https://x.org' }] },
    ],
  ])('refuses %s', async (_name, file, content) => {
    await expect(load({ files: { [file]: content } })).rejects.toThrow(/Invalid seed data/);
  });

  it('refuses the same id twice', async () => {
    const duplicate = {
      projects: [
        { slug: 'same', title: 'A', summary: 'S' },
        { slug: 'same', title: 'B', summary: 'S' },
      ],
    };

    await expect(load({ files: { 'projects.json': duplicate } })).rejects.toThrow(
      /"same" is used more than once/,
    );
  });

  it('names the file when JSON is broken or missing', async () => {
    await expect(load({ files: { 'skills.json': '{ nope' } })).rejects.toThrow(
      /skills\.json is not valid JSON/,
    );
    await expect(load({ files: { 'education.json': null } })).rejects.toThrow(
      /Cannot read seed file education\.json/,
    );
  });

  it('refuses a post file that cannot be published, and repeated post slugs', async () => {
    await expect(
      load({ posts: { 'broken.md': '---\ntitle: No date\n---\n\nText' } }),
    ).rejects.toThrow(/posts\/broken\.md/);

    const one = '---\ntitle: One\nslug: same\npublishedAt: 2025-01-01\n---\n\nText';
    await expect(load({ posts: { 'a.md': one, 'b.md': one } })).rejects.toThrow(
      /slug "same" is already used by a\.md/,
    );
  });

  it('works with no posts folder content', async () => {
    const data = await load({ posts: {} });

    expect(data.posts).toEqual([]);
  });
});
