#!/usr/bin/env bash
# changelog.sh — grouped Conventional-Commit changelog for a release tag.
#
#   scripts/changelog.sh [<tag>] [<prev-tag>]
#
# - <tag>       release tag to announce (default: most recent reachable tag)
# - <prev-tag>  tag to diff from        (default: auto-detected, see below)
#
# Auto-detection diffs against the previous tag IN THE SAME SERIES. The series
# is the tag's non-numeric prefix, so `v1.2.0` diffs from the previous `v*` and
# `server-v1.2.0` from the previous `server-v*` — the two never cross. A first
# release (no prior tag in the series) spans full history from the root commit.
#
# Output is plain markdown the skill curates into posts: grouped Features /
# Fixes / Improvements (one "- <subject> (<sha>)" per line, PR refs kept), with
# pure maintenance commits (chore/ci/docs/test/build/style) counted, not listed.
#
# Targets stock macOS bash 3.2 + BSD tools under `set -euo pipefail`.
set -euo pipefail

tag="${1:-}"
prev="${2:-}"

if [ -z "$tag" ]; then
  tag="$(git describe --tags --abbrev=0 2>/dev/null || true)"
  [ -n "$tag" ] || { echo "no tags in this repo — pass a tag explicitly" >&2; exit 1; }
fi

git rev-parse -q --verify "refs/tags/$tag" >/dev/null 2>&1 \
  || { echo "tag not found: $tag" >&2; exit 1; }

# Series prefix = the tag with its trailing version number stripped.
#   v1.2.0 -> v   ·   server-v1.2.0 -> server-v   ·   1.2.0 -> ""
prefix="$(printf '%s' "$tag" | sed -E 's/[0-9].*$//')"

# Auto-detect the previous same-series tag: walk the version-sorted list
# (descending) and take the entry right after our tag. bash 3.2 has no
# readarray, so loop with read.
if [ -z "$prev" ]; then
  seen=0
  while IFS= read -r t; do
    [ -z "$t" ] && continue
    if [ "$seen" -eq 1 ]; then prev="$t"; break; fi
    [ "$t" = "$tag" ] && seen=1
  done <<EOF
$(git tag --list "${prefix}[0-9]*" --sort=-v:refname 2>/dev/null || true)
EOF
fi

if [ -n "$prev" ]; then range="${prev}..${tag}"; else range="$tag"; fi

features=""; fixes=""; improvements=""; other=""; maint=0; total=0

while IFS="	" read -r subject sha; do
  [ -z "$subject" ] && continue
  total=$((total + 1))
  type="$(printf '%s' "$subject" | sed -E 's/^([a-zA-Z]+)(\(.*\))?!?:.*/\1/' | tr 'A-Z' 'a-z')"
  desc="$(printf '%s' "$subject" | sed -E 's/^[a-zA-Z]+(\(.*\))?!?:[[:space:]]*//')"
  line="- ${desc} (${sha})"
  case "$type" in
    feat)           features="${features}${line}
" ;;
    fix)            fixes="${fixes}${line}
" ;;
    perf|refactor)  improvements="${improvements}${line}
" ;;
    chore|ci|docs|test|build|style) maint=$((maint + 1)) ;;
    *)              other="${other}${line}
" ;;
  esac
done <<EOF
$(git log "$range" --no-merges --pretty=format:'%s%x09%h' 2>/dev/null || true)
EOF

echo "# Changelog — ${prev:+${prev}..}${tag}"
echo
echo "_${total} commit(s) in range \`${range}\`._"
echo
if [ -n "$features" ];     then echo "## Features";     echo; printf '%s' "$features";     echo; fi
if [ -n "$fixes" ];        then echo "## Fixes";        echo; printf '%s' "$fixes";        echo; fi
if [ -n "$improvements" ]; then echo "## Improvements"; echo; printf '%s' "$improvements"; echo; fi
if [ -n "$other" ];        then echo "## Other";        echo; printf '%s' "$other";        echo; fi
if [ "$maint" -gt 0 ];     then echo "_+${maint} maintenance commit(s) (chore/ci/docs/test/build/style), omitted from public copy._"; fi
