import skillsData from '@portfolio/shared/data/skills.json';
import { isSkillLevel } from '../utils/skillLevels.js';

const isText = (value) => typeof value === 'string' && value.trim() !== '';

/**
 * Cleans skill data so the page never has to guard against bad values: entries without an id
 * or name are dropped, an unknown level becomes null (no label shown) and groups left with no
 * skills disappear. The shape matches what GET /api/skills will return in Phase 15.
 */
export function normalizeSkillGroups(data) {
  const categories = Array.isArray(data?.categories) ? data.categories : [];

  return categories
    .filter((category) => isText(category?.id) && isText(category?.label))
    .map((category) => ({
      id: category.id,
      label: category.label.trim(),
      skills: (Array.isArray(category.skills) ? category.skills : [])
        .filter((skill) => isText(skill?.id) && isText(skill?.name))
        .map((skill) => ({
          id: skill.id,
          name: skill.name.trim(),
          level: isSkillLevel(skill.level) ? skill.level : null,
          description: isText(skill.description) ? skill.description.trim() : '',
        })),
    }))
    .filter((category) => category.skills.length > 0);
}

/**
 * Skills grouped by category. It is async on purpose: today it reads the bundled seed file,
 * and in Phase 15 only this function changes to fetch the API, with no change to the page.
 */
export async function getSkillGroups() {
  return normalizeSkillGroups(skillsData);
}
