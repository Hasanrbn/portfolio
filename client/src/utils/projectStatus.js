// Project statuses and how they are shown. The label is always visible text, so the colour
// is never the only signal.
export const PROJECT_STATUSES = {
  planned: { label: 'Planned', tone: 'warning' },
  in_progress: { label: 'In progress', tone: 'accent' },
  completed: { label: 'Completed', tone: 'success' },
  archived: { label: 'Archived', tone: 'neutral' },
};

export function isProjectStatus(value) {
  return typeof value === 'string' && Object.hasOwn(PROJECT_STATUSES, value);
}
