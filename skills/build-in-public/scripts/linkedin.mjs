#!/usr/bin/env node
// linkedin.mjs — post a reviewed draft straight to LinkedIn's API, no third party.
//
//   node scripts/linkedin.mjs login                      # one-time OAuth (local callback)
//   node scripts/linkedin.mjs exchange --code <code>     # fallback: paste the code by hand
//   node scripts/linkedin.mjs post --file <linkedin.md>  # post now  [--dry-run]
//   node scripts/linkedin.mjs post --file <md> --image a.png --image b.png  # attach images
//   node scripts/linkedin.mjs whoami                     # show the connected member
//
//   node scripts/linkedin.mjs login --org               # also request org scopes
//   node scripts/linkedin.mjs post --file <md> --org <organizationId>  # post AS a Page
//
// Personal profile (scope w_member_social) is free. Posting AS a Company Page
// (--org) needs LinkedIn's Community Management API product on the app: the
// Development tier is self-serve but test-pages-only; posting to a real Page
// needs the Standard tier, which requires LinkedIn's review. No client can
// bypass that — until the scope is granted, --org returns unauthorized_scope_error.
//
// Env (the OAuth app's keys):
//   LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET
//   LINKEDIN_REDIRECT_URI   default http://localhost:8765/callback
// Token is cached in $XDG_CONFIG_HOME/bip/linkedin.json (mode 600), never in the repo.
//
// Zero-dependency Node (>=18).

import http from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, existsSync, chmodSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, basename } from 'node:path';

const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const argAll = (n) => process.argv.flatMap((v, i) => (v === n && process.argv[i + 1] ? [process.argv[i + 1]] : []));
const has = (n) => process.argv.includes(n);
const die = (m) => { console.error(`[linkedin] ${m}`); process.exit(1); };
const cmd = process.argv[2];

const CLIENT_ID = process.env.LINKEDIN_CLIENT_ID || die('set LINKEDIN_CLIENT_ID');
const CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET || die('set LINKEDIN_CLIENT_SECRET');
const REDIRECT = process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:8765/callback';
const PERSONAL_SCOPE = 'openid profile w_member_social';
// Org scopes need LinkedIn's Community Management API product (gated: Standard
// tier needs review). Added only with `login --org`.
const ORG_SCOPE = `${PERSONAL_SCOPE} r_organization_social w_organization_social`;

const CFG_DIR = join(process.env.XDG_CONFIG_HOME || join(homedir(), '.config'), 'bip');
const CFG = join(CFG_DIR, 'linkedin.json');

function saveToken(t) {
  mkdirSync(CFG_DIR, { recursive: true });
  writeFileSync(CFG, JSON.stringify(t, null, 2));
  chmodSync(CFG, 0o600);
}
function loadToken() {
  if (!existsSync(CFG)) die('not authenticated — run: node scripts/linkedin.mjs login');
  return JSON.parse(readFileSync(CFG, 'utf8'));
}

function authUrl(state, scope) {
  const p = new URLSearchParams({ response_type: 'code', client_id: CLIENT_ID, redirect_uri: REDIRECT, scope, state });
  return `https://www.linkedin.com/oauth/v2/authorization?${p}`;
}

async function exchangeCode(code) {
  const body = new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT, client_id: CLIENT_ID, client_secret: CLIENT_SECRET });
  const r = await fetch('https://www.linkedin.com/oauth/v2/accessToken', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const j = await r.json();
  if (!r.ok || !j.access_token) die(`token exchange failed (${r.status}): ${JSON.stringify(j)}`);
  const me = await (await fetch('https://api.linkedin.com/v2/userinfo', { headers: { Authorization: `Bearer ${j.access_token}` } })).json();
  const tok = {
    accessToken: j.access_token,
    refreshToken: j.refresh_token || null,
    expiresAt: Date.now() + (j.expires_in || 0) * 1000,
    sub: me.sub,
    name: me.name,
  };
  saveToken(tok);
  console.log(`[linkedin] connected as ${tok.name} (urn:li:person:${tok.sub}); token valid ${Math.round((j.expires_in || 0) / 86400)}d. Saved to ${CFG}`);
}

async function login() {
  const port = Number(new URL(REDIRECT).port || 80);
  const state = `s${Date.now()}`;
  const url = authUrl(state, has('--org') ? ORG_SCOPE : PERSONAL_SCOPE);
  const server = http.createServer(async (req, res) => {
    if (!req.url.startsWith('/callback')) { res.writeHead(404); return res.end(); }
    const q = new URL(req.url, REDIRECT).searchParams;
    if (q.get('error')) { res.end(`LinkedIn error: ${q.get('error_description') || q.get('error')}`); console.error(q.get('error_description')); server.close(); return; }
    res.end('LinkedIn connected — you can close this tab and return to the terminal.');
    server.close();
    await exchangeCode(q.get('code'));
    process.exit(0);
  });
  server.listen(port, () => {
    console.log('[linkedin] Open this URL in your browser, authorize, and come back:\n');
    console.log('  ' + url + '\n');
    console.log(`[linkedin] waiting for the callback on ${REDIRECT} …`);
  });
}

function extract(md) {
  return md.split('\n').filter((l) => !/^\s*>\s*DRAFT/i.test(l)).join('\n').replace(/^\s*#[^\n]*\n/, '').trim();
}

// Upload one image and return its asset URN (LinkedIn v2 Assets: register → PUT binary).
async function uploadImage(t, owner, path) {
  const reg = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${t.accessToken}`, 'Content-Type': 'application/json', 'X-Restli-Protocol-Version': '2.0.0' },
    body: JSON.stringify({
      registerUploadRequest: {
        recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
        owner,
        serviceRelationships: [{ relationshipType: 'OWNER', identifier: 'urn:li:userGeneratedContent' }],
      },
    }),
  });
  const j = await reg.json();
  if (!reg.ok) die(`registerUpload failed (${reg.status}): ${JSON.stringify(j).slice(0, 300)}`);
  const asset = j.value?.asset;
  const uploadUrl = j.value?.uploadMechanism?.['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']?.uploadUrl;
  if (!asset || !uploadUrl) die(`registerUpload: no asset/uploadUrl in ${JSON.stringify(j).slice(0, 300)}`);
  const up = await fetch(uploadUrl, { method: 'PUT', headers: { Authorization: `Bearer ${t.accessToken}` }, body: readFileSync(path) });
  if (!up.ok) die(`image PUT failed (${up.status}) for ${path}`);
  console.log(`[linkedin] uploaded ${basename(path)} → ${asset}`);
  return asset;
}

async function post() {
  const file = arg('--file') || die('pass --file <path to reviewed linkedin.md>');
  const text = extract(readFileSync(file, 'utf8'));
  if (!text) die(`empty post after extracting ${file}`);
  const t = loadToken();
  if (Date.now() > t.expiresAt) die('token expired — run: node scripts/linkedin.mjs login');
  const org = arg('--org'); // organization id → post as the Page (needs org scope)
  const author = org ? `urn:li:organization:${org}` : `urn:li:person:${t.sub}`;
  const dry = has('--dry-run');
  const imgs = argAll('--image'); // repeatable; feature screenshots
  // In dry-run we still upload (validates the pipeline) but skip publishing.
  const media = [];
  for (const p of imgs) {
    const asset = await uploadImage(t, author, p);
    media.push({ status: 'READY', description: { text: basename(p) }, media: asset, title: { text: basename(p) } });
  }
  const share = { shareCommentary: { text }, shareMediaCategory: media.length ? 'IMAGE' : 'NONE' };
  if (media.length) share.media = media;
  const payload = {
    author,
    lifecycleState: 'PUBLISHED',
    specificContent: { 'com.linkedin.ugc.ShareContent': share },
    visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
  };
  if (dry) { console.log(JSON.stringify(payload, null, 2)); return; }
  const r = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: { Authorization: `Bearer ${t.accessToken}`, 'Content-Type': 'application/json', 'X-Restli-Protocol-Version': '2.0.0' },
    body: JSON.stringify(payload),
  });
  const id = r.headers.get('x-restli-id') || r.headers.get('x-linkedin-id');
  const txt = await r.text();
  if (r.ok) console.log(`[linkedin] posted as ${org ? `Page ${org}` : t.name}: ${id ? `https://www.linkedin.com/feed/update/${id}` : txt.slice(0, 200)}`);
  else die(`LinkedIn POST failed (${r.status}): ${txt.slice(0, 400)}`);
}

const main = {
  login,
  exchange: () => exchangeCode(arg('--code') || die('pass --code <code from the redirect URL>')),
  post,
  whoami: () => { const t = loadToken(); console.log(`${t.name} · urn:li:person:${t.sub} · token ${Date.now() > t.expiresAt ? 'EXPIRED' : 'valid'}`); },
}[cmd];
if (!main) die('usage: linkedin.mjs <login|exchange|post|whoami> [...]');
Promise.resolve(main()).catch((e) => die(e?.message || String(e)));
