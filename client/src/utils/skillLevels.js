// Experience levels used on the Skills page. Three labels instead of percentages, because a
// number like "JavaScript 95%" has no objective basis. The meanings are shown to visitors.
export const SKILL_LEVELS = {
  familiar: {
    label: 'Familiar',
    tone: 'neutral',
    meaning: 'I have used it and can work with it, looking things up as needed.',
  },
  intermediate: {
    label: 'Intermediate',
    tone: 'accent',
    meaning: 'I use it regularly and can build features with it on my own.',
  },
  advanced: {
    label: 'Advanced',
    tone: 'success',
    meaning: 'I know it in depth and can design solutions and explain trade-offs.',
  },
};

export function isSkillLevel(value) {
  return typeof value === 'string' && Object.hasOwn(SKILL_LEVELS, value);
}
