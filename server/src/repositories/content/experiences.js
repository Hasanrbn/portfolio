/** Read-only access to experience entries, newest first, in the client's shape. */
export function createExperiencesRepository({ pool }) {
  return {
    async list() {
      const { rows } = await pool.query(
        `SELECT e.slug AS id, e.position, e.organization, e.type,
                to_char(e.start_date, 'YYYY-MM') AS start_date,
                to_char(e.end_date, 'YYYY-MM') AS end_date,
                e.description, e.responsibilities, e.sort_order,
                COALESCE((SELECT json_agg(t.name ORDER BY et.position)
                            FROM experience_technologies et
                            JOIN technologies t ON t.id = et.technology_id
                           WHERE et.experience_id = e.id), '[]'::json) AS technologies
           FROM experiences e
          WHERE e.is_visible
          ORDER BY e.start_date DESC, e.sort_order, e.id`,
      );

      return rows.map((row) => ({
        id: row.id,
        position: row.position,
        organization: row.organization,
        type: row.type,
        startDate: row.start_date,
        endDate: row.end_date,
        description: row.description.trim(),
        responsibilities: row.responsibilities,
        technologies: row.technologies,
        sortOrder: row.sort_order,
      }));
    },
  };
}
