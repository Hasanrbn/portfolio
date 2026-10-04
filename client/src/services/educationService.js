import educationData from '@portfolio/shared/data/education.json';
import { isText, text, textList, uniqueBy } from './normalize.js';

const isYear = (value) => Number.isInteger(value) && value >= 1900 && value <= 2100;

function normalizeEducation(entry) {
  return {
    id: entry.id,
    institution: text(entry.institution),
    program: text(entry.program),
    startYear: entry.startYear,
    endYear: isYear(entry.endYear) ? entry.endYear : null,
    subjects: textList(entry.subjects),
    achievements: textList(entry.achievements),
    sortOrder: Number.isFinite(entry.sortOrder) ? entry.sortOrder : 0,
  };
}

/**
 * Cleans education data. An entry is dropped when it is hidden, lacks an id, institution or
 * program, or has a start year that is not a real year or an end year that is not one or comes
 * before the start (a missing end year means "Present"). Newest first. The shape matches what
 * GET /api/education will return in Phase 15.
 */
export function normalizeEducationList(data) {
  const entries = Array.isArray(data?.education) ? data.education : [];

  const valid = entries
    .filter((entry) => entry && entry.visible !== false)
    .filter((entry) => isText(entry.id) && isText(entry.institution) && isText(entry.program))
    .filter((entry) => isYear(entry.startYear))
    .filter(
      (entry) =>
        entry.endYear == null || (isYear(entry.endYear) && entry.endYear >= entry.startYear),
    );

  return uniqueBy(valid, (entry) => entry.id)
    .map(normalizeEducation)
    .sort((a, b) => b.startYear - a.startYear || a.sortOrder - b.sortOrder);
}

/** Async on purpose: only this function changes when the API replaces the seed file (Phase 15). */
export async function getEducation() {
  return normalizeEducationList(educationData);
}
