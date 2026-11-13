// Principal class only: secondary skills never confer tracker exclusivity.
export const primaryClass = c => c?.birth?.classId ?? c?.abilityProfile?.class?.id ?? c?.primaryClassId ?? c?.abilities?.class?.id ?? c?.spaceOutlawsSkills?.classId;
export const isTracker = c => primaryClass(c) === 'TRA';
