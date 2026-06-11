#!/usr/bin/env node
// post.mjs — publish a REVIEWED build-in-public draft to a connected channel via
// a self-hosted/cloud Postiz instance. This is the only step that actually posts;
// it runs only when invoked explicitly, on a file you've already reviewed.
//
//   POSTIZ_API_KEY=<key> POSTIZ_API_URL=https://<host>/api/public/v1 \
//     node scripts/post.mjs --file build-in-public/<tag>/linkedin.md \
//        [--platform linkedin] [--schedule 2026-06-11T09:00:00Z] [--dry-run]
//
// - Auto-discovers the channel by identifier (default linkedin) via /integrations.
// - Strips the `> DRAFT …` marker + a single leading H1, posts the rest verbatim.
// - No --schedule => posts now; --schedule <ISO> => schedules in Postiz.
// - X / Product Hunt are never posted here (X costs per-post; PH has no API).
//
// Zero-dependency Node (>=18 for global fetch). Auth header is the raw key (no Bearer).

import { readFileSync } from 'node:fs';

const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const has = (n) => process.argv.includes(n);
const die = (m) => { console.error(`[bip-post] ${m}`); process.exit(1); };

const KEY = process.env.POSTIZ_API_KEY || die('set POSTIZ_API_KEY');
const BASE = (process.env.POSTIZ_API_URL || die('set POSTIZ_API_URL (e.g. https://host/api/public/v1)')).replace(/\/+$/, '');
const platform = arg('--platform', 'linkedin');
const file = arg('--file') || die('pass --file <path to reviewed draft .md>');
const schedule = arg('--schedule'); // ISO 8601; omit to post now
const dry = has('--dry-run');

const headers = { Authorization: KEY, 'Content-Type': 'application/json' };

// Post body = file minus the DRAFT blockquote and an optional leading H1.
function extract(md) {
  return md
    .split('\n')
    .filter((l) => !/^\s*>\s*DRAFT/i.test(l))
    .join('\n')
    .replace(/^\s*#[^\n]*\n/, '')
    .trim();
}

async function main() {
  const intgRes = await fetch(`${BASE}/integrations`, { headers });
  if (!intgRes.ok) die(`GET /integrations -> ${intgRes.status}: ${(await intgRes.text()).slice(0, 300)}`);
  const data = await intgRes.json();
  const list = Array.isArray(data) ? data : data.integrations || data.data || [];
  const ch = list.find((i) => (i.identifier || i.provider || i.providerIdentifier) === platform);
  if (!ch) die(`no connected "${platform}" channel in Postiz (connect it in the UI first)`);

  const content = extract(readFileSync(file, 'utf8'));
  if (!content) die(`empty post after extracting ${file}`);

  const payload = {
    type: schedule ? 'schedule' : 'now',
    date: schedule || new Date(Date.now() + 60_000).toISOString(),
    shortLink: false,
    tags: [],
    posts: [
      {
        integration: { id: ch.id },
        value: [{ content, image: [] }],
        settings: { __type: platform },
      },
    ],
  };

  if (dry) { console.log(JSON.stringify(payload, null, 2)); return; }

  const res = await fetch(`${BASE}/posts`, { method: 'POST', headers, body: JSON.stringify(payload) });
  const txt = await res.text();
  if (res.ok) console.log(`[bip-post] ${schedule ? 'scheduled' : 'posted'} to ${platform} (${ch.name || ch.id}): ${txt.slice(0, 300)}`);
  else die(`Postiz POST /posts -> ${res.status}: ${txt.slice(0, 400)}`);
}

main().catch((e) => die(e?.message || String(e)));
