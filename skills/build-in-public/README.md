# Build in Public

Turn a shipped release into **review-ready launch copy** — a skill for Claude
Code (and any agent that supports skills — OpenCode, Codex, Cursor). It reads
your changelog since the previous tag and writes one English draft per channel:
an **X/Twitter thread**, a **LinkedIn post**, and (for major releases) a
**Product Hunt launch kit**.

```
Resolve release → Changelog → Project context → Draft per channel → [you review the files] → Report + checklist
```

It **drafts, never posts** — files land in `build-in-public/<tag>/` for you to
edit and publish manually. No API keys, no auto-posting: the agent itself writes
the copy.

## How it works

1. **Resolves the release** — the tag you name (or the latest), and whether it's
   a *major* (`vX.0.0`) release, which adds the Product Hunt kit.
2. **Builds the changelog** — `scripts/changelog.sh` groups Conventional Commits
   (Features / Fixes / Improvements) since the previous tag *in the same series*
   (`v*` and `server-v*` never cross), counting maintenance noise instead of
   listing it.
3. **Learns the voice** — product one-liner, links, and tone from the repo's
   README / CLAUDE.md / package.json / existing public copy.
4. **Writes the drafts** — `x-thread.md`, `linkedin.md`, and (major)
   `producthunt.md`, each per the format specs in `references/platforms.md`.
5. **Reports** — output dir, file list, and a posting checklist.

## Install

```bash
npx skills add https://github.com/Myra-Agents/skills --skill build-in-public
```

## Usage

After tagging a release, ask to announce it — "build in public for v1.2.0",
"write a launch thread for this release" — or run `/build-in-public v1.2.0`. It
auto-triggers on the phrases in `SKILL.md`'s `description`.

| Agent | Global path | Project path |
|-------|-------------|--------------|
| Claude Code | `~/.claude/skills/build-in-public/` | `.claude/skills/build-in-public/` |
| OpenCode | `~/.config/opencode/skill/build-in-public/` | `.opencode/skill/build-in-public/` |
| Codex | `~/.codex/skills/build-in-public/` | `.codex/skills/build-in-public/` |
| Cursor | `~/.cursor/skills/build-in-public/` | `.cursor/skills/build-in-public/` |

## Structure

```
build-in-public-skill/
├── SKILL.md                 # the skill itself (frontmatter + procedure)
├── scripts/
│   └── changelog.sh         # grouped Conventional-Commit changelog for a tag
├── references/
│   ├── platforms.md         # per-channel format, limits, good/bad examples
│   └── changelog.md         # changelog logic + manual fallback
└── evals/
    ├── evals.json           # trigger / behavior evals
    └── fixtures/setup.sh     # builds throwaway tagged repos for the evals
```

## Requirements

- `git` and a POSIX shell (the changelog helper targets **bash 3.2 + BSD
  tools**; works on Linux too).
- The agent itself writes the copy — **no API key required**.
- Optional: `gh` CLI to enrich drafts with the release URL.

## License

MIT
