# Clariva — AI-Powered Idea Validation SaaS

## Overview

Clariva is a full-stack SaaS application that helps founders and builders validate startup ideas before they build them. Submit an idea → the pipeline searches GitHub, Wikipedia, and DuckDuckGo → feeds context to an LLM → returns structured scores and insights.

## Architecture

- **Frontend**: React + Vite (`artifacts/clariva-web`, preview at `/`)
- **Backend**: Express 5 + Drizzle ORM + PostgreSQL (`artifacts/api-server`, preview at `/api`)
- **AI**: OpenRouter (meta-llama/llama-3.3-70b-instruct:free) via `@workspace/integrations-openrouter-ai`
- **Auth**: Session-based (express-session + bcryptjs), no JWT

## Key Features

- **Analysis Pipeline**: GitHub API (competitive landscape) + Wikipedia API (domain context) + DuckDuckGo API (market awareness) + rule-based engine → LLM analysis
- **Scores**: Uniqueness, Feasibility, Impact, Innovation, Overall (0–100 each)
- **Insights**: Strengths, Weaknesses, Risks, Suggestions (structured AI output)
- **Dashboard**: List all ideas with status, scores, multi-select for comparison
- **Compare**: Side-by-side score comparison across multiple ideas
- **Fallback**: If LLM is rate-limited, uses metadata-derived fallback scores

## Project Structure

```
artifacts/
  api-server/      Express API server
    src/
      app.ts                   Express app setup (CORS, sessions, JSON)
      routes/
        auth.ts                /api/auth/* routes
        ideas.ts               /api/ideas/* routes + background analysis
        health.ts              /api/healthz
      lib/
        pipeline/
          analyzer.ts          Main orchestrator (calls all sources + LLM)
          github.ts            GitHub search API
          wikipedia.ts         Wikipedia REST API
          duckduckgo.ts        DuckDuckGo instant answer API
          rules.ts             Rule-based signal extraction
        logger.ts              Pino logger singleton
      middlewares/
        auth.ts                requireAuth middleware
  clariva-web/     React + Vite frontend
    src/
      pages/
        auth.tsx               Login / Register
        dashboard.tsx          Idea list with search, multi-select
        submit.tsx             New idea form with complexity slider
        results.tsx            Full analysis view with score bars
        compare.tsx            Side-by-side idea comparison
      components/
        layout.tsx             Sidebar navigation layout

lib/
  api-spec/        OpenAPI spec (openapi.yaml) + Orval codegen config
  api-zod/         Generated Zod schemas (from codegen)
  api-client-react/ Generated React Query hooks (from codegen)
  db/              Drizzle ORM schema + migrations
    src/schema/
      users.ts
      ideas.ts
      analyses.ts
  integrations-openrouter-ai/  OpenRouter AI client
```

## Environment Variables

- `SESSION_SECRET` — Express session secret
- `DATABASE_URL` — PostgreSQL connection string (auto-provisioned)
- `AI_INTEGRATIONS_OPENROUTER_BASE_URL` — OpenRouter base URL
- `AI_INTEGRATIONS_OPENROUTER_API_KEY` — OpenRouter API key
- `GITHUB_TOKEN` — (optional) GitHub API token for higher rate limits

## Development

```bash
# Run codegen after OpenAPI spec changes
pnpm --filter @workspace/api-spec run codegen

# Push DB schema changes
pnpm --filter @workspace/db run push

# Typecheck
pnpm run typecheck
```

## DB Schema

- `users`: id, email, password_hash, name, domain, created_at, updated_at
- `ideas`: id, user_id, title, description, domain, complexity, status, created_at, updated_at
- `analyses`: id, idea_id, status, scores (5 integer cols), insights (4 jsonb cols), github_repos jsonb, tech_stack jsonb, market_context text, verdict_summary text, created_at, updated_at

## API Endpoints

```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me

GET  /api/ideas                 List user's ideas with analysis
POST /api/ideas                 Create idea + auto-queue analysis
GET  /api/ideas/compare?ids=1,2 Compare multiple ideas
GET  /api/ideas/:id             Full idea + analysis
DELETE /api/ideas/:id           Delete idea
POST /api/ideas/:id/analyze     Re-trigger analysis
```
