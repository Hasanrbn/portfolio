import { slugify } from '@portfolio/shared/validation.js';

/**
 * Writes the seed data (see loadData.js) into the database inside ONE transaction: either
 * everything is stored or nothing is.
 *
 * Two modes:
 *
 *   'missing' (default)  Only adds rows whose slug does not exist yet. Rows that are already
 *                        there are left alone, so edits made later (for example in the admin
 *                        dashboard) are never overwritten, and running it twice changes nothing.
 *   'update'             Also overwrites rows that exist with what the files say, and replaces
 *                        their technologies, images and tags. Rows that are not in the files
 *                        are never deleted.
 *
 * Returns { table: { created, updated, skipped } } for each table written.
 */
export async function seedDatabase({ pool, data, mode = 'missing', logger }) {
  if (mode !== 'missing' && mode !== 'update') {
    throw new Error(`Unknown seed mode "${mode}"`);
  }

  const client = await pool.connect();
  const summary = {};
  const count = (table, outcome) => {
    summary[table] ??= { created: 0, updated: 0, skipped: 0 };
    summary[table][outcome] += 1;
  };

  /**
   * Inserts one row keyed by `slug`. Returns { id, write } where `write` says whether the row's
   * children (technologies, images, tags) should be written: true for a new row, and for an
   * existing one only in 'update' mode.
   */
  async function upsert(table, row) {
    const columns = Object.keys(row);
    const placeholders = columns.map((_, index) => `$${index + 1}`);
    const values = columns.map((column) => row[column]);
    const head = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;

    if (mode === 'missing') {
      const { rows } = await client.query(
        `${head} ON CONFLICT (slug) DO NOTHING RETURNING id`,
        values,
      );
      if (rows.length === 0) {
        count(table, 'skipped');
        return { id: null, write: false };
      }
      count(table, 'created');
      return { id: rows[0].id, write: true };
    }

    const updates = columns
      .filter((column) => column !== 'slug')
      .map((column) => `${column} = EXCLUDED.${column}`);
    const { rows } = await client.query(
      `${head} ON CONFLICT (slug) DO UPDATE SET ${updates.join(', ')} RETURNING id, (xmax = 0) AS inserted`,
      values,
    );
    count(table, rows[0].inserted ? 'created' : 'updated');
    return { id: rows[0].id, write: true };
  }

  // Technologies --------------------------------------------------------------------------

  const technologySlugs = new Map(); // lowercase name -> slug
  const usedSlugs = new Set();
  const technologyIds = new Map(); // slug -> id

  async function loadTechnologies() {
    const { rows } = await client.query('SELECT id, name, slug FROM technologies ORDER BY id');
    for (const row of rows) {
      usedSlugs.add(row.slug);
      technologyIds.set(row.slug, row.id);
      if (!technologySlugs.has(row.name.toLowerCase())) {
        technologySlugs.set(row.name.toLowerCase(), row.slug);
      }
    }
  }

  /** The id of the technology called `name`, creating it (category "other") when new. */
  async function technologyId(name) {
    const known = technologySlugs.get(name.toLowerCase());
    if (known) {
      return technologyIds.get(known);
    }

    const base = slugify(name);
    if (!base) {
      throw new Error(`Cannot make a URL-safe slug from the technology name "${name}"`);
    }
    // "C++" and "C#" both become "c": the second one gets "c-2" instead of clashing.
    let slug = base;
    for (let n = 2; usedSlugs.has(slug); n += 1) {
      slug = `${base}-${n}`;
    }

    const { rows } = await client.query(
      'INSERT INTO technologies (name, slug) VALUES ($1, $2) RETURNING id',
      [name, slug],
    );
    usedSlugs.add(slug);
    technologyIds.set(slug, rows[0].id);
    technologySlugs.set(name.toLowerCase(), slug);
    count('technologies', 'created');
    return rows[0].id;
  }

  async function replaceLinks(table, ownerColumn, ownerId, names) {
    await client.query(`DELETE FROM ${table} WHERE ${ownerColumn} = $1`, [ownerId]);
    const ids = [];
    for (const name of names) {
      const id = await technologyId(name);
      if (!ids.includes(id)) {
        ids.push(id);
      }
    }
    for (const [position, id] of ids.entries()) {
      await client.query(
        `INSERT INTO ${table} (${ownerColumn}, technology_id, position) VALUES ($1, $2, $3)`,
        [ownerId, id, position],
      );
    }
  }

  // Sections -------------------------------------------------------------------------------

  async function seedSkills() {
    for (const [index, skill] of data.skills.entries()) {
      const existing = technologyIds.get(skill.id);
      let id = existing;
      if (existing === undefined) {
        const { rows } = await client.query(
          'INSERT INTO technologies (name, slug, category) VALUES ($1, $2, $3) RETURNING id',
          [skill.name, skill.id, skill.category],
        );
        id = rows[0].id;
        usedSlugs.add(skill.id);
        technologyIds.set(skill.id, id);
        technologySlugs.set(skill.name.toLowerCase(), skill.id);
        count('technologies', 'created');
      } else if (mode === 'update') {
        await client.query('UPDATE technologies SET name = $1, category = $2 WHERE id = $3', [
          skill.name,
          skill.category,
          id,
        ]);
        count('technologies', 'updated');
      }

      const params = [id, skill.level, skill.description, index];
      const insert =
        'INSERT INTO skills (technology_id, level, description, sort_order) VALUES ($1, $2, $3, $4)';
      if (mode === 'missing') {
        const { rowCount } = await client.query(
          `${insert} ON CONFLICT (technology_id) DO NOTHING`,
          params,
        );
        count('skills', rowCount ? 'created' : 'skipped');
      } else {
        const { rows } = await client.query(
          `${insert} ON CONFLICT (technology_id) DO UPDATE SET level = EXCLUDED.level,
             description = EXCLUDED.description, sort_order = EXCLUDED.sort_order
           RETURNING (xmax = 0) AS inserted`,
          params,
        );
        count('skills', rows[0].inserted ? 'created' : 'updated');
      }
    }
  }

  async function seedProjects() {
    for (const project of data.projects) {
      const thumb = project.thumbnail;
      const { id, write } = await upsert('projects', {
        slug: project.slug,
        title: project.title,
        summary: project.summary,
        description_md: project.description,
        problem_md: project.problem,
        solution_md: project.solution,
        features: project.features,
        architecture_description: project.architecture?.description ?? '',
        architecture_layers: JSON.stringify(project.architecture?.layers ?? []),
        challenges_md: project.challenges,
        lessons_md: project.lessons,
        category: project.category,
        status: project.status,
        year: project.year,
        thumbnail_url: thumb?.url ?? null,
        thumbnail_alt: thumb?.alt ?? '',
        thumbnail_caption: thumb?.caption ?? '',
        thumbnail_width: thumb?.width ?? null,
        thumbnail_height: thumb?.height ?? null,
        repo_url: project.repoUrl,
        demo_url: project.demoUrl,
        is_featured: project.featured,
        is_published: project.published,
        sort_order: project.sortOrder,
      });
      if (!write) continue;

      await replaceLinks('project_technologies', 'project_id', id, project.technologies);
      await client.query('DELETE FROM project_images WHERE project_id = $1', [id]);
      for (const [order, shot] of project.screenshots.entries()) {
        await client.query(
          `INSERT INTO project_images (project_id, url, alt, caption, width, height, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [id, shot.url, shot.alt, shot.caption, shot.width, shot.height, order],
        );
      }
    }
  }

  async function seedExperiences() {
    for (const entry of data.experiences) {
      const { id, write } = await upsert('experiences', {
        slug: entry.id,
        position: entry.position,
        organization: entry.organization,
        type: entry.type,
        start_date: `${entry.startDate}-01`,
        end_date: entry.endDate ? `${entry.endDate}-01` : null,
        description: entry.description,
        responsibilities: entry.responsibilities,
        sort_order: entry.sortOrder,
        is_visible: entry.visible,
      });
      if (write) {
        await replaceLinks('experience_technologies', 'experience_id', id, entry.technologies);
      }
    }
  }

  async function seedEducation() {
    for (const entry of data.education) {
      await upsert('education', {
        slug: entry.id,
        institution: entry.institution,
        program: entry.program,
        start_year: entry.startYear,
        end_year: entry.endYear,
        subjects: entry.subjects,
        achievements: entry.achievements,
        sort_order: entry.sortOrder,
        is_visible: entry.visible,
      });
    }
  }

  async function seedCertificates() {
    for (const entry of data.certificates) {
      await upsert('certificates', {
        slug: entry.id,
        title: entry.title,
        issuer: entry.issuer,
        issued_date: `${entry.issuedDate}-01`,
        category: entry.category,
        credential_id: entry.credentialId,
        credential_url: entry.credentialUrl,
        file_url: entry.file?.url ?? null,
        file_alt: entry.file?.alt || null,
        sort_order: entry.sortOrder,
        is_visible: entry.visible,
      });
    }
  }

  async function seedPosts() {
    for (const post of data.posts) {
      const { id, write } = await upsert('posts', {
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        content_md: post.content,
        cover_image_url: post.cover?.url ?? null,
        cover_alt: post.cover?.alt ?? '',
        category: post.category,
        status: 'published',
        published_at: `${post.publishedAt}T00:00:00Z`,
        edited_at: post.updatedAt ? `${post.updatedAt}T00:00:00Z` : null,
        reading_time_minutes: post.readingTime,
      });
      if (!write) continue;

      await client.query('DELETE FROM post_tags WHERE post_id = $1', [id]);
      const used = new Map(); // tag id -> name, to catch two names that become one tag
      for (const [position, name] of post.tags.entries()) {
        const tagSlug = slugify(name);
        if (!tagSlug) {
          throw new Error(
            `Post "${post.slug}": cannot make a URL-safe slug from the tag "${name}"`,
          );
        }
        // The first spelling of a tag wins ("React" and "react" are one tag).
        const { rows } = await client.query(
          `INSERT INTO tags (name, slug) VALUES ($1, $2)
           ON CONFLICT (slug) DO UPDATE SET slug = EXCLUDED.slug RETURNING id`,
          [name, tagSlug],
        );
        if (used.has(rows[0].id)) {
          throw new Error(
            `Post "${post.slug}": the tags "${used.get(rows[0].id)}" and "${name}" would be the same tag`,
          );
        }
        used.set(rows[0].id, name);
        await client.query(
          'INSERT INTO post_tags (post_id, tag_id, position) VALUES ($1, $2, $3)',
          [id, rows[0].id, position],
        );
      }
    }
  }

  try {
    await client.query('BEGIN');
    await loadTechnologies();
    await seedSkills();
    await seedProjects();
    await seedExperiences();
    await seedEducation();
    await seedCertificates();
    await seedPosts();
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }

  logger?.debug({ summary, mode }, 'seed finished');
  return summary;
}
