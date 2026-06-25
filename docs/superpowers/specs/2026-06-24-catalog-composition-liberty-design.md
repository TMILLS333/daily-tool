# Catalog Composition Liberty — Design Spec

- **Date:** 2026-06-24
- **Branch:** `catalog-expansion` (worktree `../daily-tool-catalog`, based off `d6466b5`)
- **Status:** Approved design, pending user review of this spec
- **Methodology note:** written as a brainstorming design doc; the file list below doubles as the AFP for the MCD Micro-Contract. Execution waits for Tania's explicit trigger.

## Context

The question that started this: "I only have the basic catalog, how do I get to the full A2UI Composer Gallery?" The grounded answer (verified against the CopilotKit `a2ui-renderer` skill and the [Fixed Schema A2UI docs](https://docs.copilotkit.ai/generative-ui/a2ui/fixed-schema)) is that the Gallery cards are **compositions of small primitives inside layout containers**, not monolithic card components. CopilotKit's own flight-card reference is a 5-piece domain catalog (`Title`, `Airport`, `Arrow`, `AirlineBadge`, `PriceTag`) merged with the basic catalog (`Card`, `Column`, `Row`, `Text`, `Button`) and composed by the agent.

The instinct that "you should not hardcode a portfolio/stat card" is half right: the A2UI philosophy leans away from opaque monolith cards (the v0.8 "Standard" set was renamed "Basic" to signal it is a fallback), but it does not forbid your own components, and Fixed Schema explicitly recommends building known surfaces. The resolution adopted here: **partition by surface**.

- **Structural widgets** (Kanban, Table, Matrix, Timeline, PieChart) stay monolithic leaves. They earn it: they are algorithmic layouts that cannot be composed from Text and Rows. Already shipped. Untouched.
- **Editorial surfaces** (profile, stat, portfolio) are reached by **composition** — more layout liberty for the agent, the documented gallery pattern.

The "having both A and B causes a problem" worry is real only if the agent gets two ways to render the same surface (a `StatCard` leaf AND stat primitives). This slice adds **no monolith cards**, so that conflict never arises.

## Goal

Give the agent more composition liberty than "Stack only" by:

1. Adding three display-only primitives from the A2UI basic catalog that fit the no-state, presentational thesis: **`Image`**, **`Icon`**, **`Divider`**.
2. Making **`Card` a composer** (it can hold children) so the agent assembles gallery-grade cards.

Applies to the **Declarative** pattern in **both** render paths (simplified + real A2UI), kept in parity.

## Non-goals (out of scope)

- No Static/Controlled (`show_*` tool) changes; no Open-Ended changes.
- No monolithic `ProfileCard` / `StatCard` / `PortfolioCard` component.
- No interactive/stateful basic-catalog components (TextField, CheckBox, Slider, DateTimeInput, ChoicePicker, Tabs, Modal, AudioPlayer, Video) — they contradict the display-only positioning vs base44.
- **Fenced follow-up (not this slice):** the Image-honesty on/off switch (see below).

## The three new primitives

All token-driven (`--dt-*`), no external dependencies, matching the hand-rolled-SVG house style of `DTPieChart`.

### `Image`
- **Props:** `alt` (string, required), `src` (string, optional).
- **Behavior:** renders `<img>` when `src` is present and non-empty, with an `onError` fallback to the placeholder (so a broken or hallucinated URL degrades gracefully, never a broken-image glyph). When `src` is absent, renders a branded placeholder box (token border + subtle fill, a small image glyph, `alt` as caption).
- **Honesty rule (default, soft):** the agent must set `src` **only** when the user's data carries a real image URL; it must never invent one. This rule lives in the **Image component description itself** (the same place `Timeline` and `Matrix` carry "do not invent dates / scores"), so it propagates to both routes through the existing prompt assembly (`catalogPromptText` and `A2UI_SCHEMA`). It extends the structure-honesty thesis to imagery: the agent can compose a profile card but cannot fabricate the face.
- **Mode note:** the renderer is identical for honest (#1) and permissive (#2) modes. The only difference is the prompt line. This is what makes the fenced follow-up cheap.

### `Icon`
- **Props:** `name` (enum from a small curated set: `check`, `info`, `warning`, `star`, `calendar`, `dot`, `arrow-right`), `label` (string, optional, for a11y).
- **Behavior:** inline SVG map keyed by `name`, colored via tokens / `currentColor`. Unknown `name` falls back to a neutral `dot`. No icon-library dependency.

### `Divider`
- **Props:** none.
- **Behavior:** a token-driven hairline rule (`--dt-border`), vertical rhythm via `--dt-gap`.

## `Card` becomes a composer

- **Simplified path (`catalog.tsx`):** set the `Card` entry to `container: true`; make `title` (and keep `body`) optional in the zod props; update the description to note it may hold child components. `DTCard` already accepts and renders `children` ([catalog-primitives.tsx:40](../../../src/components/catalog-primitives.tsx)), so the only renderer change is making `title` optional.
- **Real A2UI path (`a2ui-spike-catalog.tsx`):** give the `Card` definition the same `children` (id array) + `childIds` (alias) props as `Stack`, and give its renderer the Stack-style by-id resolver (`children(id)` buildChild), because A2UI references children by ID. Update the `A2UI_SCHEMA` Card description in the spike route accordingly.
- **Backward compatible:** `title` + `body` leaf usage still renders unchanged.

## File-by-file change list (AFP)

1. `src/components/catalog-primitives.tsx` — add `DTImage`, `DTIcon`, `DTDivider`; make `DTCard.title` optional. (`children` already supported.)
2. `src/lib/catalog.tsx` — register `Image`, `Icon`, `Divider` (`enabled: true`) with descriptions + zod props; set `Card` `container: true` and `title` optional; add `CATALOG_SAMPLES` for the three (and a child sample for Card).
3. `src/lib/a2ui-spike-catalog.tsx` — add `Image`, `Icon`, `Divider` definitions + renderers; add the by-id child resolver to `Card`.
4. `src/app/api/copilotkit-a2ui-spike/[[...slug]]/route.ts` — add the three to `A2UI_SCHEMA` (mirroring the catalog descriptions, including the Image honesty line in the Image description); update the `Card` description to note it can hold children.
5. `src/app/api/copilotkit/[[...slug]]/route.ts` — **two halves.** The simplified `default` agent derives its catalog from `catalogPromptText`, so the new `CATALOG` entries and the Image honesty line propagate automatically (no edit). The shipped real-A2UI `declarativeA2UI` agent carries its OWN inline `A2UI_SCHEMA` (separate from the spike route's), which IS edited here: add the three components, update the `Card` description.
6. `src/components/CatalogTab.tsx` — add `Image`, `Icon`, `Divider` to the `BASIC` grouping array. **Discovered during verification:** the Catalog tab groups by hardcoded name lists (`BASIC` / `STRUCTURED`) by design (grouping lives in the view layer), so new `CATALOG` entries do NOT auto-surface. The original AFP's "no UI change" assumption was wrong; the slice stays a focused six files.

## Enablement defaults

`Image`, `Icon`, `Divider` all default `enabled: true` (maximize composition liberty; Image on so it can be tested immediately). Each is disable-able in the Catalog tab via the existing `enabledNames` mechanism.

## Acceptance criteria

Verified on a keyed production build (`next build` + a real Gemini run), per house practice.

1. Build passes with no type errors.
2. Catalog tab lists `Image`, `Icon`, `Divider` with live samples; the `Card` sample shows a nested child.
3. Simplified Declarative: a prompt warranting a composed card (e.g. "make a profile card for <person from pasted data>") produces a `Card` containing children (e.g. Image placeholder + Heading + Badge) that validates and renders.
4. Real A2UI (experimental path): the same composed card renders, with `Card` children resolved by ID.
5. `Image` with no `src` renders the branded placeholder + `alt` caption; with a user-provided `src` renders the image; a broken `src` falls back to the placeholder via `onError`.
6. Honest mode holds: across a few runs where the pasted data has no image URL, the agent does not emit a `src` (soft, prompt-enforced; spot-checked).
7. No regression: the five structured widgets and the existing patterns still render unchanged.

## Fenced follow-up (separate slice, after honest mode is proven)

**Image-honesty on/off switch.** A designer-facing rule lever that flips the Image prompt line between honest (#1, never invent `src`) and permissive (#2, may supply a fitting `src`) for testing. Default honest. Requires no renderer change (the `onError` fallback already makes permissive mode safe). Add only after Tania has seen honest mode render cleanly a few times.

## Isolation / merge notes

- All work on `catalog-expansion` in the `../daily-tool-catalog` worktree. The parallel UI-cleanup session keeps `studio-ui-cleanup` with its uncommitted `DataTab.tsx` / `TeachingCard.tsx`, untouched.
- Zero file overlap between this slice's AFP and the parallel session's dirty files, so a later merge is clean.
- Base is `d6466b5` (CopilotKit 1.60.1, latest catalog), not the older `main` (`eb1bf30`).

## Outcomes Record (Closeout)

- **Status:** key-free criteria CLOSED; agent-driven criteria PENDING a keyed run.
- **Files delivered (AFP, six):** `catalog-primitives.tsx`, `catalog.tsx`, `a2ui-spike-catalog.tsx`, `api/copilotkit/route.ts`, `api/copilotkit-a2ui-spike/route.ts`, `CatalogTab.tsx`.
- **AFP corrections (recorded honestly):** the original five-file AFP (a) mischaracterized the main route as verify-only — it carries the shipped real-A2UI `A2UI_SCHEMA`, which was edited — and (b) missed `CatalogTab.tsx`, whose hardcoded `BASIC`/`STRUCTURED` grouping does not auto-surface new entries. Both folded in above; no expansion beyond the slice's intent.
- **Verified:**
  - Criterion 1 (build): PASS. `next build` compiled, TypeScript passed, both routes generated, zero errors.
  - Criterion 2 (Catalog tab): PASS. `Image` (honest captioned placeholder), `Icon` (brand-teal check glyph), `Divider` (hairline) render in BASIC; the `Card` sample shows nested children; `PieChart`/`Table` unchanged (no regression). Browser console clean.
- **Pending a keyed Gemini run (the worktree has no `.env` key):** criterion 3 (composed card, simplified path), 4 (composed card, real-A2UI path), 5 (real-`src` render path), 6 (honest mode holds across runs).
- **Isolation:** all on `catalog-expansion`; the parallel `studio-ui-cleanup` working tree was untouched throughout.
