# Platform draft specs

English drafts, build-in-public voice: concrete, humble, specific. Show the
change and why it helps a real user. No hype words ("revolutionary",
"game-changer", "🚀🚀🚀"), no competitor-bashing — name a competitor only if the
statement is factual and neutral. Claim only what shipped.

Each file opens with:

```
> DRAFT — review & edit before posting; nothing is auto-posted.
```

---

## X / Twitter thread — `x-thread.md`

- **Tweet 1 (hook)** — what shipped, in one line, with the version. ≤1 emoji,
  **no link** (links in the first tweet suppress reach). End on a reason to keep
  reading.
- **Tweets 2–N** — one highlight each, plain language, optional emoji bullet.
  2–4 highlights total.
- **Final tweet** — the try/download link + repo link + a soft CTA
  ("Feedback welcome", "What should we build next?").
- Number tweets `1/`, `2/`, … and annotate each with its character count, e.g.
  `(214/280)`. Hard cap **280** including the numbering.
- Whole thread: **3–6 tweets. Shorter wins.**

Write it as a fenced list so each tweet is copy-pasteable:

```
1/ <hook>                       (NN/280)

2/ <highlight>                  (NN/280)

3/ Try it: <link>  ·  <repo>    (NN/280)
```

Good: `Schedules can now run on cron — set it once, the agent fires itself.`
Bad:  `feat(schedules): add cron scheduling support (#123)`  ← commit-speak.

---

## LinkedIn — `linkedin.md`

- **One post**, ~600–1300 characters.
- **First line is the hook** — LinkedIn truncates around 210 chars before
  "…see more", so the value must land before the fold.
- Structure: hook → 1–2 sentences of context → **3 highlight bullets** →
  what's next / CTA → link.
- **3–5 relevant hashtags** at the end.
- Professional but personal; first person ("we shipped", "I").

---

## Product Hunt launch kit — `producthunt.md` (major releases only)

Product Hunt has **no launch API** — this kit is for manual submission. Remind
the user to schedule the launch (12:01am PT is the convention) and line up
hunters/supporters.

- **Tagline** — ≤60 chars, the one-liner shown under the product name.
- **Description** — ~260 chars: what it is + who it's for.
- **First comment (maker's comment)** — the story: why you built it, what this
  release adds, an explicit ask for feedback. 2–4 short paragraphs.
- **Topics** — 3 suggested Product Hunt topics/categories.
- **Gallery shot list** — ordered list of the 3–5 images/GIF to upload. Point at
  existing assets if the repo has them (a landing `assets/` dir, screenshots);
  otherwise describe each shot to capture.
- **Links** — website, download, repo.
