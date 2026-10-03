# Deploying to Coolify

How the production pipeline works:

```
push to crm ──► GitHub Actions: npm ci → npm test → demo build
                        │ tests pass
                        ▼
                POST Coolify deploy webhook ──► Coolify: git clone → docker build (Dockerfile) → health check → switch traffic
```

- Repository: `justuktamov/justuktamov` (public), branch `crm`. Workflow: `.github/workflows/ci-cd.yml`.
- A pull request only runs the tests. Only a push to `crm` with green tests deploys. When several pushes come quickly, an older run still in progress is cancelled, so the newest commit is what gets deployed.
- Coolify builds the image from `Dockerfile`, keeps the database on a persistent volume and holds all secrets (`.env` values). Nothing secret is stored in the repository.

Current production: Coolify at `https://coolify.khanumirzakoff.com` → project **ProAnalitics** → environment `production` → application **crm-analitika** (server `localhost`).

---

## 1. Application (already done)

**+ New** → **Public Git Repository** → `https://github.com/justuktamov/justuktamov/tree/crm` (the `/tree/crm` part selects the branch) → **Build Pack:** `Dockerfile`, port `3000`.

The repository is public, so Coolify needs no key or GitHub App to read it.

## 2. Persistent storage (already done) — required before the first deploy

The SQLite database lives at `/data/analytika.db` inside the container. Without a volume it is **deleted on every deploy**.

**Persistent Storage** → **Add Mount** → **Volume mount**: name `crm-data`, destination path `/data`.

After a deploy the log line `Yangi ma'lumotlar bazasi yaratildi: /data/analytika.db` must appear **only on the very first deploy**. If you see it after later deploys too, the volume is not mounted.

## 3. Environment variables

**Environment Variables** → **+ Add**. For secrets set **Build time** to "not available" so they exist only at runtime.

| Name | Value | Note |
|---|---|---|
| `ADMIN_LOGIN` | `pm` | PM login created on first start |
| `ADMIN_PASSWORD` | a strong password | secret; used only on the very first start |
| `TELEGRAM_BOT_TOKEN` | from @BotFather | secret; use a bot that runs **only** here (two servers with one bot token conflict) |
| `AI_PROVIDER` | `openrouter` | default; or `deepseek` / `anthropic` / `openai` |
| `AI_API_KEY` | OpenRouter API key | secret; https://openrouter.ai/keys |
| `AI_MODEL` | `deepseek/deepseek-v4-pro` | `deepseek/deepseek-v4-flash` is faster/cheaper |
| `APP_URL` | the app's address | shows the app by name in OpenRouter usage stats |
| `USD_RATE` | `12800` | starting rate; later changed in Settings |
| `COOKIE_SECURE` | `0` now, `1` once the site opens via **https://** | with `1` on plain http, login stops working |
| `TZ_NAME` | `Asia/Tashkent` | |

`DB_PATH`, `PORT` and `NODE_ENV` are already set in the Dockerfile. After changing a variable: **Restart** (or Deploy) — a running app does not see changes.

## 4. Health check and auto deploy (already done)

- **Healthcheck:** enabled, path `/api/health`, port `3000`. Coolify switches traffic to a new version only when it is healthy.
- **Advanced:** "Auto Deploy" off. Deploys come from GitHub Actions after the tests pass.

## 5. Automatic deploy after every push to `crm`

Needs one-time setup in two places.

**A. In Coolify** (someone with Coolify admin access):
1. **Settings → Configuration → Advanced** → enable **API Access**. Leave "Allowed IPs" empty (GitHub's servers change IPs).
2. **Keys & Tokens → API Tokens** → create a token, name `github-deploy`, permission **deploy** only, expiry 1 year. Copy it once — Coolify won't show it again.
3. The deploy webhook URL of the application (also visible under the application's **Webhooks** tab):
   `https://coolify.khanumirzakoff.com/api/v1/deploy?uuid=edcxoidyeqsptqtqhwsmjktq&force=false`

**B. In GitHub** (needs **admin** on `justuktamov/justuktamov`):
1. `https://github.com/justuktamov/justuktamov/settings/secrets/actions` → **New repository secret**:
   - Name `COOLIFY_WEBHOOK`, value: the webhook URL above
   - Name `COOLIFY_TOKEN`, value: the API token from A.2
2. `https://github.com/justuktamov/justuktamov/settings/actions` → **Actions permissions**: "Allow all actions and reusable workflows" (or at least allow the GitHub-owned `actions/checkout` and `actions/setup-node`).

Or with the GitHub CLI (it asks for each value; run by the admin):
```bash
gh secret set COOLIFY_WEBHOOK --repo justuktamov/justuktamov
gh secret set COOLIFY_TOKEN --repo justuktamov/justuktamov
```

**Test:** GitHub → **Actions → CI/CD → Run workflow** (branch `crm`), or push any commit to `crm`. Both jobs go green and a new deployment appears in Coolify → **Deployments**. Until the secrets exist, the `deploy` job only prints a warning and deploys nothing.

Optional: Coolify → **Notifications** → Telegram, so failed deployments are reported to you.

## 6. Domain

**Now:** the generated address `http://edcxoidyeqsptqtqhwsmjktq.77.83.192.117.sslip.io` (points to the server IP `77.83.192.117`). Keep `COOKIE_SECURE=0` while it is plain http.

**When the domain is active** (e.g. `crm.perfo.uz`):
1. At the domain registrar, add a DNS **A record** `crm` → `77.83.192.117`.
2. Application → **Domains** → enter `https://crm.perfo.uz` and save. Coolify gets a free Let's Encrypt certificate.
3. Set `APP_URL=https://crm.perfo.uz`, `COOKIE_SECURE=1`, then **Deploy**.

## 7. Daily database backup (already done)

Application → **Scheduled Tasks**: name `backup`, command `node --disable-warning=ExperimentalWarning src/backup.js`, frequency `0 22 * * *` (server time is UTC → 03:00 Tashkent).

It writes `/data/backups/analytika-YYYY-MM-DD.db` (a consistent copy taken while the app runs) and keeps 30 days. These copies are on the same server — regularly copy `/data/backups` somewhere else as well.

---

## Day-to-day

- **Deploy a change:** push to `crm`. Watch it in GitHub → **Actions** and in Coolify → **Deployments**.
- **Deploy by hand** (e.g. before the secrets exist): Coolify → application → **Actions → Deploy**.
- **Roll back:** revert the bad commit on `crm` (the pipeline redeploys the previous code), or use Coolify's rollback to a previous image in the application settings.
- **Change a secret:** edit it in Coolify → **Environment Variables**, then **Restart**.
- **Logs:** Coolify → application → **Logs**.
