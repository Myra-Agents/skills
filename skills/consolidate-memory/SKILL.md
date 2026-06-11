---
name: consolidate-memory
description: >
  Extract persistent learnings from the current session and save them to the
  auto-memory system. Triggers when the user says "consolidate", "consolidate
  learnings", "save learnings", "what did we learn", "save what we learned",
  "extract memories from this session", or invokes /consolidate-memory. Also
  trigger proactively after a long debugging session, a corrected approach, or
  when the user explicitly validates something non-obvious. Do NOT wait for the
  user to ask if the session clearly produced memorable learnings.
---

# Consolidate Memory

Scan the current conversation, extract what's worth keeping across future
sessions, and write it to the project's auto-memory system.

```
read context → classify signals → draft memories → write files → update MEMORY.md
```

## 1. Compute the memory directory

```bash
MEMORY_DIR="$HOME/.claude/projects/$(pwd | sed 's|^/||; s|/|-|g')/memory"
```

Verify it exists: `ls "$MEMORY_DIR"`. If the directory doesn't exist, the
project has no memory system — tell the user and stop.

## 2. Check what's already documented

Before scanning for signals, grep the CLAUDE.md files to know what's already
written down — anything captured there does NOT need a memory file:

```bash
# Find all CLAUDE.md files in the project tree
find . -name "CLAUDE.md" -not -path "*/node_modules/*" | head -10
# Then grep them for relevant terms as you identify candidate learnings
grep -l "git clone\|TUI\|bootstrap" CLAUDE.md */CLAUDE.md 2>/dev/null
```

If a learning is already stated in any CLAUDE.md, skip it. Memory files are
for what code/docs can't capture — behavioral preferences, incident context,
team decisions, non-obvious constraints.

## 3. Scan for signals worth keeping

Read the entire visible conversation. Extract only what a future Claude instance
couldn't derive from the code, git history, or CLAUDE.md files.

**High-value signals:**
- User corrections — "no, not that", "stop doing X", explicit pushback on an
  approach you chose
- Validated non-obvious choices — user accepted an unusual approach without
  complaint (silence after an unexpected call = implicit confirmation)
- "Aha" moments — a discovery that changed direction or resolved a persistent
  confusion
- Project facts — deadlines, constraints, architectural decisions, external
  dependencies not obvious from code
- User profile updates — revealed expertise, domain, workflow preferences

**Low-value / skip:**
- Code patterns already visible in files
- Git history (use `git log` instead)
- Temporary state or in-progress work
- Things already in MEMORY.md (check before writing)
- Things already in any CLAUDE.md file (checked above)
- Debugging recipes (the fix is in the code)

## 4. Classify each learning

| Signal | Type |
|--------|------|
| Correction / "don't do X" / behavioral preference | `feedback` |
| Project fact, deadline, architectural decision, incident | `project` |
| User role, expertise, workflow preference | `user` |
| Pointer to external resource, location of info | `reference` |

## 5. Draft each memory file

Read the current MEMORY.md index to avoid duplicates. For an existing entry,
update the file rather than creating a new one.

**Filename:** `<type>_<slug>.md` — short, lowercase, kebab-case. Examples:
`feedback_no_mock_db.md`, `project_release_freeze.md`, `user_go_expert.md`.

**File format:**
```markdown
---
name: <kebab-case-slug>
description: <one-line summary — specific enough to judge relevance cold>
metadata:
  type: <feedback|project|user|reference>
---

<body — see structure below>
```

**Body structure by type:**

*feedback:*
```
<The rule itself — what to do or avoid.>

**Why:** <reason the user gave, or inferred from context>
**How to apply:** <when this kicks in, scope, edge cases>
```

*project:*
```
<The fact or decision.>

**Why:** <motivation — constraint, deadline, stakeholder>
**How to apply:** <how this should shape future suggestions>
```

*user:* free-form, focused on role / expertise / preferences relevant to
collaboration.

*reference:* `<resource> at <location> — <what it's used for>`.

Convert any relative dates to absolute (e.g. "Thursday" → "2026-06-12").

Link related memories with `[[their-name]]` slugs in the body.

## 6. Write files + update MEMORY.md

Write each new or updated file. Then update `$MEMORY_DIR/MEMORY.md`:
- New entry: append `- [Title](filename.md) — <one-line hook>` under the
  relevant section (or at the end). Keep entries under ~150 chars.
- Updated entry: edit the existing line if the hook is now stale.

Keep MEMORY.md under 200 lines total.

## 7. Report to user

List what you wrote, one line each:
```
Saved 3 memories:
• feedback_no_mock_db.md — don't mock the DB in integration tests
• project_auth_rewrite.md — auth middleware rewrite driven by compliance, not tech debt
• user_go_expert.md — deep Go expertise, new to React
```

If nothing was worth saving, say so plainly: "Nothing novel this session —
all learnings already captured or derivable from code."

## Edge cases

- **Nothing to save:** don't create empty or trivial files.
- **Ambiguous signal:** prefer `feedback` over `project` if in doubt.
- **Multiple learnings same topic:** merge into one file rather than
  fragmenting.
- **Sensitive info** (credentials, PII): never write to memory. Flag it to the
  user if found in the conversation.
