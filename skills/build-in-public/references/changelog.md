# Changelog extraction

`scripts/changelog.sh <tag> [<prev>]` does this automatically. Here's the logic
it follows and the manual fallback for histories that don't use Conventional
Commits.

## Previous-tag detection

Diff against the previous tag **in the same series**. The series is the tag's
non-numeric prefix:

- `v1.4.0` → series `v` → previous `v*`
- `server-v2.0.0` → series `server-v` → previous `server-v*`

```bash
prefix=$(printf '%s' "$tag" | sed -E 's/[0-9].*$//')   # v1.4.0 -> v
git tag --list "${prefix}[0-9]*" --sort=-v:refname
```

Walk that descending list; the entry right after your tag is the previous one.
A first release (no prior tag in the series) spans full history — diff from the
tag alone (`git log <tag>`).

## Grouping

```bash
git log <prev>..<tag> --no-merges --pretty=format:'%s%x09%h'
```

Classify by Conventional-Commit type prefix:

| Type prefix                         | Bucket                         |
|-------------------------------------|--------------------------------|
| `feat`                              | Features                       |
| `fix`                               | Fixes                          |
| `perf`, `refactor`                  | Improvements                   |
| `chore` `ci` `docs` `test` `build` `style` | maintenance (counted, not listed) |
| no recognizable type                | Other (review by hand)         |

Strip the `type(scope):` prefix for display; keep trailing `(#PR)` refs.

## Caveats

- The script targets stock macOS **bash 3.2 + BSD tools** under `set -euo
  pipefail`; works on Linux too.
- If the project doesn't use Conventional Commits, the script still runs but
  most commits land in **Other** — read them and group by hand.
- The grouped output is **raw material**. Don't paste it into a post: pick the
  few changes that matter and rewrite them for humans.
