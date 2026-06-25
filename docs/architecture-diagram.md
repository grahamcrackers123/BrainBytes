# BrainBytes Deployment Architecture

## System Architecture Overview

```mermaid
graph LR
    subgraph "Developer"
        DEV[Developer]
        GIT[GitHub Repo]
    end

    subgraph "GitHub Actions"
        CI[CI/CD Pipeline<br/>Lint → Test → Build → E2E → Security]
    end

    subgraph "Railway.app Cloud Platform"
        subgraph "Backend Service"
            BE[Express API<br/>Port 3000<br/>node:18-alpine]
        end
        subgraph "Frontend Service"
            FE[Next.js App<br/>Port 3000<br/>node:18-alpine]
        end
        subgraph "MongoDB Plugin"
            DB[(MongoDB 7<br/>Persistent Storage)]
        end
    end

    subgraph "External"
        GROQ[Groq AI API]
    end

    DEV -->|git push| GIT
    GIT -->|trigger| CI
    CI -->|deploy| BE
    CI -->|deploy| FE
    FE -->|HTTP / API calls| BE
    BE -->|Mongoose| DB
    BE -->|HTTPS| GROQ
```

## Data Flow

```
User's Browser
      │
      ▼
Railway Frontend (Next.js) ───→ Railway Backend (Express) ───→ Railway MongoDB
      │                              │
      │                              ▼
      │                         Groq AI API
      │
  Auto SSL        Internal Network       Managed Database
  (Railway)       (Railway DNS)          (Railway Plugin)
```

## Service Communication

| From | To | Protocol | How |
|------|----|----------|-----|
| Browser | Frontend | HTTPS | Railway auto-provides URL + SSL |
| Frontend | Backend | HTTP | Railway internal URL env var |
| Backend | MongoDB | MongoDB Wire | Railway plugin connection string |
| Backend | Groq API | HTTPS | External API call |

## Security Layers

| Layer | Protection |
|-------|------------|
| Transport | Auto SSL/HTTPS (Railway-managed) |
| Secrets | Encrypted env vars (Railway) |
| Network | Internal service networking (no public DB) |
| API | Input validation in Express routes |
| CORS | Restricted to frontend origin in production |
