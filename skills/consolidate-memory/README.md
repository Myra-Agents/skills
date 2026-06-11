# Consolidate Memory

Extract persistent learnings from the current session and write them to the
project's auto-memory system (`~/.claude/projects/<project>/memory/`).

```
read context → classify signals → draft memories → write files → update MEMORY.md
```

Invoke with `/consolidate-memory` or say "consolidate learnings" / "save what
we learned". The skill also triggers automatically after a long debugging
session or when the user validates a non-obvious approach.

## What it captures

| Signal | Memory type |
|--------|-------------|
| User corrections ("no, not that") | `feedback` |
| Validated non-obvious choices | `feedback` |
| Project decisions, constraints, incidents | `project` |
| User role / expertise / preferences | `user` |
| External resource locations | `reference` |

## What it skips

- Anything already in a `CLAUDE.md` file
- Code patterns visible in the repo
- Git history (use `git log`)
- Debugging recipes (the fix is in the code)
- Temporary / in-progress state

## Install

```bash
npx skills add https://github.com/Myra-Agents/skills --skill consolidate-memory
```
