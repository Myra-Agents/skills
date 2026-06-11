---
name: build-in-public
description: Turn a shipped release into review-ready "build in public" drafts — generates an X/Twitter thread, a LinkedIn post, and (for major releases) a Product Hunt launch kit from the repo's changelog, as English drafts you edit before posting. Use when the user wants to announce a release, build in public, write a launch thread or post, draft a Product Hunt launch, or share dev progress publicly after tagging a version.
---

# Build in Public

Turn a release into ready-to-edit launch copy. The skill reads the changelog
since the previous release, learns the product's voice from the repo, and writes
one English draft per channel — X/Twitter thread, LinkedIn post, and (for major
releases) a Product Hunt launch kit — into `build-in-public/<tag>/`. It drafts,
it never posts: you review the files, edit, and publish manually.

```
Resolve release → Changelog → Project context → Draft per channel → [you review the files] → Report + checklist
```

## 1. Resolve the release

- **Tag** — use the tag the user names. If none, list candidates
  (`git tag --sort=-v:refname | head`) and confirm the latest version tag.
- **Major?** — a release is *major* when the tag is `vX.0.0` (semver major
  bump) or the user calls it a launch/major. Major releases get the Product
  Hunt kit; others get X + LinkedIn only.
- **Series** — a repo may hold several tag series (e.g. `v*` app tags and
  `server-v*` worker tags). Stay within the series of the tag you announce; the
  changelog helper does this automatically.

## 2. Build the changelog

Run the bundled helper from inside the target repo:

```bash
bash <skill-dir>/scripts/changelog.sh <tag>          # auto-detects previous tag
bash <skill-dir>/scripts/changelog.sh <tag> <prev>   # explicit range
```

It prints grouped **Features / Fixes / Improvements** (Conventional Commits, PR
refs preserved) and counts pure maintenance commits instead of listing them.
Logic + manual fallback for non-conventional histories: `references/changelog.md`.

**Curate — the changelog is raw material, not the post.** Pick the 2–4 changes a
user actually cares about and say them in plain language, not commit-speak.

## 3. Learn the project's voice

Gather, don't invent:

- **What it is** — one line. Sources: repo `README`, `CLAUDE.md`,
  `package.json` `description`.
- **Links** — website / download / repo (`git remote get-url origin`), and the
  release URL if one exists (`gh release view <tag> --json url` when `gh` is
  available).
- **Tone** — skim existing public copy (a `blog/`, landing page, prior posts)
  and match it. If there's none, ask the user for one line of positioning.
- **Locale** — default **English**; switch only if the user asks.

If a product claim isn't discoverable, ask one tight question rather than
guessing.

## 4. Write the drafts

Read `references/platforms.md` for each channel's exact format, limits, and
good/bad examples, then write to `build-in-public/<tag>/`:

- `x-thread.md` — numbered thread: hook → 2–4 highlights → CTA + link. Annotate
  each tweet with its character count (≤280).
- `linkedin.md` — one narrative post + 3 highlights + link + a few hashtags.
- `producthunt.md` — **major releases only** — tagline (≤60), description, first
  maker comment, topics, gallery shot list, links.

Every file opens with `> DRAFT — review & edit before posting; nothing is
auto-posted.` Honest copy only: no metrics you can't back, no competitor-
bashing, claim only what actually shipped.

## 5. Report

Tell the user the output directory, list the files written, and give a posting
checklist: post the X thread · post on LinkedIn · (major) submit to Product Hunt
· attach screenshots/GIF · double-check every link. Flag anything you had to
assume so they can fix it before posting.

## 6. Publish (optional)

**The skill's job is the drafts (steps 1–5). Publishing is entirely optional** —
by default you copy-paste the files yourself. Two opt-in publishers ship for the
**LinkedIn** draft; both post only the file you've already reviewed:

- **Direct, no third party** — `scripts/linkedin.mjs` calls LinkedIn's API
  itself. One-time `login` (OAuth, token cached locally), then `post`:
  ```bash
  LINKEDIN_CLIENT_ID=<id> LINKEDIN_CLIENT_SECRET=<secret> \
    node scripts/linkedin.mjs login                                  # once
  node scripts/linkedin.mjs post --file build-in-public/<tag>/linkedin.md
  ```
  Personal profile (free, scope `w_member_social`). Posting as a Company Page
  (`--org <id>`) needs LinkedIn's gated Community Management API (separate app,
  review for production) — see the `--org` notes in the script header.
- **Via Postiz** — `scripts/post.mjs` posts/schedules through a self-host/cloud
  [Postiz](https://postiz.com) instance. Setup + LinkedIn scope caveat:
  `references/postiz.md`.

- **X** stays manual: X's API is pay-per-use since 2026 (~$0.01/post, $0.20 with
  a link) — copy-paste the `x-thread.md` draft for free.
- **Product Hunt** stays manual: no launch API.

