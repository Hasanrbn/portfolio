// Same order and labels as the skills page: the five categories in a fixed order, each
// labelled with its capitalised id (the seed file does the same).
const CATEGORY_ORDER = ['frontend', 'backend', 'database', 'tools', 'other'];
const capitalise = (id) => id.charAt(0).toUpperCase() + id.slice(1);

/** Read-only access to skills. Returns the same shape as the client's skills service. */
export function createSkillsRepository({ pool }) {
  return {
    /** Skill groups: [{ id, label, skills: [{ id, name, level, description }] }]. */
    async listGroups() {
      const { rows } = await pool.query(
        `SELECT t.slug AS id, t.name, t.category, s.level, s.description
           FROM skills s
           JOIN technologies t ON t.id = s.technology_id
          WHERE s.is_visible
          ORDER BY s.sort_order, t.name, s.id`,
      );

      return CATEGORY_ORDER.map((category) => ({
        id: category,
        label: capitalise(category),
        skills: rows
          .filter((row) => row.category === category)
          .map(({ id, name, level, description }) => ({ id, name, level, description })),
      })).filter((group) => group.skills.length > 0);
    },
  };
}
