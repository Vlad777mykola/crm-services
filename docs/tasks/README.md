# Task archive

Numbered history of completed work — separate tracks for **frontend** and **backend**.

## Structure

Each task folder: `{major}.{minor}-{slug}/`

| File | Audience | Purpose |
|------|----------|---------|
| `guide.md` | Humans / teammates | How to use it, how it works |
| `context.md` | AI / future you | Decisions, files, constraints |

## Numbering

- IDs increment per area: `1.01`, `1.02`, … (major `1` by default).
- Frontend and backend numbering is **independent**.

## Archive a finished task

In Cursor, invoke the **archive-task** skill or say:

```
/archive-task frontend — {short title}
/archive-task backend — {short title}
```

Or: *"Archive this task using archive-task skill"*

## Reference a prior task

Tell the agent:

```
Read docs/tasks/backend/1.01-microservice-boundaries/context.md for context
```

## Index

- [Frontend tasks](./frontend/INDEX.md)
- [Backend tasks](./backend/INDEX.md)
