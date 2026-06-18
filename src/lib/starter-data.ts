/**
 * Starter datasets for the Data tab (Pass 3b).
 *
 * Five realistic, domain-distinct piles a designer can load with one click when
 * they don't have their own data handy. Each is CSV-formatted on purpose so the
 * tool also demonstrates "paste a CSV, watch the agent structure it."
 *
 * These are EMBEDDED CONSTANTS, not files fetched from /public — deliberate, so
 * a one-click load never hits the network and can't 404 in a flaky workshop room.
 * The tab never parses this text; it pours it into the same `data` string the
 * agent receives as context. Fields containing commas are quoted so the content
 * is well-formed CSV.
 *
 * Each dataset has a status-like column and more than three rows, so it exercises
 * the default rules (status badges, "never show more than 3 items").
 */
export type StarterDataset = {
  id: string;
  /** Short button label. */
  label: string;
  /** One-line description (shown on hover). */
  description: string;
  /** The CSV's identity, e.g. "usability-findings.csv". */
  filename: string;
  /** Raw CSV content, loaded verbatim into the Data tab. */
  csv: string;
};

export const STARTER_DATASETS: StarterDataset[] = [
  {
    id: "usability",
    label: "Usability findings",
    description: "Research sessions with task, severity, and status.",
    filename: "usability-findings.csv",
    csv: `session,participant,task,severity,status,note
1,P01 senior PM,Checkout flow,high,open,Missed the promo code field entirely
2,P02 new user,Checkout flow,medium,open,Hesitated at the shipping step for 40s
3,P03 returning,Account setup,low,resolved,Minor copy confusion on 2FA
4,P04 senior PM,Search,high,open,Filters reset on back navigation
5,P05 new user,Search,critical,open,Could not find saved items at all
6,P06 returning,Checkout flow,medium,resolved,"Wanted Apple Pay, used a card instead"
7,P07 new user,Onboarding,high,open,Skipped the tutorial and got lost on the dashboard
8,P08 senior PM,Onboarding,low,resolved,Liked the progress bar
`,
  },
  {
    id: "accessibility",
    label: "Accessibility audit",
    description: "Design QA: WCAG issues by page, severity, and status.",
    filename: "accessibility-audit.csv",
    csv: `page,issue,wcag,severity,status,owner
Settings,Muted text fails AA contrast,1.4.3,high,open,Dana
Checkout,Form inputs missing labels,1.3.1,critical,open,Dana
Dashboard,Focus order skips the sidebar,2.4.3,medium,open,Lee
Profile,Image alt text missing,1.1.1,high,resolved,Lee
Search,Error shown by color only,1.4.1,medium,open,Dana
Onboarding,Animation ignores reduced-motion,2.3.3,low,open,Sam
Pricing,Heading levels jump h1 to h4,1.3.1,medium,resolved,Sam
`,
  },
  {
    id: "interviews",
    label: "Interview quotes",
    description: "Research quotes with theme and sentiment.",
    filename: "interview-quotes.csv",
    csv: `participant,role,quote,theme,sentiment
P01,Freelance designer,"I never trust the auto-layout, I redo it by hand",trust,negative
P02,Design lead,The handoff doc is the first thing engineers ignore,handoff,negative
P03,Product designer,When tokens are named well I move twice as fast,tokens,positive
P04,Researcher,"I keep notes in five places, then lose all of them",tooling,negative
P05,Design lead,An hour pairing with an engineer saves a week,collaboration,positive
P06,Freelance designer,Clients want it fast more than they want it right,pressure,negative
`,
  },
  {
    id: "content",
    label: "Content calendar",
    description: "Campaign assets by date, channel, and status.",
    filename: "content-calendar.csv",
    csv: `date,channel,asset,status,owner
2026-07-01,Newsletter,July product roundup,draft,Mia
2026-07-03,LinkedIn,Case study carousel,in review,Mia
2026-07-08,Blog,GenUI explainer post,blocked,Tania
2026-07-10,Instagram,Behind-the-scenes reel,scheduled,Jo
2026-07-15,Newsletter,Workshop recap,not started,Mia
2026-07-18,LinkedIn,Hiring announcement,draft,Jo
`,
  },
  {
    id: "sprint",
    label: "Sprint board",
    description: "Design tasks by owner, status, and priority.",
    filename: "sprint-board.csv",
    csv: `task,owner,status,priority,note
Redesign empty states,Ari,in progress,high,Three screens left
Token migration QA,Dana,blocked,high,Waiting on the staging deploy
Onboarding copy pass,Sam,done,medium,Shipped Monday
Search filter rework,Lee,todo,critical,Resets on back nav (see usability)
Icon set cleanup,Ari,todo,low,Nice to have
Pricing page a11y fixes,Sam,in progress,medium,Two issues remain
`,
  },
  {
    id: "prioritization",
    label: "Prioritization grid",
    description: "Initiatives scored by effort and impact (0-100), with status.",
    filename: "prioritization.csv",
    csv: `initiative,effort,impact,status,owner
Search filter rework,30,85,open,Lee
Icon set cleanup,20,25,open,Ari
Onboarding redesign,75,80,open,Sam
Token migration,60,40,in progress,Dana
Empty-state polish,25,55,open,Ari
Pricing page a11y,35,45,open,Sam
`,
  },
];
