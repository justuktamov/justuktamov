# Deploying to Coolify

How the production pipeline works:

```
push to main ──► GitHub Actions: npm ci → npm test → demo build
                         │ tests pass
                         ▼
                 POST Coolify deploy webhook ──► Coolify: git clone → docker build (Dockerfile) → health check → switch traffic
```

- Repository: `buzzi-uz/CRM-Analitics`, branch `main`. Workflow: `.github/workflows/ci-cd.yml`.
- A pull request only runs the tests. Only a push to `main` with green tests deploys.
- Coolify builds the image from `Dockerfile`, keeps the database on a persistent volume and holds all secrets (`.env` values). Nothing secret is stored in the repository.

Do the steps below once, in this order. Menu names are from Coolify v4.

---

## 1. Check that GitHub can reach Coolify

GitHub Actions calls Coolify over the internet. Open your Coolify panel URL from a phone on mobile data (not office Wi-Fi):

- **Opens** → continue with step 2.
- **Doesn't open** (Coolify is only on the internal network) → everything except the automatic deploy still works. Deploy with the **Deploy** button in Coolify, or install a [self-hosted GitHub runner](https://docs.github.com/en/actions/hosting-your-own-runners) on the Coolify server and change `runs-on: ubuntu-latest` to `runs-on: self-hosted` in the `deploy` job.

## 2. Connect the GitHub repository

1. Coolify → **Sources** → **+ Add** → **GitHub App**.
2. Choose the organization **buzzi-uz** and register the app (Coolify opens GitHub for you).
3. On GitHub, install the app with **Only select repositories** → `CRM-Analitics`.

(If you can't install apps in the organization, use the **Deploy Key** option instead — Coolify shows a public key; add it in GitHub → repo **Settings → Deploy keys**, read-only.)

## 3. Create the application

1. **Projects** → **+ Add** → name it `CRM Analitika` → open the `production` environment.
2. **+ New** → **Private Repository (with GitHub App)** → select the GitHub App → repository `CRM-Analitics`, branch `main`.
3. **Build Pack:** `Dockerfile`. **Ports Exposes:** `3000`.
4. Don't deploy yet — finish steps 4–6 first.

## 4. Persistent storage — do this before the first deploy

The SQLite database lives at `/data/analytika.db` inside the container. Without a volume it is **deleted on every deploy**.

**Persistent Storage** → **+ Add** → **Volume**:
- Name: `crm-data`
- Destination path: `/data`

After a deploy the log line `Yangi ma'lumotlar bazasi yaratildi: /data/analytika.db` must appear **only on the very first deploy**. If you see it after later deploys too, the volume is not mounted.

## 5. Environment variables

**Environment Variables** → add (for secrets, untick "Build Variable" so they are only available at runtime):

| Name | Value | Note |
|---|---|---|
| `ADMIN_LOGIN` | `pm` | PM login created on first start |
| `ADMIN_PASSWORD` | a strong password | used only on the very first start; change it later in the app |
| `TELEGRAM_BOT_TOKEN` | from @BotFather | use a bot that runs **only** here (two servers with one bot token conflict) |
| `AI_PROVIDER` | `deepseek` | or `anthropic` / `openai` |
| `AI_API_KEY` | DeepSeek API key | https://platform.deepseek.com/api_keys |
| `AI_MODEL` | *(empty)* | default `deepseek-v4-pro`; `deepseek-flash` is faster/cheaper |
| `USD_RATE` | `12800` | starting rate; later changed in Settings |
| `COOKIE_SECURE` | `0` now, `1` once the site opens via **https://** | with `1` on plain http, login stops working |

`DB_PATH`, `PORT` and `NODE_ENV` are already set in the Dockerfile.

## 6. Health check and auto deploy

- **Health Check:** enable, path `/api/health`, port `3000`. Coolify switches traffic to a new version only when it is healthy.
- **Advanced:** turn **off** "Auto Deploy". Deploys come from GitHub Actions after the tests pass; with both on, every push would deploy twice (and untested).

## 7. Domain

**No domain yet:** in **General**, use the generated domain (Coolify can generate an `sslip.io` address from the server IP, e.g. `http://<random>.<server-ip>.sslip.io`). Keep `COOKIE_SECURE=0` while it is plain http.

**When you have a domain** (e.g. `crm.example.uz`):
1. At the domain registrar, add a DNS **A record** `crm` → the Coolify server's public IP.
2. In **General → Domains** enter `https://crm.example.uz` and save. Coolify gets a free Let's Encrypt certificate.
3. Set `COOKIE_SECURE=1` and redeploy.

## 8. First deploy

Click **Deploy**. In the deployment log you should see the build, then the app log:

```
Yangi ma'lumotlar bazasi yaratildi: /data/analytika.db
Birinchi ishga tushirish. Login "pm", parol "…" — kirgach parolni o'zgartiring.
Analitika: http://localhost:3000
```

Open the domain, log in with `ADMIN_LOGIN` / `ADMIN_PASSWORD`, then change the password in **Sozlamalar → Profil**. Settings → Telegram shows whether the bot and AI are connected.

## 9. Connect GitHub Actions to Coolify

1. Coolify → **Settings → Configuration → Advanced** → enable **API Access** (self-hosted Coolify has it off by default). If you restrict "Allowed IPs", GitHub's runners must be allowed — simplest is to leave it empty.
2. **Keys & Tokens → API Tokens** → create a token named `github-deploy` with only the **deploy** permission, expiry 1 year. Copy it.
3. Application → **Webhooks** → copy the **Deploy Webhook (auth required)** URL.
4. GitHub → `buzzi-uz/CRM-Analitics` → **Settings → Secrets and variables → Actions → New repository secret**:
   - `COOLIFY_WEBHOOK` = the webhook URL
   - `COOLIFY_TOKEN` = the API token

   Or from a terminal with the GitHub CLI (it asks you to paste each value):
   ```bash
   gh secret set COOLIFY_WEBHOOK --repo buzzi-uz/CRM-Analitics
   gh secret set COOLIFY_TOKEN --repo buzzi-uz/CRM-Analitics
   ```
5. Test it: GitHub → **Actions → CI/CD → Run workflow** (branch `main`). Both jobs go green and a new deployment appears in Coolify.

Optional: Coolify → **Notifications** → Telegram, so failed deployments are reported to you.

## 10. Daily database backup

Application → **Scheduled Tasks** → **+ Add**:
- Name: `backup`
- Command: `node --disable-warning=ExperimentalWarning src/backup.js`
- Frequency: `0 3 * * *` (every day at 03:00)

It writes `/data/backups/analytika-YYYY-MM-DD.db` (a consistent copy taken while the app runs) and keeps 30 days. These copies are on the same server — regularly copy `/data/backups` somewhere else as well (another server or cloud storage).

---

## Day-to-day

- **Deploy a change:** push to `main` (or merge a pull request). Watch it in GitHub → **Actions** and in Coolify → **Deployments**.
- **Roll back:** revert the bad commit on `main` (the pipeline redeploys the previous code), or use Coolify's rollback to a previous image in the application settings.
- **Change a secret:** edit it in Coolify → **Environment Variables**, then **Restart** (no rebuild needed).
- **Logs:** Coolify → application → **Logs**.
