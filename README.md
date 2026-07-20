<div align="center">

# Clariva — AI-Powered Idea Validation Platform

**Validate your startup ideas before you build. Kill bad bets. Ship with confidence.**

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-Clariva-4f46e5?style=for-the-badge&logo=vercel&logoColor=white)](https://clariva-idea-hub-clariva-web.vercel.app/)

---

<!--
  TODO: Add project banner/hero image here
  Recommended: Screenshot of main dashboard or landing page
  Image path: ./docs/images/clariva-hero.png
-->

_Structured AI analysis for entrepreneurs who need fast, objective feedback on their ideas._

</div>

---

## ⚡ What is Clariva?

**Clariva** is a production-ready **AI-powered idea validation platform** that helps entrepreneurs, product teams, and startup founders evaluate their ideas before investing time or capital. It provides structured analysis across multiple dimensions, competitive intelligence, and actionable recommendations — all in under a minute.

```
User Idea  →  [ Clariva Analysis Engine ]  →  Structured Report

                      ↓
            ┌─────────────────────────┐
            │  OpenRouter AI Models    │  ← Multi-model routing
            │  GitHub API Scanner      │  ← Competitive analysis
            │  Web Search Integration  │  ← Market context
            │  Scoring Algorithm       │  ← 5-dimension evaluation
            └─────────────────────────┘
                      ↓
              Analysis Report with Scores & Insights
```

---

## 🌐 Live Application

**[https://clariva-idea-hub-clariva-web.vercel.app/](https://clariva-idea-hub-clariva-web.vercel.app/)**

---

## 📌 Project Scope

Clariva is a full-stack SaaS web application built for entrepreneurs, product teams, and startup founders who need fast, objective feedback on their ideas before investing time or capital. Users submit ideas and receive structured AI analysis covering feasibility, uniqueness, market potential, risk factors, and strategic recommendations.

### Key Highlights

<div align="center">

|      ⚡ Fast Analysis       |   🎯 Structured Scoring   |      🤝 Team Collaboration       |     🏆 Community Challenges      |
| :-------------------------: | :-----------------------: | :------------------------------: | :------------------------------: |
| Results in under 60 seconds | 5-dimension AI evaluation | Real-time presence & discussions | Weekly AI-generated competitions |

|  📊 Idea Comparison   |   🔄 Pivot Suggestions    |    📄 PDF Export     |    🌐 Public Feed    |
| :-------------------: | :-----------------------: | :------------------: | :------------------: |
| Side-by-side analysis | AI-generated alternatives | Professional reports | Share ideas publicly |

</div>

---

## 🎯 Project Purpose

Most startup ideas fail not because of poor execution, but because of poor validation. Clariva fills this gap by providing:

- An **AI-powered analysis engine** that evaluates ideas across five dimensions: feasibility, uniqueness, impact, innovation, and overall viability.
- **Competitive intelligence** that scans GitHub and the web for existing solutions.
- **Actionable pivot suggestions** for ideas that score low in key areas.
- **Team collaboration** features so co-founders can review, compare, and discuss ideas together.
- **PDF export** for sharing analysis reports externally.

---

## 🛠️ Tech Stack

| Layer               | Technologies                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------------ |
| **Frontend**        | React 18, Vite, TypeScript, Tailwind CSS v4, Radix UI, TanStack Query, Framer Motion, Recharts, Wouter |
| **Backend**         | Node.js, Express, TypeScript, Pino Logger, express-session                                             |
| **Database**        | PostgreSQL (Supabase), Drizzle ORM                                                                     |
| **AI / LLM**        | OpenRouter API (multi-model routing), GitHub API                                                       |
| **Auth**            | Session-based authentication with PostgreSQL session store                                             |
| **Package Manager** | pnpm Workspaces (monorepo)                                                                             |
| **Deployment**      | Vercel (frontend), Render (backend), Docker                                                            |
| **CI/CD**           | GitHub Actions (build, typecheck, Docker push, Render deploy hook)                                     |

---

## 🎨 Application Flow

<!--
  TODO: Add application flow diagram here
  Recommended: User journey flowchart showing key interactions
  Image path: ./docs/images/application-flow.png
-->

### User Journey

```
1. Registration/Login
   └─> Session-based authentication with bcrypt

2. Dashboard
   ├─> View all ideas (pending, processing, analyzed, failed)
   ├─> Submit new idea
   ├─> Compare ideas
   └─> View AI insights

3. Idea Submission
   ├─> Enter title, description, domain, complexity
   └─> Trigger background analysis

4. AI Analysis Pipeline
   ├─> OpenRouter API analysis (multi-model)
   ├─> GitHub repository scanning
   ├─> Web search for market context
   └─> Generate 5-dimension scores + insights

5. Results & Actions
   ├─> View detailed analysis report
   ├─> Generate pivot suggestions (if low score)
   ├─> Export to PDF
   ├─> Share to team
   └─> Publish to public feed

6. Team Collaboration
   ├─> Create/join teams
   ├─> Share ideas with team members
   ├─> Real-time discussions
   └─> Live presence indicators

7. Weekly Challenges
   ├─> View active challenges
   ├─> Submit challenge entries
   ├─> Vote on submissions
   └─> Win badges
```

### Real-Time Features

- **WebSocket connections** for live updates
- **Presence indicators** showing active team members
- **Challenge notifications** for new competitions and winners
- **Vote updates** broadcast in real-time

---

## 🗄️ Database Structure

Clariva uses **PostgreSQL** (via Supabase) with **Drizzle ORM** for type-safe database operations.

<!--
  TODO: Add database schema diagram here
  Recommended: Entity-relationship diagram showing table relationships
  Image path: ./docs/images/database-schema.png
-->

### Core Tables

| Table                     | Purpose                     | Key Fields                                                                                                                                                            |
| ------------------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **users**                 | User accounts & profiles    | `id`, `email`, `passwordHash`, `name`, `theme`, `notifications`, `isAdmin`                                                                                            |
| **ideas**                 | User-submitted ideas        | `id`, `userId`, `title`, `description`, `domain`, `complexity`, `status`                                                                                              |
| **analyses**              | AI analysis results         | `ideaId`, `uniquenessScore`, `feasibilityScore`, `impactScore`, `innovationScore`, `overallScore`, `strengths`, `weaknesses`, `risks`, `githubRepos`, `marketContext` |
| **teams**                 | Collaboration teams         | `id`, `name`, `description`, `ownerId`                                                                                                                                |
| **team_members**          | Team membership             | `teamId`, `userId`, `role`                                                                                                                                            |
| **team_ideas**            | Ideas shared with teams     | `teamId`, `ideaId`                                                                                                                                                    |
| **public_ideas**          | Ideas shared to public feed | `ideaId`, `userId`, `isAnonymous`                                                                                                                                     |
| **weekly_challenges**     | AI-generated competitions   | `id`, `title`, `description`, `startsAt`, `endsAt`, `status`, `winnerCalculated`                                                                                      |
| **challenge_submissions** | Challenge entries           | `challengeId`, `userId`, `ideaId`                                                                                                                                     |
| **challenge_votes**       | Community voting            | `submissionId`, `userId`                                                                                                                                              |
| **notifications**         | User notifications          | `userId`, `type`, `title`, `body`, `targetPath`, `isRead`                                                                                                             |
| **user_badges**           | Achievement badges          | `userId`, `badgeType`, `awardedAt`                                                                                                                                    |

### Database Relationships

```
users (1) ──< (N) ideas
ideas (1) ──< (1) analyses
users (1) ──< (N) teams (as owner)
teams (1) ──< (N) team_members ──> (1) users
teams (1) ──< (N) team_ideas ──> (1) ideas
ideas (1) ──< (1) public_ideas
weekly_challenges (1) ──< (N) challenge_submissions ──> (1) ideas
challenge_submissions (1) ──< (N) challenge_votes ──> (1) users
users (1) ──< (N) notifications
users (1) ──< (N) user_badges
```

### Key Database Features

- **Cascade deletes** ensure data integrity when users or ideas are removed
- **Unique constraints** prevent duplicate submissions and votes
- **JSONB fields** store complex structured data (scores, strengths, weaknesses)
- **Timestamp tracking** with automatic `updatedAt` on every modification
- **Session store** for secure authentication persistence

---

## 🏗️ System Architecture

<!--
  TODO: Add system architecture diagram here
  Recommended: High-level architecture showing frontend, backend, database, and external services
  Image path: ./docs/images/system-architecture.png
-->

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  React 18 + TypeScript + Vite                          │    │
│  │  - TanStack Query (data fetching & caching)            │    │
│  │  - Wouter (routing)                                    │    │
│  │  - Tailwind CSS v4 + Radix UI (styling)               │    │
│  │  - Framer Motion (animations)                          │    │
│  │  - Recharts (data visualization)                       │    │
│  │  - WebSocket client (real-time updates)               │    │
│  └────────────────────────────────────────────────────────┘    │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTPS/WSS
┌───────────────────────────▼─────────────────────────────────────┐
│                        API LAYER                                 │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Node.js + Express + TypeScript                        │    │
│  │  - REST API routes                                     │    │
│  │  - WebSocket server (express-ws)                       │    │
│  │  - Session-based authentication                        │    │
│  │  - Pino logger                                         │    │
│  │  - Background workers (challenge lifecycle)            │    │
│  └────────────────────────────────────────────────────────┘    │
└──────────┬─────────────────┬────────────────┬───────────────────┘
           │                 │                │
┌──────────▼─────────┐ ┌────▼──────────┐ ┌──▼─────────────────┐
│   DATABASE LAYER   │ │  AI SERVICES  │ │  EXTERNAL APIs     │
│                    │ │               │ │                    │
│  PostgreSQL        │ │  OpenRouter   │ │  GitHub API        │
│  (Supabase)        │ │  Multi-model  │ │  Repository scan   │
│                    │ │  AI routing   │ │  Search APIs       │
│  - Drizzle ORM     │ │               │ │                    │
│  - Type safety     │ │  Models:      │ │                    │
│  - Migrations      │ │  - GPT-4      │ │                    │
│                    │ │  - Claude     │ │                    │
│                    │ │  - Gemini     │ │                    │
└────────────────────┘ └───────────────┘ └────────────────────┘
```

### Monorepo Structure

```
Clariva/
├── 📁 artifacts/
│   ├── api-server/          # Backend Express application
│   │   ├── src/
│   │   │   ├── routes/      # REST API endpoints
│   │   │   ├── middlewares/ # Auth, team-auth, admin-auth
│   │   │   ├── lib/         # Analysis pipeline, email, notifications
│   │   │   └── workers/     # Background challenge worker
│   │   └── Dockerfile
│   │
│   └── clariva-web/         # Frontend React application
│       ├── src/
│       │   ├── pages/       # Route components
│       │   ├── components/  # Reusable UI components
│       │   └── lib/         # API client, utilities
│       └── public/
│
├── 📁 lib/
│   ├── api-client-react/    # Type-safe React Query hooks
│   ├── api-spec/            # OpenAPI specification
│   ├── api-zod/             # Shared Zod schemas
│   ├── db/                  # Database schema & Drizzle config
│   └── integrations-openrouter-ai/  # AI service integration
│
├── 📁 scripts/              # Utility scripts
├── 📁 .github/workflows/    # CI/CD pipelines
├── docker-compose.yml       # Local development setup
├── pnpm-workspace.yaml      # Monorepo configuration
└── README.md
```

### Data Flow: Idea Analysis

```
1. User submits idea via frontend form
   └─> POST /api/ideas

2. Backend creates idea record (status: "pending")
   └─> Stores in PostgreSQL
   └─> Returns idea ID to frontend

3. Frontend starts polling for analysis status
   └─> GET /api/ideas/:id

4. Background analysis pipeline starts:
   ├─> Analyzer extracts domain-specific context
   ├─> GitHub scanner searches for similar repos
   ├─> OpenRouter API generates 5-dimension analysis
   └─> Updates idea status: "processing" → "analyzed"

5. Frontend receives completed analysis
   └─> Displays scores, insights, and recommendations
   └─> Enables PDF export and sharing options
```

### Real-Time Communication Flow

```
1. User connects to WebSocket
   └─> wss://api-domain/ws

2. Backend authenticates via session
   └─> Stores connection in active connections map

3. Events broadcast to connected clients:
   ├─> New challenge created
   ├─> Challenge extended
   ├─> Challenge winner announced
   ├─> Vote cast on submission
   └─> Team presence updates

4. Frontend updates UI reactively
   └─> No page refresh required
```

### Deployment Architecture

| Component       | Platform                 | Purpose                                         |
| --------------- | ------------------------ | ----------------------------------------------- |
| **Frontend**    | Vercel                   | Static hosting with CDN, automatic deployments  |
| **Backend API** | Render                   | Node.js server, WebSocket support, auto-scaling |
| **Database**    | Supabase                 | Managed PostgreSQL with connection pooling      |
| **Worker**      | Render Background Worker | Automated challenge lifecycle management        |
| **CI/CD**       | GitHub Actions           | Automated build, typecheck, deploy on push      |

---

## ⚙️ System Functionalities

### Core Features

| Feature                       | Description                                                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **User Registration & Login** | Secure email/password authentication with bcrypt hashing and session cookies                                 |
| **Idea Submission**           | Submit ideas with title, description, domain, and complexity level                                           |
| **AI Analysis**               | Automated background analysis producing 5 dimension scores, strengths, weaknesses, risks, and market context |
| **Results Dashboard**         | View all submitted ideas with status tracking (pending, processing, analyzed, failed)                        |
| **Idea Comparison**           | Side-by-side comparison of multiple ideas using radar and bar charts                                         |
| **AI Pivot Suggestions**      | For low-scoring ideas, generate 3 specific, actionable pivot strategies                                      |
| **AI Insights**               | Aggregated analytics and patterns across all of a user's ideas                                               |
| **Team Collaboration**        | Create teams, invite members, share ideas within teams, and discuss with real-time presence indicators       |
| **Settings & Profile**        | Update profile, avatar, theme (dark/light), language, and notification preferences                           |
| **PDF Export**                | Export idea analysis reports as professional PDFs                                                            |
| **Dark/Light Mode**           | Persistent theme preference synced to the database                                                           |

### Weekly Challenge System

Clariva features a **fully automated Weekly Challenge System** that maintains continuous community competitions:

| Feature                     | Description                                                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **AI-Generated Challenges** | Challenges automatically created using OpenRouter AI with domain variety and engaging problem statements                 |
| **Automated Lifecycle**     | Background worker manages challenge creation, extensions, completion, and winner calculation without manual intervention |
| **Smart Extensions**        | Challenges auto-extend by 2 days when no submissions exist 24 hours before expiration                                    |
| **Winner Calculation**      | Sophisticated tiebreaker logic: highest votes → earliest submission → AI evaluation for simultaneous ties                |
| **Badge System**            | Automated "challenge_winner" badge awarding with duplicate prevention                                                    |
| **Self-Voting Prevention**  | Backend validation and frontend UI prevent users from voting on their own submissions                                    |
| **Real-Time Updates**       | WebSocket broadcasts for challenge creation, extensions, winner announcements, and vote updates                          |
| **Professional UX**         | Empty states, extension badges, user submission highlights, and winner celebration animations                            |

**Technical Implementation:**

- Separate **worker process** runs independently every hour
- Retry logic with exponential backoff for reliability
- Idempotent operations prevent duplicate actions
- Race condition protection with optimistic locking
- Comprehensive error handling and logging

---

## 💡 Why Idea Validation Matters

The majority of startups fail not because of poor execution, but because they solve the wrong problem or build something nobody wants. Clariva addresses this critical gap:

```
Without Clariva:
  Entrepreneur: "I'll spend 6 months and $50k building this..."
  6 Months Later: "Nobody wants this. Market already saturated."
  Result: ❌ Time wasted, capital burned, opportunity cost

With Clariva:
  Entrepreneur: "Let me validate this idea first..."
  5 Minutes Later: "78% similar solutions exist. Pivot to focus on X instead."
  Result: ✅ Informed decision, saved resources, better direction
```

**Key Statistics:**

- **42%** of startups fail due to no market need (CB Insights)
- **23%** fail due to being outcompeted
- **14%** fail due to poor product

Clariva helps you avoid being part of these statistics by providing:

- **Early validation** before you invest significant resources
- **Competitive intelligence** to understand the landscape
- **Actionable pivots** when your initial direction needs adjustment
- **Data-driven insights** instead of gut feelings

---

## 🔍 Gap Filling

Most existing idea validation tools fall into one of two categories:

1. **Manual frameworks** (e.g., lean canvas, business model canvas) that require significant time and domain expertise.
2. **Generic AI chatbots** that provide unstructured, non-reproducible feedback.

Clariva addresses both gaps by providing a **structured, reproducible, automated evaluation pipeline** that stores results, enables comparison across ideas, and generates scored dimensions rather than raw text output.

---

## ✨ Novelty

- **Multi-dimensional scoring**: Ideas are evaluated across 5 distinct AI-generated scores, not a single rating.
- **Intelligent model routing**: The backend routes AI requests across multiple LLM providers with automatic fallback, maximizing reliability and cost-efficiency.
- **Pivot engine**: Instead of just flagging weak ideas, Clariva actively generates specific, targeted pivots tailored to the idea's exact weaknesses.
- **Real-time team presence**: WebSocket-based live presence indicators show team members who are currently active.
- **Monorepo with shared types**: A single Zod schema library (`@workspace/api-zod`) is shared across the frontend, backend, and generated API clients, eliminating type drift between layers.

---

## 📦 Project Structure

```
Clariva/
├── 📁 artifacts/
│   ├── api-server/                     # Backend Express application
│   │   ├── src/
│   │   │   ├── app.ts                  # Express app configuration
│   │   │   ├── index.ts                # Server entry point
│   │   │   ├── routes/                 # API endpoints
│   │   │   │   ├── auth.ts             # Authentication routes
│   │   │   │   ├── ideas.ts            # Idea CRUD operations
│   │   │   │   ├── challenges.ts       # Weekly challenge routes
│   │   │   │   ├── teams.ts            # Team management
│   │   │   │   ├── notifications.ts    # Notification system
│   │   │   │   ├── public-feed.ts      # Public idea feed
│   │   │   │   └── ws.ts               # WebSocket handlers
│   │   │   ├── middlewares/
│   │   │   │   ├── auth.ts             # User authentication
│   │   │   │   ├── team-auth.ts        # Team authorization
│   │   │   │   └── admin-auth.ts       # Admin-only access
│   │   │   ├── lib/
│   │   │   │   ├── pipeline/           # AI analysis pipeline
│   │   │   │   ├── email.ts            # Email service
│   │   │   │   ├── notify.ts           # Notification system
│   │   │   │   └── challenge-lifecycle.ts
│   │   │   └── workers/
│   │   │       └── challenge-worker.ts # Automated challenge management
│   │   ├── Dockerfile                  # Container configuration
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── clariva-web/                    # Frontend React application
│       ├── src/
│       │   ├── pages/                  # Route components
│       │   │   ├── home.tsx
│       │   │   ├── dashboard.tsx
│       │   │   ├── idea-detail.tsx
│       │   │   ├── comparison.tsx
│       │   │   ├── challenges.tsx
│       │   │   ├── teams.tsx
│       │   │   └── settings.tsx
│       │   ├── components/             # Reusable components
│       │   │   ├── ui/                 # Radix UI wrappers
│       │   │   ├── idea-card.tsx
│       │   │   ├── analysis-chart.tsx
│       │   │   └── team-presence.tsx
│       │   └── lib/
│       │       ├── api.ts              # API client
│       │       └── websocket.ts        # WebSocket client
│       ├── public/
│       │   ├── favicon.ico
│       │   └── logo.svg
│       ├── package.json
│       └── vite.config.ts
│
├── 📁 lib/                             # Shared libraries (pnpm workspace)
│   ├── api-client-react/               # Type-safe React Query hooks
│   │   └── src/generated/
│   ├── api-spec/                       # OpenAPI specification
│   │   └── openapi.yaml
│   ├── api-zod/                        # Shared Zod validation schemas
│   │   └── src/schemas/
│   ├── db/                             # Database layer
│   │   ├── src/schema/                 # Drizzle table definitions
│   │   │   ├── users.ts
│   │   │   ├── ideas.ts
│   │   │   ├── analyses.ts
│   │   │   ├── teams.ts
│   │   │   ├── weekly-challenges.ts
│   │   │   └── [22 total schema files]
│   │   ├── drizzle.config.ts
│   │   └── package.json
│   └── integrations-openrouter-ai/     # AI service wrapper
│
├── 📁 scripts/                         # Automation scripts
├── 📁 .github/workflows/               # CI/CD pipelines
│   ├── ci.yml                          # Build & typecheck
│   └── deploy.yml                      # Deployment automation
├── docker-compose.yml                  # Local development orchestration
├── pnpm-workspace.yaml                 # Monorepo workspace definition
├── .env.example                        # Environment variable template
└── README.md
```

---

## 🔌 API Reference

### Authentication Endpoints

| Method | Endpoint             | Description                 |
| ------ | -------------------- | --------------------------- |
| `POST` | `/api/auth/register` | Register new user account   |
| `POST` | `/api/auth/login`    | Login with email & password |
| `POST` | `/api/auth/logout`   | Logout and clear session    |
| `GET`  | `/api/auth/me`       | Get current user profile    |

### Idea Management

| Method   | Endpoint                  | Description                  |
| -------- | ------------------------- | ---------------------------- |
| `POST`   | `/api/ideas`              | Submit new idea for analysis |
| `GET`    | `/api/ideas`              | Get all user ideas           |
| `GET`    | `/api/ideas/:id`          | Get specific idea details    |
| `PATCH`  | `/api/ideas/:id`          | Update idea                  |
| `DELETE` | `/api/ideas/:id`          | Delete idea                  |
| `GET`    | `/api/ideas/:id/analysis` | Get analysis results         |
| `POST`   | `/api/ideas/:id/pivot`    | Generate pivot suggestions   |
| `GET`    | `/api/ideas/insights`     | Get aggregated AI insights   |

### Challenge System

| Method | Endpoint                               | Description                  |
| ------ | -------------------------------------- | ---------------------------- |
| `GET`  | `/api/challenges`                      | Get all challenges           |
| `GET`  | `/api/challenges/active`               | Get current active challenge |
| `POST` | `/api/challenges/:id/submit`           | Submit idea to challenge     |
| `POST` | `/api/challenges/submissions/:id/vote` | Vote for submission          |
| `GET`  | `/api/challenges/:id/leaderboard`      | Get challenge leaderboard    |

### Team Collaboration

| Method | Endpoint                     | Description           |
| ------ | ---------------------------- | --------------------- |
| `POST` | `/api/teams`                 | Create new team       |
| `GET`  | `/api/teams`                 | Get user's teams      |
| `POST` | `/api/teams/:id/invite`      | Invite member to team |
| `POST` | `/api/teams/:id/ideas`       | Share idea with team  |
| `GET`  | `/api/teams/:id/discussions` | Get team discussions  |

### WebSocket Events

Connect to `ws://localhost:3000/ws` (or `wss://your-domain.com/ws` in production).

| Event                | Payload                     | Description                 |
| -------------------- | --------------------------- | --------------------------- |
| `challenge:created`  | `{ challenge }`             | New challenge started       |
| `challenge:extended` | `{ challenge }`             | Challenge deadline extended |
| `challenge:winner`   | `{ challengeId, winnerId }` | Winner announced            |
| `challenge:vote`     | `{ submissionId, votes }`   | Vote count updated          |
| `presence:update`    | `{ teamId, users }`         | Team member online status   |

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the repository
2. Create your feature branch: `git checkout -b feat/my-feature`
3. Commit your changes: `git commit -m 'feat: add my feature'`
4. Push to the branch: `git push origin feat/my-feature`
5. Open a Pull Request

---

## 👥 Contributors

<div align="center">

| Name                | Role                                                 | Contact                         |
| ------------------- | ---------------------------------------------------- | ------------------------------- |
| **Tajamal Hussain** | Team Lead, Backend Developer, Version/Docker Manager | 📧 tajamalhussain1004@gmail.com |
| **Manir Ahmad**     | Documentation & Project Manager                      | 📧 munirahmed135652@gmail.com   |
| **Abdul Wahab**     | Frontend Developer                                   | 📧 aistudent1483@gmail.com      |

</div>

---

## 📄 License

This project is private and not licensed for public distribution.

---

<div align="center">

**Built with ❤️ to help entrepreneurs validate ideas faster.**

_If Clariva helped you, give it a ⭐ on GitHub!_

**[🚀 Try Clariva Now](https://clariva-idea-hub-clariva-web.vercel.app/)**

</div>
