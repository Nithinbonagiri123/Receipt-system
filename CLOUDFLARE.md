# Deploying to Cloudflare Pages

This project is set up to deploy as a **static site** on [Cloudflare Pages](https://pages.cloudflare.com/).

## Option 1: Connect with Git (recommended)

1. Push this repo to **GitHub** or **GitLab**.
2. In [Cloudflare Dashboard](https://dash.cloudflare.com/) go to **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**.
3. Select your repo and branch.
4. Set build settings:
   - **Build command:** `pnpm run build` (or `npm run build`)
   - **Build output directory:** `dist`
   - **Root directory:** leave empty (or set if the app lives in a subfolder)
5. Click **Save and Deploy**. Future pushes to the branch will auto-deploy.
6. Your site will be at `https://receipt-system.pages.dev` (or the project name you chose).

## Option 2: Direct upload (no Git)

1. Install dependencies and log in to Cloudflare (one-time):
   ```bash
   pnpm install
   pnpm exec wrangler login
   ```
2. Create the Pages project (one-time):
   ```bash
   pnpm exec wrangler pages project create receipt-system
   ```
3. Build and deploy:
   ```bash
   pnpm run deploy
   ```
   Or manually:
   ```bash
   pnpm run build
   pnpm exec wrangler pages deploy dist --project-name=receipt-system
   ```
4. Open the URL shown in the terminal (e.g. `https://receipt-system.pages.dev`).

## Environment variables

- For **Git-connected** deployments: In the Cloudflare Pages project, go to **Settings** → **Environment variables** and add any `VITE_*` variables (e.g. `VITE_APP_TITLE`, `VITE_COMPANY_NAME`, `VITE_DEFAULT_CURRENCY`). Rebuild after changing them.
- For **direct upload**: Set variables in `.env` before running `pnpm run build`; they are baked into the build.

## Custom domain

In the Pages project: **Custom domains** → add your domain and follow the DNS steps.
