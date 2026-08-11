---
name: archive-task
description: >-
  Archive finished work into numbered task folders under docs/tasks (frontend or
  backend). Creates guide.md (human/teammate) and context.md (AI reference).
  Use when the user says archive task, document this work, save task context,
  /archive-task, or at the end of a completed frontend/backend task.
disable-model-invocation: true
---

# Archive Task

Archive completed work so teammates and future AI sessions can find how and why it was done.

## Folder layout

```
docs/tasks/
  frontend/
    INDEX.md
    1.01-slug/
      guide.md    # short, human — how to use, how it works
      context.md  # dense — decisions, files, constraints for AI
  backend/
    INDEX.md
    1.01-slug/
      guide.md
      context.md
```

- **Area**: `frontend` or `backend` (never mix in one folder).
- **ID**: `major.minor-slug` (default major `1`, minor auto-increments: `1.01`, `1.02`, …).
- **Slug**: lowercase, hyphenated, max 40 chars, derived from task title.

## When to run

User finished a task and wants history preserved — invoke explicitly (`archive this task`, `/archive-task`).

If work touched **both** areas, create **two** folders (one per area) with matching IDs only if same epic; otherwise independent numbering per area.

## Workflow

Copy this checklist and track progress:

```
Archive progress:
- [ ] Step 1: Confirm area(s) and short title
- [ ] Step 2: Compute next task ID
- [ ] Step 3: Create folder and write guide.md + context.md
- [ ] Step 4: Update area INDEX.md
- [ ] Step 5: Tell user folder path and ID
```

### Step 1: Gather content

From the conversation and `git diff` (if available):

- **guide.md**: what it is, when to use, how it works, commands, teammate notes. No jargon walls; 1–2 pages max.
- **context.md**: goal, files changed, architecture decisions, lint/test commands, follow-ups, links to prior task IDs.

Do **not** paste large code blocks — reference paths. Do **not** duplicate INDEX content in both files.

### Step 2: Next task ID

From repo root:

```bash
node .cursor/skills/archive-task/scripts/next-task-id.mjs frontend
node .cursor/skills/archive-task/scripts/next-task-id.mjs backend
```

Optional third arg = major number (default `1`).

### Step 3: Create files

Use templates in [templates/](templates/). Folder name: `{id}-{slug}`.

### Step 4: Update INDEX.md

In `docs/tasks/{area}/INDEX.md`, append a row:

```markdown
| ID | Slug | Summary | Date |
|----|------|---------|------|
```

Keep table sorted by ID.

### Step 5: Report

Tell the user:

- Full path(s) created
- ID for future references (`see backend task 1.02`)
- One-line summary

## Referencing prior tasks

In new work, point agents at `docs/tasks/{area}/{id}-*/context.md` for continuity.

## Quality bar

**guide.md** — a new teammate can use the feature without reading the chat.

**context.md** — an agent can continue the work without re-exploring the repo.

Apply [writing-for-agents](https://github.com/mattpocock/skills/blob/main/docs/productivity/writing-for-agents.md) principles: short, pointer-heavy, no no-ops.

## Templates

- Human guide: [templates/guide.md](templates/guide.md)
- AI context: [templates/context.md](templates/context.md)
