import experiencesData from '@portfolio/shared/data/experiences.json';
import { isExperienceType } from '../utils/experienceTypes.js';
import { isMonth } from '../utils/dates.js';
import { isText, text, textList, uniqueBy } from './normalize.js';

function normalizeExperience(entry) {
  const hasEnd = isText(entry.endDate);

  return {
    id: entry.id,
    position: text(entry.position),
    organization: text(entry.organization),
    type: isExperienceType(entry.type) ? entry.type : null,
    startDate: entry.startDate,
    endDate: hasEnd ? entry.endDate : null,
    description: text(entry.description),
    responsibilities: textList(entry.responsibilities),
    technologies: textList(entry.technologies),
    sortOrder: Number.isFinite(entry.sortOrder) ? entry.sortOrder : 0,
  };
}

/**
 * Cleans experience data. An entry is dropped when it is hidden, lacks an id, position or
 * organization, or has dates that are not "YYYY-MM" or that end before they start. A wrong date
 * is never guessed at (an unreadable end date must not turn into "Present"). The result is
 * newest first.
 */
export function normalizeExperiences(data) {
  const entries = Array.isArray(data?.experiences) ? data.experiences : [];

  const valid = entries
    .filter((entry) => entry && entry.visible !== false)
    .filter((entry) => isText(entry.id) && isText(entry.position) && isText(entry.organization))
    .filter((entry) => isMonth(entry.startDate))
    .filter((entry) => !isText(entry.endDate) || isMonth(entry.endDate))
    .filter((entry) => !isText(entry.endDate) || entry.endDate >= entry.startDate);

  return uniqueBy(valid, (entry) => entry.id)
    .map(normalizeExperience)
    .sort((a, b) => b.startDate.localeCompare(a.startDate) || a.sortOrder - b.sortOrder);
}

/** Async on purpose: the pages already show loading and error states, so where the data comes from can change without touching them. */
export async function getExperiences() {
  return normalizeExperiences(experiencesData);
}
