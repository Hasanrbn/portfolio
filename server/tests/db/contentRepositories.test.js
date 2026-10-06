import { afterAll, beforeAll, describe, expect, it } from 'vitest';
// The client's own cleaning code is the definition of the data's shape. The repositories must
// return exactly what it returns for the same content, so the site can switch from the seed
// files to the API without a page noticing.
import { normalizeCertificates } from '../../../client/src/services/certificatesService.js';
import { normalizeEducationList } from '../../../client/src/services/educationService.js';
import { normalizeExperiences } from '../../../client/src/services/experienceService.js';
import { normalizePosts } from '../../../client/src/services/postsService.js';
import { normalizeProjects } from '../../../client/src/services/projectsService.js';
import { normalizeSkillGroups } from '../../../client/src/services/skillsService.js';
import { createContentRepositories } from '../../src/repositories/content/index.js';
import { loadSeedData } from '../../src/db/seed/loadData.js';
import { seedDatabase } from '../../src/db/seed/seed.js';
import * as content from '../fixtures/content.js';
import { createDataDir } from '../helpers/dataDir.js';
import { createTestDatabase, TEST_DATABASE_URL } from '../helpers/database.js';

describe.skipIf(!TEST_DATABASE_URL)('content repositories (PostgreSQL)', () => {
  let db;
  let repos;

  beforeAll(async () => {
    db = await createTestDatabase();
    const dataDir = await createDataDir();
    try {
      await seedDatabase({ pool: db.pool, data: await loadSeedData(dataDir.dir) });
    } finally {
      await dataDir.remove();
    }
    repos = createContentRepositories({ pool: db.pool });
  });
  afterAll(() => db.drop());

  // The one deliberate difference: a technology or tag has ONE spelling in the database (the
  // first one written), so "node.js" in a project and "Node.js" in the skills are the same row.
  // Everything else must be identical.
  const spelling = (names) => {
    const first = new Map();
    for (const name of names) {
      if (!first.has(name.toLowerCase())) first.set(name.toLowerCase(), name);
    }
    return (name) => first.get(name.toLowerCase());
  };
  const technologySpelling = spelling([
    ...content.skills.categories.flatMap((category) => category.skills.map((skill) => skill.name)),
    ...content.projects.projects.flatMap((project) => project.technologies ?? []),
  ]);
  const tagSpelling = spelling(
    content.postFiles.flatMap((file) => normalizePosts([file]).flatMap((post) => post.tags)),
  );
  const respell = (items, field, fix) =>
    items.map((item) => ({ ...item, [field]: item[field].map(fix) }));

  describe('return exactly what the client services return for the same content', () => {
    it('skills', async () => {
      const expected = normalizeSkillGroups(content.skills);

      expect(expected.length).toBe(3);
      expect(await repos.skills.listGroups()).toEqual(expected);
    });

    it('projects (published only, ordered by sortOrder)', async () => {
      const expected = respell(
        normalizeProjects(content.projects),
        'technologies',
        technologySpelling,
      );

      expect(expected.map((project) => project.slug)).toEqual(['minimal-project', 'full-project']);
      expect(await repos.projects.list()).toEqual(expected);
    });

    it('experiences (visible only, newest first)', async () => {
      const expected = normalizeExperiences(content.experiences);

      expect(expected.map((entry) => entry.id)).toEqual(['current-role', 'old-job']);
      expect(await repos.experiences.list()).toEqual(expected);
    });

    it('education', async () => {
      const expected = normalizeEducationList(content.education);

      expect(expected.map((entry) => entry.id)).toEqual(['university', 'high-school']);
      expect(await repos.education.list()).toEqual(expected);
    });

    it('certificates', async () => {
      const expected = normalizeCertificates(content.certificates);

      expect(expected.map((entry) => entry.id)).toEqual(['cert-image', 'cert-pdf', 'cert-plain']);
      expect(await repos.certificates.list()).toEqual(expected);
    });

    it('posts (newest first)', async () => {
      const expected = respell(normalizePosts(content.postFiles), 'tags', tagSpelling);

      expect(expected.map((post) => post.slug)).toEqual([
        'third-post',
        'second-post',
        'first-post',
      ]);
      expect(await repos.posts.list()).toEqual(expected);
    });
  });

  describe('projects', () => {
    it('finds one by slug, with its fallbacks filled in', async () => {
      const project = await repos.projects.findBySlug('full-project');

      expect(project.thumbnail.alt).toBe('Preview of Full Project');
      expect(project.screenshots.map((shot) => shot.alt)).toEqual([
        'First view',
        'Screenshot of Full Project',
      ]);
      expect(project.technologies).toEqual(['React', 'Vite', 'Node.js']);
    });

    it('treats an unpublished project like a missing one', async () => {
      expect(await repos.projects.findBySlug('hidden-project')).toBeNull();
      expect(await repos.projects.findBySlug('does-not-exist')).toBeNull();
    });

    it('is not fooled by SQL in the slug', async () => {
      expect(await repos.projects.findBySlug("x' OR '1'='1")).toBeNull();
    });
  });

  describe('posts', () => {
    it('finds one by slug', async () => {
      const post = await repos.posts.findBySlug('second-post');

      expect(post).toMatchObject({
        title: 'Second Post',
        publishedAt: '2025-04-10',
        updatedAt: '2025-05-01',
        readingTime: 3,
        tags: ['Node', 'Testing'],
        cover: { url: '/images/cover.png', alt: 'A cover' },
      });
    });

    it('hides drafts and posts dated in the future', async () => {
      await db.pool.query(
        `INSERT INTO posts (slug, title, content_md) VALUES ('a-draft', 'Draft', 'Text')`,
      );
      await db.pool.query(
        `INSERT INTO posts (slug, title, content_md, status, published_at)
         VALUES ('scheduled', 'Later', 'Text', 'published', now() + interval '1 day')`,
      );

      const slugs = (await repos.posts.list()).map((post) => post.slug);

      expect(slugs).not.toContain('a-draft');
      expect(slugs).not.toContain('scheduled');
      expect(await repos.posts.findBySlug('a-draft')).toBeNull();
      expect(await repos.posts.findBySlug('scheduled')).toBeNull();
    });
  });

  it('hides an entry once it is switched off in the database', async () => {
    await db.pool.query(
      `UPDATE skills SET is_visible = false WHERE technology_id = (SELECT id FROM technologies WHERE slug = 'css')`,
    );
    await db.pool.query(`UPDATE education SET is_visible = false WHERE slug = 'university'`);

    const groups = await repos.skills.listGroups();
    expect(groups[0].skills.map((skill) => skill.id)).toEqual(['react']);
    expect((await repos.education.list()).map((entry) => entry.id)).toEqual(['high-school']);
  });
});
