/** Read-only access to education entries, newest first, in the client's shape. */
export function createEducationRepository({ pool }) {
  return {
    async list() {
      const { rows } = await pool.query(
        `SELECT slug AS id, institution, program, start_year, end_year,
                subjects, achievements, sort_order
           FROM education
          WHERE is_visible
          ORDER BY start_year DESC, sort_order, id`,
      );

      return rows.map((row) => ({
        id: row.id,
        institution: row.institution,
        program: row.program,
        startYear: row.start_year,
        endYear: row.end_year,
        subjects: row.subjects,
        achievements: row.achievements,
        sortOrder: row.sort_order,
      }));
    },
  };
}
