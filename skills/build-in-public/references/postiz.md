# Optional auto-publish via Postiz

`scripts/post.mjs` publishes a reviewed draft to a connected channel through
[Postiz](https://postiz.com) (open-source social scheduler, AGPL — self-host free
or use the cloud). Only **LinkedIn** is wired here: X is pay-per-use since 2026,
Product Hunt has no launch API — both stay copy-paste.

## Setup

1. **Run Postiz** — cloud account, or self-host (Docker: `postiz` + postgres +
   redis + Temporal; see the official `gitroomhq/postiz-docker-compose`). Set
   `MAIN_URL`/`FRONTEND_URL`/`NEXT_PUBLIC_BACKEND_URL` to your public HTTPS URL.
2. **LinkedIn OAuth app** — create one at linkedin.com/developers, add the
   **Sign In with LinkedIn using OpenID Connect** + **Share on LinkedIn**
   products, and register the redirect URL Postiz expects:
   `https://<host>/integrations/social/linkedin`. Put the client id/secret in
   Postiz env (`LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET`).
3. **Connect the channel** — Postiz UI → Add Channel → LinkedIn → authorize.
4. **API key** — Postiz → Settings → Developers → Public API → generate.

## Run

```bash
POSTIZ_API_KEY=<key> POSTIZ_API_URL=https://<host>/api/public/v1 \
  node scripts/post.mjs --file build-in-public/<tag>/linkedin.md \
     [--platform linkedin] [--schedule 2026-06-11T09:00:00Z] [--dry-run]
```

- Self-host API base is `https://<host>/api/public/v1` (the `/api` prefix routes
  to the backend); cloud is `https://api.postiz.com/public/v1`.
- Auth header is the **raw key** (no `Bearer`).
- `--dry-run` prints the payload without posting. Omit `--schedule` to post now.

## ⚠️ LinkedIn scope caveat (self-host)

Postiz's LinkedIn provider hardcodes **organization** scopes
(`rw_organization_admin`, `w_organization_social`, `r_organization_social`) plus
`r_basicprofile` for *both* the `linkedin` and `linkedin-page` channels. Those
need LinkedIn's gated **Community Management API** product — without it the
connect fails with `unauthorized_scope_error`, even for personal-profile posting.

If you only post to a **personal profile**, patch the self-hosted provider to
request just `['openid','profile','w_member_social']` (the scopes the free
"Share on LinkedIn" + "Sign In with OpenID Connect" products already grant):

- File: `apps/{backend,orchestrator}/dist/.../integrations/social/linkedin.provider.js`
  inside the container — replace the `this.scopes = [...]` array.
- Persist it with a `:ro` bind-mount so it survives `docker compose up`.
- The provider's `/v2/me` call (needs `r_basicprofile`) then 403s silently → no
  vanity username stored, otherwise harmless.
- **Re-apply after any Postiz image update** — the bundled file is overwritten.
