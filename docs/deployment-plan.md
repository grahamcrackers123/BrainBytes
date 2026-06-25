# BrainBytes Deployment Plan

## 1. Environment Architecture

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     GitHub                              │
│  ┌─────────┐  ┌────────┐  ┌────────┐  ┌───────────┐   │
│  │  Code   │  │ Lint & │  │ Build &│  │ Deploy to │   │
│  │  Push   │──▶│  Test  │──▶│Package │──▶│  Railway   │   │
│  └─────────┘  └────────┘  └────────┘  └───────────┘   │
└──────────────────────────┬──────────────────────────────┘
                           │ Docker images via artifact
                           ▼
┌─────────────────── Railway.app ─────────────────────────┐
│                                                          │
│  ┌─────────────────────────────────────────────┐        │
│  │         Railway Backend Service              │        │
│  │  ┌──────────────────────────────────────┐    │        │
│  │  │  Express.js API                      │    │        │
│  │  │  Port 3000                           │    │        │
│  │  │  Health: GET /                       │    │        │
│  │  └──────────────────────────────────────┘    │        │
│  └─────────────────────────────────────────────┘        │
│                                                          │
│  ┌─────────────────────────────────────────────┐        │
│  │         Railway Frontend Service             │        │
│  │  ┌──────────────────────────────────────┐    │        │
│  │  │  Next.js (Static + SSR)             │    │        │
│  │  │  Port 3000                          │    │        │
│  │  │  Calls backend via internal URL     │    │        │
│  │  └──────────────────────────────────────┘    │        │
│  └─────────────────────────────────────────────┘        │
│                                                          │
│  ┌─────────────────────────────────────────────┐        │
│  │         Railway MongoDB Plugin               │        │
│  │  ┌──────────────────────────────────────┐    │        │
│  │  │  Mongo 7.0+                         │    │        │
│  │  │  Persistent storage                 │    │        │
│  │  │  Internal only (no public port)     │    │        │
│  │  └──────────────────────────────────────┘    │        │
│  └─────────────────────────────────────────────┘        │
│                                                          │
│  ┌────────────── Security ───────────────────────┐      │
│  │  SSL/HTTPS (auto) │ Encrypted env vars │ CORS  │      │
│  └────────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User** → HTTPS → **Frontend** (Nginx on port 443/80)
2. **Frontend** → HTTP → **Backend API** (localhost:3000)
3. **Backend** → MongoDB driver → **MongoDB** (localhost:27017)
4. **Backend** → HTTPS → **Groq AI API** (external)
5. **GitHub Actions** → `railway up` → **Railway services** (deployment)

### Network Topology

Railway.app manages all networking automatically:

| Service | Internal URL | Public URL | Access |
|---------|-------------|------------|--------|
| Frontend | `brainbytes-frontend.up.railway.app` | Auto-assigned `*.railway.app` | HTTPS public |
| Backend | `brainbytes-backend.up.railway.app` | Auto-assigned `*.railway.app` | HTTPS public |
| MongoDB | Internal Railway plugin | Not exposed | Private only |

---

## 2. Resource Specifications

| Resource | Specification | Justification |
|----------|--------------|---------------|
| Compute | VM.Standard.E2.1.Micro (1 OCPU, 1 GB RAM) | Always Free; sufficient for a low-traffic tutoring app |
| Boot Volume | 200 GB max | OS + Docker images |
| Block Volume | 50 GB | MongoDB data, logs, backups (separate from OS for safety) |
| MongoDB | mongo:7 Docker image | Upgrade from 4.4 for better stability |
| Frontend | Next.js (port 80) | Serves static + SSR React app |
| Backend | Express.js (port 3000) | REST API + Socket.io for real-time chat |

---

## 3. Security Implementation

### Access Control

| Layer | Method | Details |
|-------|--------|---------|
| SSH | Key-based authentication only | RSA 4096-bit keys, no password login |
| OS | Non-root user (`ubuntu`) | Sudo via SSH key only |
| Database | Localhost-only binding | MongoDB port not exposed to internet |
| API | Input validation | All endpoints validate request bodies |
| Secrets | GitHub Actions secrets | No secrets in code, only in env vars |

### Environment Variables

| Variable | Source | Purpose |
|----------|--------|---------|
| `GROQ_API_KEY` | GitHub Secret | AI service authentication |
| `MONGO_URL` | docker-compose.yml | Database connection string |
| `NODE_ENV` | docker-compose.yml | Environment mode |
| `SNYK_TOKEN` | GitHub Secret | Security scanning auth |

### Data Protection

- **At rest**: MongoDB data stored on Railway's managed persistent storage
- **In transit**: HTTPS between user and Railway services; internal HTTP within Railway network
- **Backups**: Railway MongoDB plugin includes automated backups

---

## 4. Deployment Procedures

### Step-by-Step Deployment

#### Option A: Automatic via Railway GitHub Integration

1. Connect your GitHub repo to Railway
2. Select the `main` branch for auto-deploy
3. Railway detects changes and deploys automatically on push

#### Option B: Manual via GitHub Actions

```yaml
# .github/workflows/deploy-railway.yml
name: Deploy to Railway

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Railway CLI
        run: npm install -g @railway/cli

      - name: Deploy Backend
        working-directory: ./brainbytes-multi-container/backend
        run: railway up --service brainbytes-backend
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}

      - name: Deploy Frontend
        working-directory: ./brainbytes-multi-container/frontend
        run: railway up --service brainbytes-frontend
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

### Verification Steps

```bash
# After deployment, verify via Railway URL:
curl -s https://brainbytes-backend.up.railway.app/          # Should return 200
curl -s https://brainbytes-frontend.up.railway.app/         # Should return HTML
curl -s https://brainbytes-backend.up.railway.app/api/messages  # Should return JSON
```

Or check in Railway dashboard:
1. Go to https://railway.app/dashboard
2. Select your project
3. Check that all services show **Running** status
4. Click on each service to view deployment logs

### Rollback Procedure

1. Go to Railway dashboard → **Deployments** tab
2. Click **Rollback** on the previous successful deployment
3. Railway automatically restores the previous version

If database rollback is needed:
1. Railway MongoDB plugin → **Backups** tab
2. Select a backup timestamp
3. Click **Restore**

---

## 5. Testing and Validation

### Post-Deployment Checklist

- [ ] Frontend loads without errors (HTTP 200)
- [ ] Backend API responds (HTTP 200 on `/`)
- [ ] Messages can be sent and received
- [ ] MongoDB connection successful
- [ ] Groq AI integration works
- [ ] All containers have <500 MB memory usage
- [ ] Disk usage below 80%
- [ ] SSL certificate valid (if configured)

### Performance Testing

```bash
# Test API response time
time curl -s http://localhost:3000/api/messages

# Test concurrent connections
sudo apt install -y apache2-utils
ab -n 100 -c 10 http://localhost:3000/
```

### Security Testing

- Railway manages network security automatically
- All services communicate over internal Railway network
- MongoDB is accessible only within the Railway project
- Verify that no sensitive data is exposed in logs via Railway dashboard

---

## 6. Operational Procedures

### Routine Maintenance

| Frequency | Task | How |
|-----------|------|-----|
| Daily | Check logs | Railway dashboard → service → Logs tab |
| Weekly | Check deployments | Railway dashboard → Deployments tab |
| Weekly | Database backup | Railway MongoDB plugin → Backups → Create |
| Monthly | Review environment variables | Railway dashboard → Variables tab |

### Incident Response

1. **Service down**: Check Railway dashboard → service status → view logs
2. **High memory**: Railway auto-restarts; check Memory graph in dashboard
3. **Build failure**: View build logs in Railway dashboard → Deployments
4. **Database corruption**: Railway MongoDB plugin → Backups → Restore

### Backup and Recovery

- MongoDB backups are handled by Railway's managed plugin
- To create a manual backup: Railway dashboard → MongoDB → Backups → **Create Backup**
- To restore: Select a backup → **Restore**
- Backups are stored in Railway's infrastructure (no manual disk management)

### Monitoring Procedures

- **Railway dashboard**: Real-time CPU, memory, and response time graphs
- **Service logs**: Accessible per-service in Railway dashboard
- **Deployment history**: Track all deployments with rollback capability
- **Health checks**: Railway automatically monitors and restarts unhealthy services

---

## 7. Cost Management

### Free Tier Tracking

Railway.app offers free tier with the following limits:

| Resource | Free Tier Limit | BrainBytes Usage |
|----------|----------------|------------------|
| Projects | Unlimited | 1 project |
| Deployments | Unlimited | Auto-deploy on push |
| Bandwidth | 1 GB/month (free tier) | Well within limit (text-based) |
| Build minutes | 500 hours/month | Minimal |
| MongoDB | 1 instance (free) | 1 database |

### Optimization Strategies

- **Text-based responses**: AI responses are text, minimizing bandwidth usage
- **Efficient builds**: Railway caches layers between builds
- **No unused services**: Only 3 services (frontend, backend, MongoDB)
- **Static optimization**: Next.js automatically optimizes bundles
- **Database indexing**: Proper indexes on MongoDB collections for efficiency
