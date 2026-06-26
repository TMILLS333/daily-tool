/**
 * Default design rules — EMPTY by design.
 *
 * Rules are the SOFT, optional escape hatch: the agent is asked to follow them
 * but nothing enforces it (unlike the Catalog, which is enforced at render).
 * They start empty so the tool never implies that typing prose is how you
 * steer — the real levers are the catalog (membership + descriptions) and
 * theme. A designer reaches for a rule only if those aren't enough, knowing it
 * is not guaranteed to be used.
 */
export const DEFAULT_RULES = "";

/**
 * Default content of the Data tab, so the first run works before anyone
 * pastes anything. Deliberately messy: the point is that the agent
 * structures it.
 */
export const DEFAULT_DATA = `standup notes tuesday —
auth flow redesign: waiting on legal review of the consent copy (BLOCKED)
new onboarding illustrations: sketches approved, vectors in progress
usability round 3: 5 of 8 sessions done, two no-shows, recruiting 2 more
design tokens migration: done, shipped monday
bug: settings page contrast fails AA on the muted text, needs a token fix
offsite planning doc due friday
`;

/** The canonical request, used as the placeholder and the first-run value. */
export const DEFAULT_REQUEST =
  "Turn this into a status board I can read in ten seconds.";
