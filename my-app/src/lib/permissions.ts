/**
 * Round-assignment access control.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  WHO CAN ASSIGN / RE-ASSIGN / UNASSIGN ROUNDS TO OTHER PEOPLE.
 *  This list is the WHOLE control surface:
 *    • To grant someone  → add their email below.
 *    • To revoke someone → delete (or comment out) their line.
 *  Keep emails lowercase. After editing, redeploy for it to take effect.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Note: this does NOT affect labelers picking up their OWN unassigned rounds —
 * that stays open to everyone. It only governs assigning rounds to other users
 * (and removing assignments).
 */
export const ROUND_ASSIGNERS: string[] = [
  'syd@boxraw.com', // Sydney
  'hueman@boxraw.com', // hue
  // 'olly@boxraw.com', // Olly — revoked (re-add this line to give it back)
];

/**
 * True if the given email is allowed to assign / re-assign / unassign rounds.
 * Used by both the API routes (server enforcement) and the UI (control visibility).
 */
export function canAssignRounds(email?: string | null): boolean {
  if (!email) return false;
  return ROUND_ASSIGNERS.includes(email.trim().toLowerCase());
}
