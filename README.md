# Clariva — AI-Powered Idea Validation Platform

<p align="center">
  <strong>Validate your startup ideas before you build. Kill bad bets. Ship with confidence.</strong>
</p>

<p align="center">
  <a href="https://clariva-idea-hub-clariva-web.vercel.app/" target="_blank">
    <img src="https://img.shields.io/badge/Live-clariva--idea--hub.vercel.app-4f46e5?style=for-the-badge&logo=vercel" alt="Live URL" />
  </a>
</p>

---

## 🌐 Live Application

**[https://clariva-idea-hub-clariva-web.vercel.app/](https://clariva-idea-hub-clariva-web.vercel.app/)**

---

## 📌 Project Scope

Clariva is a full-stack SaaS web application built for entrepreneurs, product teams, and startup founders who need fast, objective feedback on their ideas before investing time or capital. Users submit ideas and receive structured AI analysis covering feasibility, uniqueness, market potential, risk factors, and strategic recommendations.

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

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS v4, Radix UI, TanStack Query, Framer Motion, Recharts, Wouter |
| **Backend** | Node.js, Express, TypeScript, Pino Logger, express-session |
| **Database** | PostgreSQL (Supabase), Drizzle ORM |
| **AI / LLM** | OpenRouter API (multi-model routing), GitHub API |
| **Auth** | Session-based authentication with PostgreSQL session store |
| **Package Manager** | pnpm Workspaces (monorepo) |
| **Deployment** | Vercel (frontend), Render (backend), Docker |
| **CI/CD** | GitHub Actions (build, typecheck, Docker push, Render deploy hook) |

---

## ⚙️ System Functionalities

| Feature | Description |
|---|---|
| **User Registration & Login** | Secure email/password authentication with bcrypt hashing and session cookies |
| **Idea Submission** | Submit ideas with title, description, domain, and complexity level |
| **AI Analysis** | Automated background analysis producing 5 dimension scores, strengths, weaknesses, risks, and market context |
| **Results Dashboard** | View all submitted ideas with status tracking (pending, processing, analyzed, failed) |
| **Idea Comparison** | Side-by-side comparison of multiple ideas using radar and bar charts |
| **AI Pivot Suggestions** | For low-scoring ideas, generate 3 specific, actionable pivot strategies |
| **AI Insights** | Aggregated analytics and patterns across all of a user's ideas |
| **Team Collaboration** | Create teams, invite members, share ideas within teams, and discuss with real-time presence indicators |
| **Settings & Profile** | Update profile, avatar, theme (dark/light), language, and notification preferences |
| **PDF Export** | Export idea analysis reports as professional PDFs |
| **Dark/Light Mode** | Persistent theme preference synced to the database |

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

## 🚀 Getting Started (Local Development)

### Prerequisites
- Node.js v18+
- pnpm v9+

### 1. Clone & Install

```bash
git clone <repository-url>
cd Creative-Idea-Hub
pnpm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Fill in `.env` with your actual values:
- `DATABASE_URL` — PostgreSQL connection string (Supabase or local)
- `SESSION_SECRET` — A long, random secret string
- `CORS_ORIGIN` — `http://localhost:5173` for local development
- `AI_INTEGRATIONS_OPENROUTER_API_KEY` — Your OpenRouter API key

### 3. Push Database Schema

```bash
pnpm db:push
```

### 4. Start Development Servers

```bash
pnpm dev
```

- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:3000](http://localhost:3000)

---

## ☁️ Deployment Configuration

| Service | Platform | Required Environment Variables |
|---|---|---|
| **Frontend** | Vercel | `VITE_API_URL=https://your-render-api.onrender.com` |
| **Backend** | Render | `DATABASE_URL`, `SESSION_SECRET`, `CORS_ORIGIN=https://your-vercel-url.vercel.app`, `NODE_ENV=production`, `AI_INTEGRATIONS_OPENROUTER_API_KEY` |

> **Important:** `CORS_ORIGIN` on Render **must** match your Vercel frontend URL exactly. Without it, session cookies will be blocked and all authenticated requests return 401.

---

## 👥 Contributors

| Name | Email | Role |
|---|---|---|
| **Tajamal Hussain** | tajamalhussain1004@gmail.com | Team Lead, Backend Developer, Version/Docker Manager |
| **Manir Ahmad** | munirahmed135652@gmail.com | Documentation & Project Manager |
| **Abdul Wahab** | aistudent1483@gmail.com | Frontend Developer |

---

## 📄 License

This project is private and not licensed for public distribution.
