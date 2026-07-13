# Deployment Guide

This repository is set up for a split deployment model:

- Frontend: Vercel
- Backend: Render
- Container images: GitHub Container Registry
- Database: PostgreSQL, typically Supabase for production

The repo now includes Dockerfiles, a local compose stack, GitHub Actions for CI/CD, and an environment example file. Branch protection, contributor permissions, and the GitHub/Vercel/Render setup still need to be configured manually in the hosting dashboards.

## Project Layout for Deployment

- `artifacts/clariva-web` is the Vercel frontend.
- `artifacts/api-server` is the Express backend.
- `docker-compose.yml` runs the local stack with PostgreSQL, backend, and frontend containers.
- `.github/workflows/ci.yml` validates pull requests.
- `.github/workflows/deploy.yml` builds and pushes Docker images, then triggers Render deploy hooks.

## Branch Strategy

Recommended protected branches:

- `develop` for integration work
- `staging` for UAT and release candidate validation
- `main` for production-ready releases

Contributor branches should follow the pattern `feature/<username>/<feature-name>`.

Required flow:

1. Create a feature branch from `develop`.
2. Open a pull request into `develop`.
3. Merge `develop` into `staging` after review and CI pass.
4. Merge `staging` into `main` after UAT approval.
5. Deploy production only from `main`.

## What Is Automated In The Repo

- Docker builds for backend and frontend
- Docker image publishing to GitHub Container Registry
- PR CI checks
- Deployment hook calls for Render
- Example environment configuration in `.env.example`
- Local Docker Compose workflow

## What You Must Configure Manually

- Create the new GitHub repository and push this code to it
- Add contributors and assign permissions
- Create branch protection rules for `main`, `staging`, and `develop`
- Create GitHub environments named `staging` and `production`
- Add GitHub environment secrets
- Create Vercel and Render projects
- Add Render environment variables
- Add Vercel environment variables
- Create the Render deploy hooks used by GitHub Actions

## Repository Cleanup And New Repository Setup

The old remote has been removed from the local Git config. To push to a new repository:

1. Create a new empty repository on GitHub.
2. Add the new remote locally:

   ```bash
   git remote add origin https://github.com/<owner>/<new-repo>.git
   ```

3. Push the existing branches:

   ```bash
   git push -u origin main
   git push -u origin develop
   git push -u origin staging
   ```

If `develop` and `staging` do not exist yet, create them from `main` or your current working branch before pushing.

Suggested repository name:

- `clariva-idea-hub`

Suggested description:

- `AI-powered idea validation and brainstorming platform with a Vercel frontend, Render backend, and PostgreSQL storage.`

## Contributor Roles

Recommended permissions:

- Owner or Admin: 1 to 2 maintainers only
- Write: trusted contributors who can merge through pull requests
- Triage: reviewers who manage issues and labels but do not merge
- Read: external collaborators or auditors

Keep direct pushes disabled on protected branches. Require pull requests, at least one review, and passing CI before merge.

## Docker Workflow

The new Dockerfiles are designed around the pnpm workspace:

- Backend image: `artifacts/api-server/Dockerfile`
- Frontend image: `artifacts/clariva-web/Dockerfile`
- Local compose file: `docker-compose.yml`

Suggested image tagging scheme:

- `staging-latest`
- `production-latest`
- `${commit-sha}`

The GitHub Actions deploy workflow pushes images to GHCR using those tags. For Render, use the deploy hook in the workflow to trigger the service deployment after the image publish completes.

### Connecting Render To Docker Images

Render commonly deploys from the repository and Dockerfile. The cleanest setup for this repository is:

1. Keep the backend Dockerfile in the repo.
2. Configure the Render service to use the repository Docker build.
3. Let GitHub Actions publish versioned images to GHCR for traceability.
4. Trigger the Render deploy hook after the image push so Render rebuilds from the same Dockerfile and commit.

If your Render plan or account supports a private registry deployment path, you can also point the Render service at the image tags produced by GitHub Actions. The exact registry wiring is handled in the Render dashboard, not in the workflow file.

## CI Pipeline

`ci.yml` runs on pull requests targeting `develop`, `staging`, or `main`.

It performs:

- `pnpm install --frozen-lockfile`
- root type checking
- available test scripts, if any exist
- frontend build validation
- backend build validation
- Docker build validation for both service images

## CD Pipeline

`deploy.yml` runs on pushes to `staging` and `main`.

It performs:

- Build and push backend image to GHCR
- Build and push frontend image to GHCR
- Tag images with the branch release tag and commit SHA
- Trigger the correct Render deploy hook for staging or production

## Environment Variables

The backend reads these values from the Render environment:

- `DATABASE_URL`
- `NODE_ENV`
- `PORT`
- `SESSION_SECRET`
- `CORS_ORIGIN`
- `LOG_LEVEL`
- `AI_INTEGRATIONS_OPENROUTER_BASE_URL`
- `AI_INTEGRATIONS_OPENROUTER_API_KEY`
- `AI_INTEGRATIONS_OPENROUTER_API_KEY_2`
- `AI_INTEGRATIONS_OPENROUTER_API_KEY_3`
- `GITHUB_TOKEN`

The frontend only needs:

- `VITE_API_URL`

The `VITE_` prefix is public by design, so do not put secrets there.

## Manual GitHub Secrets And Environments

Create two GitHub environments:

- `staging`
- `production`

Add environment secrets such as:

- `RENDER_DEPLOY_HOOK_STAGING`
- `RENDER_DEPLOY_HOOK_PRODUCTION`
- `VITE_API_URL_STAGING`
- `VITE_API_URL_PRODUCTION`
- `DATABASE_URL`
- `SESSION_SECRET`
- `AI_INTEGRATIONS_OPENROUTER_API_KEY`
- `AI_INTEGRATIONS_OPENROUTER_API_KEY_2`
- `AI_INTEGRATIONS_OPENROUTER_API_KEY_3`
- `GITHUB_TOKEN`

If you prefer Docker Hub instead of GHCR, add the Docker registry username and token there and update the login step accordingly.

## Vercel Setup

1. Import the GitHub repository into Vercel.
2. Set the root directory to `artifacts/clariva-web`.
3. Use `main` as the production branch.
4. Add `VITE_API_URL` for the production frontend environment.
5. Add preview environment variables if you want staging or preview builds to talk to the Render staging URL.

## Render Setup

Create two Render web services:

- One for staging, connected to the `staging` branch
- One for production, connected to the `main` branch

Set these environment variables on each service:

- `DATABASE_URL`
- `SESSION_SECRET`
- `CORS_ORIGIN`
- `AI_INTEGRATIONS_OPENROUTER_BASE_URL`
- `AI_INTEGRATIONS_OPENROUTER_API_KEY`
- `LOG_LEVEL`

The backend must use the production Supabase transaction pooler URL or another production PostgreSQL database URL with SSL enabled.

## Local Verification

Recommended local checks:

```bash
pnpm install
pnpm run typecheck
pnpm run build
docker compose up --build
```

This should start PostgreSQL, the backend API, and the frontend container.

## Post-Deployment Checklist

- Confirm the frontend loads on Vercel.
- Confirm login and session persistence work against the Render backend.
- Confirm the backend can connect to PostgreSQL.
- Confirm the Render logs show no startup errors.
- Confirm Docker images are published with the expected tags.
- Confirm branch protection prevents direct pushes to protected branches.
