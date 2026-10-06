import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { loadSeedData } from '../../src/db/seed/loadData.js';
import { seedDatabase } from '../../src/db/seed/seed.js';
import { createDataDir } from '../helpers/dataDir.js';
import { createTestDatabase, TEST_DATABASE_URL } from '../helpers/database.js';

describe.skipIf(!TEST_DATABASE_URL)('seed (PostgreSQL)', () => {
  let db;
  let data;
  let dataDir;

  beforeAll(async () => {
    db = await createTestDatabase();
    dataDir = await createDataDir();
    data = await loadSeedData(dataDir.dir);
  });
  afterAll(async () => {
    await dataDir.remove();
    await db.drop();
  });
  beforeEach(async () => {
    await db.pool.query(
      `TRUNCATE post_tags, tags, posts, project_images, project_technologies, projects,
                experience_technologies, experiences, education, certificates, skills, technologies
       RESTART IDENTITY CASCADE`,
    );
  });

  const count = async (table) =>
    (await db.pool.query(`SELECT count(*)::int AS n FROM ${table}`)).rows[0].n;
  const seed = (mode, override = data) => seedDatabase({ pool: db.pool, data: override, mode });

  it('stores every section and reports what it did', async () => {
    const summary = await seed();

    expect(summary.skills).toEqual({ created: 4, updated: 0, skipped: 0 });
    expect(summary.projects).toEqual({ created: 3, updated: 0, skipped: 0 });
    expect(summary.experiences.created).toBe(3);
    expect(summary.education.created).toBe(3);
    expect(summary.certificates.created).toBe(4);
    expect(summary.posts.created).toBe(3);
    expect(await count('messages')).toBe(0);
  });

  it('creates a technology for each skill, and for names used elsewhere only once', async () => {
    await seed();

    const { rows } = await db.pool.query(
      `SELECT name, slug, category FROM technologies ORDER BY id`,
    );
    const bySlug = Object.fromEntries(rows.map((row) => [row.slug, row]));
    // From the skills file, with its own category and slug.
    expect(bySlug['node-js']).toMatchObject({ name: 'Node.js', category: 'backend' });
    // Used in a project or job but not a skill: created as "other". "node.js" in the project
    // matches the skill "Node.js" ignoring case, so it does not create a second technology.
    expect(bySlug.vite).toMatchObject({ name: 'Vite', category: 'other' });
    expect(bySlug.docker).toMatchObject({ name: 'Docker', category: 'other' });
    expect(bySlug['secret-tech']).toBeDefined();
    expect(rows.filter((row) => row.name.toLowerCase() === 'node.js')).toHaveLength(1);
    expect(rows).toHaveLength(7);
  });

  it('keeps the order technologies were written in', async () => {
    await seed();

    const { rows } = await db.pool.query(
      `SELECT t.name FROM project_technologies pt
         JOIN projects p ON p.id = pt.project_id JOIN technologies t ON t.id = pt.technology_id
        WHERE p.slug = 'full-project' ORDER BY pt.position`,
    );
    expect(rows.map((row) => row.name)).toEqual(['React', 'Vite', 'Node.js']);
  });

  it('stores months as the first day, and "until now" as no end date', async () => {
    await seed();

    const { rows } = await db.pool.query(
      `SELECT slug, to_char(start_date, 'YYYY-MM-DD') AS s, end_date FROM experiences ORDER BY slug`,
    );
    expect(rows.find((row) => row.slug === 'current-role')).toMatchObject({
      s: '2024-02-01',
      end_date: null,
    });
  });

  it('stores posts as published at midnight UTC, with shared tags', async () => {
    await seed();

    const { rows: tags } = await db.pool.query(`SELECT name FROM tags ORDER BY name`);
    // "Node" in the first post wins over "node" in the second.
    expect(tags.map((tag) => tag.name)).toEqual(['Node', 'React', 'Testing']);
    const { rows } = await db.pool.query(
      `SELECT status, to_char(published_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI') AS at, reading_time_minutes AS rt
         FROM posts WHERE slug = 'second-post'`,
    );
    expect(rows[0]).toEqual({ status: 'published', at: '2025-04-10T00:00', rt: 3 });
  });

  describe('running it again', () => {
    it('changes nothing in the default mode', async () => {
      await seed();
      const before = await db.pool.query(`SELECT * FROM projects ORDER BY id`);

      const summary = await seed();

      expect(summary.projects).toEqual({ created: 0, updated: 0, skipped: 3 });
      expect(summary.skills.skipped).toBe(4);
      expect((await db.pool.query(`SELECT * FROM projects ORDER BY id`)).rows).toEqual(before.rows);
      expect(await count('technologies')).toBe(7);
      expect(await count('project_technologies')).toBe(3 + 0 + 1);
    });

    it('never overwrites an edit made after seeding', async () => {
      await seed();
      await db.pool.query(
        `UPDATE projects SET title = 'Edited in the dashboard', is_published = false WHERE slug = 'full-project'`,
      );
      await db.pool.query(
        `DELETE FROM project_technologies WHERE project_id = (SELECT id FROM projects WHERE slug = 'full-project')`,
      );

      await seed();

      const { rows } = await db.pool.query(
        `SELECT title, is_published FROM projects WHERE slug = 'full-project'`,
      );
      expect(rows[0]).toEqual({ title: 'Edited in the dashboard', is_published: false });
      expect(await count('project_technologies')).toBe(1);
    });

    it('adds only what is new', async () => {
      await seed();
      const more = {
        ...data,
        projects: [
          ...data.projects,
          { ...data.projects[1], slug: 'brand-new', title: 'Brand New' },
        ],
      };

      const summary = await seed('missing', more);

      expect(summary.projects).toEqual({ created: 1, updated: 0, skipped: 3 });
    });

    it('overwrites from the files in update mode, and replaces technologies, images and tags', async () => {
      await seed();
      await db.pool.query(`UPDATE projects SET title = 'Edited' WHERE slug = 'full-project'`);
      await db.pool.query(`DELETE FROM project_images`);
      await db.pool.query(`DELETE FROM post_tags`);

      const summary = await seed('update');

      expect(summary.projects).toEqual({ created: 0, updated: 3, skipped: 0 });
      expect(
        (await db.pool.query(`SELECT title FROM projects WHERE slug = 'full-project'`)).rows[0]
          .title,
      ).toBe('Full Project');
      expect(await count('project_images')).toBe(2);
      expect(await count('post_tags')).toBe(4);
      expect(await count('project_technologies')).toBe(4);
      expect(await count('technologies')).toBe(7);
    });

    it('does not delete rows that are not in the files, even in update mode', async () => {
      await seed();
      await db.pool.query(
        `INSERT INTO projects (slug, title, summary) VALUES ('dashboard-only', 'T', 'S')`,
      );

      await seed('update');

      expect(await count('projects')).toBe(4);
    });
  });

  it('stores nothing at all when anything fails', async () => {
    const broken = {
      ...data,
      // The last section fails: two tags that become the same tag.
      posts: [...data.posts, { ...data.posts[0], slug: 'broken-tags', tags: ['C++', 'C#'] }],
    };

    await expect(seed('missing', broken)).rejects.toThrow(/would be the same tag/);

    for (const table of [
      'technologies',
      'skills',
      'projects',
      'experiences',
      'education',
      'certificates',
      'posts',
      'tags',
    ]) {
      expect(await count(table)).toBe(0);
    }
  });

  it('gives a second technology with the same slug a numbered slug instead of failing', async () => {
    const clash = {
      ...data,
      projects: [{ ...data.projects[1], slug: 'clash', technologies: ['C++', 'C#'] }],
      posts: [],
    };

    await seed('missing', clash);

    const { rows } = await db.pool.query(
      `SELECT name, slug FROM technologies WHERE name IN ('C++', 'C#') ORDER BY id`,
    );
    expect(rows).toEqual([
      { name: 'C++', slug: 'c' },
      { name: 'C#', slug: 'c-2' },
    ]);
  });

  it('refuses a technology name with nothing usable for a slug', async () => {
    const odd = {
      ...data,
      projects: [{ ...data.projects[1], slug: 'odd', technologies: ['+++'] }],
    };

    await expect(seed('missing', odd)).rejects.toThrow(/Cannot make a URL-safe slug/);
  });

  it('refuses an unknown mode', async () => {
    await expect(seed('overwrite-everything')).rejects.toThrow(/Unknown seed mode/);
  });
});
