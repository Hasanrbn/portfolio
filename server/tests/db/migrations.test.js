import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  assertMigrated,
  getMigrationStatus,
  listMigrationFiles,
  runMigrations,
} from '../../src/db/migrate.js';
import { createTestDatabase, TEST_DATABASE_URL } from '../helpers/database.js';

const TABLES = [
  'certificates',
  'education',
  'experience_technologies',
  'experiences',
  'messages',
  'pgmigrations',
  'post_tags',
  'posts',
  'project_images',
  'project_technologies',
  'projects',
  'session',
  'skills',
  'tags',
  'technologies',
  'users',
];

describe.skipIf(!TEST_DATABASE_URL)('migrations (PostgreSQL)', () => {
  let db;
  const tables = async () => {
    const { rows } = await db.pool.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = $1 ORDER BY 1`,
      [db.schema],
    );
    return rows.map((row) => row.table_name);
  };
  const fails = (sql, params, constraint) =>
    expect(db.pool.query(sql, params)).rejects.toMatchObject(
      constraint ? { code: '23514', constraint } : { code: expect.stringMatching(/^23/) },
    );

  beforeAll(async () => {
    db = await createTestDatabase({ migrate: false });
  });
  afterAll(() => db.drop());

  it('reports everything as pending before the first run, then nothing', async () => {
    const files = await listMigrationFiles();
    expect(files.length).toBeGreaterThanOrEqual(3);
    expect(await getMigrationStatus(db.pool)).toEqual({ applied: [], pending: files, unknown: [] });
    await expect(assertMigrated(db.pool)).rejects.toThrow(/missing \d+ migration/);

    const applied = await runMigrations({ connection: db.connection, schema: db.schema });

    expect(applied).toEqual(files);
    expect(await tables()).toEqual(TABLES);
    expect(await getMigrationStatus(db.pool)).toEqual({ applied: files, pending: [], unknown: [] });
    await expect(assertMigrated(db.pool)).resolves.toBeUndefined();
  });

  it('applies nothing the second time', async () => {
    expect(await runMigrations({ connection: db.connection, schema: db.schema })).toEqual([]);
  });

  it('flags a migration the code does not know about', async () => {
    await db.pool.query(
      `INSERT INTO pgmigrations (name, run_on) VALUES ('9999_from_the_future', now())`,
    );

    await expect(assertMigrated(db.pool)).rejects.toThrow(/9999_from_the_future/);

    await db.pool.query(`DELETE FROM pgmigrations WHERE name = '9999_from_the_future'`);
  });

  describe('constraints', () => {
    const project = (slug, extra = {}) => {
      const row = { slug, title: 'T', summary: 'S', ...extra };
      const columns = Object.keys(row);
      return [
        `INSERT INTO projects (${columns.join(',')}) VALUES (${columns.map((_, i) => `$${i + 1}`).join(',')})`,
        Object.values(row),
      ];
    };

    it('only lets URL-safe slugs in', async () => {
      await db.pool.query(...project('good-slug-2'));
      for (const bad of ['Bad Slug', 'UPPER', '-lead', 'trail-', 'double--hyphen', '', 'a/b']) {
        await fails(...project(bad), 'projects_slug_check');
      }
    });

    it('only lets https links in, and no spaces', async () => {
      await db.pool.query(...project('p-https', { repo_url: 'https://github.com/a/b' }));
      for (const bad of [
        'http://x.org',
        'javascript:alert(1)',
        'ftp://x.org',
        'https://a b',
        '//x.org',
      ]) {
        await fails(...project('p-bad-link', { repo_url: bad }), 'projects_repo_url_check');
      }
    });

    it('lets images be a path on this site or https, never another host disguised as a path', async () => {
      await db.pool.query(...project('p-img-1', { thumbnail_url: '/images/a.png' }));
      await db.pool.query(
        ...project('p-img-2', { thumbnail_url: 'https://cdn.example.org/a.png' }),
      );
      for (const bad of [
        '//evil.example.org/a.png',
        '/\\evil.example.org',
        'javascript:alert(1)',
        'data:text/html,x',
        'a.png',
      ]) {
        await fails(
          ...project('p-img-bad', { thumbnail_url: bad }),
          'projects_thumbnail_url_check',
        );
      }
    });

    it('keeps new projects hidden until published on purpose', async () => {
      const { rows } = await db.pool.query(
        `SELECT is_published FROM projects WHERE slug = 'good-slug-2'`,
      );
      expect(rows[0].is_published).toBe(false);
    });

    it('stores months as the first day and refuses an end before the start', async () => {
      const insert = (start, end) =>
        db.pool.query(
          `INSERT INTO experiences (slug, position, organization, start_date, end_date)
           VALUES ('e-' || gen_random_uuid(), 'P', 'O', $1, $2)`,
          [start, end],
        );
      await insert('2024-03-01', null);
      await insert('2024-03-01', '2024-03-01');
      await expect(insert('2024-03-05', null)).rejects.toMatchObject({ code: '23514' });
      await expect(insert('2024-03-01', '2024-02-01')).rejects.toMatchObject({ code: '23514' });
    });

    it('refuses an invalid status, year or skill level', async () => {
      await fails(...project('p-status', { status: 'done' }), 'projects_status_check');
      await fails(...project('p-year', { year: 1800 }), 'projects_year_check');
      const { rows } = await db.pool.query(
        `INSERT INTO technologies (name, slug) VALUES ('X', 'x-tech') RETURNING id`,
      );
      await expect(
        db.pool.query(`INSERT INTO skills (technology_id, level) VALUES ($1, 'expert')`, [
          rows[0].id,
        ]),
      ).rejects.toMatchObject({ code: '23514' });
    });

    it('does not let a technology be deleted while a project uses it', async () => {
      const { rows: tech } = await db.pool.query(
        `SELECT id FROM technologies WHERE slug = 'x-tech'`,
      );
      const { rows: proj } = await db.pool.query(`SELECT id FROM projects WHERE slug = 'p-https'`);
      await db.pool.query(`INSERT INTO project_technologies VALUES ($1, $2, 0)`, [
        proj[0].id,
        tech[0].id,
      ]);

      await expect(
        db.pool.query(`DELETE FROM technologies WHERE id = $1`, [tech[0].id]),
      ).rejects.toMatchObject({
        code: '23503',
      });

      // Deleting the project removes only the link.
      await db.pool.query(`DELETE FROM projects WHERE id = $1`, [proj[0].id]);
      const { rows: left } = await db.pool.query(
        `SELECT count(*)::int AS n FROM project_technologies`,
      );
      expect(left[0].n).toBe(0);
    });

    it('keeps updated_at current by itself', async () => {
      await db.pool.query(...project('p-touch'));
      await db.pool.query(
        `UPDATE projects SET created_at = now() - interval '1 day', updated_at = now() - interval '1 day' WHERE slug = 'p-touch'`,
      );

      await db.pool.query(`UPDATE projects SET title = 'Changed' WHERE slug = 'p-touch'`);

      const { rows } = await db.pool.query(
        `SELECT updated_at > now() - interval '1 minute' AS fresh, created_at < now() - interval '1 hour' AS old FROM projects WHERE slug = 'p-touch'`,
      );
      expect(rows[0]).toEqual({ fresh: true, old: true });
    });

    describe('posts', () => {
      const post = (slug, extra = {}) => {
        const row = { slug, title: 'T', content_md: 'Body', ...extra };
        const columns = Object.keys(row);
        return [
          `INSERT INTO posts (${columns.join(',')}) VALUES (${columns.map((_, i) => `$${i + 1}`).join(',')})`,
          Object.values(row),
        ];
      };

      it('needs a publish date for a published post, and starts as a draft', async () => {
        await db.pool.query(...post('draft-post'));
        await db.pool.query(
          ...post('live-post', { status: 'published', published_at: '2025-01-01T00:00:00Z' }),
        );
        await expect(
          db.pool.query(...post('no-date', { status: 'published' })),
        ).rejects.toMatchObject({
          code: '23514',
        });
        const { rows } = await db.pool.query(`SELECT status FROM posts WHERE slug = 'draft-post'`);
        expect(rows[0].status).toBe('draft');
      });

      it('refuses an edit date before the publish date and an empty body', async () => {
        await expect(
          db.pool.query(
            ...post('edit-early', {
              status: 'published',
              published_at: '2025-02-01T00:00:00Z',
              edited_at: '2025-01-01T00:00:00Z',
            }),
          ),
        ).rejects.toMatchObject({ code: '23514' });
        await expect(db.pool.query(...post('empty', { content_md: '' }))).rejects.toMatchObject({
          code: '23514',
        });
      });

      it('builds a weighted search index, title above body', async () => {
        await db.pool.query(
          ...post('about-databases', { title: 'Databases explained', content_md: 'Nothing else.' }),
        );
        await db.pool.query(
          ...post('mentions-databases', { title: 'Other', content_md: 'We use databases here.' }),
        );

        const { rows } = await db.pool.query(
          `SELECT slug FROM posts WHERE search_vector @@ plainto_tsquery('simple', 'databases')
            ORDER BY ts_rank(search_vector, plainto_tsquery('simple', 'databases')) DESC`,
        );

        expect(rows.map((row) => row.slug)).toEqual(['about-databases', 'mentions-databases']);
      });

      it('treats "React" and "react" as one tag', async () => {
        await db.pool.query(`INSERT INTO tags (name, slug) VALUES ('React', 'react')`);
        await expect(
          db.pool.query(`INSERT INTO tags (name, slug) VALUES ('react', 'react')`),
        ).rejects.toMatchObject({
          code: '23505',
        });
      });
    });

    describe('messages', () => {
      const message = (extra = {}) => {
        const row = {
          name: 'Ada',
          email: 'ada@example.com',
          subject: 'Hello',
          body: 'A real message.',
          ...extra,
        };
        const columns = Object.keys(row);
        return [
          `INSERT INTO messages (${columns.join(',')}) VALUES (${columns.map((_, i) => `$${i + 1}`).join(',')}) RETURNING id, status`,
          Object.values(row),
        ];
      };

      it('stores a valid message as "new" with a generated id', async () => {
        const { rows } = await db.pool.query(...message());

        expect(rows[0].status).toBe('new');
        expect(rows[0].id).toMatch(/^[0-9a-f-]{36}$/);
      });

      it('repeats the length limits of the contact form', async () => {
        await fails(...message({ body: 'short' }), 'messages_body_check');
        await fails(...message({ body: 'x'.repeat(2001) }), 'messages_body_check');
        await fails(...message({ name: '' }), 'messages_name_check');
        await fails(...message({ subject: 'x'.repeat(151) }), 'messages_subject_check');
        await db.pool.query(...message({ body: 'x'.repeat(2000) }));
      });

      it('only stores a hash, never an address', async () => {
        await db.pool.query(...message({ ip_hash: 'a'.repeat(64) }));
        await fails(...message({ ip_hash: '203.0.113.7' }), 'messages_ip_hash_check');
      });
    });
  });

  it('reverts every migration and leaves nothing behind, then applies again', async () => {
    const reverted = await runMigrations({
      connection: db.connection,
      schema: db.schema,
      direction: 'down',
      count: Infinity,
    });

    expect(reverted).toHaveLength((await listMigrationFiles()).length);
    expect(await tables()).toEqual(['pgmigrations']);
    const { rows } = await db.pool.query(
      `SELECT count(*)::int AS n FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = $1 AND p.proname = 'set_updated_at'`,
      [db.schema],
    );
    expect(rows[0].n).toBe(0);

    await runMigrations({ connection: db.connection, schema: db.schema });
    expect(await tables()).toEqual(TABLES);
  });
});
