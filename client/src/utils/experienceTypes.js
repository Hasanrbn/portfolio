// The kinds of experience, so a visitor can tell a job from a personal or academic project.
// Without formal work experience, the honest types are academic, personal, organization and volunteer.
export const EXPERIENCE_TYPES = {
  employment: 'Employment',
  internship: 'Internship',
  freelance: 'Freelance',
  academic: 'Academic project',
  personal: 'Personal project',
  organization: 'Organization',
  volunteer: 'Volunteer',
};

export function isExperienceType(value) {
  return typeof value === 'string' && Object.hasOwn(EXPERIENCE_TYPES, value);
}
