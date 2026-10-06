// One query returns each project with its technologies and screenshots already collected,
// so listing projects costs one round trip however many there are.
const SELECT_PROJECTS = `
  SELECT p.*,
         COALESCE((SELECT json_agg(t.name ORDER BY pt.position)
                     FROM project_technologies pt
                     JOIN technologies t ON t.id = pt.technology_id
                    WHERE pt.project_id = p.id), '[]'::json) AS technology_names,
         COALESCE((SELECT json_agg(json_build_object(
                          'url', i.url, 'alt', i.alt, 'caption', i.caption,
                          'width', i.width, 'height', i.height) ORDER BY i.sort_order, i.id)
                     FROM project_images i
                    WHERE i.project_id = p.id), '[]'::json) AS images
    FROM projects p
   WHERE p.is_published`;

function toPicture(picture, fallbackAlt) {
  return {
    url: picture.url,
    alt: picture.alt.trim() || fallbackAlt,
    caption: picture.caption.trim(),
    width: picture.width,
    height: picture.height,
  };
}

function toProject(row) {
  const layers = row.architecture_layers.map((layer) => ({
    name: layer.name,
    detail: layer.detail ?? '',
  }));
  const hasArchitecture = row.architecture_description.trim() !== '' || layers.length > 0;

  return {
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    description: row.description_md.trim(),
    problem: row.problem_md.trim(),
    solution: row.solution_md.trim(),
    features: row.features,
    architecture: hasArchitecture
      ? { description: row.architecture_description.trim(), layers }
      : null,
    challenges: row.challenges_md.trim(),
    lessons: row.lessons_md.trim(),
    category: row.category.trim(),
    status: row.status,
    year: row.year,
    thumbnail: row.thumbnail_url
      ? toPicture(
          {
            url: row.thumbnail_url,
            alt: row.thumbnail_alt,
            caption: row.thumbnail_caption,
            width: row.thumbnail_width,
            height: row.thumbnail_height,
          },
          `Preview of ${row.title}`,
        )
      : null,
    screenshots: row.images.map((image) => toPicture(image, `Screenshot of ${row.title}`)),
    repoUrl: row.repo_url,
    demoUrl: row.demo_url,
    technologies: row.technology_names,
    featured: row.is_featured,
    sortOrder: row.sort_order,
  };
}

/** Read-only access to published projects, in the shape the client's projects service returns. */
export function createProjectsRepository({ pool }) {
  return {
    /** Published projects, ordered by `sortOrder`. */
    async list() {
      const { rows } = await pool.query(`${SELECT_PROJECTS} ORDER BY p.sort_order, p.id`);
      return rows.map(toProject);
    },

    /** One published project, or null (an unpublished project is the same as a missing one). */
    async findBySlug(slug) {
      const { rows } = await pool.query(`${SELECT_PROJECTS} AND p.slug = $1`, [slug]);
      return rows[0] ? toProject(rows[0]) : null;
    },
  };
}
