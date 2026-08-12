---
name: improve-codebase-architecture
description: >-
  Scan crm-services frontend/backend for deepening opportunities, present them
  as a visual HTML report, then grill through whichever one you pick. Use when
  the user asks to improve architecture, scale the codebase, review structure,
  or find refactoring opportunities.
disable-model-invocation: true
---

# Improve Codebase Architecture

Surface architectural friction and propose **deepening opportunities** — refactors that turn shallow modules into deep ones. The aim is testability and AI-navigability.

This command is informed by the project's domain model and built on a shared design vocabulary:

- Run the `/codebase-design` skill for the architecture vocabulary (**module**, **interface**, **depth**, **seam**, **adapter**, **leverage**, **locality**).
- Domain language lives in `docs/architecture/*.md` and per-task `docs/tasks/{area}/{id}-*/context.md`. Do not re-litigate decisions recorded there.

## Process

### 1. Explore

**Scope before you scan — YAGNI.** Put extra weight on recently changed areas (`git log --oneline`).

Read first:

- `docs/architecture/target-production-architecture.md`
- `docs/architecture/service-ownership.md`
- `docs/architecture/event-driven-model.md`
- Relevant `docs/tasks/*/INDEX.md` and latest task `context.md` files

Then explore frontend (`frontend/src/`) and backend (`backend/src/`) separately:

- Where does understanding one concept require bouncing between many small modules?
- Where are modules **shallow** — interface nearly as complex as the implementation?
- Where do tightly-coupled modules leak across their seams?
- Which parts are untested or hard to test through their current interface?

Apply the **deletion test** to anything you suspect is shallow.

### 2. Present candidates as an HTML report

Write a self-contained HTML file to the OS temp directory (`%TEMP%` on Windows, `/tmp` on Linux/macOS): `architecture-review-crm-services-<timestamp>.html`. Open it for the user (`start` on Windows, `open` on macOS, `xdg-open` on Linux).

Each candidate card includes:

- **Files** — which modules are involved
- **Problem** — why the current architecture causes friction
- **Solution** — plain English description of what would change
- **Benefits** — locality, leverage, testability
- **Before / After diagram**
- **Recommendation strength** — `Strong`, `Worth exploring`, or `Speculative`

End with a **Top recommendation** section.

Use vocabulary from `/codebase-design`. Reference domain terms from architecture docs (Appointment, Company, Outbox, etc.).

If a candidate contradicts a recorded task decision, mark it clearly — only surface when friction is real enough to reopen.

### 3. Grilling loop

Once the user picks a candidate, run `/grilling` to walk the decision tree.

As decisions crystallize:

- **New architectural decision?** Offer to archive via `/archive-task` (`guide.md` + `context.md`).
- **Sharpening a fuzzy term?** Update the relevant `context.md` or `docs/architecture/` doc.
- **Exploring alternative interfaces?** Use `/codebase-design` design-it-twice thinking (two radically different interface shapes, compare on depth and seam placement).

Do not implement until the user confirms shared understanding after grilling.

## CRM-specific scaling lens

When scanning this repo, weight these migration axes (from `docs/architecture/`):

| Axis | Current signal | Target |
|------|----------------|--------|
| Backend process | HTTP API + gated in-process notifications | HTTP only; side effects via outbox → `services/*` |
| Import boundaries | ESLint rules exist; ~65 backend + 3 frontend violations | Zero violations per extractable module |
| Contracts | Hand-written OpenAPI + Zod; frontend fetch wrappers | Generated types both sides (Orval / openapi-typescript) |
| Data ownership | Single Postgres, shared entities | Per-service ownership per `service-ownership.md` |
| Read paths | `dashboard` fans out across 8+ modules | Read model or dedicated query module at a clean seam |

## Source

Adapted from [mattpocock/skills — improve-codebase-architecture](https://github.com/mattpocock/skills/blob/main/skills/engineering/improve-codebase-architecture/SKILL.md).
