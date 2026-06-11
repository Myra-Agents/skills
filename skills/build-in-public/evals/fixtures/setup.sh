#!/usr/bin/env bash
# setup.sh — build throwaway tagged git repos the evals run against.
# Idempotent: wipes and recreates ./normal and ./major next to this script.
#
#   evals/fixtures/setup.sh
#
# normal/ : tags v1.2.0 (prev) and v1.3.0 (current)  — non-major release
# major/  : tags v1.4.0 (prev) and v2.0.0 (current)  — major release
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
GIT="git -c user.name=eval -c user.email=eval@example.com -c commit.gpgsign=false -c init.defaultBranch=main"

mk() { # mk <dir> <one-line-desc>
  d="$here/$1"; rm -rf "$d"; mkdir -p "$d"; cd "$d"
  $GIT init -q
  printf '# Acme\n\n%s\n' "$2" > README.md
  printf '{\n  "name": "acme",\n  "description": "%s"\n}\n' "$2" > package.json
  $GIT add -A; $GIT commit -qm "chore: scaffold project"
}

cm() { echo "$RANDOM-$1" > .marker 2>/dev/null || echo "$1" > .marker; $GIT add -A; $GIT commit -qm "$1"; }

# --- normal release: v1.2.0 -> v1.3.0 ---
mk normal "Acme schedules your coding agents."
$GIT tag v1.2.0
cm "feat(schedules): run schedules on a cron expression (#12)"
cm "feat(ui): show next-run time on each schedule card (#14)"
cm "fix(planner): stop duplicate cards when a schedule fires twice (#15)"
cm "chore: bump deps"
cm "docs: update README"
$GIT tag v1.3.0

# --- major release: v1.4.0 -> v2.0.0 ---
mk major "Acme schedules your coding agents."
$GIT tag v1.4.0
cm "feat(remote): connect to a cloud relay, not just the local sidecar (#40)"
cm "feat(mobile): approve and re-run cards from the new mobile client (#42)"
cm "perf(board): render 500-card boards without jank (#43)"
cm "fix(auth): refresh tokens before they expire, not after (#44)"
cm "ci: add release workflow"
$GIT tag v2.0.0

echo "fixtures built: $here/normal (v1.3.0), $here/major (v2.0.0)"
