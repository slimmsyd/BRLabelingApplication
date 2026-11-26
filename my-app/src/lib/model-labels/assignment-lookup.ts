/** How the workspace loads one assignment. assignmentId opens that row; otherwise the newest. */
export function assignmentLookup(input: {
  videoId: string;
  labelType: string;
  assignmentId?: string | null;
  userId?: string | null;
}): { where: Record<string, string>; orderBy: { assignedAt: 'desc' } } {
  const where: Record<string, string> = {
    videoId: input.videoId,
    labelType: input.labelType,
  };
  if (input.assignmentId) where.id = input.assignmentId;
  if (input.userId) where.userId = input.userId;
  return { where, orderBy: { assignedAt: 'desc' } };
}
