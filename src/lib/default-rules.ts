/**
 * Default design rules — the starter content of the Rules tab.
 *
 * This is the file attendees rewrite in plain English during Act 2.
 * The text is sent to the agent verbatim as design policy. There is no
 * special syntax: write rules the way you would brief a junior designer.
 */
export const DEFAULT_RULES = `# My design rules

- Always start with one heading that names the task, not the data.
- Group related items into cards. One idea per card.
- Use badges for status only: "blocked" is always danger, "done" is always success.
- Never show more than 3 items per list. If there are more, show the top 3
  and say how many were left out.
- Never invent data that isn't in my Data tab.
- Keep all text short. No paragraphs longer than two sentences.
`;

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
