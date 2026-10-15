import skillsData from '@portfolio/shared/data/skills.json';
import { isSkillLevel } from '../utils/skillLevels.js';

const isText = (value) => typeof value === 'string' && value.trim() !== '';

/**
 * Cleans skill data so the page never has to guard against bad values: entries without an id
 * or name are dropped, an unknown level becomes null (no label shown) and groups left with no
 * skills disappear.
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
 * Adds each skill's logo path (`icon`, an empty string when there is none) to the groups. Only
 * the skill's own entry counts: an id such as "constructor" must not pick up something that
 * every object inherits.
 */
export function withIcons(groups, iconPaths) {
  return groups.map((group) => ({
    ...group,
    skills: group.skills.map((skill) => ({
      ...skill,
      icon: Object.hasOwn(iconPaths, skill.id) ? iconPaths[skill.id] : '',
    })),
  }));
}

/**
 * Skills grouped by category. It is async on purpose: the page already shows loading and error
 * states, so where the data comes from can change without touching it. Today it is the bundled
 * file in shared/data. The logos (about 10 KB) are fetched here too, as a separate file, so only
 * visitors who open the Skills page download them.
 */
export async function getSkillGroups() {
  const { SKILL_ICON_PATHS } = await import('../utils/skillIcons.js');
  return withIcons(normalizeSkillGroups(skillsData), SKILL_ICON_PATHS);
}
