# Packtical

Packtical is an interactive prep and packing hub for outdoor activities and travel.

Project-specific agent instructions live in [AGENTS.md](AGENTS.md). Shared product terminology lives in [docs/ubiquitous-language.md](docs/ubiquitous-language.md).

## Included checklists

- Camping
- Trail running
- Travel preparation
- Backpacking
- Basic cycling
- Mountain biking

## Current app shape

- React application built with Vite
- Hash-based checklist routes such as `/#/camping` and `/#/backpacking`
- Legacy activity paths such as `/camping/` and `/backpacking/` redirect into the React app
- Supabase auth is required before using checklists
- Per-user checklist progress and custom items are stored in Supabase
- Ad-hoc custom items supported per section

## Local development

Install dependencies and start the Vite dev server:

```bash
pnpm install
pnpm dev
```

Then open the local URL printed by Vite.

To avoid Supabase auth rate limits while testing locally, set this in `.env.local`:

```bash
VITE_USE_LOCAL_AUTH=true
```

Local auth only works in Vite development mode. It signs the app in as `local-dev@packtical.test` and stores checklist progress in browser `localStorage` instead of Supabase.

## Testing

The validation suite has three layers:

- `pnpm run test` runs Vitest unit and component tests in jsdom.
- `pnpm run test:coverage` runs the same tests with V8 coverage reporting.
- `pnpm run test:e2e` runs the Playwright browser smoke test against the Vite app with local dev auth enabled.

Use `pnpm run test:all` when you want the fast suite and browser smoke test together. GitHub Actions runs lint, tests, e2e smoke, and build on pushes to `main` and pull requests.

## Supabase sync

Supabase is required for checklist persistence. Visitors can sign in, create an account, or continue with an anonymous Supabase user and attach that progress to an email account later:

1. Create a Supabase project.
2. Run [docs/supabase.sql](docs/supabase.sql) in the Supabase SQL editor.
3. In Supabase Auth Providers, enable anonymous sign-ins.
4. In Supabase Auth Providers, keep Email enabled and confirm magic links are allowed.
5. If Supabase shows a manual identity linking setting, enable it so anonymous users can connect an email identity.
6. Copy `.env.example` to `.env.local` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
   - Use `VITE_USE_LOCAL_AUTH=true` only for local development when you want to bypass Supabase auth.
7. In Supabase Auth URL settings, add your local dev URL and GitHub Pages URL, for example:
   - `http://localhost:5173`
   - `https://<my-github-username>.github.io/packtical/`
8. In GitHub, add repository Actions variables or secrets named:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

Only the public anon key belongs in the frontend. Keep the service role key out of GitHub Pages.

Custom Packtical magic-link email copy and HTML lives in [docs/supabase-auth-email-templates.md](docs/supabase-auth-email-templates.md).

When an anonymous user signs in to an existing email account, the app temporarily stores their guest checklist state in `sessionStorage`, then merges it into the signed-in account after the magic link returns.

## GitHub Pages

This site now deploys through GitHub Actions instead of serving the repository root directly.

Repository settings should use:

- **Build and deployment**: **GitHub Actions**

Expected Pages URL:

`https://<my-github-username>.github.io/packtical/`

Main React routes:

- `/#/camping`
- `/#/trail-running`
- `/#/travel-preparation`
- `/#/backpacking`
- `/#/basic-cycling`
- `/#/mountain-biking`

## If Pages is showing an old custom domain

If your site opens at `http://burlett.xyz/packtical/`, a custom domain is still configured for this repository or your account-level Pages config.

To reset it:

1. Go to **GitHub -> this repository -> Settings -> Pages**.
2. In **Custom domain**, clear `burlett.xyz` and click **Save**.
3. If present, delete any `CNAME` file at the repo root.
4. Confirm source is **GitHub Actions**.
5. Wait a few minutes and reload the GitHub Pages URL.
